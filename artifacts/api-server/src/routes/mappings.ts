import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, fieldMappingsTable, type FieldMappingData } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { SaveFieldMappingsBody } from "@workspace/api-zod";
import {
  getNotionConnection,
  notionFetch,
  handleNotionErrors,
  NotionTokenInvalidError,
} from "../lib/notionClient";

const router: IRouter = Router();

// ---- Allowed database types (DI-UPGRADE UNTUK ARSITEKTUR SAMBELFARM) ----
const VALID_DB_TYPES = new Set([
  "panen",
  "expenses",
  "laba_rugi",
  "kategori",
  "pindah_tanam",
  "inspeksi",
  "pekerja",
  "perawatan",
  "operasional",
  "riwayat_perawatan_a",
  "riwayat_perawatan_b",
  "riwayat_perawatan_c",
  "riwayat_perawatan_gh",
  "pupuk_master",
  "pupuk_berat",
  "pupuk_kombinasi",
]);

// Default names for backward-compat name search (anchor penamaan default)
const DEFAULT_DB_NAMES: Record<string, string> = {
  panen: "Panen",
  expenses: "Expenses",
  laba_rugi: "Laba Rugi",
  kategori: "Kategori Pengeluaran",
  pindah_tanam: "Pindah tanam",
  inspeksi: "Inspeksi tanaman",
  pekerja: "Data pekerja",
  perawatan: "Riwayat Perawatan",
  operasional: "Operasional Kebun",
  riwayat_perawatan_a: "Riwayat Perawatan Blok A",
  riwayat_perawatan_b: "Riwayat Perawatan Blok B",
  riwayat_perawatan_c: "Riwayat Perawatan Blok C",
  riwayat_perawatan_gh: "Riwayat Perawatan Greenhouse",
  pupuk_master: "Master data",
  pupuk_berat: "kalkulator pupuk/berat",
  pupuk_kombinasi: "kombinasi pupuk",
};

// ---- Notion API types -------------------------------------------------------

interface NotionSearchDatabase {
  id: string;
  title?: Array<{ plain_text: string }>;
  icon?: { type: string; emoji?: string };
}

interface NotionDatabaseProperty {
  id: string;
  name: string;
  type: string;
  relation?: { database_id: string };
}

interface NotionDatabaseRetrieveResponse {
  id: string;
  title: Array<{ plain_text: string }>;
  properties: Record<string, NotionDatabaseProperty>;
}

// ---- Helpers ----------------------------------------------------------------

async function searchAllDatabases(
  userId: string,
  accessToken: string,
): Promise<NotionSearchDatabase[]> {
  const all: NotionSearchDatabase[] = [];
  let startCursor: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filter: { value: "database", property: "object" },
      page_size: 100,
    };
    if (startCursor) body.start_cursor = startCursor;

    try {
      const response = await notionFetch(userId, accessToken, "https://api.notion.com/v1/search", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!response.ok) break;

      const data = (await response.json()) as {
        results: NotionSearchDatabase[];
        has_more: boolean;
        next_cursor: string | null;
      };

      all.push(...data.results);

      if (data.has_more && data.next_cursor) {
        startCursor = data.next_cursor;
      } else {
        break;
      }
    } catch (err) {
      if (err instanceof NotionTokenInvalidError) throw err;
      break;
    }
  } while (true);

  return all;
}

async function findDatabaseIdByName(
  userId: string,
  accessToken: string,
  name: string,
): Promise<string | null> {
  const results = await searchAllDatabases(userId, accessToken);
  const found = results.find((r) =>
    r.title?.some((t) => t.plain_text.toLowerCase().includes(name.toLowerCase())),
  );
  return found?.id ?? null;
}

async function retrieveDatabase(
  userId: string,
  accessToken: string,
  databaseId: string,
): Promise<NotionDatabaseRetrieveResponse | null> {
  try {
    const response = await notionFetch(
      userId,
      accessToken,
      `https://api.notion.com/v1/databases/${databaseId}`,
      { method: "GET" },
    );
    if (!response.ok) return null;
    return response.json() as Promise<NotionDatabaseRetrieveResponse>;
  } catch (err) {
    if (err instanceof NotionTokenInvalidError) throw err;
    return null;
  }
}

