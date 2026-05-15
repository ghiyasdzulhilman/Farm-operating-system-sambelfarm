import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, fieldMappingsTable, stagingDataTable, type FieldMappingData } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { AddHarvestBody, GetHarvestDropdownOptionsResponse } from "@workspace/api-zod";
import {
  getNotionConnection,
  notionFetch,
  handleNotionErrors,
  NotionTokenInvalidError,
} from "../lib/notionClient";
import { notionCache, delay } from "../lib/notionCache";

const router: IRouter = Router();

interface NotionPage {
  id: string;
  properties: Record<string, {
    type: string;
    title?: Array<{ plain_text: string }>;
    rich_text?: Array<{ plain_text: string }>;
  }>;
}

interface NotionDatabase {
  id: string;
  title?: Array<{ plain_text: string }>;
}

// ---- Notion helpers ---------------------------------------------------------

async function findDatabaseByName(userId: string, accessToken: string, name: string): Promise<string | null> {
  try {
    const response = await notionFetch(userId, accessToken, "https://api.notion.com/v1/search", {
      method: "POST",
      body: JSON.stringify({
        query: name,
        filter: { value: "database", property: "object" },
      }),
    });
    if (!response.ok) return null;
    const data = await response.json() as { results: NotionDatabase[] };
    const found = data.results.find((r) =>
      r.title?.some((t) => t.plain_text.toLowerCase().includes(name.toLowerCase()))
    );
    return found?.id ?? null;
  } catch (err) {
    if (err instanceof NotionTokenInvalidError) throw err;
    return null;
  }
}

async function queryAllPages(userId: string, accessToken: string, databaseId: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const response = await notionFetch(userId, accessToken, `https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify({ page_size: 100 }),
    });
    if (!response.ok) return [];
    const data = await response.json() as { results: NotionPage[] };
    return data.results.map((page) => {
      const titleProp = Object.values(page.properties).find((p) => p.type === "title");
      const name = titleProp?.title?.[0]?.plain_text ?? "Tanpa Nama";
      return { id: page.id, name };
    });
  } catch (err) {
    if (err instanceof NotionTokenInvalidError) throw err;
    return [];
  }
}

async function getMappingRow(userId: string, databaseType: string) {
  const [row] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, databaseType)));
  return row;
}

// ---- Routes -----------------------------------------------------------------

router.get("/notion/harvest-dropdown-options", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;
    const mappingRow = await getMappingRow(userId, "panen");
    const mappings = mappingRow?.mappings as FieldMappingData;

    const [pindahTanamDbId, labaRugiDbId] = await Promise.all([
      mappings?.areaPindahTanam?.relatedDatabaseId || findDatabaseByName(userId, accessToken, "Pindah Tanam"),
      mappings?.labaRugi?.relatedDatabaseId || findDatabaseByName(userId, accessToken, "Laba Rugi"),
    ]);

    const [pindahTanam, labaRugi] = await Promise.all([
      pindahTanamDbId ? queryAllPages(userId, accessToken, pindahTanamDbId) : Promise.resolve([]),
      labaRugiDbId ? queryAllPages(userId, accessToken, labaRugiDbId) : Promise.resolve([]),
    ]);

    res.json(GetHarvestDropdownOptionsResponse.parse({ pindahTanam, labaRugi }));
  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/notion/add-harvest", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const parsed = AddHarvestBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  try {
    const payload = { ...parsed.data, tanggal: req.body.tanggal || new Date().toISOString().split('T')[0] };
    await db.insert(stagingDataTable).values({
      userId,
      databaseType: "panen",
      data: payload,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    notionCache.del(`notion_dashboard_${userId}`);
    res.status(201).json({ success: true, isStaging: true });
  } catch (err) {
    res.status(500).json({ error: "Gagal simpan panen ke staging" });
  }
});

export default router;
