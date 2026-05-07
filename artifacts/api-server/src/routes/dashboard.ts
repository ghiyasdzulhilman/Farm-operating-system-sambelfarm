import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, notionConnectionsTable, fieldMappingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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

async function findLabaRugiDatabaseByName(accessToken: string): Promise<string | null> {
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

  const data = (await response.json()) as {
    results: Array<{ id: string; title?: Array<{ plain_text: string }> }>;
  };
  const found = data.results.find((r) =>
    r.title?.some((t) => t.plain_text.toLowerCase().includes("laba rugi")),
  );

  return found?.id ?? null;
}

async function queryLabaRugi(
  accessToken: string,
  databaseId: string,
): Promise<{ pendapatan: number; pengeluaran: number }> {
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

  const data = (await response.json()) as NotionQueryResponse;
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
    res.status(404).json({
      error: "Notion tidak terhubung. Silakan hubungkan workspace Notion Anda terlebih dahulu.",
    });
    return;
  }

  // --- Resolve database ID: saved mapping first, then name search ---
  const [mappingRow] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(
      eq(fieldMappingsTable.userId, userId),
      eq(fieldMappingsTable.databaseType, "laba_rugi"),
    ));

  const savedDatabaseId = mappingRow?.notionDatabaseId ?? null;

  req.log.info(
    { userId, savedDatabaseId },
    "Dashboard: resolving Laba Rugi database ID",
  );

  let databaseId: string | null = savedDatabaseId;

  if (!databaseId) {
    req.log.info({ userId }, "Dashboard: no saved DB ID, falling back to name search");
    databaseId = await findLabaRugiDatabaseByName(connection.accessToken);
  }

  if (!databaseId) {
    req.log.warn({ userId }, "Dashboard: Laba Rugi database not found");
    res.status(404).json({
      error: "Database Laba Rugi tidak ditemukan. Pilih database Laba Rugi di halaman Pengaturan.",
    });
    return;
  }

  req.log.info({ userId, databaseId }, "Dashboard: querying Laba Rugi database");

  const { pendapatan, pengeluaran } = await queryLabaRugi(connection.accessToken, databaseId);

  req.log.info({ userId, databaseId, pendapatan, pengeluaran }, "Dashboard: data fetched");

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
