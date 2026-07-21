import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { 
  areasTable, 
  siklusTanamTable, 
  panenTable, 
  pengeluaranTable 
} from "@workspace/db"; // Sesuaikan path jika berbeda
import { sql, desc } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

const router: IRouter = Router();

// Fungsi helper buat ngerapihin output angka dari hasil aggregate Drizzle (Postgres SUM return string)
const safeNumber = (val: any) => Number(val) || 0;

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // ── 1. AMBIL SEMUA DATA AGREGASI SECARA PARALEL (SUPER KILAT) ──
    const [
      areas,
      modalSiklusRaw,
      panenRaw,
      pengeluaranRaw,
      recentPanen,
      recentPengeluaran
    ] = await Promise.all([
      // Ambil daftar area
      db.select({ id: areasTable.id, name: areasTable.name }).from(areasTable),
      
      // Aggregate Modal Awal per Area
      db.select({
        areaId: siklusTanamTable.areaId,
        totalModal: sql<number>`SUM(${siklusTanamTable.modalAwal})`.mapWith(Number)
      }).from(siklusTanamTable).groupBy(siklusTanamTable.areaId),

      // Aggregate Panen per Area (Pendapatan & Berat)
      db.select({
        areaId: panenTable.areaId,
        totalPendapatan: sql<number>`SUM(${panenTable.totalPendapatan})`.mapWith(Number),
        totalBerat: sql<number>`SUM(${panenTable.kuantitasKg})`.mapWith(Number)
      }).from(panenTable).groupBy(panenTable.areaId),

      // Aggregate Pengeluaran per Area (Total Biaya)
      db.select({
        areaId: pengeluaranTable.areaId,
        totalBiaya: sql<number>`SUM(${pengeluaranTable.totalBiaya})`.mapWith(Number)
      }).from(pengeluaranTable).groupBy(pengeluaranTable.areaId),

      // Ambil 5 Aktivitas Panen Terakhir
      db.select({
        id: panenTable.id,
        areaId: panenTable.areaId,
        kegiatan: panenTable.kegiatan,
        kuantitasKg: panenTable.kuantitasKg,
        tanggal: panenTable.tanggal,
      }).from(panenTable).orderBy(desc(panenTable.createdAt)).limit(5),

      // Ambil 5 Aktivitas Pengeluaran Terakhir
      db.select({
        id: pengeluaranTable.id,
        areaId: pengeluaranTable.areaId,
        namaItem: pengeluaranTable.namaItem,
        totalBiaya: pengeluaranTable.totalBiaya,
        tanggal: pengeluaranTable.tanggal,
      }).from(pengeluaranTable).orderBy(desc(pengeluaranTable.createdAt)).limit(5)
    ]);

    // ── 2. OLAH DATA PER AREA (GABUNGAN) ──
    let totalModalGlobal = 0;
    let totalPendapatanGlobal = 0;
    let totalPengeluaranGlobal = 0;
    let totalBeratGlobal = 0;

    // Bikin mapping area buat lookup cepat
    const areaMap = new Map<string, string>();
    areas.forEach(a => areaMap.set(a.id, a.name));

    const finalAreas = areas.map((area) => {
      // Tarik hasil agregasi tiap area
      const modal = modalSiklusRaw.find(m => m.areaId === area.id)?.totalModal || 0;
      const pendapatan = panenRaw.find(p => p.areaId === area.id)?.totalPendapatan || 0;
      const berat = panenRaw.find(p => p.areaId === area.id)?.totalBerat || 0;
      const pengeluaran = pengeluaranRaw.find(e => e.areaId === area.id)?.totalBiaya || 0;

      // Hitung margin jujur per area
      const profit = pendapatan - pengeluaran;
      const margin = pendapatan > 0 
        ? (profit / pendapatan) * 100 
        : (pengeluaran > 0 ? -100 : 0);

      // Tambahkan ke Global Total
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

    // ── 3. KALKULASI GLOBAL ──
    const profitGlobal = totalPendapatanGlobal - totalPengeluaranGlobal;
    const marginGlobal = totalPendapatanGlobal > 0 
      ? (profitGlobal / totalPendapatanGlobal) * 100 
      : (totalPengeluaranGlobal > 0 ? -100 : 0);

    const hpp = totalBeratGlobal > 0 ? (totalPengeluaranGlobal / totalBeratGlobal) : 0;
    const averageRevenuePerKg = totalBeratGlobal > 0 ? (totalPendapatanGlobal / totalBeratGlobal) : 0;
    const bepProgress = totalModalGlobal > 0 ? (totalPendapatanGlobal / totalModalGlobal) * 100 : 0;

    // ── 4. ACTIVITY FEED (GABUNGAN PANEN & PENGELUARAN) ──
    const allActivities = [
      ...recentPanen.map(p => ({
        type: "harvest",
        title: `Panen ${areaMap.get(p.areaId!) || "Area"}`,
        description: `${safeNumber(p.kuantitasKg)}kg berhasil dicatat • ${p.kegiatan}`,
        rawDate: new Date(p.tanggal),
        time: formatDistanceToNow(new Date(p.tanggal), { addSuffix: true, locale: id }),
      })),
      ...recentPengeluaran.map(e => ({
        type: "expense",
        title: e.namaItem,
        description: `Pengeluaran Rp${safeNumber(e.totalBiaya).toLocaleString("id-ID")} • ${areaMap.get(e.areaId!) || "Area"}`,
        rawDate: new Date(e.tanggal),
        time: formatDistanceToNow(new Date(e.tanggal), { addSuffix: true, locale: id }),
      }))
    ];

    // Urutkan gabungan aktivitas dari yang paling baru, lalu potong max 5
    const finalActivities = allActivities
      .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
      .slice(0, 5)
      .map(({ rawDate, ...rest }) => rest); // Buang rawDate dari response

    // ── 5. RESPONSE PAYLOAD KEMBALI KE FRONTEND ──
    res.json({
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
      // Staging stats di-set 0 semua biar frontend (kartu staging) gak error, 
      // bisa dihapus nanti pas clean-up frontend UI.
      stagingStats: {
        pendingCount: 0,
        pendingFinanceAmount: 0,
        pendingWeight: 0,
        pendingInspeksiCount: 0,
        pendingPerawatanCount: 0,
      },
      operational: {
        totalAreas: finalAreas.length,
        activeAreas: finalAreas.length, 
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
      notionDatabaseId: null, // Udah gak pakai notion
      activities: finalActivities,
      cacheInfo: {
        hit: false, 
        cachedAt: null,
      },
    });

  } catch (err) {
    console.error("[DASHBOARD ERR]:", err);
    res.status(500).json({ error: "Gagal mengambil ringkasan dashboard" });
  }
});

export default router;
