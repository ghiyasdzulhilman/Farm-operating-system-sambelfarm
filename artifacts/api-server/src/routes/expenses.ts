import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, fieldMappingsTable, stagingDataTable, type FieldMappingData } from "@workspace/db"; // Tambahkan stagingDataTable
import { eq, and } from "drizzle-orm";
import { AddExpenseBody, GetDropdownOptionsResponse } from "@workspace/api-zod";
import {
  getNotionConnection,
  notionFetch,
  handleNotionErrors,
  NotionTokenInvalidError,
} from "../lib/notionClient";
import { myCache } from "../lib/notionCache"; // Import cache buat bersih-bersih

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

// GET /notion/dropdown-options (Tetap sama karena butuh data live dari Notion)
router.get("/notion/dropdown-options", async (req, res): Promise<void> => {
  // ... (Kode dropdown tidak berubah karena butuh data relasi terkini)
});

// POST /notion/add-expense (DI-UPGRADE KE STAGING)
router.post("/notion/add-expense", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = AddExpenseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    // 1. SIMPAN KE STAGING (DATABASE INTERNAL)
    // Kita tidak perlu menunggu Notion. Simpan mentahnya saja dulu.
    await db.insert(stagingDataTable).values({
      userId,
      databaseType: "expenses", // Kategori data
      data: parsed.data,        // Data mentah dari form
      status: "pending",        // Status awal
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    req.log.info({ userId }, "Expense saved to Staging Area");

    // 2. BERSIHKAN CACHE DASHBOARD
    // Supaya pas dashboard dipanggil lagi, dia "ngeh" ada data pending baru
    myCache.del(`notion_dashboard_${userId}`);

    // 3. LANGSUNG KASIH RESPONSE SUKSES
    // User tidak perlu nunggu Notion API yang lambat
    res.status(201).json({ 
      success: true, 
      message: "Data tersimpan di antrean (Staging).",
      isStaging: true 
    });

  } catch (err) {
    req.log.error({ err, userId }, "Failed to save to staging");
    res.status(500).json({ error: "Gagal menyimpan ke antrean data internal." });
  }
});

export default router;
