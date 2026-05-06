import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, notionConnectionsTable, fieldMappingsTable, type FieldMappingData } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { SaveFieldMappingsBody } from "@workspace/api-zod";

const router: IRouter = Router();

// ---- Notion database types ------------------------------------------------

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

interface NotionSearchDatabase {
  id: string;
  title?: Array<{ plain_text: string }>;
}

// ---- Helpers ----------------------------------------------------------------

const DATABASE_NAMES: Record<string, string> = {
  panen: "Panen",
  expenses: "Expenses",
};

async function findDatabaseIdByName(
  accessToken: string,
  name: string,
): Promise<string | null> {
  const response = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      query: name,
      filter: { value: "database", property: "object" },
    }),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { results: NotionSearchDatabase[] };
  const found = data.results.find((r) =>
    r.title?.some((t) => t.plain_text.toLowerCase().includes(name.toLowerCase())),
  );
  return found?.id ?? null;
}

async function retrieveDatabase(
  accessToken: string,
  databaseId: string,
): Promise<NotionDatabaseRetrieveResponse | null> {
  const response = await fetch(
    `https://api.notion.com/v1/databases/${databaseId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Notion-Version": "2022-06-28",
      },
    },
  );
  if (!response.ok) return null;
  return response.json() as Promise<NotionDatabaseRetrieveResponse>;
}

// ---- Routes -----------------------------------------------------------------

// GET /notion/inspect-database?type=panen|expenses
router.get("/notion/inspect-database", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const dbType = req.query.type as string;
  const dbName = DATABASE_NAMES[dbType];
  if (!dbName) {
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

  const databaseId = await findDatabaseIdByName(accessToken, dbName);
  if (!databaseId) {
    res.status(404).json({
      error: `Database '${dbName}' tidak ditemukan di workspace Notion Anda.`,
    });
    return;
  }

  const database = await retrieveDatabase(accessToken, databaseId);
  if (!database) {
    res.status(404).json({ error: `Gagal mengambil detail database '${dbName}'.` });
    return;
  }

  const databaseName =
    database.title?.[0]?.plain_text ?? dbName;

  // Map Notion property object to our simplified format
  const properties = Object.values(database.properties)
    .filter((p) => p.type !== "formula" && p.type !== "rollup")
    .map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      relatedDatabaseId: p.relation?.database_id ?? null,
    }))
    .sort((a, b) => {
      // Show title first, then alphabetically
      if (a.type === "title") return -1;
      if (b.type === "title") return 1;
      return a.name.localeCompare(b.name);
    });

  req.log.info({ userId, databaseId, count: properties.length }, "Database inspected");

  res.json({ databaseId, databaseName, properties });
});

// GET /notion/field-mappings?type=panen|expenses
router.get("/notion/field-mappings", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const dbType = req.query.type as string;
  if (!DATABASE_NAMES[dbType]) {
    res.status(400).json({ error: "Parameter 'type' harus 'panen' atau 'expenses'." });
    return;
  }

  const [row] = await db
    .select()
    .from(fieldMappingsTable)
    .where(
      and(
        eq(fieldMappingsTable.userId, userId),
        eq(fieldMappingsTable.databaseType, dbType),
      ),
    );

  res.json({
    databaseType: dbType,
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

  const { databaseType, mappings } = parsed.data;

  if (!DATABASE_NAMES[databaseType]) {
    res.status(400).json({ error: "databaseType harus 'panen' atau 'expenses'." });
    return;
  }

  await db
    .insert(fieldMappingsTable)
    .values({
      userId,
      databaseType,
      mappings: mappings as FieldMappingData,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [fieldMappingsTable.userId, fieldMappingsTable.databaseType],
      set: {
        mappings: mappings as FieldMappingData,
        updatedAt: new Date(),
      },
    });

  req.log.info({ userId, databaseType, fieldCount: Object.keys(mappings).length }, "Field mappings saved");

  res.json({ success: true });
});

export default router;
