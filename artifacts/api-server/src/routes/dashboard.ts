import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, fieldMappingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import {
  getNotionConnection,
  notionFetch,
  handleNotionErrors,
  NotionTokenInvalidError,
} from "../lib/notionClient";

const router: IRouter = Router();

// -- Interface Notion --
interface NotionProperty {
  id: string;
  type: string;
  rollup?: { number?: number | null };
  number?: number | null;
  formula?: { number?: number | null };
  title?: Array<{ plain_text: string }>;
  date?: { start?: string };
  created_time?: string;
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
async function queryLabaRugi(
  userId: string,
  accessToken: string,
  databaseId: string,
  mappings: any,
) {
  try {
    const response = await notionFetch(
      userId,
      accessToken,
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      { method: "POST", body: JSON.stringify({ page_size: 100 }) },
    );

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
      const margin = pendapatan > 0 ? (profit / pendapatan) * 100 : 0;

      areas.push({
        id: page.id,
        name: areaName,
        modalAwal,
        pendapatan,
        pengeluaran,
        profit,
        margin,
        harvestWeight: 0,
      });
    }

    const profitGlobal = totalPendapatan - totalPengeluaran;
    const marginTotal = totalPendapatan > 0 ? (profitGlobal / totalPendapatan) * 100 : 0;

    return { totalModal, totalPendapatan, totalPengeluaran, marginTotal, areas };
  } catch (err) {
    if (err instanceof NotionTokenInvalidError) throw err;
    return { totalModal: 0, totalPendapatan: 0, totalPengeluaran: 0, marginTotal: 0, areas: [] };
  }
}

// --- 2. Fungsi Baru: Narik Data Panen dan Di-Group Per Area ---
async function queryHarvestByArea(
  userId: string,
  accessToken: string,
  databaseId: string,
  mappings: any,
) {
  let hasMore = true;
  let nextCursor: string | undefined = undefined;

  const weightMap: Record<string, number> = { global: 0 };

  const weightPropId = mappings?.jumlahPanen?.propertyId || mappings?.jumlah?.propertyId;
  const labaRugiRelationId = mappings?.labaRugiId?.propertyId || mappings?.labaRugi?.propertyId;

  while (hasMore) {
    const body: any = { page_size: 100 };
    if (nextCursor) body.start_cursor = nextCursor;

    try {
      const response = await notionFetch(
        userId,
        accessToken,
        `https://api.notion.com/v1/databases/${databaseId}/query`,
        { method: "POST", body: JSON.stringify(body) },
      );

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

        let relatedIds: string[] = [];
        if (labaRugiRelationId) {
          const relProp = Object.values(page.properties).find((p: any) => p.id === labaRugiRelationId) as any;
          if (relProp?.relation) relatedIds = relProp.relation.map((r: any) => r.id);
        }
        if (!labaRugiRelationId) continue;

        if (relatedIds.length > 0) {
          weightMap.global += weight;
        }
        for (const relId of relatedIds) {
          weightMap[relId] = (weightMap[relId] || 0) + weight;
        }
      }

      hasMore = data.has_more;
      nextCursor = data.next_cursor ?? undefined;
    } catch (err) {
      if (err instanceof NotionTokenInvalidError) throw err;
      break;
    }
  }

  return weightMap;
}

function formatRelativeTime(dateString?: string) {
  if (!dateString) return "Baru saja";
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return "Baru saja";
  }
}

