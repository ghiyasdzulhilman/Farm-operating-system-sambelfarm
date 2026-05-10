import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, notionConnectionsTable, fieldMappingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// --- Interface Notion ---
interface NotionProperty {
  id: string;
  type: string;
  rollup?: { number?: number | null };
  number?: number | null;
  formula?: { number?: number | null };
  title?: Array<{ plain_text: string }>;
  relation?: Array<{ id: string }>;
  select?: { name: string };
  multi_select?: Array<{ name: string }>;
  rich_text?: Array<{ plain_text: string }>;
}

interface NotionPage {
  id: string;
  properties: Record<string, NotionProperty>;
}

interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

// --- Helper: Bikin Filter Tanggal Buat Notion ---
function getDateFilter(mappings: any, month?: string, year?: string) {
  const datePropId = mappings?.tanggal?.propertyId || mappings?.date?.propertyId;
  // Kalau ga ada filter dari frontend atau kolom tanggal belum di-map, lewatin
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

// --- 1. Fungsi Narik Data Laba Rugi (+ Filter Bulan) ---
async function queryLabaRugi(accessToken: string, databaseId: string, mappings: any, month?: string, year?: string) {
  const filter = getDateFilter(mappings, month, year);
  
  const bodyPayload: any = { page_size: 100 };
  if (filter) bodyPayload.filter = filter;

  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    return { totalModal: 0, totalPendapatan: 0, totalPengeluaran: 0, marginTotal: 0, areas: [] };
  }

  const data = (await response.json()) as NotionQueryResponse;

  const modalPropId = mappings?.modalAwal?.propertyId;
  const pendapatanPropId = mappings?.pendapatan?.propertyId;
  const pengeluaranPropId = mappings?.pengeluaran?.propertyId;
  const areaPropId = mappings?.area?.propertyId;

  let totalModal = 0;
  let totalPendapatan = 0;
  let totalPengeluaran = 0;
  const areas: any[] = [];

  for (const page of data.results) {
    const extractNum = (propId: string) => {
      if (!propId) return 0;
      const prop = Object.values(page.properties).find((p: any) => p.id === propId) as any;
      if (!prop) return 0;
      return prop.rollup?.number ?? prop.number ?? prop.formula?.number ?? 0;
    };

    const modalAwal = extractNum(modalPropId);
    const pendapatan = extractNum(pendapatanPropId);
    const pengeluaran = extractNum(pengeluaranPropId);

    let areaName = "Area Tanpa Nama";
    if (areaPropId) {
      const titleProp = Object.values(page.properties).find((p: any) => p.id === areaPropId) as any;
      if (titleProp && titleProp.title?.[0]) areaName = titleProp.title[0].plain_text;
    } else {
      const titleProp = Object.values(page.properties).find((p: any) => p.type === "title") as any;
      if (titleProp && titleProp.title?.[0]) areaName = titleProp.title[0].plain_text;
    }

    totalModal += modalAwal;
    totalPendapatan += pendapatan;
    totalPengeluaran += pengeluaran;

    const profit = pendapatan - pengeluaran;
    const margin = modalAwal > 0 ? (profit / modalAwal) * 100 : 0;

    areas.push({
      id: page.id,
      name: areaName,
      modalAwal,
      pendapatan,
      pengeluaran,
      profit,
      margin,
      harvestWeight: 0 
    });
  }

  const profitGlobal = totalPendapatan - totalPengeluaran;
  const marginTotal = totalModal > 0 ? (profitGlobal / totalModal) * 100 : 0;

  return { totalModal, totalPendapatan, totalPengeluaran, marginTotal, areas };
}

// --- 2. Fungsi Narik Data Panen (+ Filter Bulan) ---
async function queryHarvestByArea(accessToken: string, databaseId: string, mappings: any, month?: string, year?: string) {
  let hasMore = true;
  let nextCursor: string | undefined = undefined;
  const weightMap: Record<string, number> = { global: 0 };

  const weightPropId = mappings?.jumlahPanen?.propertyId || mappings?.jumlah?.propertyId;
  const labaRugiRelationId = mappings?.labaRugiId?.propertyId || mappings?.labaRugi?.propertyId;
  const filter = getDateFilter(mappings, month, year);

  while (hasMore) {
    const bodyPayload: any = { page_size: 100 };
    if (nextCursor) bodyPayload.start_cursor = nextCursor;
    if (filter) bodyPayload.filter = filter;

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) break;

    const data = (await response.json()) as NotionQueryResponse;
    
    for (const page of data.results) {
      let weight = 0;
      if (weightPropId) {
        const prop = Object.values(page.properties).find((p: any) => p.id === weightPropId) as any;
        if (prop?.type === "number") weight = prop.number ?? 0;
        else if (prop?.type === "formula") weight = prop.formula?.number ?? 0;
      } else {
         const prop = Object.values(page.properties).find((p: any) => p.type === "number") as any;
         if (prop) weight = prop.number ?? 0;
      }

      weightMap.global += weight;

      let relatedIds: string[] = [];
      if (labaRugiRelationId) {
        const relProp = Object.values(page.properties).find((p: any) => p.id === labaRugiRelationId) as any;
        if (relProp?.relation) relatedIds = relProp.relation.map((r: any) => r.id);
      } else {
        for (const prop of Object.values(page.properties) as any[]) {
          if (prop.type === "relation" && prop.relation) {
            prop.relation.forEach((r: any) => relatedIds.push(r.id));
          }
        }
      }

      for (const relId of relatedIds) {
        weightMap[relId] = (weightMap[relId] || 0) + weight;
      }
    }

    hasMore = data.has_more;
    nextCursor = data.next_cursor ?? undefined;
  }

  return weightMap;
}

