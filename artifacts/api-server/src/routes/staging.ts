import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, stagingDataTable, fieldMappingsTable } from "@workspace/db";
import { and, eq, lt } from "drizzle-orm";
import {
  getNotionConnection,
  notionFetch,
  handleNotionErrors,
  NotionTokenInvalidError,
} from "../lib/notionClient";
import { purgeOldStagingData } from "../lib/autoPurge";
import type { FieldMappingData } from "@workspace/db";

const router: IRouter = Router();

// ---- Helpers ----------------------------------------------------------------

function pk(mappings: FieldMappingData | undefined, field: string, fallback: string): string {
  return mappings?.[field]?.propertyId ?? fallback;
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

function buildNotionProperties(
  databaseType: string,
  data: Record<string, unknown>,
  mappings: FieldMappingData | undefined,
): Record<string, unknown> {
  if (databaseType === "panen") {
    const props: Record<string, unknown> = {
      [pk(mappings, "kegiatan", "Kegiatan")]: {
        title: [{ text: { content: String(data.kegiatan ?? "") } }],
      },
      [pk(mappings, "jumlahPanen", "Jumlah Panen (kg)")]: { number: Number(data.jumlahPanen ?? 0) },
      [pk(mappings, "hargaJualPerKg", "Harga Jual per Kg")]: { number: Number(data.hargaJualPerKg ?? 0) },
      [pk(mappings, "kualitas", "Kualitas")]: { select: { name: String(data.kualitas ?? "") } },
      [pk(mappings, "channelPenjualan", "Channel Penjualan")]: {
        select: { name: String(data.channelPenjualan ?? "") },
      },
    };
    if (data.tanggal) {
      props[pk(mappings, "tanggal", "Tanggal")] = { date: { start: String(data.tanggal) } };
    }
    if (data.pindahTanamId) {
      props[pk(mappings, "areaPindahTanam", "Area Pindah Tanam")] = {
        relation: [{ id: String(data.pindahTanamId) }],
      };
    }
    if (data.labaRugiId) {
      props[pk(mappings, "labaRugi", "Area Laba Rugi")] = {
        relation: [{ id: String(data.labaRugiId) }],
      };
    }
    return props;
  }

  if (databaseType === "expenses") {
    const props: Record<string, unknown> = {
      [pk(mappings, "pengeluaran", "Pengeluaran")]: {
        title: [{ text: { content: String(data.pengeluaran ?? "") } }],
      },
      [pk(mappings, "qty", "Qty")]: { number: Number(data.qty ?? 0) },
      [pk(mappings, "hargaPerPcs", "Harga/pcs")]: { number: Number(data.hargaPerPcs ?? 0) },
      [pk(mappings, "date", "Date")]: { date: { start: String(data.date ?? "") } },
    };
    if (data.kategoriId) {
      props[pk(mappings, "kategori", "Kategori")] = {
        relation: [{ id: String(data.kategoriId) }],
      };
    }
    if (data.areaId) {
      props[pk(mappings, "labaRugi", "Area Laba Rugi")] = {
        relation: [{ id: String(data.areaId) }],
      };
    }
    return props;
  }

  return {};
}

// ---- Routes -----------------------------------------------------------------

// POST /api/staging/save
router.post("/staging/save", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { databaseType, data } = req.body as {
    databaseType?: string;
    data?: Record<string, unknown>;
  };

  if (!databaseType || !data || typeof data !== "object") {
    res.status(400).json({ error: "Field 'databaseType' dan 'data' diperlukan." });
    return;
  }

  const [record] = await db
    .insert(stagingDataTable)
    .values({ userId, databaseType, data, status: "pending" })
    .returning();

  req.log.info({ userId, databaseType, stagingId: record.id }, "Staging: data saved");

  res.status(201).json({ success: true, stagingId: record.id, status: "pending" });
});

// GET /api/staging/list  — returns only 'pending' records for this user
router.get("/staging/list", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const records = await db
    .select()
    .from(stagingDataTable)
    .where(and(
      eq(stagingDataTable.userId, userId),
      eq(stagingDataTable.status, "pending"),
    ));

  res.json({ records });
});

// POST /api/staging/sync
router.post("/staging/sync", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;

    const pendingRecords = await db
      .select()
      .from(stagingDataTable)
      .where(and(
        eq(stagingDataTable.userId, userId),
        eq(stagingDataTable.status, "pending"),
      ));

    if (pendingRecords.length === 0) {
      res.json({ success: true, synced: 0, failed: 0, message: "Tidak ada data pending." });
      return;
    }

    let synced = 0;
    let failed = 0;
    const errors: Array<{ stagingId: string; error: string }> = [];

    for (const record of pendingRecords) {
      try {
        const databaseId = await resolveNotionDatabaseId(userId, accessToken, record.databaseType);

        if (!databaseId) {
          const errMsg = `Database '${record.databaseType}' tidak ditemukan di Notion.`;
          await db
            .update(stagingDataTable)
            .set({ status: "failed", errorMessage: errMsg })
            .where(eq(stagingDataTable.id, record.id));
          failed++;
          errors.push({ stagingId: record.id, error: errMsg });
          continue;
        }

        const mappingRow = await getMappingRow(userId, record.databaseType);
        const mappings = mappingRow?.mappings as FieldMappingData | undefined;
        const properties = buildNotionProperties(record.databaseType, record.data, mappings);

        const response = await notionFetch(userId, accessToken, "https://api.notion.com/v1/pages", {
          method: "POST",
          body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
        });

        if (!response.ok) {
          const errText = await response.text();
          const errMsg = `Notion error: ${errText.slice(0, 255)}`;
          await db
            .update(stagingDataTable)
            .set({ status: "failed", errorMessage: errMsg })
            .where(eq(stagingDataTable.id, record.id));
          failed++;
          errors.push({ stagingId: record.id, error: errMsg });
          continue;
        }

        const created = await response.json() as { id: string };
        await db
          .update(stagingDataTable)
          .set({ status: "synced", errorMessage: null })
          .where(eq(stagingDataTable.id, record.id));

        req.log.info({ userId, stagingId: record.id, notionPageId: created.id }, "Staging: synced to Notion");
        synced++;
      } catch (err) {
        if (err instanceof NotionTokenInvalidError) throw err;
        const errMsg = err instanceof Error ? err.message.slice(0, 255) : "Kesalahan tidak terduga.";
        await db
          .update(stagingDataTable)
          .set({ status: "failed", errorMessage: errMsg })
          .where(eq(stagingDataTable.id, record.id));
        failed++;
        errors.push({ stagingId: record.id, error: errMsg });
      }
    }

    res.json({ success: true, synced, failed, errors });
  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    throw err;
  }
});

// DELETE /api/staging/clean-old-data
router.delete("/staging/clean-old-data", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const deletedCount = await purgeOldStagingData(userId);

  req.log.info({ userId, deletedCount }, "Staging: manual clean-old-data triggered");

  res.json({
    success: true,
    deletedCount,
    message: `${deletedCount} record lama berhasil dihapus.`,
  });
});

export default router;
