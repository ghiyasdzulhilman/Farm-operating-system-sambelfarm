import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, notionConnectionsTable, fieldMappingsTable, type FieldMappingData } from "@workspace/db";
import { eq, and } from "drizzle-orm";
// Note: Kalau API-Zod error gara-gara tipe data baru, bypass aja dulu atau update Zod schema-nya nanti
import { SaveFieldMappingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

// ---- Allowed database types (DI-UPGRADE UNTUK ARSITEKTUR SAMBELFARM) ----
const VALID_DB_TYPES = new Set([
  "panen",
  "expenses",
  "laba_rugi",
  "pindah_tanam",
  "inspeksi",
  "pekerja",
  "riwayat_perawatan_a",
  "riwayat_perawatan_b",
  "riwayat_perawatan_c",
  "riwayat_perawatan_gh",
  "pupuk_master",
  "pupuk_berat",
  "pupuk_kombinasi"
]);

// Default names for backward-compat name search (anchor penamaan default)
const DEFAULT_DB_NAMES: Record<string, string> = {
  panen: "Panen",
  expenses: "Expenses",
  laba_rugi: "Laba Rugi",
  pindah_tanam: "Pindah tanam",
  inspeksi: "Inspeksi tanaman",
  pekerja: "Data pekerja",
  riwayat_perawatan_a: "Riwayat Perawatan Blok A",
  riwayat_perawatan_b: "Riwayat Perawatan Blok B",
  riwayat_perawatan_c: "Riwayat Perawatan Blok C",
  riwayat_perawatan_gh: "Riwayat Perawatan Greenhouse",
  pupuk_master: "Master data",
  pupuk_berat: "kalkulator pupuk/berat",
  pupuk_kombinasi: "kombinasi pupuk"
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

async function searchAllDatabases(accessToken: string): Promise<NotionSearchDatabase[]> {
  const all: NotionSearchDatabase[] = [];
  let startCursor: string | undefined;

  do {
    const body: Record<string, unknown> = {
      filter: { value: "database", property: "object" },
      page_size: 100,
    };
    if (startCursor) body.start_cursor = startCursor;

    const response = await fetch("https://api.notion.com/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
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
  } while (true);

  return all;
}

async function findDatabaseIdByName(accessToken: string, name: string): Promise<string | null> {
  const results = await searchAllDatabases(accessToken);
  const found = results.find((r) =>
    r.title?.some((t) => t.plain_text.toLowerCase().includes(name.toLowerCase())),
  );
  return found?.id ?? null;
}

async function retrieveDatabase(
  accessToken: string,
  databaseId: string,
): Promise<NotionDatabaseRetrieveResponse | null> {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
    },
  });
  if (!response.ok) return null;
  return response.json() as Promise<NotionDatabaseRetrieveResponse>;
}

async function getSavedDatabaseId(
  userId: string,
  databaseType: string,
): Promise<string | null> {
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

  const [connection] = await db
    .select()
    .from(notionConnectionsTable)
    .where(eq(notionConnectionsTable.userId, userId));

  if (!connection) {
    res.status(404).json({ error: "Notion tidak terhubung." });
    return;
  }

  const raw = await searchAllDatabases(connection.accessToken);

  const databases = raw.map((db) => ({
    id: db.id,
    name: db.title?.map((t) => t.plain_text).join("") || "(Tanpa Nama)",
    iconEmoji: db.icon?.type === "emoji" ? (db.icon.emoji ?? null) : null,
  })).sort((a, b) => a.name.localeCompare(b.name));

  req.log.info({ userId, count: databases.length }, "Listed Notion databases");

  res.json({ databases });
});

// GET /notion/inspect-database?type=...
router.get("/notion/inspect-database", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const dbType = req.query.type as string;
  // FIX KRUSIAL: Hapus blokir untuk laba_rugi
  if (!VALID_DB_TYPES.has(dbType)) {
    res.status(400).json({ error: "Parameter 'type' database tidak dikenali oleh sistem Sambel Farm." });
    return;
  }

  const [connection] = await db
    .select()
    .from(notionConnectionsTable)
    .where(eq(notionConnectionsTable.userId, userId));

  if (!connection) {
    res.status(404).json({ error: "Notion tidak terhubung." });
    return;
  }

  const { accessToken } = connection;

  const explicitId = req.query.databaseId as string | undefined;
  const savedId = !explicitId ? await getSavedDatabaseId(userId, dbType) : null;
  const fallbackName = DEFAULT_DB_NAMES[dbType];

  const resolvedId =
    explicitId ||
    savedId ||
    (await findDatabaseIdByName(accessToken, fallbackName));

  if (!resolvedId) {
    res.status(404).json({
      error: `Database tidak ditemukan. Pilih database terlebih dahulu di bagian 'Pilih Database'.`,
    });
    return;
  }

  const database = await retrieveDatabase(accessToken, resolvedId);
  if (!database) {
    res.status(404).json({
      error: `Gagal mengambil detail database dari Notion. Pastikan database masih ada dan integrasi memiliki akses.`,
    });
    return;
  }

  const databaseName = database.title?.[0]?.plain_text ?? fallbackName;

  // FIX KRUSIAL: Filter formula dan rollup dihapus supaya bisa di-mapping!
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

  const parsed = SaveFieldMappingsBody.safeParse(req.body);
  if (!parsed.success) {
    // Kalau strict Zod bikin error pas lu save data, lu bisa pertimbangkan bypass safeParse ini nanti
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { databaseType, notionDatabaseId, mappings } = parsed.data;

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