async function getSavedDatabaseId(userId: string, databaseType: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(
      eq(fieldMappingsTable.userId, userId),
      eq(fieldMappingsTable.databaseType, databaseType),
    ));
  return row?.notionDatabaseId ?? null;
}

// ---- Routes -----------------------------------------------------------------

// GET /notion/list-databases
router.get("/notion/list-databases", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const connection = await getNotionConnection(userId);
    const raw = await searchAllDatabases(userId, connection.accessToken);

    const databases = raw
      .map((db) => ({
        id: db.id,
        name: db.title?.map((t) => t.plain_text).join("") || "(Tanpa Nama)",
        iconEmoji: db.icon?.type === "emoji" ? (db.icon.emoji ?? null) : null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    req.log.info({ userId, count: databases.length }, "Listed Notion databases");

    res.json({ databases });
  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    throw err;
  }
});

// GET /notion/inspect-database?type=...
router.get("/notion/inspect-database", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const dbType = req.query.type as string;
  if (!VALID_DB_TYPES.has(dbType)) {
    res.status(400).json({ error: "Parameter 'type' database tidak dikenali oleh sistem Sambel Farm." });
    return;
  }

  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;

    const explicitId = req.query.databaseId as string | undefined;
    const savedId = !explicitId ? await getSavedDatabaseId(userId, dbType) : null;
    const fallbackName = DEFAULT_DB_NAMES[dbType];

    const resolvedId =
      explicitId ||
      savedId ||
      (await findDatabaseIdByName(userId, accessToken, fallbackName));

    if (!resolvedId) {
      res.status(404).json({
        error: `Database tidak ditemukan. Pilih database terlebih dahulu di bagian 'Pilih Database'.`,
      });
      return;
    }

    const database = await retrieveDatabase(userId, accessToken, resolvedId);
    if (!database) {
      res.status(404).json({
        error: `Gagal mengambil detail database dari Notion. Pastikan database masih ada dan integrasi memiliki akses.`,
      });
      return;
    }

    const databaseName = database.title?.[0]?.plain_text ?? fallbackName;

    const properties = Object.values(database.properties)
      .map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        relatedDatabaseId: p.relation?.database_id ?? null,
      }))
      .sort((a, b) => {
        if (a.type === "title") return -1;
        if (b.type === "title") return 1;
        return a.name.localeCompare(b.name);
      });

    res.json({ databaseId: resolvedId, databaseName, properties });
  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    throw err;
  }
});

// GET /notion/field-mappings
router.get("/notion/field-mappings", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const dbType = req.query.type as string;
  if (!VALID_DB_TYPES.has(dbType)) {
    res.status(400).json({ error: "Parameter 'type' database tidak dikenali." });
    return;
  }

  const [row] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(
      eq(fieldMappingsTable.userId, userId),
      eq(fieldMappingsTable.databaseType, dbType),
    ));

  res.json({
    databaseType: dbType,
    notionDatabaseId: row?.notionDatabaseId ?? null,
    mappings: (row?.mappings ?? {}) as FieldMappingData,
  });
});

// POST /notion/field-mappings
router.post("/notion/field-mappings", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body;
  if (!body || !body.databaseType || !body.mappings) {
    res.status(400).json({ error: "Request tidak valid." });
    return;
  }

  const { databaseType, notionDatabaseId, mappings } = body;
console.log(
  "MAPPINGS DEBUG",
  JSON.stringify(mappings, null, 2)
);

  if (!VALID_DB_TYPES.has(databaseType)) {
    res.status(400).json({ error: "Tipe database tidak valid untuk ekosistem Sambel Farm." });
    return;
  }

  await db
    .insert(fieldMappingsTable)
    .values({
      userId,
      databaseType,
      notionDatabaseId: notionDatabaseId ?? null,
      mappings: mappings as FieldMappingData,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [fieldMappingsTable.userId, fieldMappingsTable.databaseType],
      set: {
        notionDatabaseId: notionDatabaseId ?? null,
        mappings: mappings as FieldMappingData,
        updatedAt: new Date(),
      },
    });

  res.json({ success: true });
});

export default router;
