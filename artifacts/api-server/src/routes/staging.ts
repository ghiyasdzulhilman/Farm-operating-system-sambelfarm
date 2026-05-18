import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
// ✨ TAMBAHAN 1: Import tabel perawatan dan inspeksi
import { db, stagingDataTable, fieldMappingsTable, stagingPerawatanTable, stagingInspeksiTable } from "@workspace/db";
import { and, eq, lt } from "drizzle-orm";
import {
  getNotionConnection,
  notionFetch,
  handleNotionErrors,
  NotionTokenInvalidError,
} from "../lib/notionClient";
import { purgeOldStagingData } from "../lib/autoPurge";
import { notionCache, getDashboardCacheKey } from "../lib/notionCache";
import type { FieldMappingData } from "@workspace/db";

const router: IRouter = Router();

// ---- Helpers ----------------------------------------------------------------

function decodePropertyId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

async function getMappingRow(userId: string, databaseType: string) {
  const [row] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(
      eq(fieldMappingsTable.userId, userId),
      eq(fieldMappingsTable.databaseType, databaseType),
    ));
  return row ?? null;
}

async function findDatabaseByName(
  userId: string,
  accessToken: string,
  name: string,
): Promise<string | null> {
  try {
    const response = await notionFetch(userId, accessToken, "https://api.notion.com/v1/search", {
      method: "POST",
      body: JSON.stringify({ query: name, filter: { value: "database", property: "object" } }),
    });
    if (!response.ok) return null;
    const data = await response.json() as {
      results: Array<{ id: string; title?: Array<{ plain_text: string }> }>;
    };
    const found = data.results.find((r) =>
      r.title?.some((t) => t.plain_text.toLowerCase().includes(name.toLowerCase()))
    );
    return found?.id ?? null;
  } catch (err) {
    if (err instanceof NotionTokenInvalidError) throw err;
    return null;
  }
}

const DEFAULT_DB_NAMES: Record<string, string> = {
  panen: "Panen",
  expenses: "Expenses",
  // Bisa ditambah nanti untuk perawatan & inspeksi jika perlu
};

async function resolveNotionDatabaseId(
  userId: string,
  accessToken: string,
  databaseType: string,
): Promise<string | null> {
  const mappingRow = await getMappingRow(userId, databaseType);
  if (mappingRow?.notionDatabaseId) return mappingRow.notionDatabaseId;
  const defaultName = DEFAULT_DB_NAMES[databaseType];
  if (!defaultName) return null;
  return findDatabaseByName(userId, accessToken, defaultName);
}

// ---- Dynamic property builder -----------------------------------------------

interface FieldSpec {
  mappingKey: string;
  dataKey?: string;
  build: (value: unknown) => unknown;
  optional?: boolean;
}

const DB_FIELD_SPECS: Record<string, FieldSpec[]> = {
  panen: [
    { mappingKey: "kegiatan", build: (v) => ({ title: [{ text: { content: String(v ?? "") } }] }) },
    { mappingKey: "tanggal", build: (v) => ({ date: { start: String(v) } }), optional: true },
    { mappingKey: "jumlahPanen", build: (v) => ({ number: Number(v ?? 0) }) },
    { mappingKey: "hargaJualPerKg", build: (v) => ({ number: Number(v ?? 0) }) },
    { mappingKey: "kualitas", build: (v) => ({ select: { name: String(v) } }), optional: true },
    { mappingKey: "channelPenjualan", build: (v) => ({ select: { name: String(v) } }), optional: true },
    { mappingKey: "areaPindahTanam", dataKey: "pindahTanamId", build: (v) => ({ relation: [{ id: String(v) }] }), optional: true },
    { mappingKey: "labaRugi", dataKey: "labaRugiId", build: (v) => ({ relation: [{ id: String(v) }] }), optional: true },
  ],
  expenses: [
    { mappingKey: "pengeluaran", build: (v) => ({ title: [{ text: { content: String(v ?? "") } }] }) },
    { mappingKey: "qty", build: (v) => ({ number: Number(v ?? 0) }) },
    { mappingKey: "hargaPerPcs", build: (v) => ({ number: Number(v ?? 0) }) },
    { mappingKey: "date", build: (v) => ({ date: { start: String(v) } }) },
    { mappingKey: "kategori", dataKey: "kategoriId", build: (v) => ({ relation: [{ id: String(v) }] }), optional: true },
    { mappingKey: "labaRugi", dataKey: "areaId", build: (v) => ({ relation: [{ id: String(v) }] }), optional: true },
  ],
  
  // ✨ TAMBAHAN 2: Mapping untuk Modul Agronomy (Persiapan Sync)
  perawatan: [
    { mappingKey: "kegiatan", build: (v) => ({ title: [{ text: { content: String(v ?? "") } }] }) },
    { mappingKey: "tanggal", build: (v) => ({ date: { start: String(v) } }) },
    { mappingKey: "areaId", build: (v) => ({ relation: [{ id: String(v) }] }), optional: true },
    { mappingKey: "tags", build: (v) => ({ select: { name: String(v) } }), optional: true },
    { mappingKey: "petugasId", build: (v) => ({ relation: [{ id: String(v) }] }), optional: true },
  ],
  inspeksi: [
    { mappingKey: "kegiatan", build: (v) => ({ title: [{ text: { content: String(v ?? "") } }] }) },
    { mappingKey: "tanggal", build: (v) => ({ date: { start: String(v) } }) },
    { mappingKey: "areaId", build: (v) => ({ relation: [{ id: String(v) }] }), optional: true },
    { mappingKey: "hama", build: (v) => ({ multi_select: (Array.isArray(v) ? v : []).map(x => ({ name: String(x) })) }), optional: true },
    { mappingKey: "penyakit", build: (v) => ({ multi_select: (Array.isArray(v) ? v : []).map(x => ({ name: String(x) })) }), optional: true },
    { mappingKey: "tingkatSerangan", build: (v) => ({ number: Number(v ?? 0) }), optional: true },
    { mappingKey: "radius", build: (v) => ({ number: Number(v ?? 0) }), optional: true },
    { mappingKey: "phTanah", build: (v) => ({ number: Number(v ?? 0) }), optional: true },
    { mappingKey: "petugasId", build: (v) => ({ relation: [{ id: String(v) }] }), optional: true },
  ],
};