// --- 3. FUNGSI BARU: Breakdown Pengeluaran per Kategori (+ Filter Bulan) ---
async function queryExpensesByCategory(accessToken: string, databaseId: string, mappings: any, month?: string, year?: string) {
  let hasMore = true;
  let nextCursor: string | undefined = undefined;
  const categoryMap: Record<string, number> = {};

  const nominalPropId = mappings?.nominal?.propertyId || mappings?.jumlah?.propertyId || mappings?.pengeluaran?.propertyId;
  const kategoriPropId = mappings?.kategori?.propertyId || mappings?.category?.propertyId;
  const filter = getDateFilter(mappings, month, year);

  while (hasMore) {
    const bodyPayload: any = { page_size: 100 };
    if (nextCursor) bodyPayload.start_cursor = nextCursor;
    if (filter) bodyPayload.filter = filter;

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) break;

    const data = (await response.json()) as NotionQueryResponse;

    for (const page of data.results) {
      // Ekstrak Nominal (Uang)
      let nominal = 0;
      if (nominalPropId) {
        const prop = Object.values(page.properties).find((p: any) => p.id === nominalPropId) as any;
        if (prop?.type === "number") nominal = prop.number ?? 0;
        else if (prop?.type === "formula") nominal = prop.formula?.number ?? 0;
      } else {
        const prop = Object.values(page.properties).find((p: any) => p.type === "number") as any;
        if (prop) nominal = prop.number ?? 0;
      }

      // Ekstrak Kategori (Pupuk, Pestisida, dll)
      let categoryName = "Lain-lain";
      if (kategoriPropId) {
        const prop = Object.values(page.properties).find((p: any) => p.id === kategoriPropId) as any;
        if (prop?.type === "select" && prop.select) categoryName = prop.select.name;
        else if (prop?.type === "multi_select" && prop.multi_select?.length > 0) categoryName = prop.multi_select[0].name;
        else if (prop?.type === "title" && prop.title?.[0]) categoryName = prop.title[0].plain_text;
        else if (prop?.type === "rich_text" && prop.rich_text?.[0]) categoryName = prop.rich_text[0].plain_text;
      } else {
        const prop = Object.values(page.properties).find((p: any) => p.type === "select") as any;
        if (prop?.select) categoryName = prop.select.name;
      }

      // Kumpulin totalnya
      categoryMap[categoryName] = (categoryMap[categoryName] || 0) + nominal;
    }

    hasMore = data.has_more;
    nextCursor = data.next_cursor ?? undefined;
  }

  // Format datanya jadi Array dan urutin dari pengeluaran terbesar
  return Object.entries(categoryMap)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
}

// --- Endpoint Dashboard Summary ---
router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const { month, year } = req.query; // Nangkep parameter filter dari frontend

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

  // Tarik Mapping Laba Rugi
  const [labaRugiMapping] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, "laba_rugi")));

  // Tarik Mapping Panen
  const [panenMapping] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, "panen")));

  // Tarik Mapping Pengeluaran (Buat breakdown)
  const [pengeluaranMapping] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, "pengeluaran")));

  const dbLabaRugiId = labaRugiMapping?.notionDatabaseId;
  if (!dbLabaRugiId) {
    res.status(404).json({ error: "Database Laba Rugi belum disetup di Pengaturan." });
    return;
  }

  // Tembak 3 query ke Notion barengan biar cepet loadingnya
  const [resultLabaRugi, harvestMap, expenseBreakdown] = await Promise.all([
    queryLabaRugi(connection.accessToken, dbLabaRugiId, labaRugiMapping?.mappings || {}, month as string, year as string),
    
    panenMapping?.notionDatabaseId 
      ? queryHarvestByArea(connection.accessToken, panenMapping.notionDatabaseId, panenMapping.mappings || {}, month as string, year as string)
      : Promise.resolve({ global: 0 } as Record<string, number>),
      
    pengeluaranMapping?.notionDatabaseId
      ? queryExpensesByCategory(connection.accessToken, pengeluaranMapping.notionDatabaseId, pengeluaranMapping.mappings || {}, month as string, year as string)
      : Promise.resolve([]) // Kasih array kosong kalau belum di-setup
  ]);

  const finalAreas = resultLabaRugi.areas.map(area => ({
    ...area,
    harvestWeight: harvestMap[area.id] || 0 
  }));

  res.json({
    totalModal: resultLabaRugi.totalModal,
    totalPendapatan: resultLabaRugi.totalPendapatan,
    totalPengeluaran: resultLabaRugi.totalPengeluaran,
    labaRugi: resultLabaRugi.totalPendapatan - resultLabaRugi.totalPengeluaran,
    marginTotal: resultLabaRugi.marginTotal,
    areas: finalAreas, 
    totalHarvestWeight: harvestMap.global, 
    expenseBreakdown: expenseBreakdown, // <--- INI DATA BREAKDOWN-NYA
    currency: "IDR",
    lastUpdated: new Date().toISOString(),
    notionDatabaseId: dbLabaRugiId,
  });
});

export default router;
