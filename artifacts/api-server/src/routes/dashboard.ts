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
}

// Fungsi utama narik data pakai Property ID dari Mapping
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

  // Tarik Property ID dari hasil mapping di database
  const modalPropId = mappings?.modalAwal?.propertyId;
  const pendapatanPropId = mappings?.pendapatan?.propertyId;
  const pengeluaranPropId = mappings?.pengeluaran?.propertyId;
  const areaPropId = mappings?.area?.propertyId;

  let totalModal = 0;
  let totalPendapatan = 0;
  let totalPengeluaran = 0;
  const areas: any[] = [];

  for (const page of data.results) {
    // Helper sakti buat ekstrak angka (Number / Formula / Rollup)
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

    // Ekstrak Nama Area (Blok A, B, dll)
    let areaName = "Area Tanpa Nama";
    if (areaPropId) {
      const titleProp = Object.values(page.properties).find((p: any) => p.id === areaPropId) as any;
      if (titleProp && titleProp.title?.[0]) areaName = titleProp.title[0].plain_text;
    } else {
      // Fallback kalau area belum di-map: cari tipe 'title'
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

  // 1. Panggil hasil mapping Laba Rugi yang udah lu set di Pengaturan
  const [mappingRow] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(
      eq(fieldMappingsTable.userId, userId),
      eq(fieldMappingsTable.databaseType, "laba_rugi"),
    ));

  const databaseId = mappingRow?.notionDatabaseId;
  const mappings = mappingRow?.mappings || {};

  if (!databaseId) {
    res.status(404).json({ error: "Database Laba Rugi belum disetup di Pengaturan." });
    return;
  }

  // 2. Oper mappings-nya ke fungsi pencarian
  const result = await queryLabaRugi(connection.accessToken, databaseId, mappings);

  // 3. Tembak balikan JSON ke Frontend Dashboard
  res.json({
    totalModal: result.totalModal,
    totalPendapatan: result.totalPendapatan,
    totalPengeluaran: result.totalPengeluaran,
    labaRugi: result.totalPendapatan - result.totalPengeluaran,
    marginTotal: result.marginTotal,
    areas: result.areas,
    currency: "IDR",
    lastUpdated: new Date().toISOString(),
    notionDatabaseId: databaseId,
  });
});

export default router;
