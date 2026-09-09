import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  areasTable,
  siklusTanamTable,
  panenTable,
  pengeluaranTable,
} from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

const router: IRouter = Router();

const safeNumber = (val: unknown) => Number(val) || 0;

const dashboardQuerySchema = z
  .object({
    areaId: z.string().uuid().optional(),
    siklus: z.enum(["aktif", "selesai", "semua"]).default("aktif"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .refine(
    (value) => Boolean(value.startDate) === Boolean(value.endDate),
    { message: "startDate dan endDate harus dikirim bersamaan" }
  );

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!req.organisasiId) {
    res.status(403).json({ error: "BELUM_ONBOARDING" });
    return;
  }

  const parsedQuery = dashboardQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    res.status(400).json({
      error: "Filter dashboard tidak valid",
      details: parsedQuery.error.flatten(),
    });
    return;
  }

  const { areaId, siklus, startDate, endDate } = parsedQuery.data;

  try {
    // Filter options selalu mengambil seluruh area tenant agar selector tidak kehilangan pilihan.
    const allAreas = await db
      .select({ id: areasTable.id, name: areasTable.name })
      .from(areasTable)
      .where(eq(areasTable.organisasiId, req.organisasiId));

    const scopedAreas = areaId
      ? allAreas.filter((area) => area.id === areaId)
      : allAreas;

    // Siklus diambil sebagai rows supaya status, modal, dan active-area bisa dihitung dari satu sumber.
    const allCycleRows = await db
      .select({
        id: siklusTanamTable.id,
        areaId: siklusTanamTable.areaId,
        status: siklusTanamTable.status,
        modalAwal: siklusTanamTable.modalAwal,
      })
      .from(siklusTanamTable)
      .where(
        and(
          eq(siklusTanamTable.organisasiId, req.organisasiId),
          areaId ? eq(siklusTanamTable.areaId, areaId) : undefined
        )
      );

    const scopedCycles = allCycleRows.filter((cycle) => {
      if (siklus === "aktif") return cycle.status === "Aktif";
      if (siklus === "selesai") return cycle.status === "Selesai" || cycle.status === "Ditutup";
      return true;
    });

    const scopedCycleIds = scopedCycles.map((cycle) => cycle.id);
    const restrictToCycle = siklus !== "semua";

    const panenConditions = [
      eq(panenTable.organisasiId, req.organisasiId),
      areaId ? eq(panenTable.areaId, areaId) : undefined,
      startDate ? sql`${panenTable.tanggal}::date >= ${startDate}::date` : undefined,
      endDate ? sql`${panenTable.tanggal}::date <= ${endDate}::date` : undefined,
      restrictToCycle
        ? scopedCycleIds.length > 0
          ? inArray(panenTable.siklusId, scopedCycleIds)
          : sql`false`
        : undefined,
    ];

    const pengeluaranConditions = [
      eq(pengeluaranTable.organisasiId, req.organisasiId),
      areaId ? eq(pengeluaranTable.areaId, areaId) : undefined,
      startDate ? sql`${pengeluaranTable.tanggal}::date >= ${startDate}::date` : undefined,
      endDate ? sql`${pengeluaranTable.tanggal}::date <= ${endDate}::date` : undefined,
      restrictToCycle
        ? scopedCycleIds.length > 0
          ? inArray(pengeluaranTable.siklusId, scopedCycleIds)
          : sql`false`
        : undefined,
    ];

    const [panenRaw, pengeluaranRaw, recentPanen, recentPengeluaran] = await Promise.all([
      db
        .select({
          areaId: panenTable.areaId,
          totalPendapatan: sql<number>`SUM(${panenTable.totalPendapatan})`.mapWith(Number),
          totalBerat: sql<number>`SUM(${panenTable.kuantitasKg})`.mapWith(Number),
        })
        .from(panenTable)
        .where(and(...panenConditions))
        .groupBy(panenTable.areaId),

      db
        .select({
          areaId: pengeluaranTable.areaId,
          totalBiaya: sql<number>`SUM(${pengeluaranTable.totalBiaya})`.mapWith(Number),
        })
        .from(pengeluaranTable)
        .where(and(...pengeluaranConditions))
        .groupBy(pengeluaranTable.areaId),

      db
        .select({
          id: panenTable.id,
          areaId: panenTable.areaId,
          kegiatan: panenTable.kegiatan,
          kuantitasKg: panenTable.kuantitasKg,
          tanggal: panenTable.tanggal,
        })
        .from(panenTable)
        .where(and(...panenConditions))
        .orderBy(desc(panenTable.tanggal))
        .limit(5),

      db
        .select({
          id: pengeluaranTable.id,
          areaId: pengeluaranTable.areaId,
          namaItem: pengeluaranTable.namaItem,
          totalBiaya: pengeluaranTable.totalBiaya,
          tanggal: pengeluaranTable.tanggal,
        })
        .from(pengeluaranTable)
        .where(and(...pengeluaranConditions))
        .orderBy(desc(pengeluaranTable.tanggal))
        .limit(5),
    ]);

    const areaMap = new Map(allAreas.map((area) => [area.id, area.name]));

    let totalModalGlobal = 0;
    let totalPendapatanGlobal = 0;
    let totalPengeluaranGlobal = 0;
    let totalBeratGlobal = 0;

    const finalAreas = scopedAreas.map((area) => {
      const modal = scopedCycles
        .filter((cycle) => cycle.areaId === area.id)
        .reduce((total, cycle) => total + safeNumber(cycle.modalAwal), 0);
      const pendapatan = panenRaw.find((row) => row.areaId === area.id)?.totalPendapatan || 0;
      const berat = panenRaw.find((row) => row.areaId === area.id)?.totalBerat || 0;
      const pengeluaran = pengeluaranRaw.find((row) => row.areaId === area.id)?.totalBiaya || 0;
      const profit = pendapatan - pengeluaran;
      const margin = pendapatan > 0 ? (profit / pendapatan) * 100 : pengeluaran > 0 ? -100 : 0;

      totalModalGlobal += modal;
      totalPendapatanGlobal += pendapatan;
      totalPengeluaranGlobal += pengeluaran;
      totalBeratGlobal += berat;

      return {
        id: area.id,
        name: area.name,
        modalAwal: modal,
        pendapatan,
        pengeluaran,
        profit,
        margin,
        harvestWeight: berat,
      };
    });

    const profitGlobal = totalPendapatanGlobal - totalPengeluaranGlobal;
    const marginGlobal =
      totalPendapatanGlobal > 0
        ? (profitGlobal / totalPendapatanGlobal) * 100
        : totalPengeluaranGlobal > 0
          ? -100
          : 0;

    const hpp = totalBeratGlobal > 0 ? totalPengeluaranGlobal / totalBeratGlobal : 0;
    const averageRevenuePerKg =
      totalBeratGlobal > 0 ? totalPendapatanGlobal / totalBeratGlobal : 0;
    const bepProgress = totalModalGlobal > 0 ? (totalPendapatanGlobal / totalModalGlobal) * 100 : 0;

    const allActivities = [
      ...recentPanen.map((panen) => ({
        type: "harvest" as const,
        title: `Panen ${areaMap.get(panen.areaId ?? "") || "Area"}`,
        description: `${safeNumber(panen.kuantitasKg)}kg berhasil dicatat • ${panen.kegiatan}`,
        rawDate: new Date(panen.tanggal),
        time: formatDistanceToNow(new Date(panen.tanggal), { addSuffix: true, locale: id }),
      })),
      ...recentPengeluaran.map((expense) => ({
        type: "expense" as const,
        title: expense.namaItem,
        description: `Pengeluaran Rp${safeNumber(expense.totalBiaya).toLocaleString("id-ID")} • ${areaMap.get(expense.areaId ?? "") || "Area"}`,
        rawDate: new Date(expense.tanggal),
        time: formatDistanceToNow(new Date(expense.tanggal), { addSuffix: true, locale: id }),
      })),
    ];

    const finalActivities = allActivities
      .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
      .slice(0, 5)
      .map(({ rawDate, ...activity }) => activity);

    const activeAreaCount = new Set(
      allCycleRows.filter((cycle) => cycle.status === "Aktif").map((cycle) => cycle.areaId)
    ).size;

    res.json({
      filters: {
        areaId: areaId ?? null,
        siklus,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
      },
      filterOptions: {
        areas: allAreas,
      },
      financial: {
        totalModal: totalModalGlobal,
        totalPendapatan: totalPendapatanGlobal,
        totalPengeluaran: totalPengeluaranGlobal,
        labaRugi: profitGlobal,
        marginTotal: marginGlobal,
        bepProgress,
      },
      production: {
        totalHarvestWeight: totalBeratGlobal,
        hpp,
        averageRevenuePerKg,
      },
      operational: {
        totalAreas: scopedAreas.length,
        activeAreas: activeAreaCount,
      },
      insight: {
        businessStatus: marginGlobal > 0 ? "Profitable" : "Developing",
        recommendation:
          marginGlobal < 0
            ? "Usaha masih merugi. Fokus meningkatkan penjualan dan efisiensi biaya."
            : marginGlobal < 15
              ? "Margin rendah, efisiensi operasional perlu ditingkatkan."
              : "Performa usaha dalam kondisi baik.",
      },
      areas: finalAreas,
      currency: "IDR",
      lastUpdated: new Date().toISOString(),
      activities: finalActivities,
    });
  } catch (err) {
    console.error("[DASHBOARD ERR]:", err);
    res.status(500).json({ error: "Gagal mengambil ringkasan dashboard" });
  }
});

export default router;
