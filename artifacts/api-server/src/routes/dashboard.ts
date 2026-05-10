import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, notionConnectionsTable, fieldMappingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

interface NotionProperty {
  id: string;
  type: string;
  rollup?: { function: string; number?: number | null };
  number?: number | null;
  formula?: { number?: number | null };
  title?: Array<{ plain_text: string }>;
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

// 1. Fungsi Utama Narik Data Laba Rugi
async function queryLabaRugi(accessToken: string, databaseId: string, mappings: any) {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({ page_size: 100 }),
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
      if (prop.type === "rollup") return prop.rollup?.number ?? 0;
      if (prop.type === "number") return prop.number ?? 0;
      if (prop.type === "formula") return prop.formula?.number ?? 0;
      return 0;
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
      margin
    });
  }

  const profitGlobal = totalPendapatan - totalPengeluaran;
  const marginTotal = totalModal > 0 ? (profitGlobal / totalModal) * 100 : 0;

  return { totalModal, totalPendapatan, totalPengeluaran, marginTotal, areas };
}

// 2. Fungsi Baru: Narik Data Total Panen (Kg)
async function queryTotalPanen(accessToken: string, databaseId: string, mappings: any) {
  let totalKg = 0;
  let hasMore = true;
  let nextCursor: string | undefined = undefined;

  // Mencari ID dari property jumlah panen dari mapping
  const jumlahPanenPropId = mappings?.jumlahPanen?.propertyId || mappings?.jumlah?.propertyId;

  while (hasMore) {
    const body: any = { page_size: 100 };
    if (nextCursor) body.start_cursor = nextCursor;

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) break;

    const data = (await response.json()) as NotionQueryResponse;
    
    for (const page of data.results) {
      let value = 0;
      if (jumlahPanenPropId) {
        const prop = Object.values(page.properties).find((p: any) => p.id === jumlahPanenPropId) as any;
        if (prop?.type === "number") value = prop.number ?? 0;
        else if (prop?.type === "formula") value = prop.formula?.number ?? 0;
      } else {
         // Fallback otomatis kalau property belum ke-mapping sempurna: cari kolom number pertama
         const prop = Object.values(page.properties).find((p: any) => p.type === "number") as any;
         if (prop) value = prop.number ?? 0;
      }
      totalKg += value;
    }

    hasMore = data.has_more;
    nextCursor = data.next_cursor ?? undefined;
  }

  return totalKg;
}

// 3. Endpoint Dashboard Summary
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
    res.status(404).json({ error: "Notion tidak terhubung." });
    return;
  }

  // Tarik Mapping Laba Rugi
  const [labaRugiMapping] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(
      eq(fieldMappingsTable.userId, userId),
      eq(fieldMappingsTable.databaseType, "laba_rugi"),
    ));

  // Tarik Mapping Panen
  const [panenMapping] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(
      eq(fieldMappingsTable.userId, userId),
      eq(fieldMappingsTable.databaseType, "panen"),
    ));

  const dbLabaRugiId = labaRugiMapping?.notionDatabaseId;
  const mappingsLabaRugi = labaRugiMapping?.mappings || {};

  if (!dbLabaRugiId) {
    res.status(404).json({ error: "Database Laba Rugi belum disetup di Pengaturan." });
    return;
  }

  // Jalankan kedua fungsi query secara paralel (biar loading aplikasi lebih cepet)
  const [resultLabaRugi, totalHarvestWeight] = await Promise.all([
    queryLabaRugi(connection.accessToken, dbLabaRugiId, mappingsLabaRugi),
    panenMapping?.notionDatabaseId 
      ? queryTotalPanen(connection.accessToken, panenMapping.notionDatabaseId, panenMapping.mappings || {})
      : Promise.resolve(0) // Kalau panen belum diset, anggap 0 kg
  ]);

  // Tembak balikan JSON ke Frontend
  res.json({
    totalModal: resultLabaRugi.totalModal,
    totalPendapatan: resultLabaRugi.totalPendapatan,
    totalPengeluaran: resultLabaRugi.totalPengeluaran,
    labaRugi: resultLabaRugi.totalPendapatan - resultLabaRugi.totalPengeluaran,
    marginTotal: resultLabaRugi.marginTotal,
    areas: resultLabaRugi.areas,
    totalHarvestWeight: totalHarvestWeight, // <--- INI DIA BINTANG UTAMANYA!
    currency: "IDR",
    lastUpdated: new Date().toISOString(),
    notionDatabaseId: dbLabaRugiId,
  });
});

export default router;
