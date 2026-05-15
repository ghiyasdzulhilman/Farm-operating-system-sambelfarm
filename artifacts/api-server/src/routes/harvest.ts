import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, fieldMappingsTable, stagingDataTable, type FieldMappingData } from "@workspace/db"; // Tambah stagingDataTable
import { eq, and } from "drizzle-orm";
import { AddHarvestBody, GetHarvestDropdownOptionsResponse } from "@workspace/api-zod";
import {
  getNotionConnection,
  notionFetch,
  handleNotionErrors,
  NotionTokenInvalidError,
} from "../lib/notionClient";
import { notionCache } from "../lib/notionCache";

const router: IRouter = Router();

// ... (Helper NotionPage, NotionDatabase, findDatabaseByName, queryAllPages tetap sama)

// ---- Mapping helpers (Tetap sama) --------------------------------------------------------
async function getMappingRow(userId: string, databaseType: string) {
  const [row] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(
      eq(fieldMappingsTable.userId, userId),
      eq(fieldMappingsTable.databaseType, databaseType),
    ));
  return row;
}

// ---- Routes -----------------------------------------------------------------

// GET /notion/harvest-dropdown-options (Tetap butuh data live Notion untuk pilihan dropdown)
router.get("/notion/harvest-dropdown-options", async (req, res): Promise<void> => {
  // ... (Kode dropdown tidak berubah)
});

// POST /notion/add-harvest (DI-UPGRADE KE STAGING)
router.post("/notion/add-harvest", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = AddHarvestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    // 1. SIAPKAN DATA (Pastikan tanggal ikut terbawa)
    const payload = {
      ...parsed.data,
      tanggal: req.body.tanggal || new Date().toISOString().split('T')[0]
    };

    // 2. SIMPAN KE STAGING (DATABASE INTERNAL)
    // Proses ini super cepat, tidak perlu nunggu antrean Notion API
    await db.insert(stagingDataTable).values({
      userId,
      databaseType: "panen", // Kategori panen
      data: payload,         // Simpan mentah sesuai skema form
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    req.log.info({ userId }, "Harvest data saved to Staging Area");

    // 3. BERSIHKAN CACHE DASHBOARD
    // Supaya dashboard langsung "ngeh" ada tambahan kg panen dari staging
    notionCache.del(`notion_dashboard_${userId}`);

    // 4. RESPONSE INSTAN
    res.status(201).json({ 
      success: true, 
      message: "Data panen masuk antrean staging.",
      isStaging: true 
    });

  } catch (err) {
    req.log.error({ err, userId }, "Failed to save harvest to staging");
    res.status(500).json({ error: "Gagal menyimpan data panen ke database internal." });
  }
});

export default router;
