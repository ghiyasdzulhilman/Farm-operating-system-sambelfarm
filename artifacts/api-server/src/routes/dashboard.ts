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

// --- 1. Fungsi Utama Narik Data Laba Rugi ---
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
      id: page.id, // Ini krusial: Kita butuh Page ID Laba Rugi buat nyocokin relasi panen nanti
      name: areaName,
      modalAwal,
      pendapatan,
      pengeluaran,
      profit,
      margin,
      harvestWeight: 0 // Akan di-update dari database panen
    });
  }

  const profitGlobal = totalPendapatan - totalPengeluaran;
  const marginTotal = totalModal > 0 ? (profitGlobal / totalModal) * 100 : 0;

  return { totalModal, totalPendapatan, totalPengeluaran, marginTotal, areas };
}

// --- 2. Fungsi Baru: Narik Data Panen dan Di-Group Per Area ---
async function queryHarvestByArea(accessToken: string, databaseId: string, mappings: any) {
  let hasMore = true;
  let nextCursor: string | undefined = undefined;
  
  // weightMap bakal nyimpen data format: { "global": 393, "ID-Blok-B": 75, ... }
  const weightMap: Record<string, number> = { global: 0 };

  const weightPropId = mappings?.jumlahPanen?.propertyId || mappings?.jumlah?.propertyId;
  const labaRugiRelationId = mappings?.labaRugiId?.propertyId || mappings?.labaRugi?.propertyId;

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
      // 1. Ekstrak Berat Panen (Kg)
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

      // 2. Ekstrak Area ID dari Relasi (Biar tau ini panen punya blok mana)
      let relatedIds: string[] = [];
      if (labaRugiRelationId) {
        const relProp = Object.values(page.properties).find((p: any) => p.id === labaRugiRelationId) as any;
        if (relProp?.relation) relatedIds = relProp.relation.map((r: any) => r.id);
      } else {
        // Fallback: Kalau belum di-mapping sempurna, kumpulin aja semua ID relasinya.
        // Nanti bakal otomatis cocok sama ID Laba Rugi yang kita cari.
        for (const prop of Object.values(page.properties) as any[]) {
          if (prop.type === "relation" && prop.relation) {
            prop.relation.forEach((r: any) => relatedIds.push(r.id));
          }
        }
      }

      // Masukin beratnya ke masing-masing ID Blok
      for (const relId of relatedIds) {
        weightMap[relId] = (weightMap[relId] || 0) + weight;
      }
    }

    hasMore = data.has_more;
    nextCursor = data.next_cursor ?? undefined;
  }

  return weightMap;
}
async function queryRecentActivities(
  accessToken: string,
  databaseId: string
) {

  const activities: any[] = [];
const response = await fetch(
  `https://api.notion.com/v1/databases/${databaseId}/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      page_size: 5,
    }),
  }
);

if (!response.ok) {
  return [];
}

const data =
  (await response.json()) as NotionQueryResponse;
for (const page of data.results) {
const titleProp = Object.values(
  page.properties
).find((p: any) => p.type === "title") as any;

const areaName =
  titleProp?.title?.[0]?.plain_text ||
  "Area";

const numberProp = Object.values(
  page.properties
).find((p: any) => p.type === "number") as any;

const weight =
  numberProp?.number || 0;
  activities.push({
    type: "harvest",
    title: `Panen ${areaName}`,

description: `${weight}kg berhasil dicatat`,
    time: "Baru saja",
  });

}
  return activities;
}
// --- 3. Endpoint Dashboard Summary ---
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

  // Jalankan kedua fungsi query secara paralel
  const [resultLabaRugi, harvestMap] = await Promise.all([
    queryLabaRugi(connection.accessToken, dbLabaRugiId, mappingsLabaRugi),
    panenMapping?.notionDatabaseId 
      ? queryHarvestByArea(connection.accessToken, panenMapping.notionDatabaseId, panenMapping.mappings || {})
      : Promise.resolve({ global: 0 } as Record<string, number>) // Fallback kalau db panen belum konek
  ]);

  // GABUNGKAN DATA: Cocokin harvestWeight spesifik ke masing-masing area
  const finalAreas = resultLabaRugi.areas.map(area => ({
    ...area,
    harvestWeight: harvestMap[area.id] || 0 // Tarik data 75 kg untuk Blok B, dst.
  }));

  // Tembak balikan JSON ke Frontend Dashboard
  const totalProfit =
  resultLabaRugi.totalPendapatan -
  resultLabaRugi.totalPengeluaran;

const hpp =
  resultLabaRugi.totalPengeluaran /
  (harvestMap.global || 1);

const bepProgress =
  (resultLabaRugi.totalPendapatan /
    (resultLabaRugi.totalModal || 1)) *
  100;

res.json({
  financial: {
    totalModal: resultLabaRugi.totalModal,
    totalPendapatan: resultLabaRugi.totalPendapatan,
    totalPengeluaran: resultLabaRugi.totalPengeluaran,
    labaRugi: totalProfit,
    marginTotal: resultLabaRugi.marginTotal,
    bepProgress,
  },

  production: {
    totalHarvestWeight: harvestMap.global,
    hpp,
    averageRevenuePerKg:
      resultLabaRugi.totalPendapatan /
      (harvestMap.global || 1),
  },

  operational: {
    totalAreas: finalAreas.length,
    activeAreas: finalAreas.length,
  },

  insight: {
    businessStatus:
  resultLabaRugi.marginTotal > 0
    ? "Profitable"
    : "Developing",

    recommendation:
  resultLabaRugi.marginTotal < 0
    ? "Usaha masih merugi. Fokus meningkatkan penjualan dan efisiensi biaya."
    : resultLabaRugi.marginTotal < 15
      ? "Margin rendah, efisiensi operasional perlu ditingkatkan."
      : "Performa usaha dalam kondisi baik.",
  },

  areas: finalAreas,

  currency: "IDR",

  lastUpdated: new Date().toISOString(),

  notionDatabaseId: dbLabaRugiId,
activities: panenMapping?.notionDatabaseId
  ? await queryRecentActivities(
      connection.accessToken,
      panenMapping.notionDatabaseId
    )
  : [],
});
});

export default router;
