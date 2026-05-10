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

// --- 1. Fungsi Query Laba Rugi ---
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

  if (!response.ok) return { totalModal: 0, totalPendapatan: 0, totalPengeluaran: 0, areas: [] };

  const data = await response.json();
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
    const titleProp = Object.values(page.properties).find((p: any) => p.id === areaPropId || p.type === "title") as any;
    if (titleProp?.title?.[0]) areaName = titleProp.title[0].plain_text;

    totalModal += modalAwal;
    totalPendapatan += pendapatan;
    totalPengeluaran += pengeluaran;

    areas.push({
      id: page.id, // Ini adalah Area ID (Laba Rugi Page ID)
      name: areaName,
      modalAwal,
      pendapatan,
      pengeluaran,
      profit: pendapatan - pengeluaran,
      margin: modalAwal > 0 ? ((pendapatan - pengeluaran) / modalAwal) * 100 : 0,
      harvestWeight: 0 // Akan diisi nanti
    });
  }

  return { totalModal, totalPendapatan, totalPengeluaran, areas };
}

// --- 2. Fungsi Query Panen (Group by Area) ---
async function queryHarvestByArea(accessToken: string, databaseId: string, mappings: any) {
  let hasMore = true;
  let nextCursor: string | undefined = undefined;
  const weightMap: Record<string, number> = { global: 0 };

  const weightPropId = mappings?.jumlahPanen?.propertyId || mappings?.jumlah?.propertyId;
  const areaRelationId = mappings?.area?.propertyId; // ID kolom Relasi ke Laba Rugi

  while (hasMore) {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({ page_size: 100, start_cursor: nextCursor }),
    });

    if (!response.ok) break;
    const data = await response.json();

    for (const page of data.results) {
      // Ekstrak Berat
      const weightProp = Object.values(page.properties).find((p: any) => p.id === weightPropId || p.type === "number") as any;
      const weight = weightProp?.number ?? weightProp?.formula?.number ?? 0;
      
      weightMap.global += weight;

      // Ekstrak Area ID (Relasi)
      const areaProp = Object.values(page.properties).find((p: any) => p.id === areaRelationId || p.type === "relation") as any;
      const areaId = areaProp?.relation?.[0]?.id;

      if (areaId) {
        weightMap[areaId] = (weightMap[areaId] || 0) + weight;
      }
    }
    hasMore = data.has_more;
    nextCursor = data.next_cursor ?? undefined;
  }
  return weightMap;
}

// --- 3. Endpoint Dashboard ---
router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [connection] = await db.select().from(notionConnectionsTable).where(eq(notionConnectionsTable.userId, userId));
  const [lrMap] = await db.select().from(fieldMappingsTable).where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, "laba_rugi")));
  const [pMap] = await db.select().from(fieldMappingsTable).where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, "panen")));

  if (!lrMap?.notionDatabaseId) { res.status(404).json({ error: "Setup Laba Rugi dulu bro." }); return; }

  const [lrResult, harvestMap] = await Promise.all([
    queryLabaRugi(connection.accessToken, lrMap.notionDatabaseId, lrMap.mappings),
    pMap?.notionDatabaseId ? queryHarvestByArea(connection.accessToken, pMap.notionDatabaseId, pMap.mappings) : Promise.resolve({ global: 0 })
  ]);

  // Gabungkan berat panen ke masing-masing area
  const finalAreas = lrResult.areas.map(area => ({
    ...area,
    harvestWeight: harvestMap[area.id] || 0
  }));

  res.json({
    totalModal: lrResult.totalModal,
    totalPendapatan: lrResult.totalPendapatan,
    totalPengeluaran: lrResult.totalPengeluaran,
    totalHarvestWeight: harvestMap.global,
    areas: finalAreas,
    lastUpdated: new Date().toISOString(),
  });
});

export default router;
