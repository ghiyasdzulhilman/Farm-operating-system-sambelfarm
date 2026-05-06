import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, notionConnectionsTable, fieldMappingsTable, type FieldMappingData } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { AddExpenseBody, GetDropdownOptionsResponse } from "@workspace/api-zod";

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

async function findDatabaseByName(accessToken: string, name: string): Promise<string | null> {
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
  const data = await response.json() as { results: NotionDatabase[] };
  const found = data.results.find((r) =>
    r.title?.some((t) => t.plain_text.toLowerCase().includes(name.toLowerCase()))
  );
  return found?.id ?? null;
}

async function queryAllPages(
  accessToken: string,
  databaseId: string,
): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({ page_size: 100 }),
  });
  if (!response.ok) return [];
  const data = await response.json() as { results: NotionPage[] };
  return data.results.map((page) => {
    const titleProp = Object.values(page.properties).find((p) => p.type === "title");
    const name = titleProp?.title?.[0]?.plain_text ?? "Tanpa Nama";
    return { id: page.id, name };
  });
}

// ---- Mapping helpers --------------------------------------------------------

async function getMapping(userId: string, databaseType: string): Promise<FieldMappingData | null> {
  const [row] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(
      eq(fieldMappingsTable.userId, userId),
      eq(fieldMappingsTable.databaseType, databaseType),
    ));
  return (row?.mappings as FieldMappingData) ?? null;
}

/** Returns property ID from mapping if set, otherwise returns the fallback name. */
function pk(mapping: FieldMappingData | null, field: string, fallback: string): string {
  return mapping?.[field]?.propertyId ?? fallback;
}

// ---- Routes -----------------------------------------------------------------

// GET /notion/dropdown-options
router.get("/notion/dropdown-options", async (req, res): Promise<void> => {
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

  const { accessToken } = connection;

  // Load saved mapping to get the linked database IDs for relation fields
  const mapping = await getMapping(userId, "expenses");

  // Use mapped relatedDatabaseId if available, otherwise fall back to name search
  const [kategoriDbId, labaRugiDbId] = await Promise.all([
    mapping?.kategori?.relatedDatabaseId
      ? Promise.resolve(mapping.kategori.relatedDatabaseId)
      : findDatabaseByName(accessToken, "Kategori Pengeluaran"),
    mapping?.area?.relatedDatabaseId
      ? Promise.resolve(mapping.area.relatedDatabaseId)
      : findDatabaseByName(accessToken, "Laba Rugi"),
  ]);

  const [categories, areas] = await Promise.all([
    kategoriDbId ? queryAllPages(accessToken, kategoriDbId) : Promise.resolve([]),
    labaRugiDbId ? queryAllPages(accessToken, labaRugiDbId) : Promise.resolve([]),
  ]);

  const data = GetDropdownOptionsResponse.parse({ categories, areas });
  res.json(data);
});

// POST /notion/add-expense
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

  const { pengeluaran, date, qty, hargaPerPcs, kategoriId, areaId } = parsed.data;

  const [connection] = await db
    .select()
    .from(notionConnectionsTable)
    .where(eq(notionConnectionsTable.userId, userId));

  if (!connection) {
    res.status(404).json({ error: "Notion tidak terhubung." });
    return;
  }

  const { accessToken } = connection;

  // Load mapping for this user's expenses database
  const mapping = await getMapping(userId, "expenses");

  const expensesDbId = await findDatabaseByName(accessToken, "Expenses");
  if (!expensesDbId) {
    res.status(404).json({ error: "Database 'Expenses' tidak ditemukan di workspace Notion Anda." });
    return;
  }

  // Build Notion properties: use mapped property IDs when available, fall back to hardcoded names
  const notionBody = {
    parent: { database_id: expensesDbId },
    properties: {
      [pk(mapping, "pengeluaran", "Pengeluaran")]: {
        title: [{ text: { content: pengeluaran } }],
      },
      [pk(mapping, "qty", "Qty")]: {
        number: qty,
      },
      [pk(mapping, "hargaPerPcs", "Harga/pcs")]: {
        number: hargaPerPcs,
      },
      [pk(mapping, "date", "Date")]: {
        date: { start: date },
      },
      [pk(mapping, "kategori", "Kategori")]: {
        relation: [{ id: kategoriId }],
      },
      [pk(mapping, "area", "Area")]: {
        relation: [{ id: areaId }],
      },
    },
  };

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(notionBody),
  });

  if (!response.ok) {
    const errBody = await response.text();
    req.log.error({ statusCode: response.status, errBody }, "Notion rejected add-expense");
    let userMessage = "Gagal menyimpan pengeluaran ke Notion.";
    try {
      const errParsed = JSON.parse(errBody) as { message?: string };
      if (errParsed.message) userMessage = `Notion: ${errParsed.message}`;
    } catch {
      // keep default
    }
    res.status(400).json({ error: userMessage });
    return;
  }

  const created = await response.json() as { id: string };
  req.log.info({ userId, pageId: created.id }, "Expense created in Notion");

  res.status(201).json({ success: true, pageId: created.id });
});

export default router;
