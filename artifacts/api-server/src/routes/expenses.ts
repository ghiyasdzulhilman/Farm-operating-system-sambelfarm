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

interface MappingRow {
  notionDatabaseId: string | null;
  mappings: FieldMappingData;
}

async function getMappingRow(userId: string, databaseType: string): Promise<MappingRow | null> {
  const [row] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(
      eq(fieldMappingsTable.userId, userId),
      eq(fieldMappingsTable.databaseType, databaseType),
    ));
  if (!row) return null;
  return {
    notionDatabaseId: row.notionDatabaseId ?? null,
    mappings: (row.mappings as FieldMappingData) ?? {},
  };
}

/** Returns property ID from mapping if set, otherwise returns the fallback name. */
function pk(mappings: FieldMappingData | undefined, field: string, fallback: string): string {
  return mappings?.[field]?.propertyId ?? fallback;
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

  // Load saved mapping — includes notionDatabaseId + property mappings
  const mappingRow = await getMappingRow(userId, "expenses");
  const mappings = mappingRow?.mappings;

  // Resolve dropdown databases:
  // 1. Use relatedDatabaseId from mapping (most accurate)
  // 2. Fall back to name search
  const [kategoriDbId, areaDbId] = await Promise.all([
    mappings?.kategori?.relatedDatabaseId
      ? Promise.resolve(mappings.kategori.relatedDatabaseId)
      : findDatabaseByName(accessToken, "Kategori Pengeluaran"),
    mappings?.area?.relatedDatabaseId
      ? Promise.resolve(mappings.area.relatedDatabaseId)
      : findDatabaseByName(accessToken, "Laba Rugi"),
  ]);

  req.log.info({ userId, kategoriDbId, areaDbId }, "Expenses dropdown options resolved");

  const [categories, areas] = await Promise.all([
    kategoriDbId ? queryAllPages(accessToken, kategoriDbId) : Promise.resolve([]),
    areaDbId ? queryAllPages(accessToken, areaDbId) : Promise.resolve([]),
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

  // Load full mapping row — includes notionDatabaseId + property mappings
  const mappingRow = await getMappingRow(userId, "expenses");
  const mappings = mappingRow?.mappings;

  // Use stored notionDatabaseId if available, otherwise fall back to name search
  const expensesDbId =
    mappingRow?.notionDatabaseId ||
    (await findDatabaseByName(accessToken, "Expenses"));

  req.log.info(
    { userId, expensesDbId, usingStoredId: !!mappingRow?.notionDatabaseId },
    "Add expense: resolved Expenses database ID",
  );

  if (!expensesDbId) {
    res.status(404).json({ error: "Database 'Expenses' tidak ditemukan. Pilih database di halaman Pengaturan." });
    return;
  }

  // Build Notion properties: use mapped property IDs when available, fall back to hardcoded names
  const notionBody = {
    parent: { database_id: expensesDbId },
    properties: {
      [pk(mappings, "pengeluaran", "Pengeluaran")]: {
        title: [{ text: { content: pengeluaran } }],
      },
      [pk(mappings, "qty", "Qty")]: {
        number: qty,
      },
      [pk(mappings, "hargaPerPcs", "Harga/pcs")]: {
        number: hargaPerPcs,
      },
      [pk(mappings, "date", "Date")]: {
        date: { start: date },
      },
      [pk(mappings, "kategori", "Kategori")]: {
        relation: [{ id: kategoriId }],
      },
      [pk(mappings, "area", "Area")]: {
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
    } catch { /* keep default */ }
    res.status(400).json({ error: userMessage });
    return;
  }

  const created = await response.json() as { id: string };
  req.log.info({ userId, pageId: created.id }, "Expense created in Notion");

  res.status(201).json({ success: true, pageId: created.id });
});

export default router;
