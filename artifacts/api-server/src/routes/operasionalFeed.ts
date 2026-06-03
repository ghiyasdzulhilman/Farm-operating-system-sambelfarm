import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, fieldMappingsTable, stagingDataTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import {
  getNotionConnection,
  notionFetch,
  handleNotionErrors,
} from "../lib/notionClient";
import { notionCache, delay } from "../lib/notionCache";

const router: IRouter = Router();

// --- 1. UTILITY: FORMAT WAKTU & EKSTRAKTOR ---
function formatRelativeTime(dateString?: string) {
  if (!dateString) return "Baru saja";
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: id });
  } catch {
    return "Baru saja";
  }
}

function extractNotionProp(page: any, propId: string | undefined, type: string) {
  if (!propId || !page?.properties) return null;
  const prop = Object.values(page.properties).find((p: any) => p.id === propId) as any;
  if (!prop) return null;

  try {
    switch (type) {
      case "title": return prop.title?.[0]?.plain_text || "";
      case "status": return prop.status?.name || "";
      case "select": return prop.select?.name || "";
      case "multi_select": return prop.multi_select?.map((m: any) => m.name) || [];
      case "number": return prop.number ?? 0;
      case "formula_number": return prop.formula?.number ?? 0;
      case "date": return prop.date?.start || prop.created_time || "";
      case "relation": return prop.relation?.map((r: any) => r.id) || [];
      default: return null;
    }
  } catch (error) {
    return null;
  }
}

