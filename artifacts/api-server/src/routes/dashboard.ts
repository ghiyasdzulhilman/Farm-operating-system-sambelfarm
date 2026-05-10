import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, notionConnectionsTable, fieldMappingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// --- Helper Filter Tanggal Notion ---
function getDateFilter(mappings: any, month?: string, year?: string) {
  const datePropId = mappings?.tanggal?.propertyId || mappings?.date?.propertyId;
  if (!datePropId || !month || !year) return undefined;

  const startOfMonth = `${year}-${month.padStart(2, '0')}-01`;
  const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1;
  const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : year;
  const endOfMonth = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;

  return {
    property: datePropId,
    date: {
      on_or_after: startOfMonth,
      before: endOfMonth
    }
  };
}

// --- 1. Fungsi Query Laba Rugi (Updated with Filter) ---
async function queryLabaRugi(accessToken: string, databaseId: string, mappings: any, month?: string, year?: string) {
  const filter = getDateFilter(mappings, month, year);
  
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({ 
      page_size: 100,
      filter: filter // Kirim filter tanggal ke Notion
    }),
  });

  if (!response.ok) return { totalModal: 0, totalPendapatan: 0, totalPengeluaran: 0, areas: [] };

  const data = await response.json();
  const modalPropId = mappings?.modalAwal?.propertyId;
  const pendapatanPropId = mappings?.pendapatan?.propertyId;
  const pengeluaranPropId = mappings?.pengeluaran?.propertyId;
  const areaPropId = mappings?.area?.propertyId;

  let totalModal = 0, totalPendapatan = 0, totalPengeluaran = 0;
  const areas: any[] = [];

  for (const page of data.results) {
    const extractNum = (propId: string) => {
      if (!propId) return 0;
      const prop = Object.values(page.properties).find((p: any) => p.id === propId) as any;
      return prop?.rollup?.number ?? prop?.number ?? prop?.formula?.number ?? 0;
    };

    const modalAwal = extractNum(modalPropId);
    const pendapatan = extractNum(pendapatanPropId);
    const pengeluaran = extractNum(pengeluaranPropId);

    let areaName = "Area Tanpa Nama";
    const titleProp = Object.values(page.properties).find((p: any) => p.id === areaPropId || p.type === "title") as any;
    if (titleProp?.title?.[0]) areaName = titleProp.title[0].plain_text;

    totalModal += modalAwal;
    totalPendapatan += pendapatan;
    totalPengeluaran += pengeluaran;

    areas.push({
      id: page.id,
      name: areaName,
      modalAwal,
      pendapatan,
      pengeluaran,
      profit: pendapatan - pengeluaran,
      margin: modalAwal > 0 ? ((pendapatan - pengeluaran) / modalAwal) * 100 : 0,
      harvestWeight: 0
    });
  }

  return { totalModal, totalPendapatan, totalPengeluaran, areas };
}

// --- 2. Fungsi Query Panen (Updated with Filter) ---
async function queryHarvestByArea(accessToken: string, databaseId: string, mappings: any, month?: string, year?: string) {
  let hasMore = true;
  let nextCursor: string | undefined = undefined;
  const weightMap: Record<string, number> = { global: 0 };

  const weightPropId = mappings?.jumlahPanen?.propertyId || mappings?.jumlah?.propertyId;
  const areaRelationId = mappings?.area?.propertyId;
  const filter = getDateFilter(mappings, month, year);

  while (hasMore) {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({ 
        page_size: 100, 
        start_cursor: nextCursor,
        filter: filter 
      }),
    });

    if (!response.ok) break;
    const data = await response.json();

    for (const page of data.results) {
      const weightProp = Object.values(page.properties).find((p: any) => p.id === weightPropId || p.type === "number") as any;
      const weight = weightProp?.number ?? weightProp?.formula?.number ?? 0;
      weightMap.global += weight;

      const areaProp = Object.values(page.properties).find((p: any) => p.id === areaRelationId || p.type === "relation") as any;
      const areaId = areaProp?.relation?.[0]?.id;
      if (areaId) weightMap[areaId] = (weightMap[areaId] || 0) + weight;
    }
    hasMore = data.has_more;
    nextCursor = data.next_cursor ?? undefined;
  }
  return weightMap;
}

router.get("/dashboard/summary", async (req, res) => {
  const { userId } = getAuth(req);
  const { month, year } = req.query; // Ambil bulan & tahun dari URL

  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const [connection] = await db.select().from(notionConnectionsTable).where(eq(notionConnectionsTable.userId, userId));
  const [lrMap] = await db.select().from(fieldMappingsTable).where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, "laba_rugi")));
  const [pMap] = await db.select().from(fieldMappingsTable).where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, "panen")));

  const [lrResult, harvestMap] = await Promise.all([
    queryLabaRugi(connection.accessToken, lrMap.notionDatabaseId, lrMap.mappings, month as string, year as string),
    pMap?.notionDatabaseId ? queryHarvestByArea(connection.accessToken, pMap.notionDatabaseId, pMap.mappings, month as string, year as string) : Promise.resolve({ global: 0 })
  ]);

  const finalAreas = lrResult.areas.map(area => ({
    ...area,
    harvestWeight: harvestMap[area.id] || 0
  }));

  res.json({
    totalModal: lrResult.totalModal,
    totalPendapatan: lrResult.totalPendapatan,
    totalPengeluaran: lrResult.totalPengeluaran,
    labaRugi: lrResult.totalPendapatan - lrResult.totalPengeluaran,
    areas: finalAreas,
    totalHarvestWeight: harvestMap.global,
    lastUpdated: new Date().toISOString(),
  });
});

export default router;