function buildNotionProperties(
  databaseType: string,
  data: Record<string, unknown>,
  mappings: FieldMappingData | undefined,
): Record<string, unknown> {
  const specs = DB_FIELD_SPECS[databaseType];
  if (!specs || !mappings) return {};

  const props: Record<string, unknown> = {};

  for (const spec of specs) {
    const mapping = mappings[spec.mappingKey];
    if (!mapping) continue; 

    const value = data[spec.dataKey ?? spec.mappingKey];
    if (spec.optional && (value === undefined || value === null || value === "")) {
      continue;
    }
    const notionKey = decodePropertyId(mapping.propertyId);
    props[notionKey] = spec.build(value);
  }
  return props;
}

// ---- Routes -----------------------------------------------------------------

// POST /api/staging/save (Logic Lama - Utuh)
router.post("/staging/save", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { databaseType, data } = req.body as { databaseType?: string; data?: Record<string, unknown>; };
  if (!databaseType || !data || typeof data !== "object") {
    res.status(400).json({ error: "Field 'databaseType' dan 'data' diperlukan." });
    return;
  }
  const [record] = await db.insert(stagingDataTable).values({ userId, databaseType, data, status: "pending" }).returning();
  req.log.info({ userId, databaseType, stagingId: record.id }, "Staging: data saved");
  res.status(201).json({ success: true, stagingId: record.id, status: "pending" });
});

// GET /api/staging/list (Logic Lama - Utuh)
router.get("/staging/list", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const records = await db.select().from(stagingDataTable).where(and(eq(stagingDataTable.userId, userId), eq(stagingDataTable.status, "pending")));
  res.json({ records });
});

