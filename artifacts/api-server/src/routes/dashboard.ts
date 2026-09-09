import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { z } from "zod";
import {
  db,
  areasTable,
  siklusTanamTable,
  panenTable,
  pengeluaranTable,
  kategoriKeuanganTable,
} from "@workspace/db";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";

const router: IRouter = Router();

const safeNumber = (value: unknown) => Number(value) || 0;

const dashboardQuerySchema = z.object({
  status: z.enum(["aktif", "selesai"]).default("aktif"),
});

const dateKeyWIB = (value: Date | string) => {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

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

  const parsed = dashboardQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: "Filter dashboard tidak valid",
      details: parsed.error.flatten(),
    });
    return;
  }

  const { status } = parsed.data;

  try {
    const cycleCondition =
      status === "aktif"
        ? eq(siklusTanamTable.status, "Aktif")
        : inArray(siklusTanamTable.status, ["Selesai", "Ditutup"]);

    const contexts = await db
      .select({
        siklusId: siklusTanamTable.id,
        areaId: siklusTanamTable.areaId,
        areaName: areasTable.name,
        namaSiklus: siklusTanamTable.namaSiklus,
        statusSiklus: siklusTanamTable.status,
        tanggalPindahTanam: siklusTanamTable.tanggalPindahTanam,
        modalAwal: siklusTanamTable.modalAwal,
      })
      .from(siklusTanamTable)
      .innerJoin(
        areasTable,
        and(
          eq(siklusTanamTable.areaId, areasTable.id),
          eq(areasTable.organisasiId, req.organisasiId)
        )
      )
      .where(
        and(
          eq(siklusTanamTable.organisasiId, req.organisasiId),
          cycleCondition
        )
      )
      .orderBy(desc(siklusTanamTable.tanggalPindahTanam));

    const cycleIds = contexts.map((context) => context.siklusId);

    const panenRows = cycleIds.length
      ? await db
          .select({
            id: panenTable.id,
            siklusId: panenTable.siklusId,
            areaId: panenTable.areaId,
            tanggal: panenTable.tanggal,
            kegiatan: panenTable.kegiatan,
            kuantitasKg: panenTable.kuantitasKg,
            totalPendapatan: panenTable.totalPendapatan,
          })
          .from(panenTable)
          .where(
            and(
              eq(panenTable.organisasiId, req.organisasiId),
              inArray(panenTable.siklusId, cycleIds)
            )
          )
          .orderBy(desc(panenTable.tanggal))
      : [];

    const expenseScope =
      status === "aktif"
        ? cycleIds.length
          ? or(inArray(pengeluaranTable.siklusId, cycleIds), isNull(pengeluaranTable.siklusId))
          : isNull(pengeluaranTable.siklusId)
        : cycleIds.length
          ? inArray(pengeluaranTable.siklusId, cycleIds)
          : sql`false`;

    const pengeluaranRows = await db
      .select({
        id: pengeluaranTable.id,
        siklusId: pengeluaranTable.siklusId,
        areaId: pengeluaranTable.areaId,
        kategoriId: pengeluaranTable.kategoriId,
        kategoriName: kategoriKeuanganTable.nama,
        tanggal: pengeluaranTable.tanggal,
        namaItem: pengeluaranTable.namaItem,
        totalBiaya: pengeluaranTable.totalBiaya,
      })
      .from(pengeluaranTable)
      .leftJoin(
        kategoriKeuanganTable,
        and(
          eq(pengeluaranTable.kategoriId, kategoriKeuanganTable.id),
          eq(kategoriKeuanganTable.organisasiId, req.organisasiId)
        )
      )
      .where(
        and(
          eq(pengeluaranTable.organisasiId, req.organisasiId),
          expenseScope
        )
      )
      .orderBy(desc(pengeluaranTable.tanggal));

    const factMap = new Map<
      string,
      {
        date: string;
        siklusId: string | null;
        areaId: string | null;
        pendapatan: number;
        pengeluaran: number;
        harvestWeight: number;
        harvestCount: number;
      }
    >();

    const getFact = (date: string, siklusId: string | null, areaId: string | null) => {
      const key = `${date}|${siklusId ?? "general"}|${areaId ?? "general"}`;
      const existing = factMap.get(key);
      if (existing) return existing;

      const fact = {
        date,
        siklusId,
        areaId,
        pendapatan: 0,
        pengeluaran: 0,
        harvestWeight: 0,
        harvestCount: 0,
      };
      factMap.set(key, fact);
      return fact;
    };

    for (const row of panenRows) {
      const fact = getFact(dateKeyWIB(row.tanggal), row.siklusId, row.areaId);
      fact.pendapatan += safeNumber(row.totalPendapatan);
      fact.harvestWeight += safeNumber(row.kuantitasKg);
      fact.harvestCount += 1;
    }

    for (const row of pengeluaranRows) {
      const fact = getFact(dateKeyWIB(row.tanggal), row.siklusId, row.areaId);
      fact.pengeluaran += safeNumber(row.totalBiaya);
    }

    const costFactMap = new Map<
      string,
      {
        date: string;
        siklusId: string | null;
        areaId: string | null;
        kategoriId: string | null;
        kategoriName: string;
        totalBiaya: number;
      }
    >();

    for (const row of pengeluaranRows) {
      const date = dateKeyWIB(row.tanggal);
      const kategoriName = row.kategoriName?.trim() || "Tanpa kategori";
      const key = `${date}|${row.siklusId ?? "general"}|${row.areaId ?? "general"}|${row.kategoriId ?? "uncategorized"}`;
      const existing = costFactMap.get(key);
      if (existing) {
        existing.totalBiaya += safeNumber(row.totalBiaya);
        continue;
      }
      costFactMap.set(key, {
        date,
        siklusId: row.siklusId,
        areaId: row.areaId,
        kategoriId: row.kategoriId,
        kategoriName,
        totalBiaya: safeNumber(row.totalBiaya),
      });
    }

    const contextMap = new Map(contexts.map((context) => [context.siklusId, context]));

    const activities = [
      ...panenRows.map((row) => {
        const context = row.siklusId ? contextMap.get(row.siklusId) : undefined;
        return {
          id: row.id,
          type: "harvest" as const,
          siklusId: row.siklusId,
          areaId: row.areaId,
          occurredAt: row.tanggal.toISOString(),
          title: `Panen ${context?.areaName ?? "Area"}`,
          description: `${safeNumber(row.kuantitasKg)}kg • ${row.kegiatan}`,
        };
      }),
      ...pengeluaranRows.map((row) => {
        const context = row.siklusId ? contextMap.get(row.siklusId) : undefined;
        return {
          id: row.id,
          type: "expense" as const,
          siklusId: row.siklusId,
          areaId: row.areaId,
          occurredAt: row.tanggal.toISOString(),
          title: row.namaItem,
          description: `Rp${safeNumber(row.totalBiaya).toLocaleString("id-ID")} • ${context?.areaName ?? "Biaya umum"}`,
        };
      }),
    ].sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    res.json({
      cycleStatus: status,
      contexts: contexts.map((context) => ({
        ...context,
        modalAwal: safeNumber(context.modalAwal),
        label: `${context.areaName} - ${context.namaSiklus}`,
      })),
      facts: Array.from(factMap.values()).sort((a, b) => b.date.localeCompare(a.date)),
      costFacts: Array.from(costFactMap.values()).sort((a, b) => b.date.localeCompare(a.date)),
      activities,
      meta: {
        generatedAt: new Date().toISOString(),
        timezone: "Asia/Jakarta",
      },
    });
  } catch (err) {
    console.error("[DASHBOARD ERR]:", err);
    res.status(500).json({ error: "Gagal mengambil dataset dashboard" });
  }
});

export default router;
