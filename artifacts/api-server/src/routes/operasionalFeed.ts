import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  db,
  fieldMappingsTable,
  stagingDataTable,
  type FieldMappingData,
} from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import {
  getNotionConnection,
  notionFetch,
  handleNotionErrors,
} from "../lib/notionClient";
import { getDashboardCacheKey, notionCache, delay } from "../lib/notionCache";

const router: IRouter = Router();

type NormalizedStatus = "Selesai" | "Dalam proses" | "Belum dikerjakan";

type NotionPropertyValue = {
  id?: string;
  name?: string;
  type?: string;
  [key: string]: any;
};

type FeedMappingEntry = { propertyId?: string; relatedDatabaseId?: string };

function decodePropertyId(idValue?: string | null): string | null {
  if (!idValue) return null;
  try {
    return decodeURIComponent(idValue);
  } catch {
    return idValue;
  }
}

function normalizeKey(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findPropByIdOrName(
  page: any,
  propIdOrName: string | undefined,
): NotionPropertyValue | null {
  if (!propIdOrName || !page?.properties) return null;
  const decodedTarget = decodePropertyId(propIdOrName);
  const normalizedTarget = normalizeKey(propIdOrName);

  for (const [name, prop] of Object.entries(page.properties) as Array<
    [string, NotionPropertyValue]
  >) {
    const decodedPropId = decodePropertyId(prop.id);
    if (
      decodedPropId === decodedTarget ||
      prop.id === propIdOrName ||
      name === propIdOrName ||
      normalizeKey(name) === normalizedTarget
    ) {
      return { ...prop, name };
    }
  }

  return null;
}

function textFromRichText(
  items: Array<{ plain_text?: string }> | undefined,
): string {
  return items?.map((text) => text.plain_text ?? "").join("") ?? "";
}

function normalizeNotionProperty(prop: NotionPropertyValue | null): any {
  if (!prop) return null;

  try {
    switch (prop.type) {
      case "title":
        return textFromRichText(prop.title);
      case "rich_text":
        return textFromRichText(prop.rich_text);
      case "status":
        return prop.status?.name ?? "";
      case "select":
        return prop.select?.name ?? "";
      case "multi_select":
        return prop.multi_select?.map((m: any) => m.name) ?? [];
      case "number":
        return prop.number ?? 0;
      case "date":
        return prop.date
          ? { start: prop.date.start ?? "", end: prop.date.end ?? null }
          : null;
      case "relation":
        return prop.relation?.map((r: any) => r.id) ?? [];
      case "people":
        return (
          prop.people
            ?.map((person: any) => person.name || person.id)
            .filter(Boolean) ?? []
        );
      case "files":
        return (
          prop.files
            ?.map(
              (file: any) => file.file?.url || file.external?.url || file.name,
            )
            .filter(Boolean) ?? []
        );
      case "checkbox":
        return Boolean(prop.checkbox);
      case "url":
        return prop.url ?? "";
      case "email":
        return prop.email ?? "";
      case "phone_number":
        return prop.phone_number ?? "";
      case "created_time":
        return prop.created_time ?? "";
      case "last_edited_time":
        return prop.last_edited_time ?? "";
      case "created_by":
        return prop.created_by?.name || prop.created_by?.id || "";
      case "last_edited_by":
        return prop.last_edited_by?.name || prop.last_edited_by?.id || "";
      case "formula": {
        const formulaType = prop.formula?.type;
        return formulaType ? (prop.formula?.[formulaType] ?? null) : null;
      }
      case "rollup": {
        const rollupType = prop.rollup?.type;
        if (rollupType === "array")
          return (
            prop.rollup.array?.map((item: any) =>
              normalizeNotionProperty(item),
            ) ?? []
          );
        return rollupType ? (prop.rollup?.[rollupType] ?? null) : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function collectPageProperties(page: any) {
  const byName: Record<string, any> = {};
  const byId: Record<string, any> = {};
  const schema: Record<string, { id?: string; type?: string }> = {};

  for (const [name, prop] of Object.entries(page?.properties ?? {}) as Array<
    [string, NotionPropertyValue]
  >) {
    const value = normalizeNotionProperty({ ...prop, name });
    byName[name] = value;
    if (prop.id) byId[decodePropertyId(prop.id) ?? prop.id] = value;
    schema[name] = {
      id: prop.id ? (decodePropertyId(prop.id) ?? prop.id) : undefined,
      type: prop.type,
    };
  }

  return { byName, byId, schema };
}

function collectMappedProperties(
  page: any,
  mappings: Record<string, FeedMappingEntry> | undefined,
) {
  const mapped: Record<string, any> = {};
  for (const [key, mapping] of Object.entries(mappings ?? {})) {
    const prop = findPropByIdOrName(page, mapping?.propertyId);
    if (prop) mapped[key] = normalizeNotionProperty(prop);
  }
  return mapped;
}

function extractDateStart(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.start || "";
}

function extractDateEnd(value: any): string {
  if (!value || typeof value === "string") return "";
  return value.end || "";
}

function normalizeStatus(rawStatus: unknown, dbType: string): NormalizedStatus {
  if (dbType === "panen" || dbType === "expenses") return "Selesai";

  const safeStatus = (rawStatus || "").toString().toLowerCase().trim();
  if (/selesai|done|lunas|sudah ditangani|complete|berhasil/.test(safeStatus))
    return "Selesai";
  if (
    /dalam proses|progress|jalan|sedang ditangani|on going|working|proses/.test(
      safeStatus,
    )
  )
    return "Dalam proses";
  return "Belum dikerjakan";
}

async function fetchPageNotes(
  userId: string,
  accessToken: string,
  pageId: string,
): Promise<string> {
  try {
    const response = await notionFetch(
      userId,
      accessToken,
      `https://api.notion.com/v1/blocks/${pageId}/children?page_size=30`,
    );
    if (!response.ok) return "";
    const data = (await response.json()) as { results?: any[] };
    const lines = (data.results || [])
      .map((block: any) => {
        const type = block.type;
        const richText = block[type]?.rich_text;
        return textFromRichText(richText).trim();
      })
      .filter((line: string) => line && line !== "📝 Catatan Lapangan");
    return lines.join("\n");
  } catch {
    return "";
  }
}

// --- 1. UTILITY: FORMAT WAKTU & EKSTRAKTOR ---
function formatRelativeTime(dateString?: string) {
  if (!dateString) return "Baru saja";
  try {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: id,
    });
  } catch {
    return "Baru saja";
  }
}

function extractNotionProp(
  page: any,
  propId: string | undefined,
  type: string,
) {
  const prop = findPropByIdOrName(page, propId);
  if (!prop) return null;

  const value = normalizeNotionProperty(prop);
  if (type === "formula_number") return prop.formula?.number ?? 0;
  if (type === "date") return extractDateStart(value);
  return value;
}

// --- 2. CORE LOGIC: PENARIK & PENYETRIKA DATA ---
async function fetchSingleDatabaseFeed(
  userId: string,
  accessToken: string,
  databaseId: string,
  dbType: string,
  mappings: any,
) {
  const items: any[] = [];
  try {
    const response = await notionFetch(
      userId,
      accessToken,
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      { method: "POST", body: JSON.stringify({ page_size: 15 }) },
    );

    if (!response.ok) return [];
    const data = (await response.json()) as { results?: any[] };

    for (const page of data.results || []) {
      const allProperties = collectPageProperties(page);
      const mappedProperties = collectMappedProperties(page, mappings);
      const pageNotes = await fetchPageNotes(userId, accessToken, page.id);
      const titleId =
        mappings?.kegiatan?.propertyId ||
        mappings?.namaPekerjaan?.propertyId ||
        mappings?.pengeluaran?.propertyId;
      const dateId =
        mappings?.tanggal?.propertyId ||
        mappings?.date?.propertyId ||
        mappings?.waktuPengerjaan?.propertyId;
      const statusId = mappings?.status?.propertyId;
      const areaId =
        mappings?.labaRugi?.propertyId || mappings?.area?.propertyId;
      const workersId =
        mappings?.petugas?.propertyId || mappings?.ditugaskanKe?.propertyId;

      const rawTitle =
        extractNotionProp(page, titleId, "title") || "Aktivitas Tanpa Judul";
      const rawDate =
        extractNotionProp(page, dateId, "date") ||
        page.created_time ||
        new Date().toISOString();
      const rawStatus =
        extractNotionProp(page, statusId, "status") || "Belum dikerjakan";
      const relatedAreaIds = extractNotionProp(page, areaId, "relation") || [];
      const relatedWorkerIds =
        extractNotionProp(page, workersId, "relation") || [];

      const statusStyle = normalizeStatus(rawStatus, dbType);

      let normalizedItem: any = {
        id: page.id,
        title: rawTitle,
        time: new Date(rawDate).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        rawDate: rawDate,
        status: statusStyle,
        areaId: relatedAreaIds[0] || null,
        workers: [],
        workerIds: relatedWorkerIds,
        priority: "Medium",
        attachments: [],
        history: [
          {
            time: "Notion Sync",
            text: "Data disinkronisasi dari database utama.",
          },
        ],
        source: {
          type: "notion",
          databaseType: dbType,
          pageId: page.id,
          url: page.url,
        },
        metaEkstra: {
          notion: {
            properties: allProperties.byName,
            propertyIds: allProperties.byId,
            schema: allProperties.schema,
          },
          mapped: mappedProperties,
        },
      };

      if (dbType === "perawatan") {
        normalizedItem.module = "perawatan";
        normalizedItem.icon = "sprout";
        normalizedItem.category =
          extractNotionProp(page, mappings?.tags?.propertyId, "select") ||
          "Treatment";
        normalizedItem.duration = `${extractNotionProp(page, mappings?.durasiKerja?.propertyId, "number") || 0} jam`;
        normalizedItem.notes =
          pageNotes || `Kegiatan perawatan reguler pada area tercatat.`;
        normalizedItem.metaEkstra = {
          ...normalizedItem.metaEkstra,
          tags: normalizedItem.category,
        };
      } else if (dbType === "inspeksi") {
        normalizedItem.module = "inspeksi";
        normalizedItem.icon = "leaf";
        normalizedItem.category = "Diagnosis";
        normalizedItem.duration = `${extractNotionProp(page, mappings?.durasiKerja?.propertyId, "number") || 0} jam`;

        const hamas =
          extractNotionProp(page, mappings?.hama?.propertyId, "multi_select") ||
          [];
        const penyakits =
          extractNotionProp(
            page,
            mappings?.penyakit?.propertyId,
            "multi_select",
          ) || [];
        const hst =
          extractNotionProp(
            page,
            mappings?.hst?.propertyId,
            "formula_number",
          ) ||
          extractNotionProp(page, mappings?.hst?.propertyId, "number") ||
          0;

        normalizedItem.notes =
          hamas.length || penyakits.length
            ? `Temuan Lapangan (${hst} HST): Hama [${hamas.join(", ") || "-"}] • Penyakit [${penyakits.join(", ") || "-"}].`
            : `Kondisi tanaman terpantau aman terkendali pada usia ${hst} HST.`;

        normalizedItem.metaEkstra = {
          ...normalizedItem.metaEkstra,
          hama: hamas,
          penyakit: penyakits,
          hst: hst,
        };
      } else if (dbType === "operasional") {
        normalizedItem.module = "operasional";
        normalizedItem.icon = "wrench";
        normalizedItem.category =
          extractNotionProp(page, mappings?.kategori?.propertyId, "select") ||
          "Operasional";
        normalizedItem.priority =
          extractNotionProp(page, mappings?.prioritas?.propertyId, "select") ||
          "Medium";
        normalizedItem.duration = `${extractNotionProp(page, mappings?.durasiKerja?.propertyId, "number") || 0} jam`;
        normalizedItem.notes =
          pageNotes || `Tugas operasional umum dan maintenance kebun.`;
        const waktuPengerjaan = mappedProperties.waktuPengerjaan;
        normalizedItem.metaEkstra = {
          ...normalizedItem.metaEkstra,
          priorityLevel: normalizedItem.priority,
          formInput: {
            namaPekerjaan: rawTitle,
            kategori: normalizedItem.category,
            status: rawStatus,
            prioritas: normalizedItem.priority,
            jenisTenagaKerja: mappedProperties.jenisTenagaKerja ?? null,
            areaIds: relatedAreaIds,
            pekerjaIds: relatedWorkerIds,
            waktuMulai: extractDateStart(waktuPengerjaan) || rawDate,
            waktuSelesai: extractDateEnd(waktuPengerjaan),
            durasiKerja:
              extractNotionProp(
                page,
                mappings?.durasiKerja?.propertyId,
                "number",
              ) || 0,
            catatan: pageNotes,
          },
        };
      } else if (dbType === "panen" || dbType === "expenses") {
        const isPanen = dbType === "panen";
        const metricId = isPanen
          ? mappings?.jumlahPanen?.propertyId
          : mappings?.qty?.propertyId;
        const priceId = isPanen
          ? mappings?.hargaJualPerKg?.propertyId
          : mappings?.hargaPerPcs?.propertyId;

        const metricValue = extractNotionProp(page, metricId, "number") || 0;
        const priceValue = extractNotionProp(page, priceId, "number") || 0;

        normalizedItem.module = "finance";
        normalizedItem.icon = "banknote";
        normalizedItem.category = isPanen ? "Pendapatan" : "Pengeluaran";
        normalizedItem.title = isPanen ? `Panen: ${rawTitle}` : rawTitle;
        normalizedItem.duration = "0 jam";
        normalizedItem.priority = isPanen ? "Medium" : "High";
        normalizedItem.notes = isPanen
          ? `Hasil timbangan bruto: ${metricValue}kg. Nilai estimasi transaksi: Rp${(metricValue * priceValue).toLocaleString("id-ID")}.`
          : `Pembelian operasional: ${metricValue} unit dengan total biaya Rp${(metricValue * priceValue).toLocaleString("id-ID")}.`;

        normalizedItem.metaEkstra = {
          ...normalizedItem.metaEkstra,
          nominal: metricValue * priceValue,
          quantity: metricValue,
          price: priceValue,
        };
      }

      items.push(normalizedItem);
    }
  } catch (err) {
    console.error(`Gagal narik feed untuk ${dbType}:`, err);
  }
  return items;
}

async function resolveStatusPropertyId(
  userId: string,
  accessToken: string,
  pageId: string,
  mappings?: FieldMappingData,
): Promise<string | null> {
  const mappedStatusId = decodePropertyId(mappings?.status?.propertyId);
  if (mappedStatusId) return mappedStatusId;

  const response = await notionFetch(
    userId,
    accessToken,
    `https://api.notion.com/v1/pages/${pageId}`,
  );
  if (!response.ok) return null;

  const page = (await response.json()) as {
    properties?: Record<string, NotionPropertyValue>;
  };
  const statusEntry = Object.values(page.properties ?? {}).find(
    (prop: any) => prop.type === "status",
  ) as NotionPropertyValue | undefined;

  return decodePropertyId(statusEntry?.id);
}

// --- 3. ENDPOINT UTAMA: UNIFIED ACTIVITY FEED ---

router.patch(
  "/operasional/feed/:pageId/status",
  async (req, res): Promise<void> => {
    const { userId } = getAuth(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { pageId } = req.params;
    const nextStatus = String(req.body?.status ?? "").trim();
    const allowedStatuses: NormalizedStatus[] = [
      "Belum dikerjakan",
      "Dalam proses",
      "Selesai",
    ];

    if (!pageId || pageId.startsWith("staging-")) {
      res
        .status(400)
        .json({ error: "Aktivitas staging belum bisa diedit di Notion." });
      return;
    }

    if (!allowedStatuses.includes(nextStatus as NormalizedStatus)) {
      res.status(400).json({ error: "Status tidak valid." });
      return;
    }

    try {
      const connection = await getNotionConnection(userId);
      const [mappingRow] = await db
        .select()
        .from(fieldMappingsTable)
        .where(
          and(
            eq(fieldMappingsTable.userId, userId),
            eq(fieldMappingsTable.databaseType, "operasional"),
          ),
        );

      const statusPropertyId = await resolveStatusPropertyId(
        userId,
        connection.accessToken,
        pageId,
        mappingRow?.mappings as FieldMappingData | undefined,
      );

      if (!statusPropertyId) {
        res.status(404).json({
          error: "Properti status tidak ditemukan di halaman Notion.",
        });
        return;
      }

      const response = await notionFetch(
        userId,
        connection.accessToken,
        `https://api.notion.com/v1/pages/${pageId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            properties: {
              [statusPropertyId]: { status: { name: nextStatus } },
            },
          }),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        res
          .status(response.status)
          .json({ error: errText || "Gagal mengubah status Notion." });
        return;
      }

      notionCache.del(`operasional:feed:${userId}`);
      notionCache.del(`dashboard:summary:${userId}`);
      notionCache.del(getDashboardCacheKey(userId));

      res.json({ success: true, id: pageId, status: nextStatus });
    } catch (err) {
      if (handleNotionErrors(res, err)) return;
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal Server Error",
      });
    }
  },
);

router.get("/operasional/feed", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const connection = await getNotionConnection(userId);
    const cacheKey = `operasional:feed:${userId}`;

    const savedMappings = await db
      .select()
      .from(fieldMappingsTable)
      .where(eq(fieldMappingsTable.userId, userId));

    let cachedData = notionCache.get<{ feed: any[]; cachedAt: string }>(
      cacheKey,
    );
    let masterFeed = cachedData?.feed || [];
    let cacheTimeMs = cachedData ? new Date(cachedData.cachedAt).getTime() : 0;

    if (!cachedData) {
      req.log.info(
        { userId },
        "Operasional Feed: Cache miss, nembak ke Notion...",
      );
      const targetDbTypes = [
        "perawatan",
        "inspeksi",
        "operasional",
        "panen",
        "expenses",
      ];

      for (const dbType of targetDbTypes) {
        const config = savedMappings.find((m) => m.databaseType === dbType);
        if (config?.notionDatabaseId) {
          const singleFeed = await fetchSingleDatabaseFeed(
            userId,
            connection.accessToken,
            config.notionDatabaseId,
            dbType,
            config.mappings || {},
          );
          masterFeed = [...masterFeed, ...singleFeed];
          await delay(350);
        }
      }

      cacheTimeMs = new Date().getTime();
      notionCache.set(
        cacheKey,
        { feed: masterFeed, cachedAt: new Date().toISOString() },
        180,
      );
    }

    const areaMap: Record<string, string> = {};
    const workerMap: Record<string, string> = {};
    const cacheDashboard = notionCache.get<any>(`dashboard:summary:${userId}`);

    if (cacheDashboard?.resultLabaRugi?.areas) {
      cacheDashboard.resultLabaRugi.areas.forEach((a: any) => {
        areaMap[a.id] = a.name;
      });
    }
    if (cacheDashboard?.resultPekerja?.petugas) {
      cacheDashboard.resultPekerja.petugas.forEach((p: any) => {
        workerMap[p.id] = p.name;
      });
    }

    if (
      Object.keys(areaMap).length === 0 ||
      Object.keys(workerMap).length === 0
    ) {
      try {
        const areaConfig = savedMappings.find(
          (m) =>
            m.databaseType === "perawatan" || m.databaseType === "operasional",
        );
        const workerConfig = savedMappings.find(
          (m) =>
            m.databaseType === "operasional" || m.databaseType === "perawatan",
        );

        const areaDbId =
          areaConfig?.mappings?.labaRugi?.relatedDatabaseId ||
          areaConfig?.mappings?.area?.relatedDatabaseId;
        const workerDbId =
          workerConfig?.mappings?.petugas?.relatedDatabaseId ||
          workerConfig?.mappings?.ditugaskanKe?.relatedDatabaseId;

        const quickFetch = async (dbId: string) => {
          const res = await notionFetch(
            userId,
            connection.accessToken,
            `https://api.notion.com/v1/databases/${dbId}/query`,
            {
              method: "POST",
              body: JSON.stringify({ page_size: 100 }),
            },
          );
          if (!res.ok) return [];
          const data = (await res.json()) as { results?: any[] };
          return (data.results || []).map((p: any) => {
            const titleProp = Object.values(p.properties).find(
              (prop: any) => prop.type === "title",
            ) as any;
            return {
              id: p.id,
              name: titleProp?.title?.[0]?.plain_text || "Tanpa Nama",
            };
          });
        };

        if (areaDbId && Object.keys(areaMap).length === 0) {
          const areas = await quickFetch(areaDbId);
          areas.forEach((a: any) => {
            areaMap[a.id] = a.name;
          });
        }
        if (workerDbId && Object.keys(workerMap).length === 0) {
          const workers = await quickFetch(workerDbId);
          workers.forEach((w: any) => {
            workerMap[w.id] = w.name;
          });
        }
      } catch (err) {
        req.log.warn(
          { userId },
          "Gagal mengambil data area/pekerja fallback dari Notion",
        );
      }
    }

    const stagingRecords = await db
      .select()
      .from(stagingDataTable)
      .where(
        and(
          eq(stagingDataTable.userId, userId),
          or(
            eq(stagingDataTable.status, "pending"),
            eq(stagingDataTable.status, "synced"),
          ),
        ),
      );

    const validStagingRecords = stagingRecords.filter((record) => {
      if (record.status === "pending") return true;
      return new Date(record.createdAt).getTime() > cacheTimeMs;
    });

    const pendingFeedItems = validStagingRecords.map((record) => {
      const d = (record.data || {}) as Record<string, any>;
      const isFinance =
        record.databaseType === "panen" || record.databaseType === "expenses";
      const moduleName = isFinance ? "finance" : record.databaseType;
      const areaId = d.labaRugiId || d.areaId || d.areaIds?.[0] || null;
      const workerIds =
        d.pekerjaIds || d.pekerjaBroadcast || d.ditugaskanKe || [];
      const resolvedStatus = normalizeStatus(
        d.status || d.statusBroadcast || d.statusPerArea?.[areaId],
        record.databaseType,
      );
      const durationValue =
        d.durasiKerja ??
        d.durasiKerjaBroadcast ??
        (areaId ? d.durasiKerjaPerArea?.[areaId] : undefined) ??
        0;

      return {
        id: `staging-${record.id}`,
        module: moduleName,
        icon: isFinance
          ? "banknote"
          : moduleName === "perawatan"
            ? "sprout"
            : moduleName === "inspeksi"
              ? "leaf"
              : "wrench",
        title:
          d.kegiatan ||
          d.namaPekerjaan ||
          d.pengeluaran ||
          "Data Antrean Cloud",
        time: "Sekarang",
        rawDate: record.createdAt || new Date().toISOString(),
        status: record.status === "pending" ? resolvedStatus : "Dalam proses",
        areaId,
        workerIds,
        workers: ["Sistem Pending"],
        duration: `${durationValue || 0} jam`,
        priority: d.prioritas || d.prioritasBroadcast || "High",
        category:
          d.kategori ||
          d.kategoriBroadcast ||
          (record.databaseType === "panen" ? "Pendapatan" : "Sinkronisasi"),
        notes:
          d.catatan ||
          d.catatanBroadcast ||
          (areaId ? d.catatanPerArea?.[areaId] : undefined) ||
          "Data sedang dalam antrean atau proses indexing oleh Notion. Harap tunggu sesaat.",
        attachments: [],
        history: [
          { time: "Local", text: "Dibuat di perangkat lokal, menunggu awan." },
        ],
        isPendingStaging: record.status === "pending",
        source: {
          type: "staging",
          databaseType: record.databaseType,
          stagingId: record.id,
        },
        metaEkstra: {
          staging: {
            id: record.id,
            status: record.status,
            databaseType: record.databaseType,
            rawInput: d,
          },
          formInput: {
            namaPekerjaan: d.namaPekerjaan || d.kegiatan || d.pengeluaran || "",
            kategori: d.kategori || d.kategoriBroadcast || "",
            status: d.status || d.statusBroadcast || "",
            prioritas: d.prioritas || d.prioritasBroadcast || "",
            jenisTenagaKerja:
              d.jenisTenagaKerja || d.jenisTenagaKerjaBroadcast || "",
            areaIds: d.areaIds || (areaId ? [areaId] : []),
            pekerjaIds: workerIds,
            waktuMulai: d.waktuMulai || d.waktuMulaiBroadcast || "",
            waktuSelesai: d.waktuSelesai || d.waktuSelesaiBroadcast || "",
            durasiKerja: durationValue || 0,
            catatan: d.catatan || d.catatanBroadcast || "",
          },
        },
      };
    });

    const finalFeed = [...pendingFeedItems, ...masterFeed]
      .map((item) => {
        const itemDate = new Date(item.rawDate);

        let resolvedWorkers: string[];
        if (item.workerIds && item.workerIds.length > 0) {
          resolvedWorkers = item.workerIds
            .map((id: string) => workerMap[id] || null)
            .filter(Boolean) as string[];
        }
        if (!resolvedWorkers! || resolvedWorkers.length === 0) {
          resolvedWorkers = item.workers.length
            ? item.workers
            : ["Tim Lapangan"];
        }

        return {
          ...item,
          area: areaMap[item.areaId] || "Area Tanpa Blok",
          workers: resolvedWorkers,
          dateLabel:
            itemDate.toDateString() === new Date().toDateString()
              ? "Hari ini"
              : itemDate.toDateString() ===
                  new Date(Date.now() - 86400000).toDateString()
                ? "Kemarin"
                : "Riwayat Lama",
          timeLabel: formatRelativeTime(item.rawDate),
        };
      })
      .sort(
        (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime(),
      );

    res.json({
      success: true,
      feed: finalFeed,
      meta: {
        totalItems: finalFeed.length,
        stagingCount: pendingFeedItems.filter((i) => i.isPendingStaging).length,
        lastSynced: cachedData ? cachedData.cachedAt : new Date().toISOString(),
      },
    });
  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
