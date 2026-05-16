import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, fieldMappingsTable, stagingDataTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import {
  getNotionConnection,
  notionFetch,
  handleNotionErrors,
  NotionTokenInvalidError,
} from "../lib/notionClient";
import { notionCache, getDashboardCacheKey, delay } from "../lib/notionCache";

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

      // Anti rate-limit: 350 ms gap between paginated requests
      if (hasMore) await delay(350);
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

// ── Staging contribution aggregator ─────────────────────────────────────────
// Reads each pending staging record, extracts contributions per databaseType,
// and mutates harvestMap in-place so area-level harvest weights stay accurate.
interface StagingAggResult {
  financeAmount: number;
  harvestWeight: number;
  inspeksiCount: number;
  perawatanCount: number;
  expenseAreaMap: Record<string, number>; // INI YANG BARU
}

function aggregateStagingContributions(
  records: Array<{ databaseType: string; data: Record<string, unknown> }>,
  harvestMap: Record<string, number>,
): StagingAggResult {
    const result: StagingAggResult = {
    financeAmount: 0,
    harvestWeight: 0,
    inspeksiCount: 0,
    perawatanCount: 0,
    expenseAreaMap: {}, // INI YANG BARU
  };

  for (const record of records) {
    const d = record.data;

    switch (record.databaseType) {
      case "panen": {
        // Field: 'berat' (kg)
        const weight = Number(d.berat ?? d.jumlahPanen ?? 0);
        result.harvestWeight += weight;
        harvestMap.global = (harvestMap.global ?? 0) + weight;
        const areaId = (d.labaRugiId ?? d.area_id) as string | undefined;
        if (areaId) harvestMap[areaId] = (harvestMap[areaId] ?? 0) + weight;
        break;
      }

            case "expenses":
      case "laba_rugi": {
        const nominal =
          d.nominal !== undefined
            ? Number(d.nominal)
            : Number(d.qty ?? 0) * Number(d.hargaPerPcs ?? 0);
        result.financeAmount += nominal;

        // CATAT PENGELUARAN KE MASING-MASING AREA
        const areaId = (d.labaRugiId ?? d.areaId) as string | undefined;
        if (areaId) {
          result.expenseAreaMap[areaId] = (result.expenseAreaMap[areaId] || 0) + nominal;
        }
        break;
      }

      case "inspeksi": {
        // Placeholder — no numeric contribution yet, just count records.
        result.inspeksiCount += 1;
        break;
      }

      case "perawatan": {
        // Placeholder — no numeric contribution yet, just count records.
        result.perawatanCount += 1;
        break;
      }

      default:
        // Unknown type: silently skip — future-proof for new database types.
        break;
    }
  }

  return result;
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

    // ── DB mapping queries — cheap, always fresh, run in parallel ─────────
    const [[labaRugiMapping], [panenMapping], [expensesMapping]] = await Promise.all([
      db.select().from(fieldMappingsTable).where(and(
        eq(fieldMappingsTable.userId, userId),
        eq(fieldMappingsTable.databaseType, "laba_rugi"),
      )),
      db.select().from(fieldMappingsTable).where(and(
        eq(fieldMappingsTable.userId, userId),
        eq(fieldMappingsTable.databaseType, "panen"),
      )),
      db.select().from(fieldMappingsTable).where(and(
        eq(fieldMappingsTable.userId, userId),
        eq(fieldMappingsTable.databaseType, "expenses"),
      )),
    ]);

    const dbLabaRugiId = labaRugiMapping?.notionDatabaseId;
    const mappingsLabaRugi = labaRugiMapping?.mappings || {};

    if (!dbLabaRugiId) {
      res.status(404).json({ error: "Database Laba Rugi belum disetup di Pengaturan." });
      return;
    }

    // ── STEP A: Cache check (Notion data only) ────────────────────────────
    const cacheKey = getDashboardCacheKey(userId);

    type NotionCached = {
      resultLabaRugi: Awaited<ReturnType<typeof queryLabaRugi>>;
      harvestMapRaw: Record<string, number>;
      activities: any[];
      cachedAt: string;
    };

    let notionCached = notionCache.get<NotionCached>(cacheKey);
    const cacheHit = !!notionCached;

    if (!notionCached) {
      // Cache miss — fetch sequentially with 350 ms delay to stay under Notion rate limit
      req.log.info({ userId }, "Dashboard: cache miss, fetching from Notion sequentially");

      const resultLabaRugi = await queryLabaRugi(
        userId, connection.accessToken, dbLabaRugiId, mappingsLabaRugi,
      );
      await delay(350);

      const harvestMapRaw = panenMapping?.notionDatabaseId
        ? await queryHarvestByArea(
            userId,
            connection.accessToken,
            panenMapping.notionDatabaseId,
            panenMapping.mappings || {},
          )
        : ({ global: 0 } as Record<string, number>);
      await delay(350);

      // Build areaMap needed for the activities query
      const areaMapForActivities: Record<string, string> = {};
      for (const area of resultLabaRugi.areas) areaMapForActivities[area.id] = area.name;

      const activities = panenMapping?.notionDatabaseId
        ? await queryRecentActivities(
            userId,
            connection.accessToken,
            panenMapping.notionDatabaseId,
            expensesMapping?.notionDatabaseId || "",
            expensesMapping?.mappings || {},
            areaMapForActivities,
            panenMapping.mappings || {},
          )
        : [];

      notionCached = { resultLabaRugi, harvestMapRaw, activities, cachedAt: new Date().toISOString() };
      notionCache.set(cacheKey, notionCached);
    } else {
      req.log.info({ userId }, "Dashboard: cache hit, skipping Notion API");
    }

    // ── STEP B: Fresh staging — never cached ─────────────────────────────
    const stagingRecords = await db
      .select()
      .from(stagingDataTable)
      .where(and(
        eq(stagingDataTable.userId, userId),
        eq(stagingDataTable.status, "pending"),
      ));

    // ── STEP C: Aggregate — shallow-copy harvestMap so cache stays immutable
    const harvestMap = { ...notionCached.harvestMapRaw };
    const stagingAgg = aggregateStagingContributions(stagingRecords, harvestMap);

    const { resultLabaRugi } = notionCached;
    const adjustedPengeluaran = resultLabaRugi.totalPengeluaran + stagingAgg.financeAmount;

        const finalAreas = resultLabaRugi.areas.map((area) => {
      const pendingExpense = stagingAgg.expenseAreaMap[area.id] || 0;
      const updatedPengeluaran = area.pengeluaran + pendingExpense;
      const updatedProfit = area.pendapatan - updatedPengeluaran;
      const updatedMargin = area.pendapatan > 0 ? (updatedProfit / area.pendapatan) * 100 : 0;

      return {
        ...area,
        pengeluaran: updatedPengeluaran,
        profit: updatedProfit,
        margin: updatedMargin,
        harvestWeight: harvestMap[area.id] || 0,
      };
    });

    const areaMap: Record<string, string> = {};
    for (const area of finalAreas) areaMap[area.id] = area.name;

    const totalProfit = resultLabaRugi.totalPendapatan - adjustedPengeluaran;

// HITUNG ULANG MARGIN BERDASARKAN STAGING
const recalculatedMargin = resultLabaRugi.totalPendapatan > 0 
  ? (totalProfit / resultLabaRugi.totalPendapatan) * 100 
  : 0;

const hpp = adjustedPengeluaran / (harvestMap.global || 1);

    const bepProgress = (resultLabaRugi.totalPendapatan / (resultLabaRugi.totalModal || 1)) * 100;

    // ── STEP D: Response ──────────────────────────────────────────────────
    res.json({
      
      financial: {
        totalModal: resultLabaRugi.totalModal,
        totalPendapatan: resultLabaRugi.totalPendapatan,
        totalPengeluaran: adjustedPengeluaran,
        labaRugi: totalProfit,
        marginTotal: recalculatedMargin, // SUDAH DIGANTI PAKAI HASIL HITUNGAN BARU
        bepProgress,
      },

      production: {
        totalHarvestWeight: harvestMap.global,
        hpp,
        averageRevenuePerKg: resultLabaRugi.totalPendapatan / (harvestMap.global || 1),
      },
      stagingStats: {
        pendingCount: stagingRecords.length,
        pendingFinanceAmount: stagingAgg.financeAmount,
        pendingWeight: stagingAgg.harvestWeight,
        pendingInspeksiCount: stagingAgg.inspeksiCount,
        pendingPerawatanCount: stagingAgg.perawatanCount,
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
      activities: notionCached.activities,
      cacheInfo: {
        hit: cacheHit,
        cachedAt: notionCached.cachedAt,
      },
    });
  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    throw err;
  }
});

// DELETE /api/dashboard/cache — manual cache invalidation
router.delete("/dashboard/cache", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const cacheKey = getDashboardCacheKey(userId);
  const deletedCount = notionCache.del(cacheKey);

  req.log.info({ userId, deletedCount }, "Dashboard: cache manually invalidated");

  res.json({ success: true, cleared: deletedCount > 0 });
});

export default router;
