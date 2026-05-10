import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, notionConnectionsTable, fieldMappingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// --- Helper: Cache Nama Kategori (Biar loading tetep kenceng) ---
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

// --- Helper: Filter Tanggal Cerdas di Memory ---
function isPageInMonth(page: any, month: string, year: string) {
  const dateProp = Object.values(page.properties).find((p: any) => p.type === "date" || p.type === "created_time") as any;
  const dateStr = dateProp?.date?.start || dateProp?.created_time;
  if (!dateStr) return false; // Kalau nggak ada tanggal, lewatin
  const d = new Date(dateStr);
  return (d.getMonth() + 1 === parseInt(month) && d.getFullYear() === parseInt(year));
}

// --- 1. Query Laba Rugi (Hanya Ambil Modal Awal & Daftar Area) ---
async function queryAreas(accessToken: string, databaseId: string) {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
    body: JSON.stringify({ page_size: 100 })
  });
  if (!res.ok) return { totalModal: 0, areas: [] };
  const data = await res.json();

  let tModal = 0;
  const areas = data.results.map((page: any) => {
    // Cari kolom modal secara otomatis (Makin aman buat template)
    const keys = Object.keys(page.properties);
    const mKey = keys.find(k => k.toLowerCase().includes("modal"));
    const mProp = mKey ? page.properties[mKey] : null;
    const modal = mProp?.number ?? mProp?.formula?.number ?? 0;
    tModal += modal;

    let name = "Area Tanpa Nama";
    const tProp = Object.values(page.properties).find((p: any) => p.type === "title") as any;
    if (tProp?.title?.[0]) name = tProp.title[0].plain_text;

    return { id: page.id, name, modalAwal: modal, pendapatan: 0, pengeluaran: 0, profit: 0, margin: 0, harvestWeight: 0 };
  });
  return { totalModal: tModal, areas };
}

// --- 2. Query Panen (Hitung Pendapatan & Berat Sesuai Bulan) ---
async function queryPanen(accessToken: string, databaseId: string, month: string, year: string) {
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
      if (!isPageInMonth(page, month, year)) continue; // Filter bulan berjalan

      const keys = Object.keys(page.properties);
      const wKey = keys.find(k => k.toLowerCase().includes("jumlah") || k.toLowerCase().includes("kg") || k.toLowerCase().includes("berat"));
      const iKey = keys.find(k => k.toLowerCase().includes("total") || k.toLowerCase().includes("jual") || k.toLowerCase().includes("pendapatan"));
      const rKey = keys.find(k => page.properties[k].type === "relation");

      const weight = wKey ? (page.properties[wKey].number ?? page.properties[wKey].formula?.number ?? 0) : 0;
      const income = iKey ? (page.properties[iKey].number ?? page.properties[iKey].formula?.number ?? 0) : 0;
      const areaId = rKey ? page.properties[rKey].relation?.[0]?.id : null;

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
async function queryPengeluaran(accessToken: string, databaseId: string, month: string, year: string) {
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
      if (!isPageInMonth(page, month, year)) continue; // Filter bulan berjalan

      const keys = Object.keys(page.properties);
      const eKey = keys.find(k => k.toLowerCase().includes("nominal") || k.toLowerCase().includes("jumlah") || k.toLowerCase().includes("harga") || k.toLowerCase().includes("total"));
      const expense = eKey ? (page.properties[eKey].number ?? page.properties[eKey].formula?.number ?? 0) : 0;

      let areaId = null;
      let catName = "Lain-lain";

      // Cari kolom relation (biasanya ada 2: Area Laba Rugi dan Kategori)
      const relProps = Object.values(page.properties).filter((p: any) => p.type === "relation") as any[];
      for (const rp of relProps) {
        const propName = keys.find(k => page.properties[k].id === rp.id) || "";
        // Cek dari namanya, apakah ini relation buat Kategori?
        if (propName.toLowerCase().includes("kategori") || propName.toLowerCase().includes("tipe") || propName.toLowerCase().includes("jenis")) {
           if (rp.relation?.[0]) catName = await getPageName(accessToken, rp.relation[0].id); // Tanya namanya ke Notion
        } else {
           if (rp.relation?.[0]) areaId = rp.relation[0].id; // Asumsikan relation lainnya adalah Area
        }
      }

      // Fallback kalau kategori pake select/teks biasa
      if (catName === "Lain-lain") {
         const cProp = Object.values(page.properties).find((p:any) => p.type==="select" || p.type==="multi_select") as any;
         if (cProp?.type === "select") catName = cProp.select?.name || catName;
         if (cProp?.type === "multi_select") catName = cProp.multi_select?.[0]?.name || catName;
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

  // Tembak 3 query sekaligus
  const [areasData, panenData, pengeluaranData] = await Promise.all([
    queryAreas(conn.accessToken, lrM.notionDatabaseId),
    pM?.notionDatabaseId ? queryPanen(conn.accessToken, pM.notionDatabaseId, month as string, year as string) : { gWeight: 0, gIncome: 0, byArea: {} },
    exM?.notionDatabaseId ? queryPengeluaran(conn.accessToken, exM.notionDatabaseId, month as string, year as string) : { gExpense: 0, byArea: {}, categories: {} }
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
