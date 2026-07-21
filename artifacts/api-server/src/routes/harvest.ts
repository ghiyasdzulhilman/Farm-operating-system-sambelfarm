import { Router } from "express";
import { db, panenTable, areasTable, siklusTanamTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { getPekerjaIdFromClerk } from "../lib/authHelpers";

const router = Router();

// ==========================================
// 1. GET DROPDOWN OPTIONS (Area-Siklus Digabung) 🚀
// ==========================================
router.get("/harvest/dropdown", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const dbAreas = await db
      .select({
        id: areasTable.id,
        name: areasTable.name,
        namaSiklus: siklusTanamTable.namaSiklus,
      })
      .from(areasTable)
      .leftJoin(
        siklusTanamTable,
        and(
          eq(areasTable.id, siklusTanamTable.areaId),
          eq(siklusTanamTable.status, "Aktif")
        )
      );

    // 💡 Gabungkan string buat UI Pill Button
    const formattedAreas = dbAreas.map(a => ({ 
      id: a.id, 
      name: a.namaSiklus ? `${a.name} - ${a.namaSiklus}` : a.name 
    }));

    res.json({ success: true, areas: formattedAreas });
  } catch (err) {
    console.error("[GET HARVEST DROPDOWN ERROR]:", err);
    res.status(500).json({ error: "Gagal mengambil data opsi panen." });
  }
});

// ==========================================
// 2. GET SEMUA RIWAYAT PANEN
// ==========================================
router.get("/harvest", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const data = await db
      .select({
        id: panenTable.id,
        tanggal: panenTable.tanggal,
        kegiatan: panenTable.kegiatan,
        kuantitasKg: panenTable.kuantitasKg,
        hargaJualPerKg: panenTable.hargaJualPerKg,
        totalPendapatan: panenTable.totalPendapatan,
        kualitas: panenTable.kualitas,
        channelPenjualan: panenTable.channelPenjualan,
        catatan: panenTable.catatan,
        areaId: panenTable.areaId,
        siklusId: panenTable.siklusId,
        areaName: areasTable.name,
        siklusName: siklusTanamTable.namaSiklus,
      })
      .from(panenTable)
      .leftJoin(areasTable, eq(panenTable.areaId, areasTable.id))
      .leftJoin(siklusTanamTable, eq(panenTable.siklusId, siklusTanamTable.id))
      .orderBy(desc(panenTable.tanggal));

    res.json({ success: true, data });
  } catch (err) {
    console.error("[GET HARVEST ERROR]:", err);
    res.status(500).json({ error: "Gagal mengambil data panen." });
  }
});

// ==========================================
// 3. POST PANEN BARU (Auto-Siklus Logic) 🚀
// ==========================================
router.post("/harvest", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const {
      areaId, // Frontend HANYA ngirim ini
      tanggal,
      kegiatan,
      kuantitasKg,
      hargaJualPerKg,
      kualitas,
      channelPenjualan,
      catatan
    } = req.body;

    if (!kuantitasKg || hargaJualPerKg === undefined || !tanggal || !areaId) {
      res.status(400).json({ error: "Area, Tanggal, Kuantitas, dan Harga Jual wajib diisi." });
      return;
    }

    const qtyNum = Number(kuantitasKg);
    const hargaNum = Math.round(Number(hargaJualPerKg));
    if (qtyNum < 0 || hargaNum < 0) {
      res.status(400).json({ error: "Kuantitas dan harga tidak boleh negatif." }); return;
    }

    // 🔍 CARI SIKLUS AKTIF OTOMATIS
    const [activeCycle] = await db
      .select({ id: siklusTanamTable.id })
      .from(siklusTanamTable)
      .where(
        and(
          eq(siklusTanamTable.areaId, areaId),
          eq(siklusTanamTable.status, "Aktif")
        )
      )
      .limit(1);

    const totalPendapatanKalkulasi = Math.round(qtyNum * hargaNum);
    const pekerjaId = await getPekerjaIdFromClerk(userId);

    const [newHarvest] = await db.insert(panenTable).values({
      areaId: areaId,
      siklusId: activeCycle ? activeCycle.id : null, // 🚀 Masuk otomatis
      tanggal: new Date(tanggal),
      kegiatan: kegiatan || "Panen Rutin",
      kuantitasKg: String(qtyNum),
      hargaJualPerKg: hargaNum,
      totalPendapatan: totalPendapatanKalkulasi,
      kualitas: kualitas || null,
      channelPenjualan: channelPenjualan || null,
      catatan: catatan || null,
      createdBy: pekerjaId,
    }).returning();

    res.status(201).json({ success: true, data: newHarvest });
  } catch (err: any) {
    console.error("[POST HARVEST ERROR]:", err);
    res.status(500).json({ error: "Gagal menyimpan data panen." });
  }
});

// ==========================================
// 4. PUT / EDIT PANEN
// ==========================================
router.put("/harvest/:id", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const harvestId = req.params.id;
    const { areaId, tanggal, kegiatan, kuantitasKg, hargaJualPerKg, kualitas, channelPenjualan, catatan } = req.body;

    const qtyNum = Number(kuantitasKg);
    const hargaNum = Math.round(Number(hargaJualPerKg));

    // 🔑 ATOMIC UPDATE: Jika areaId berubah, update siklusId-nya juga
    let finalSiklusId = undefined;
    if (areaId) {
      const [activeCycle] = await db.select({ id: siklusTanamTable.id }).from(siklusTanamTable)
        .where(and(eq(siklusTanamTable.areaId, areaId), eq(siklusTanamTable.status, "Aktif"))).limit(1);
      finalSiklusId = activeCycle ? activeCycle.id : null;
    }

    const [updatedHarvest] = await db.update(panenTable).set({
      areaId: areaId || undefined,
      siklusId: finalSiklusId !== undefined ? finalSiklusId : undefined,
      tanggal: tanggal ? new Date(tanggal) : undefined,
      kegiatan: kegiatan,
      kuantitasKg: qtyNum ? String(qtyNum) : undefined, 
      hargaJualPerKg: hargaNum,
      totalPendapatan: (qtyNum && hargaNum) ? Math.round(qtyNum * hargaNum) : undefined, 
      kualitas: kualitas,
      channelPenjualan: channelPenjualan,
      catatan: catatan,
      updatedAt: new Date(),
    })
    .where(eq(panenTable.id, harvestId))
    .returning();

    res.json({ success: true, data: updatedHarvest });
  } catch (err) {
    console.error("[PUT HARVEST ERROR]:", err);
    res.status(500).json({ error: "Gagal mengubah data panen." });
  }
});

// ==========================================
// 5. DELETE PANEN
// ==========================================
router.delete("/harvest/:id", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    await db.delete(panenTable).where(eq(panenTable.id, req.params.id));
    res.json({ success: true, message: "Data panen berhasil dihapus." });
  } catch (err) { res.status(500).json({ error: "Gagal menghapus data panen." }); }
});

export default router;