// --- 2. CORE LOGIC: PENARIK & PENYETRIKA DATA ---
async function fetchSingleDatabaseFeed(
  userId: string,
  accessToken: string,
  databaseId: string,
  dbType: string,
  mappings: any
) {
  const items: any[] = [];
  try {
    const response = await notionFetch(
      userId,
      accessToken,
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      { method: "POST", body: JSON.stringify({ page_size: 15 }) }
    );

    if (!response.ok) return [];
    const data = await response.json();

    for (const page of data.results) {
      const titleId = mappings?.kegiatan?.propertyId || mappings?.namaPekerjaan?.propertyId || mappings?.pengeluaran?.propertyId;
      const dateId = mappings?.tanggal?.propertyId || mappings?.date?.propertyId || mappings?.waktuPengerjaan?.propertyId;
      const statusId = mappings?.status?.propertyId;
      const areaId = mappings?.labaRugi?.propertyId || mappings?.area?.propertyId;
      const workersId = mappings?.petugas?.propertyId || mappings?.ditugaskanKe?.propertyId;

      const rawTitle = extractNotionProp(page, titleId, "title") || "Aktivitas Tanpa Judul";
      const rawDate = extractNotionProp(page, dateId, "date") || page.created_time || new Date().toISOString();
      const rawStatus = extractNotionProp(page, statusId, "status") || "Belum dikerjakan";
      const relatedAreaIds = extractNotionProp(page, areaId, "relation") || [];
      const relatedWorkerIds = extractNotionProp(page, workersId, "relation") || [];

      // ==========================================
      // SMART STATUS NORMALIZER
      // ==========================================
      let statusStyle: "Selesai" | "Dalam proses" | "Belum dikerjakan" = "Belum dikerjakan";

      if (dbType === "panen" || dbType === "expenses") {
        statusStyle = "Selesai";
      } else {
        const safeStatus = (rawStatus || "").toString().toLowerCase().trim();
        if (/selesai|done|lunas|sudah ditangani|complete|berhasil/.test(safeStatus)) {
          statusStyle = "Selesai";
        } else if (/dalam proses|progress|jalan|sedang ditangani|on going|working|proses/.test(safeStatus)) {
          statusStyle = "Dalam proses";
        } else if (/rencana|plan|to do|todo|belum|pending|baru di temukan|draft/.test(safeStatus)) {
          statusStyle = "Belum dikerjakan";
        }
      }

      let normalizedItem: any = {
        id: page.id,
        title: rawTitle,
        time: new Date(rawDate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        rawDate: rawDate,
        status: statusStyle,
        areaId: relatedAreaIds[0] || null,
        workers: [], 
        workerIds: relatedWorkerIds,
        priority: "Medium",
        attachments: [],
        history: [{ time: "Notion Sync", text: "Data disinkronisasi dari database utama." }],
        metaEkstra: {} // Injeksi objek murni untuk frontend
      };

      if (dbType === "perawatan") {
        normalizedItem.module = "perawatan";
        normalizedItem.icon = "sprout";
        normalizedItem.category = extractNotionProp(page, mappings?.tags?.propertyId, "select") || "Treatment";
        normalizedItem.duration = `${extractNotionProp(page, mappings?.durasiKerja?.propertyId, "number") || 0} jam`;
        normalizedItem.notes = `Kegiatan perawatan reguler pada area tercatat.`;
        normalizedItem.metaEkstra = { tags: normalizedItem.category };
      } 
      else if (dbType === "inspeksi") {
        normalizedItem.module = "inspeksi";
        normalizedItem.icon = "leaf";
        normalizedItem.category = "Diagnosis";
        normalizedItem.duration = `${extractNotionProp(page, mappings?.durasiKerja?.propertyId, "number") || 0} jam`;

        const hamas = extractNotionProp(page, mappings?.hama?.propertyId, "multi_select") || [];
        const penyakits = extractNotionProp(page, mappings?.penyakit?.propertyId, "multi_select") || [];
        const hst = extractNotionProp(page, mappings?.hst?.propertyId, "formula_number") || extractNotionProp(page, mappings?.hst?.propertyId, "number") || 0;

        normalizedItem.notes = (hamas.length || penyakits.length) 
          ? `Temuan Lapangan (${hst} HST): Hama [${hamas.join(", ") || "-"}] • Penyakit [${penyakits.join(", ") || "-"}].`
          : `Kondisi tanaman terpantau aman terkendali pada usia ${hst} HST.`;
        
        normalizedItem.metaEkstra = { hama: hamas, penyakit: penyakits, hst: hst };
      } 
      else if (dbType === "operasional") {
        normalizedItem.module = "operasional";
        normalizedItem.icon = "wrench";
        normalizedItem.category = extractNotionProp(page, mappings?.kategori?.propertyId, "select") || "Operasional";
        normalizedItem.priority = extractNotionProp(page, mappings?.prioritas?.propertyId, "select") || "Medium";
        normalizedItem.duration = `${extractNotionProp(page, mappings?.durasiKerja?.propertyId, "number") || 0} jam`;
        normalizedItem.notes = `Tugas operasional umum dan maintenance kebun.`;
        normalizedItem.metaEkstra = { priorityLevel: normalizedItem.priority };
      }
      else if (dbType === "panen" || dbType === "expenses") {
        const isPanen = dbType === "panen";
        const metricId = isPanen ? mappings?.jumlahPanen?.propertyId : mappings?.qty?.propertyId;
        const priceId = isPanen ? mappings?.hargaJualPerKg?.propertyId : mappings?.hargaPerPcs?.propertyId;
        
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
        
        normalizedItem.metaEkstra = { nominal: metricValue * priceValue };
      }

      items.push(normalizedItem);
    }
  } catch (err) {
    console.error(`Gagal narik feed untuk ${dbType}:`, err);
  }
  return items;
}

// --- 3. ENDPOINT UTAMA: UNIFIED ACTIVITY FEED ---
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

    let cachedData = notionCache.get<{ feed: any[], cachedAt: string }>(cacheKey);
    let masterFeed = cachedData?.feed || [];
    let cacheTimeMs = cachedData ? new Date(cachedData.cachedAt).getTime() : 0;

    if (!cachedData) {
      req.log.info({ userId }, "Operasional Feed: Cache miss, nembak ke Notion...");
      const targetDbTypes = ["perawatan", "inspeksi", "operasional", "panen", "expenses"];

      for (const dbType of targetDbTypes) {
        const config = savedMappings.find((m) => m.databaseType === dbType);
        if (config?.notionDatabaseId) {
          const singleFeed = await fetchSingleDatabaseFeed(
            userId, connection.accessToken, config.notionDatabaseId, dbType, config.mappings || {}
          );
          masterFeed = [...masterFeed, ...singleFeed];
          await delay(350); 
        }
      }

      cacheTimeMs = new Date().getTime();
      notionCache.set(cacheKey, { feed: masterFeed, cachedAt: new Date().toISOString() }, 180);
    }

    const areaMap: Record<string, string> = {};
    const workerMap: Record<string, string> = {};
    const cacheDashboard = notionCache.get<any>(`dashboard:summary:${userId}`);

    if (cacheDashboard?.resultLabaRugi?.areas) {
      cacheDashboard.resultLabaRugi.areas.forEach((a: any) => { areaMap[a.id] = a.name; });
    }
    if (cacheDashboard?.resultPekerja?.petugas) {
      cacheDashboard.resultPekerja.petugas.forEach((p: any) => { workerMap[p.id] = p.name; });
    }

    if (Object.keys(areaMap).length === 0 || Object.keys(workerMap).length === 0) {
      try {
        const areaConfig = savedMappings.find(m => m.databaseType === 'perawatan' || m.databaseType === 'operasional');
        const workerConfig = savedMappings.find(m => m.databaseType === 'operasional' || m.databaseType === 'perawatan');

        const areaDbId = areaConfig?.mappings?.labaRugi?.relatedDatabaseId || areaConfig?.mappings?.area?.relatedDatabaseId;
        const workerDbId = workerConfig?.mappings?.petugas?.relatedDatabaseId || workerConfig?.mappings?.ditugaskanKe?.relatedDatabaseId;

        const quickFetch = async (dbId: string) => {
          const res = await notionFetch(userId, connection.accessToken, `https://api.notion.com/v1/databases/${dbId}/query`, {
            method: 'POST', body: JSON.stringify({ page_size: 100 })
          });
          if (!res.ok) return [];
          const data = await res.json();
          return data.results.map((p: any) => {
            const titleProp = Object.values(p.properties).find((prop: any) => prop.type === 'title') as any;
            return { id: p.id, name: titleProp?.title?.[0]?.plain_text || 'Tanpa Nama' };
          });
        };

        if (areaDbId && Object.keys(areaMap).length === 0) {
          const areas = await quickFetch(areaDbId);
          areas.forEach((a: any) => { areaMap[a.id] = a.name; });
        }
        if (workerDbId && Object.keys(workerMap).length === 0) {
          const workers = await quickFetch(workerDbId);
          workers.forEach((w: any) => { workerMap[w.id] = w.name; });
        }
      } catch (err) {
        req.log.warn({ userId }, "Gagal mengambil data area/pekerja fallback dari Notion");
      }
    }

    const stagingRecords = await db
      .select()
      .from(stagingDataTable)
      .where(and(
        eq(stagingDataTable.userId, userId),
        or(eq(stagingDataTable.status, "pending"), eq(stagingDataTable.status, "synced"))
      ));

    const validStagingRecords = stagingRecords.filter(record => {
      if (record.status === "pending") return true;
      return new Date(record.createdAt).getTime() > cacheTimeMs;
    });

    const pendingFeedItems = validStagingRecords.map((record) => {
      const d = record.data;
      let isFinance = record.databaseType === "panen" || record.databaseType === "expenses";
      let moduleName = isFinance ? "finance" : record.databaseType;
      
      return {
        id: `staging-${record.id}`,
        module: moduleName,
        icon: isFinance ? "banknote" : (moduleName === "perawatan" ? "sprout" : (moduleName === "inspeksi" ? "leaf" : "wrench")),
        title: d.kegiatan || d.namaPekerjaan || d.pengeluaran || "Data Antrean Cloud",
        time: "Sekarang",
        rawDate: record.createdAt || new Date().toISOString(),
        status: record.status === "pending" ? "Belum dikerjakan" : "Dalam proses",
        areaId: d.labaRugiId || d.areaId || null,
        workers: ["Sistem Pending"],
        duration: "0 jam",
        priority: "High",
        category: record.databaseType === "panen" ? "Pendapatan" : "Sinkronisasi",
        notes: "Data sedang dalam antrean atau proses indexing oleh Notion. Harap tunggu sesaat.",
        attachments: [],
        history: [{ time: "Local", text: "Dibuat di perangkat lokal, menunggu awan." }],
        isPendingStaging: record.status === "pending",
        metaEkstra: {}
      };
    });

    const finalFeed = [...pendingFeedItems, ...masterFeed]
      .map(item => {
        const itemDate = new Date(item.rawDate);
        
        let resolvedWorkers: string[];
        if (item.workerIds && item.workerIds.length > 0) {
          resolvedWorkers = item.workerIds
            .map((id: string) => workerMap[id] || null)
            .filter(Boolean) as string[];
        }
        if (!resolvedWorkers! || resolvedWorkers.length === 0) {
          resolvedWorkers = item.workers.length ? item.workers : ["Tim Lapangan"];
        }

        return {
          ...item,
          area: areaMap[item.areaId] || "Area Tanpa Blok",
          workers: resolvedWorkers,
          dateLabel: itemDate.toDateString() === new Date().toDateString() ? "Hari ini" : 
                    (itemDate.toDateString() === new Date(Date.now() - 86400000).toDateString() ? "Kemarin" : "Riwayat Lama"),
          timeLabel: formatRelativeTime(item.rawDate)
        };
      })
      .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

    res.json({
      success: true,
      feed: finalFeed,
      meta: {
        totalItems: finalFeed.length,
        stagingCount: pendingFeedItems.filter(i => i.isPendingStaging).length,
        lastSynced: cachedData ? cachedData.cachedAt : new Date().toISOString()
      }
    });

  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