// POST /api/staging/sync (Logic Lama - Utuh)
router.post("/staging/sync", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;
    const pendingRecords = await db.select().from(stagingDataTable).where(and(eq(stagingDataTable.userId, userId), eq(stagingDataTable.status, "pending")));
    if (pendingRecords.length === 0) {
      res.json({ success: true, synced: 0, failed: 0, message: "Tidak ada data pending." });
      return;
    }
    let synced = 0; let failed = 0; const errors: Array<{ stagingId: string; error: string }> = [];
    for (const record of pendingRecords) {
      try {
        const databaseId = await resolveNotionDatabaseId(userId, accessToken, record.databaseType);
        if (!databaseId) {
          const errMsg = `Database '${record.databaseType}' tidak ditemukan di Notion.`;
          await db.update(stagingDataTable).set({ status: "failed", errorMessage: errMsg }).where(eq(stagingDataTable.id, record.id));
          failed++; errors.push({ stagingId: record.id, error: errMsg }); continue;
        }
        const mappingRow = await getMappingRow(userId, record.databaseType);
        const mappings = mappingRow?.mappings as FieldMappingData | undefined;
        const properties = buildNotionProperties(record.databaseType, record.data, mappings);
        const response = await notionFetch(userId, accessToken, "https://api.notion.com/v1/pages", {
          method: "POST", body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
        });
        if (!response.ok) {
          const errText = await response.text();
          const errMsg = `Notion error: ${errText.slice(0, 255)}`;
          await db.update(stagingDataTable).set({ status: "failed", errorMessage: errMsg }).where(eq(stagingDataTable.id, record.id));
          failed++; errors.push({ stagingId: record.id, error: errMsg }); continue;
        }
        const created = await response.json() as { id: string };
        await db.update(stagingDataTable).set({ status: "synced", errorMessage: null, createdAt: new Date() }).where(eq(stagingDataTable.id, record.id));
        req.log.info({ userId, stagingId: record.id, notionPageId: created.id }, "Staging: synced to Notion");
        synced++;
      } catch (err) {
        if (err instanceof NotionTokenInvalidError) throw err;
        const errMsg = err instanceof Error ? err.message.slice(0, 255) : "Kesalahan tidak terduga.";
        await db.update(stagingDataTable).set({ status: "failed", errorMessage: errMsg }).where(eq(stagingDataTable.id, record.id));
        failed++; errors.push({ stagingId: record.id, error: errMsg });
      }
    }
    if (synced > 0) {
      req.log.info({ userId, synced }, "Staging: Sync kelar, Cache dipertahankan.");
    }
    res.json({ success: true, synced, failed, errors });
  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    throw err;
  }
});

// DELETE /api/staging/clean-old-data (Logic Lama - Utuh)
router.delete("/staging/clean-old-data", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const deletedCount = await purgeOldStagingData(userId);
  req.log.info({ userId, deletedCount }, "Staging: manual clean-old-data triggered");
  res.json({ success: true, deletedCount, message: `${deletedCount} record lama berhasil dihapus.` });
});


// ============================================================================
// ✨ TAMBAHAN 3: ENDPOINT KHUSUS AGRONOMI (LOGIKA MULTI-BLOK & SPLIT)
// ============================================================================

// POST /api/staging/perawatan/save
router.post("/staging/perawatan/save", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { areaIds, kegiatan, tanggal, logProduk, tags, petugasId } = req.body;

  // Validasi: areaIds harus berupa array dan tidak kosong
  if (!Array.isArray(areaIds) || areaIds.length === 0 || !kegiatan || !tanggal) {
    res.status(400).json({ error: "areaIds (minimal 1), kegiatan, dan tanggal wajib diisi." });
    return;
  }

  try {
    // 🔄 LOGIKA MULTI-BLOK: Pecah array areaIds jadi baris terpisah
    const rowsToInsert = areaIds.map((areaId) => ({
      areaId: String(areaId),
      kegiatan: String(kegiatan),
      tanggal: String(tanggal),
      logProduk: logProduk || null, // Array JSON produk
      tags: tags ? String(tags) : null,
      petugasId: petugasId ? String(petugasId) : null,
      status: "pending",
    }));

    const records = await db.insert(stagingPerawatanTable).values(rowsToInsert).returning();
    req.log.info({ userId, count: records.length }, "Staging Perawatan: Multi-block data saved");
    
    res.status(201).json({ success: true, count: records.length, records });
  } catch (error) {
    req.log.error({ error }, "Error saving perawatan staging");
    res.status(500).json({ error: "Terjadi kesalahan internal server." });
  }
});

// POST /api/staging/inspeksi/save
router.post("/staging/inspeksi/save", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { areaId, kegiatan, tanggal, hama, penyakit, tingkatSerangan, radius, phTanah, petugasId } = req.body;

  if (!areaId || !kegiatan || !tanggal) {
    res.status(400).json({ error: "areaId, kegiatan, dan tanggal wajib diisi." });
    return;
  }

  try {
    const [record] = await db.insert(stagingInspeksiTable).values({
      areaId: String(areaId),
      kegiatan: String(kegiatan),
      tanggal: String(tanggal),
      hama: hama || null, // Array JSON hama
      penyakit: penyakit || null, // Array JSON penyakit
      tingkatSerangan: tingkatSerangan !== undefined ? Number(tingkatSerangan) : null,
      radius: radius !== undefined ? Number(radius) : null,
      phTanah: phTanah !== undefined ? Number(phTanah) : null,
      petugasId: petugasId ? String(petugasId) : null,
      status: "pending",
    }).returning();

    req.log.info({ userId, stagingId: record.id }, "Staging Inspeksi: data saved");
    res.status(201).json({ success: true, record });
  } catch (error) {
    req.log.error({ error }, "Error saving inspeksi staging");
    res.status(500).json({ error: "Terjadi kesalahan internal server." });
  }
});

export default router;
