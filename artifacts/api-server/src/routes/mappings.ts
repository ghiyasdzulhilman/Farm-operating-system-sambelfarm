import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, notionConnectionsTable, fieldMappingsTable, type FieldMappingData } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { SaveFieldMappingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

// ---- Allowed database types -------------------------------------------------

const VALID_DB_TYPES = new Set(["panen", "expenses", "laba_rugi"]);

// Default names for backward-compat name search (used only when no saved DB ID)
const DEFAULT_DB_NAMES: Record<string, string> = {
  panen: "Panen",
  expenses: "Expenses",
  laba_rugi: "Laba Rugi",
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

// GET /notion/inspect-database?type=panen|expenses&databaseId=xxx
router.get("/notion/inspect-database", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const dbType = req.query.type as string;
  if (!VALID_DB_TYPES.has(dbType) || dbType === "laba_rugi") {
    res.status(400).json({ error: "Parameter 'type' harus 'panen' atau 'expenses'." });
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

  // Resolution order: 1) explicit databaseId param, 2) saved mapping, 3) name search
  const explicitId = req.query.databaseId as string | undefined;
  const savedId = !explicitId ? await getSavedDatabaseId(userId, dbType) : null;
  const fallbackName = DEFAULT_DB_NAMES[dbType];

  const resolvedId =
    explicitId ||
    savedId ||
    (await findDatabaseIdByName(accessToken, fallbackName));

  req.log.info(
    { userId, dbType, explicitId, savedId, resolvedId },
    "Resolving database for inspection",
  );

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

  const properties = Object.values(database.properties)
    .filter((p) => p.type !== "formula" && p.type !== "rollup")
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

  req.log.info({ userId, resolvedId, databaseName, count: properties.length }, "Database inspected");

  res.json({ databaseId: resolvedId, databaseName, properties });
});

// GET /notion/field-mappings?type=panen|expenses|laba_rugi
router.get("/notion/field-mappings", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const dbType = req.query.type as string;
  if (!VALID_DB_TYPES.has(dbType)) {
    res.status(400).json({ error: "Parameter 'type' harus 'panen', 'expenses', atau 'laba_rugi'." });
    return;
  }

  const [row] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(
      eq(fieldMappingsTable.userId, userId),
      eq(fieldMappingsTable.databaseType, dbType),
    ));

  req.log.info(
    { userId, dbType, notionDatabaseId: row?.notionDatabaseId ?? null },
    "Field mappings retrieved",
  );

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
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { databaseType, notionDatabaseId, mappings } = parsed.data;

  if (!VALID_DB_TYPES.has(databaseType)) {
    res.status(400).json({ error: "databaseType harus 'panen', 'expenses', atau 'laba_rugi'." });
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

  req.log.info(
    { userId, databaseType, notionDatabaseId, fieldCount: Object.keys(mappings).length },
    "Field mappings saved",
  );

  res.json({ success: true });
});

export default router;
