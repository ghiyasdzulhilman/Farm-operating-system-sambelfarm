import { Router } from "express";
import { db, panenTable, areasTable, siklusTanamTable } from "@workspace/db";
import { eq, desc, and, or, isNull } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { getPekerjaIdFromClerk } from "../lib/authHelpers";

const router = Router();

// ==========================================
// 1. GET DROPDOWN OPTIONS (Area-Siklus Digabung)
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

    // 1. Tangkap parameter filter dari frontend
    const statusSiklus = req.query.statusSiklus as string;

    // 2. Siapkan kondisi filter
    let conditions = [];
    if (statusSiklus === "aktif") {
      // Tampilkan Panen tanpa siklus (Null) ATAU Siklus yang masih Aktif
      conditions.push(
        or(
          eq(siklusTanamTable.status, "Aktif"),
          isNull(panenTable.siklusId)
        )
      );
    } else if (statusSiklus === "selesai") {
      // Tampilkan hanya yang siklusnya sudah Selesai
      conditions.push(eq(siklusTanamTable.status, "Selesai"));
    }

    // 3. Query dengan suntikan .where()
    const data = await db
      .select({
        id: panenTable.id,
        tanggal: panenTable.tanggal,
        kegiatan: panenTable.kegiatan,
        kuantitasKg: panenTable.kuantitasKg,
        hargaJualPerKg: panenTable.hargaJualPerKg,
        totalPendapatan: panenTable.totalPendapatan,
        kualitas: panenTable.kualitas,
        catatan: panenTable.catatan,
        areaId: panenTable.areaId,
        siklusId: panenTable.siklusId,
        areaName: areasTable.name,
        namaSiklus: siklusTanamTable.namaSiklus,
      })
      .from(panenTable)
      .leftJoin(areasTable, eq(panenTable.areaId, areasTable.id))
      .leftJoin(siklusTanamTable, eq(panenTable.siklusId, siklusTanamTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
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
      tanggal,
      kegiatan,
      kuantitasKg,
      hargaJualPerKg,
      kualitas,
      catatan
    } = req.body;

    if (kuantitasKg === undefined || hargaJualPerKg === undefined || !tanggal || !areaId) {
      res.status(400).json({ error: "Area, Tanggal, Kuantitas, dan Harga Jual wajib diisi." });
      return;
    }

    const qtyNum = Number(kuantitasKg);
    const hargaNum = Math.round(Number(hargaJualPerKg));
    
    // FIX: Tambah validasi isNaN biar input huruf gak tembus
    if (isNaN(qtyNum) || isNaN(hargaNum) || qtyNum < 0 || hargaNum < 0) {
      res.status(400).json({ error: "Kuantitas dan harga harus berupa angka positif." }); 
      return;
    }

    const [activeCycle] = await db
      .select({ id: siklusTanamTable.id })
      .from(siklusTanamTable)
      .where(and(eq(siklusTanamTable.areaId, areaId), eq(siklusTanamTable.status, "Aktif")))
      .limit(1);

    const totalPendapatanKalkulasi = Math.round(qtyNum * hargaNum);
    const pekerjaId = await getPekerjaIdFromClerk(userId);

    const [newHarvest] = await db.insert(panenTable).values({
      areaId: areaId,
      siklusId: activeCycle ? activeCycle.id : null,
      tanggal: new Date(tanggal),
      kegiatan: kegiatan || "Panen Rutin",
      kuantitasKg: String(qtyNum),
      hargaJualPerKg: hargaNum,
      totalPendapatan: totalPendapatanKalkulasi,
      kualitas: kualitas || null,
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
    const { areaId, tanggal, kegiatan, kuantitasKg, hargaJualPerKg, kualitas, catatan } = req.body;

    // FIX 1: Ambil data existing dari database untuk jaga-jaga kalau update parsial
    const [existingHarvest] = await db
      .select()
      .from(panenTable)
      .where(eq(panenTable.id, harvestId))
      .limit(1);

    if (!existingHarvest) {
      res.status(404).json({ error: "Data panen tidak ditemukan." });
      return;
    }

    // FIX 2: Tentukan angka valid dengan fallback ke data lama jika frontend tidak kirim
    const finalQty = kuantitasKg !== undefined ? Number(kuantitasKg) : Number(existingHarvest.kuantitasKg);
    const finalHarga = hargaJualPerKg !== undefined ? Math.round(Number(hargaJualPerKg)) : existingHarvest.hargaJualPerKg;

    if (isNaN(finalQty) || isNaN(finalHarga) || finalQty < 0 || finalHarga < 0) {
      res.status(400).json({ error: "Kuantitas dan harga harus berupa angka positif." });
      return;
    }

    let finalSiklusId = existingHarvest.siklusId;
    // Cek ulang siklus HANYA JIKA areaId diubah dan berbeda dari sebelumnya
    if (areaId && areaId !== existingHarvest.areaId) {
      const [activeCycle] = await db.select({ id: siklusTanamTable.id })
        .from(siklusTanamTable)
        .where(and(eq(siklusTanamTable.areaId, areaId), eq(siklusTanamTable.status, "Aktif")))
        .limit(1);
      finalSiklusId = activeCycle ? activeCycle.id : null;
    }

    const [updatedHarvest] = await db.update(panenTable).set({
      areaId: areaId !== undefined ? areaId : existingHarvest.areaId,
      siklusId: finalSiklusId,
      tanggal: tanggal ? new Date(tanggal) : existingHarvest.tanggal,
      kegiatan: kegiatan !== undefined ? kegiatan : existingHarvest.kegiatan,
      kuantitasKg: String(finalQty), 
      hargaJualPerKg: finalHarga,
      totalPendapatan: Math.round(finalQty * finalHarga), // FIX 3: Selalu kalkulasi ulang berdasarkan fallback
      kualitas: kualitas !== undefined ? kualitas : existingHarvest.kualitas,
      catatan: catatan !== undefined ? catatan : existingHarvest.catatan,
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
  // [Tidak ada perubahan]
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
    await db.delete(panenTable).where(eq(panenTable.id, req.params.id));
    res.json({ success: true, message: "Data panen berhasil dihapus." });
  } catch (err) { res.status(500).json({ error: "Gagal menghapus data panen." }); }
});

export default router;
