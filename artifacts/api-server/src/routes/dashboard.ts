import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, notionConnectionsTable, fieldMappingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// --- Helper 1: Cache Nama Kategori (Biar loading tetep kenceng) ---
const nameCache: Record<string, string> = {};
async function getPageName(accessToken: string, pageId: string) {
  if (nameCache[pageId]) return nameCache[pageId];
  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}`, "Notion-Version": "2022-06-28" },
    });
    if (!res.ok) return "Lain-lain";
    const data = await res.json();
    const titleProp = Object.values(data.properties).find((p: any) => p.type === "title") as any;
    const name = titleProp?.title?.[0]?.plain_text || "Lain-lain";
    nameCache[pageId] = name;
    return name;
  } catch {
    return "Lain-lain";
  }
}

// --- Helper 2: Ekstrak Angka Prioritas Mapping (Anti Error Rp0) ---
function extractNumber(page: any, propId: string | undefined, fallbackKeywords: string[]) {
  // 1. Coba cari pakai ID Mapping yang di-set user
  if (propId) {
    const prop = Object.values(page.properties).find((p: any) => p.id === propId) as any;
    if (prop) {
       const val = prop.number ?? prop.formula?.number ?? prop.rollup?.number;
       if (val != null) return val; // Ambil kalau nilainya bukan null/kosong
    }
  }
  // 2. Fallback kalau belum di-mapping (Cari berdasarkan keyword nama kolom)
  const keys = Object.keys(page.properties);
  for (const kw of fallbackKeywords) {
    const matchKey = keys.find(k => k.toLowerCase().includes(kw));
    if (matchKey) {
      const prop = page.properties[matchKey] as any;
      const val = prop.number ?? prop.formula?.number ?? prop.rollup?.number;
      if (val != null) return val; // Jangan ambil kalau kolom kosong
    }
  }
  return 0;
}

// --- Helper 3: Filter Tanggal Cerdas di Memory ---
function isPageInMonth(page: any, mappings: any, month: string, year: string) {
  let dateStr = page.created_time; // Fallback otomatis pakai tanggal baris dibuat
  const datePropId = mappings?.tanggal?.propertyId || mappings?.date?.propertyId;

  if (datePropId) {
    const dProp = Object.values(page.properties).find((p: any) => p.id === datePropId) as any;
    if (dProp?.type === 'date' && dProp.date?.start) dateStr = dProp.date.start;
    else if (dProp?.type === 'created_time') dateStr = dProp.created_time;
  } else {
    // Kalau lupa mapping, cari property yang tipe nya date
    const dProp = Object.values(page.properties).find((p: any) => p.type === 'date') as any;
    if (dProp?.date?.start) dateStr = dProp.date.start;
  }

  if (!dateStr) return false;
  const d = new Date(dateStr);
  return (d.getMonth() + 1 === parseInt(month) && d.getFullYear() === parseInt(year));
}

// --- 1. Query Laba Rugi (Hanya Ambil Modal Awal & Daftar Area) ---
async function queryAreas(accessToken: string, databaseId: string, mappings: any) {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
    body: JSON.stringify({ page_size: 100 })
  });
  if (!res.ok) return { totalModal: 0, areas: [] };
  const data = await res.json();

  let tModal = 0;
  const areas = data.results.map((page: any) => {
    const modal = extractNumber(page, mappings?.modalAwal?.propertyId, ["modal"]);
    tModal += modal;

    let name = "Area Tanpa Nama";
    const aPropId = mappings?.area?.propertyId;
    if (aPropId) {
        const tProp = Object.values(page.properties).find((p: any) => p.id === aPropId) as any;
        if (tProp?.title?.[0]) name = tProp.title[0].plain_text;
    } else {
        const tProp = Object.values(page.properties).find((p: any) => p.type === "title") as any;
        if (tProp?.title?.[0]) name = tProp.title[0].plain_text;
    }

    return { id: page.id, name, modalAwal: modal, pendapatan: 0, pengeluaran: 0, profit: 0, margin: 0, harvestWeight: 0 };
  });
  return { totalModal: tModal, areas };
}

// --- 2. Query Panen (Hitung Pendapatan & Berat Sesuai Bulan) ---
async function queryPanen(accessToken: string, databaseId: string, mappings: any, month: string, year: string) {
  let cursor: string | undefined;
  const resData = { gWeight: 0, gIncome: 0, byArea: {} as Record<string, { w: number, i: number }> };

  while (true) {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
      body: JSON.stringify({ page_size: 100, start_cursor: cursor })
    });
    if (!res.ok) break;
    const data = await res.json();

    for (const page of data.results) {
      if (!isPageInMonth(page, mappings, month, year)) continue; 

      const weight = extractNumber(page, mappings?.jumlahPanen?.propertyId || mappings?.jumlah?.propertyId, ["jumlah", "kg", "berat"]);
      const income = extractNumber(page, mappings?.totalPendapatan?.propertyId || mappings?.pendapatan?.propertyId, ["total pendapatan", "total", "pendapatan", "jual"]);

      let areaId = null;
      const aPropId = mappings?.area?.propertyId || mappings?.labaRugi?.propertyId;
      if (aPropId) {
         const aProp = Object.values(page.properties).find((p: any) => p.id === aPropId) as any;
         if (aProp?.relation?.[0]) areaId = aProp.relation[0].id;
      }

      resData.gWeight += weight;
      resData.gIncome += income;

      if (areaId) {
         if (!resData.byArea[areaId]) resData.byArea[areaId] = { w: 0, i: 0 };
         resData.byArea[areaId].w += weight;
         resData.byArea[areaId].i += income;
      }
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return resData;
}

// --- 3. Query Pengeluaran (Hitung Pengeluaran & Detektif Kategori) ---
async function queryPengeluaran(accessToken: string, databaseId: string, mappings: any, month: string, year: string) {
  let cursor: string | undefined;
  const resData = { gExpense: 0, byArea: {} as Record<string, number>, categories: {} as Record<string, number> };

  while (true) {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
      body: JSON.stringify({ page_size: 100, start_cursor: cursor })
    });
    if (!res.ok) break;
    const data = await res.json();

    for (const page of data.results) {
      if (!isPageInMonth(page, mappings, month, year)) continue;

      const expense = extractNumber(page, mappings?.nominal?.propertyId || mappings?.pengeluaran?.propertyId, ["nominal", "jumlah", "harga", "total", "pengeluaran"]);

      let areaId = null;
      let catName = "Lain-lain";

      // Detektif Kategori (Relation)
      const cPropId = mappings?.kategori?.propertyId;
      if (cPropId) {
         const cProp = Object.values(page.properties).find((p:any) => p.id === cPropId) as any;
         if (cProp) {
            if (cProp.type === "select") catName = cProp.select?.name || catName;
            else if (cProp.type === "multi_select" && cProp.multi_select?.[0]) catName = cProp.multi_select[0].name;
            else if (cProp.type === "relation" && cProp.relation?.[0]) catName = await getPageName(accessToken, cProp.relation[0].id);
            else if (cProp.type === "title" && cProp.title?.[0]) catName = cProp.title[0].plain_text;
         }
      }

      // Detektif Area
      const aPropId = mappings?.area?.propertyId || mappings?.labaRugi?.propertyId;
      if (aPropId) {
         const aProp = Object.values(page.properties).find((p: any) => p.id === aPropId) as any;
         if (aProp?.relation?.[0]) areaId = aProp.relation[0].id;
      }

      resData.gExpense += expense;
      if (areaId) resData.byArea[areaId] = (resData.byArea[areaId] || 0) + expense;
      resData.categories[catName] = (resData.categories[catName] || 0) + expense;
    }
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return resData;
}

// --- Endpoint Dashboard ---
router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  const { month, year } = req.query;

  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [conn] = await db.select().from(notionConnectionsTable).where(eq(notionConnectionsTable.userId, userId));
  if (!conn) { res.status(404).json({ error: "Notion terputus" }); return; }

  const [lrM] = await db.select().from(fieldMappingsTable).where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, "laba_rugi")));
  const [pM] = await db.select().from(fieldMappingsTable).where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, "panen")));
  const [exM] = await db.select().from(fieldMappingsTable).where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, "pengeluaran")));

  if (!lrM?.notionDatabaseId) { res.status(404).json({ error: "Setup Laba Rugi dulu." }); return; }

  // Tembak 3 query secara paralel pakai mapping yang udah di-set user
  const [areasData, panenData, pengeluaranData] = await Promise.all([
    queryAreas(conn.accessToken, lrM.notionDatabaseId, lrM.mappings || {}),
    pM?.notionDatabaseId ? queryPanen(conn.accessToken, pM.notionDatabaseId, pM.mappings || {}, month as string, year as string) : { gWeight: 0, gIncome: 0, byArea: {} },
    exM?.notionDatabaseId ? queryPengeluaran(conn.accessToken, exM.notionDatabaseId, exM.mappings || {}, month as string, year as string) : { gExpense: 0, byArea: {}, categories: {} }
  ]);

  // Gabungin data yang udah dihitung per bulan ke masing-masing Area
  const finalAreas = areasData.areas.map(area => {
    const pend = panenData.byArea[area.id]?.i || 0;
    const peng = pengeluaranData.byArea[area.id] || 0;
    const profit = pend - peng;
    const margin = area.modalAwal > 0 ? (profit / area.modalAwal) * 100 : 0;
    return {
      ...area,
      pendapatan: pend,
      pengeluaran: peng,
      profit,
      margin,
      harvestWeight: panenData.byArea[area.id]?.w || 0
    };
  });

  const expenseBreakdown = Object.entries(pengeluaranData.categories)
    .map(([name, amount]) => ({ name, amount: amount as number }))
    .sort((a, b) => b.amount - a.amount);

  res.json({
    totalModal: areasData.totalModal,
    totalPendapatan: panenData.gIncome,
    totalPengeluaran: pengeluaranData.gExpense,
    labaRugi: panenData.gIncome - pengeluaranData.gExpense,
    marginTotal: areasData.totalModal > 0 ? ((panenData.gIncome - pengeluaranData.gExpense) / areasData.totalModal) * 100 : 0,
    areas: finalAreas,
    totalHarvestWeight: panenData.gWeight,
    expenseBreakdown,
    currency: "IDR",
    lastUpdated: new Date().toISOString()
  });
});

export default router;