async function queryRecentActivities(
  userId: string,
  accessToken: string,
  panenDatabaseId: string,
  expensesDatabaseId: string,
  expensesMappings: any,
  areaMap: Record<string, string>,
  panenMappings: any,
) {
  const activities: any[] = [];

  try {
    const response = await notionFetch(
      userId,
      accessToken,
      `https://api.notion.com/v1/databases/${panenDatabaseId}/query`,
      { method: "POST", body: JSON.stringify({ page_size: 5 }) },
    );

    if (response.ok) {
      const data = (await response.json()) as NotionQueryResponse;

      for (const page of data.results) {
        const titleProp = Object.values(page.properties).find((p: any) => p.type === "title") as any;
        const areaName = titleProp?.title?.[0]?.plain_text || "Area";

        const dateProp = Object.values(page.properties).find(
          (p: any) => p.type === "date" || p.type === "created_time",
        ) as any;

        let relatedArea = "Area Tidak Diketahui";
        const relationPropId = panenMappings?.labaRugi?.propertyId;
        const relationProp = relationPropId
          ? Object.values(page.properties).find((p: any) => p.id === relationPropId) as any
          : null;
        const relationId = relationProp?.relation?.[0]?.id;
        if (relationId) relatedArea = areaMap[relationId] || "Area Tidak Diketahui";

        let activityDate = "";
        if (dateProp?.type === "date") activityDate = dateProp.date?.start || "";
        if (dateProp?.type === "created_time") activityDate = dateProp.created_time || "";

        const numberProp = Object.values(page.properties).find((p: any) => p.type === "number") as any;
        const weight = numberProp?.number || 0;

        activities.push({
          type: "harvest",
          title: `Panen ${areaName}`,
          description: `${weight}kg berhasil dicatat • ${relatedArea}`,
          time: formatRelativeTime(activityDate),
        });
      }
    }
  } catch (err) {
    if (err instanceof NotionTokenInvalidError) throw err;
  }

  if (expensesDatabaseId) {
    try {
      const expenseResponse = await notionFetch(
        userId,
        accessToken,
        `https://api.notion.com/v1/databases/${expensesDatabaseId}/query`,
        { method: "POST", body: JSON.stringify({ page_size: 5 }) },
      );

      if (expenseResponse.ok) {
        const expenseData = (await expenseResponse.json()) as NotionQueryResponse;

        for (const page of expenseData.results) {
          const titleProp = Object.values(page.properties).find((p: any) => p.type === "title") as any;
          const expenseName = titleProp?.title?.[0]?.plain_text || "Pengeluaran";

          let relatedArea = "Area Tidak Diketahui";
          const dateProp = Object.values(page.properties).find(
            (p: any) => p.type === "date" || p.type === "created_time",
          ) as any;

          let activityDate = "";
          if (dateProp?.type === "date") activityDate = dateProp.date?.start || "";
          if (dateProp?.type === "created_time") activityDate = dateProp.created_time || "";

          const formulaAmountProp = Object.values(page.properties).find(
            (p: any) => p.type === "formula" && p.formula?.type === "number",
          ) as any;
          const numberAmountProp = Object.values(page.properties).find(
            (p: any) => p.type === "number" && typeof p.number === "number",
          ) as any;
          const amount = formulaAmountProp?.formula?.number ?? numberAmountProp?.number ?? 0;

          const relationPropId = expensesMappings?.labaRugi?.propertyId;
          const relationProp = relationPropId
            ? Object.values(page.properties).find((p: any) => p.id === relationPropId) as any
            : null;
          const relationId = relationProp?.relation?.[0]?.id;
          if (relationId) relatedArea = areaMap[relationId] || "Area Tidak Diketahui";

          activities.push({
            type: "expense",
            title: expenseName,
            description: `Pengeluaran Rp${amount.toLocaleString("id-ID")} • ${relatedArea}`,
            time: formatRelativeTime(activityDate),
          });
        }
      }
    } catch (err) {
      if (err instanceof NotionTokenInvalidError) throw err;
    }
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

  try {
    const connection = await getNotionConnection(userId);

    const [labaRugiMapping] = await db
      .select()
      .from(fieldMappingsTable)
      .where(and(
        eq(fieldMappingsTable.userId, userId),
        eq(fieldMappingsTable.databaseType, "laba_rugi"),
      ));

    const [panenMapping] = await db
      .select()
      .from(fieldMappingsTable)
      .where(and(
        eq(fieldMappingsTable.userId, userId),
        eq(fieldMappingsTable.databaseType, "panen"),
      ));

    const [expensesMapping] = await db
      .select()
      .from(fieldMappingsTable)
      .where(and(
        eq(fieldMappingsTable.userId, userId),
        eq(fieldMappingsTable.databaseType, "expenses"),
      ));

    console.log("EXPENSE DB:", expensesMapping?.notionDatabaseId);

    const dbLabaRugiId = labaRugiMapping?.notionDatabaseId;
    const mappingsLabaRugi = labaRugiMapping?.mappings || {};

    if (!dbLabaRugiId) {
      res.status(404).json({ error: "Database Laba Rugi belum disetup di Pengaturan." });
      return;
    }

    const [resultLabaRugi, harvestMap] = await Promise.all([
      queryLabaRugi(userId, connection.accessToken, dbLabaRugiId, mappingsLabaRugi),
      panenMapping?.notionDatabaseId
        ? queryHarvestByArea(userId, connection.accessToken, panenMapping.notionDatabaseId, panenMapping.mappings || {})
        : Promise.resolve({ global: 0 } as Record<string, number>),
    ]);

    const finalAreas = resultLabaRugi.areas.map((area) => ({
      ...area,
      harvestWeight: harvestMap[area.id] || 0,
    }));

    const areaMap: Record<string, string> = {};
    for (const area of finalAreas) {
      areaMap[area.id] = area.name;
    }

    const totalProfit = resultLabaRugi.totalPendapatan - resultLabaRugi.totalPengeluaran;
    const hpp = resultLabaRugi.totalPengeluaran / (harvestMap.global || 1);
    const bepProgress = (resultLabaRugi.totalPendapatan / (resultLabaRugi.totalModal || 1)) * 100;

    const activities = panenMapping?.notionDatabaseId
      ? await queryRecentActivities(
          userId,
          connection.accessToken,
          panenMapping.notionDatabaseId,
          expensesMapping?.notionDatabaseId || "",
          expensesMapping?.mappings || {},
          areaMap,
          panenMapping?.mappings || {},
        )
      : [];

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
        averageRevenuePerKg: resultLabaRugi.totalPendapatan / (harvestMap.global || 1),
      },
      operational: {
        totalAreas: finalAreas.length,
        activeAreas: finalAreas.length,
      },
      insight: {
        businessStatus: resultLabaRugi.marginTotal > 0 ? "Profitable" : "Developing",
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
      activities,
    });
  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    throw err;
  }
});

export default router;
