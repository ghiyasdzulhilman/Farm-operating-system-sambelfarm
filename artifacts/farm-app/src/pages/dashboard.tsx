import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, notionConnectionsTable, fieldMappingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// --- Helper: Ambil Nama Halaman dari ID (Buat kolom Relation) ---
const nameCache: Record<string, string> = {}; // Biar ga nanya berulang-ulang ke Notion

async function getPageName(accessToken: string, pageId: string) {
  if (nameCache[pageId]) return nameCache[pageId];

  try {
    const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}`, "Notion-Version": "2022-06-28" },
    });
    if (!response.ok) return "Kategori Hilang";
    const data = await response.json();
    
    // Cari property tipe 'title' di halaman kategori tersebut
    const titleProp = Object.values(data.properties).find((p: any) => p.type === "title") as any;
    const name = titleProp?.title?.[0]?.plain_text || "Tanpa Nama";
    
    nameCache[pageId] = name; // Simpan di memori biar cepet
    return name;
  } catch {
    return "Error Kategori";
  }
}

function getDateFilter(mappings: any, month?: string, year?: string) {
  const datePropId = mappings?.tanggal?.propertyId || mappings?.date?.propertyId;
  if (!datePropId || !month || !year) return undefined;

  const startOfMonth = `${year}-${month.padStart(2, '0')}-01`;
  const m = parseInt(month);
  const y = parseInt(year);
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? y + 1 : y;
  const endOfMonth = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;

  return {
    property: datePropId,
    date: { on_or_after: startOfMonth, before: endOfMonth }
  };
}

// --- 1. Query Laba Rugi ---
async function queryLabaRugi(accessToken: string, databaseId: string, mappings: any, month?: string, year?: string) {
  const filter = getDateFilter(mappings, month, year);
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
    body: JSON.stringify({ page_size: 100, filter })
  });

  if (!response.ok) return { totalModal: 0, totalPendapatan: 0, totalPengeluaran: 0, areas: [] };
  const data = await response.json();
  
  let tModal = 0, tPendapatan = 0, tPengeluaran = 0;
  const areas = data.results.map((page: any) => {
    const getNum = (id: string) => {
      const p = Object.values(page.properties).find((p: any) => p.id === id) as any;
      return p?.rollup?.number ?? p?.number ?? p?.formula?.number ?? 0;
    };
    const modal = getNum(mappings?.modalAwal?.propertyId);
    const pend = getNum(mappings?.pendapatan?.propertyId);
    const peng = getNum(mappings?.pengeluaran?.propertyId);
    tModal += modal; tPendapatan += pend; tPengeluaran += peng;
    
    let name = "Area Tanpa Nama";
    const tProp = Object.values(page.properties).find((p: any) => p.id === mappings?.area?.propertyId || p.type === "title") as any;
    if (tProp?.title?.[0]) name = tProp.title[0].plain_text;

    return { id: page.id, name, modalAwal: modal, pendapatan: pend, pengeluaran: peng, profit: pend - peng, harvestWeight: 0 };
  });

  return { totalModal: tModal, totalPendapatan: tPendapatan, totalPengeluaran: tPengeluaran, areas };
}

// --- 2. Query Panen ---
async function queryHarvestByArea(accessToken: string, databaseId: string, mappings: any, month?: string, year?: string) {
  const filter = getDateFilter(mappings, month, year);
  const weightMap: Record<string, number> = { global: 0 };
  let cursor: string | undefined;

  while (true) {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
      body: JSON.stringify({ page_size: 100, start_cursor: cursor, filter })
    });
    if (!res.ok) break;
    const data = await res.json();
    for (const page of data.results) {
      const wProp = Object.values(page.properties).find((p: any) => p.id === mappings?.jumlahPanen?.propertyId || p.type === "number") as any;
      const weight = wProp?.number ?? wProp?.formula?.number ?? 0;
      weightMap.global += weight;
      const aProp = Object.values(page.properties).find((p: any) => p.id === mappings?.area?.propertyId || p.type === "relation") as any;
      const aId = aProp?.relation?.[0]?.id;
      if (aId) weightMap[aId] = (weightMap[aId] || 0) + weight;
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return weightMap;
}

// --- 3. Query Breakdown (Pintar: Otomatis deteksi Nama Relation) ---
async function queryExpensesByCategory(accessToken: string, databaseId: string, mappings: any, month?: string, year?: string) {
  const filter = getDateFilter(mappings, month, year);
  const catMap: Record<string, number> = {};
  let cursor: string | undefined;

  while (true) {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
      body: JSON.stringify({ page_size: 100, start_cursor: cursor, filter })
    });
    if (!res.ok) break;
    const data = await res.json();

    for (const page of data.results) {
      const nProp = Object.values(page.properties).find((p: any) => p.id === mappings?.nominal?.propertyId || p.type === "number") as any;
      const amount = nProp?.number ?? nProp?.formula?.number ?? 0;

      let catName = "Lain-lain";
      const cProp = Object.values(page.properties).find((p: any) => p.id === mappings?.kategori?.propertyId) as any;
      
      if (cProp) {
        if (cProp.type === "select") catName = cProp.select?.name || catName;
        else if (cProp.type === "multi_select") catName = cProp.multi_select?.[0]?.name || catName;
        else if (cProp.type === "relation" && cProp.relation?.[0]) {
          // DISINI KEAJAIBANNYA: Aplikasi nanya nama kategori berdasarkan ID relation-nya
          catName = await getPageName(accessToken, cProp.relation[0].id);
        } else if (cProp.type === "title") catName = cProp.title?.[0]?.plain_text || catName;
      }
      catMap[catName] = (catMap[catName] || 0) + amount;
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return Object.entries(catMap).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
}

router.get("/dashboard/summary", async (req, res) => {
  const { userId } = getAuth(req);
  const { month, year } = req.query;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const [conn] = await db.select().from(notionConnectionsTable).where(eq(notionConnectionsTable.userId, userId));
  const [lrM] = await db.select().from(fieldMappingsTable).where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, "laba_rugi")));
  const [pM] = await db.select().from(fieldMappingsTable).where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, "panen")));
  const [exM] = await db.select().from(fieldMappingsTable).where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, "pengeluaran")));

  const [lrR, hMap, exB] = await Promise.all([
    queryLabaRugi(conn.accessToken, lrM.notionDatabaseId, lrM.mappings, month as string, year as string),
    pM ? queryHarvestByArea(conn.accessToken, pM.notionDatabaseId, pM.mappings, month as string, year as string) : { global: 0 },
    exM ? queryExpensesByCategory(conn.accessToken, exM.notionDatabaseId, exM.mappings, month as string, year as string) : []
  ]);

  res.json({
    ...lrR,
    labaRugi: lrR.totalPendapatan - lrR.totalPengeluaran,
    totalHarvestWeight: hMap.global,
    areas: lrR.areas.map((a: any) => ({ ...a, harvestWeight: hMap[a.id] || 0 })),
    expenseBreakdown: exB,
    lastUpdated: new Date().toISOString()
  });
});

export default router;
