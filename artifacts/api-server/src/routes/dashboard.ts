import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, notionConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";

const router: IRouter = Router();

interface NotionProperty {
  type: string;
  rollup?: { function: string; number?: number | null };
  number?: number | null;
  formula?: { number?: number | null };
}

interface NotionPage {
  properties: Record<string, NotionProperty>;
}

interface NotionQueryResponse {
  results: NotionPage[];
}

async function findLabaRugiDatabase(accessToken: string): Promise<string | null> {
  const response = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      query: "Laba Rugi",
      filter: { value: "database", property: "object" },
    }),
  });

  if (!response.ok) return null;

  const data = await response.json() as { results: Array<{ id: string; title?: Array<{ plain_text: string }> }> };
  const found = data.results.find((r) =>
    r.title?.some((t) => t.plain_text.toLowerCase().includes("laba rugi"))
  );

  return found?.id ?? null;
}

async function queryLabaRugi(accessToken: string, databaseId: string): Promise<{ pendapatan: number; pengeluaran: number }> {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({ page_size: 100 }),
  });

  if (!response.ok) return { pendapatan: 0, pengeluaran: 0 };

  const data = await response.json() as NotionQueryResponse;
  let pendapatan = 0;
  let pengeluaran = 0;

  for (const page of data.results) {
    for (const [key, prop] of Object.entries(page.properties)) {
      const keyLower = key.toLowerCase();
      const value =
        prop.type === "rollup" ? (prop.rollup?.number ?? 0) :
        prop.type === "number" ? (prop.number ?? 0) :
        prop.type === "formula" ? (prop.formula?.number ?? 0) :
        0;

      if (keyLower.includes("pendapatan") || keyLower.includes("income") || keyLower.includes("revenue")) {
        pendapatan += value;
      } else if (keyLower.includes("pengeluaran") || keyLower.includes("expense") || keyLower.includes("biaya")) {
        pengeluaran += value;
      }
    }
  }

  return { pendapatan, pengeluaran };
}

router.get("/dashboard/summary", async (req, res): Promise<void> => {
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
    res.status(404).json({ error: "Notion not connected. Please connect your Notion workspace first." });
    return;
  }

  const databaseId = await findLabaRugiDatabase(connection.accessToken);

  if (!databaseId) {
    res.status(404).json({ error: "Laba Rugi database not found in your Notion workspace. Make sure you have duplicated the Farm Management System template." });
    return;
  }

  const { pendapatan, pengeluaran } = await queryLabaRugi(connection.accessToken, databaseId);

  const data = GetDashboardSummaryResponse.parse({
    totalPendapatan: pendapatan,
    totalPengeluaran: pengeluaran,
    labaRugi: pendapatan - pengeluaran,
    currency: "IDR",
    lastUpdated: new Date().toISOString(),
    notionDatabaseId: databaseId,
  });

  res.json(data);
});

export default router;
