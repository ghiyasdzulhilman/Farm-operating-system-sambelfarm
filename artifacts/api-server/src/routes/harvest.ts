import { Router } from "express";
import { db, panenTable, areasTable, siklusTanamTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { getPekerjaIdFromClerk } from "../lib/authHelpers";

const router = Router();

// ==========================================
// 1. GET DROPDOWN OPTIONS (Area & Siklus Aktif)
// ==========================================
router.get("/harvest/dropdown", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const [areas, siklusAktif] = await Promise.all([
      db.select().from(areasTable).orderBy(areasTable.name),
      db.select()
        .from(siklusTanamTable)
        .where(eq(siklusTanamTable.status, "Aktif"))
        .orderBy(siklusTanamTable.namaSiklus)
    ]);

    res.json({ success: true, areas, siklus: siklusAktif });
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

    // Join dengan areasTable dan siklusTanamTable buat dapetin nama
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
// 3. POST PANEN BARU
// ==========================================
router.post("/harvest", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const {
      areaId,
      siklusId,
      tanggal,
      kegiatan,
      kuantitasKg,
      hargaJualPerKg,
      kualitas,
      channelPenjualan,
      catatan
    } = req.body;

    // --- A. VALIDASI DASAR ---
    if (!kuantitasKg || hargaJualPerKg === undefined || !tanggal) {
      res.status(400).json({ error: "Tanggal, kuantitas, dan harga jual wajib diisi." });
      return;
    }

    const qtyNum = Number(kuantitasKg);
    const hargaNum = Math.round(Number(hargaJualPerKg));
    
    if (qtyNum < 0 || hargaNum < 0) {
      res.status(400).json({ error: "Kuantitas dan harga tidak boleh negatif." });
      return;
    }

    // 🧮 RUMUS KEJUJURAN DATA (Sesuai constraint database)
    const totalPendapatanKalkulasi = Math.round(qtyNum * hargaNum);

    const pekerjaId = await getPekerjaIdFromClerk(userId);

    // --- B. INSERT DATABASE ---
    const [newHarvest] = await db.insert(panenTable).values({
      areaId: areaId || null,
      siklusId: siklusId || null,
      tanggal: new Date(tanggal),
      kegiatan: kegiatan || "Panen Rutin",
      kuantitasKg: String(qtyNum), // Kolom numeric Drizzle butuh string
      hargaJualPerKg: hargaNum, // Kolom integer
      totalPendapatan: totalPendapatanKalkulasi, // Kolom integer, dihitung paksa backend
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
    const {
      areaId,
      siklusId,
      tanggal,
      kegiatan,
      kuantitasKg,
      hargaJualPerKg,
      kualitas,
      channelPenjualan,
      catatan
    } = req.body;

    // Pastikan datanya ada
    const existing = await db.select().from(panenTable).where(eq(panenTable.id, harvestId));
    if (existing.length === 0) {
      res.status(404).json({ error: "Data panen tidak ditemukan." });
      return;
    }

    const qtyNum = Number(kuantitasKg);
    const hargaNum = Math.round(Number(hargaJualPerKg));
    
    if (qtyNum < 0 || hargaNum < 0) {
      res.status(400).json({ error: "Kuantitas dan harga tidak boleh negatif." });
      return;
    }

    // 🧮 Hitung ulang total pendapatan
    const totalPendapatanKalkulasi = Math.round(qtyNum * hargaNum);

    // --- UPDATE DATABASE ---
    const [updatedHarvest] = await db.update(panenTable).set({
      areaId: areaId || null,
      siklusId: siklusId || null,
      tanggal: tanggal ? new Date(tanggal) : undefined,
      kegiatan: kegiatan,
      kuantitasKg: String(qtyNum), 
      hargaJualPerKg: hargaNum,
      totalPendapatan: totalPendapatanKalkulasi, 
      kualitas: kualitas || null,
      channelPenjualan: channelPenjualan || null,
      catatan: catatan || null,
      updatedAt: new Date(), // Set waktu update
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

    const harvestId = req.params.id;

    const [deletedHarvest] = await db
      .delete(panenTable)
      .where(eq(panenTable.id, harvestId))
      .returning();

    if (!deletedHarvest) {
      res.status(404).json({ error: "Data panen tidak ditemukan." });
      return;
    }

    res.json({ success: true, message: "Data panen berhasil dihapus." });
  } catch (err) {
    console.error("[DELETE HARVEST ERROR]:", err);
    res.status(500).json({ error: "Gagal menghapus data panen." });
  }
});

export default router;
