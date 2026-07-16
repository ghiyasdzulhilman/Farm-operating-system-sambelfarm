import { Router } from "express";
import { db, pengeluaranTable, produkMasterTable, stockMovementTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { getPekerjaIdFromClerk } from "../lib/authHelpers";

const router = Router();

// ==========================================
// 1. GET SEMUA PENGELUARAN (Riwayat Historis)
// ==========================================
router.get("/pengeluaran", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const data = await db
      .select()
      .from(pengeluaranTable)
      .orderBy(desc(pengeluaranTable.tanggal));

    res.json({ success: true, data });
  } catch (err) {
    console.error("[GET PENGELUARAN ERROR]:", err);
    res.status(500).json({ error: "Gagal mengambil data pengeluaran." });
  }
});

// ==========================================
// 2. POST PENGELUARAN BARU (The 3-in-1 Combo)
// ==========================================
router.post("/pengeluaran", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const {
      kategoriId,
      tanggal,
      totalBiaya,
      keterangan,
      siklusId,
      isPembelianStok,
      produkId,
      kuantitas
    } = req.body;

    // --- A. VALIDASI DASAR ---
    if (!kategoriId || !tanggal || totalBiaya === undefined) {
      res.status(400).json({ error: "Kategori, tanggal, dan total biaya wajib diisi." });
      return;
    }

    const biayaNum = Math.round(Number(totalBiaya));
    if (biayaNum < 0) {
      res.status(400).json({ error: "Total biaya tidak boleh negatif." });
      return;
    }

    // --- B. VALIDASI EKSTRA (Jika Beli Stok) ---
    let qtyNum = 0;
    let hargaSatuanNum = 0;
    
    if (isPembelianStok) {
      if (!produkId || !kuantitas) {
        res.status(400).json({ error: "Produk dan kuantitas wajib diisi untuk pembelian stok." });
        return;
      }
      qtyNum = Number(kuantitas);
      if (qtyNum <= 0) {
        res.status(400).json({ error: "Kuantitas pembelian harus lebih dari 0." });
        return;
      }
      // Hitung harga satuan di backend untuk memenuhi constraint DB (Toleransi ABS <= 1)
      hargaSatuanNum = biayaNum / qtyNum;
    }

    // 🕵️‍♂️ Lacak identitas pekerja yang melakukan input
    const pekerjaId = await getPekerjaIdFromClerk(userId);

    // 🚀 --- C. THE 3-IN-1 COMBO (ATOMIC TRANSACTION) ---
    const result = await db.transaction(async (tx) => {
      
      // [AKSI 1] Insert ke tabel pengeluaran
      const [newPengeluaran] = await tx.insert(pengeluaranTable).values({
        kategoriId,
        siklusId: siklusId || null,
        tanggal: new Date(tanggal),
        totalBiaya: biayaNum,
        keterangan: keterangan || null,
        isPembelianStok: Boolean(isPembelianStok),
        produkId: isPembelianStok ? produkId : null,
        kuantitas: isPembelianStok ? String(qtyNum) : null, 
        hargaSatuan: isPembelianStok ? String(hargaSatuanNum) : null,
        createdBy: pekerjaId,
      }).returning();

      // Jika BUKAN pembelian stok (contoh: bayar listrik/gaji), transaksi selesai di sini.
      if (!isPembelianStok) {
        return newPengeluaran;
      }

      // [AKSI 2 & 3] Khusus Pembelian Stok
      const [produk] = await tx
        .select({ id: produkMasterTable.id, stokSaatIni: produkMasterTable.stokSaatIni })
        .from(produkMasterTable)
        .where(eq(produkMasterTable.id, produkId));

      if (!produk) {
        throw new Error("PRODUK_NOT_FOUND");
      }

      const stokSebelum = parseFloat(String(produk.stokSaatIni)) || 0;
      const stokSesudah = stokSebelum + qtyNum;

      // [AKSI 2] Catat ke Ledger/Buku Jurnal Stok
      await tx.insert(stockMovementTable).values({
        produkId: produk.id,
        tipe: "pembelian", 
        delta: qtyNum,
        stokSebelum: stokSebelum,
        stokSesudah: stokSesudah,
        catatan: `Pembelian stok via pengeluaran (Ref ID: ${newPengeluaran.id})`,
      });

      // [AKSI 3] Update Cache Stok Utama
      await tx.update(produkMasterTable)
        .set({ 
          stokSaatIni: stokSesudah,
          updatedAt: new Date()
        })
        .where(eq(produkMasterTable.id, produk.id));

      return {
        ...newPengeluaran,
        _stokUpdateStatus: "Sukses",
        _stokSebelumnya: stokSebelum,
        _stokBaru: stokSesudah
      };
    });

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    console.error("[POST PENGELUARAN ERROR]:", err);
    if (err.message === "PRODUK_NOT_FOUND") {
      res.status(404).json({ error: "Produk yang dibeli tidak ditemukan di database." });
      return;
    }
    res.status(500).json({ error: "Gagal menyimpan pengeluaran." });
  }
});

export default router;
