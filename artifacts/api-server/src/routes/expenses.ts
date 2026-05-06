import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, notionConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

async function queryAllPages(accessToken: string, databaseId: string): Promise<Array<{ id: string; name: string }>> {
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

  const [kategoriDbId, labaRugiDbId] = await Promise.all([
    findDatabaseByName(accessToken, "Kategori Pengeluaran"),
    findDatabaseByName(accessToken, "Laba Rugi"),
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

  const expensesDbId = await findDatabaseByName(accessToken, "Expenses");
  if (!expensesDbId) {
    res.status(404).json({ error: "Database 'Expenses' tidak ditemukan di workspace Notion Anda." });
    return;
  }

  const notionBody = {
    parent: { database_id: expensesDbId },
    properties: {
      Pengeluaran: {
        title: [{ text: { content: pengeluaran } }],
      },
      Qty: {
        number: qty,
      },
      "Harga/pcs": {
        number: hargaPerPcs,
      },
      Date: {
        date: { start: date },
      },
      Kategori: {
        relation: [{ id: kategoriId }],
      },
      Area: {
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
    const err = await response.text();
    req.log.error({ err }, "Failed to create expense in Notion");
    res.status(400).json({ error: "Gagal menyimpan pengeluaran ke Notion. Pastikan nama properti database sesuai." });
    return;
  }

  const created = await response.json() as { id: string };
  req.log.info({ userId, pageId: created.id }, "Expense created in Notion");

  res.status(201).json({ success: true, pageId: created.id });
});

export default router;
