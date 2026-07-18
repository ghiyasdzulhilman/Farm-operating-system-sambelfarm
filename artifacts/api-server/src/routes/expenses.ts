import { Router } from "express";
import { db, pengeluaranTable, produkMasterTable, stockMovementTable, kategoriKeuanganTable, areasTable, siklusTanamTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
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
// 2. POST PENGELUARAN BARU (Otomatisasi Stok & Harga Master)
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

    // --- B. VALIDASI EKSTRA & LOGIKA KEJUJURAN DATA ---
    // Default untuk pengeluaran biasa (Gaji, Listrik, dll)
    let qtyNum = 1;
    let hargaSatuanNum: string | number = biayaNum; // 🚀 FIX: Izinkan tipe string untuk desimal
    
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
      // 🚀 FIX: Hapus Math.round(), biarkan desimal dengan presisi 3 angka di belakang koma
      hargaSatuanNum = (biayaNum / qtyNum).toFixed(3);
    }

    // Lacak identitas pekerja yang melakukan input
    const pekerjaId = await getPekerjaIdFromClerk(userId);

    // Ambil nama kategori & data produk master
    const [kategoriData] = await db.select({ nama: kategoriKeuanganTable.nama }).from(kategoriKeuanganTable).where(eq(kategoriKeuanganTable.id, kategoriId));
    let produkNama = null;
    let produkSatuan = "lumpsum";
    
    if (isPembelianStok) {
      const [p] = await db.select({ nama: produkMasterTable.nama, satuanDasar: produkMasterTable.satuanDasar }).from(produkMasterTable).where(eq(produkMasterTable.id, produkId));
      if (p) {
        produkNama = p.nama;
        produkSatuan = p.satuanDasar;
      }
    }
    
    const fallbackNamaItem = isPembelianStok && produkNama 
      ? `Beli Stok: ${produkNama}`
      : kategoriData?.nama ? `Biaya ${kategoriData.nama}` : "Biaya Operasional";

    // 🚀 --- C. THE 3-IN-1 COMBO TRANSACTION ---

        const result = await db.transaction(async (tx) => {
      
      // [AKSI 1] Insert ke tabel pengeluaran pakai DATA JUJUR
      const [newPengeluaran] = await tx.insert(pengeluaranTable).values({
        areaId: null, // 🚀 FIX: Set murni jadi Biaya Umum
        siklusId: null, // 🚀 FIX: Set murni jadi Biaya Umum
        kategoriId,
        tanggal: new Date(tanggal),
        namaItem: keterangan ? `${fallbackNamaItem} - ${keterangan}` : fallbackNamaItem,
        totalBiaya: biayaNum,
        catatan: keterangan || null, 
        isPembelianStok: Boolean(isPembelianStok),
        produkId: isPembelianStok ? produkId : null,
        satuanKerja: produkSatuan, 
        kuantitas: String(qtyNum), 
        hargaSatuan: String(hargaSatuanNum), // 🚀 FIX: Bungkus pakai String()
        createdBy: pekerjaId,
      }).returning();

    // Jika BUKAN pembelian stok, urusan selesai di sini.
      if (!isPembelianStok) {
        return newPengeluaran;
      }

      // [AKSI 2 & 3] Khusus Pembelian Stok
      const [produk] = await tx
        // 🚀 FIX: Tarik hargaPerSatuanDasar lama untuk dihitung rata-ratanya
        .select({ 
          id: produkMasterTable.id, 
          stokSaatIni: produkMasterTable.stokSaatIni,
          hargaPerSatuanDasar: produkMasterTable.hargaPerSatuanDasar 
        })
        .from(produkMasterTable)
        .where(eq(produkMasterTable.id, produkId));

      if (!produk) {
        throw new Error("PRODUK_NOT_FOUND");
      }

      const stokSebelum = parseFloat(String(produk.stokSaatIni)) || 0;
      const hargaMasterSebelum = parseFloat(String(produk.hargaPerSatuanDasar)) || 0;
      const stokSesudah = stokSebelum + qtyNum;

    // 🧮 🚀 RUMUS MOVING AVERAGE (RATA-RATA TERTIMBANG)
      let hppBaru = Number(hargaSatuanNum); // Default ke harga beli di nota
      let totalNilaiBeliBaru = qtyNum * Number(hargaSatuanNum); // 🚀 Tarik keluar biar bisa disave ke DB

      // Hitung Moving Average HANYA jika di gudang masih ada stok lama
      if (stokSebelum > 0 && stokSesudah > 0) {
        const totalNilaiAsetLama = stokSebelum * hargaMasterSebelum;
        hppBaru = (totalNilaiAsetLama + totalNilaiBeliBaru) / stokSesudah;
      }
      
      const hppBaruString = hppBaru.toFixed(3); // Rapikan maksimal 3 desimal

      // [AKSI 2] Catat ke Ledger/Buku Jurnal Stok
      await tx.insert(stockMovementTable).values({
        produkId: produk.id,
        tipe: "pembelian", 
        delta: String(qtyNum), 
        stokSebelum: String(stokSebelum), 
        stokSesudah: String(stokSesudah), 
        // 🚀 FIX: Rekam sejarah matematika HPP secara permanen (dibungkus String untuk kolom numeric)
        hargaHppSebelum: String(hargaMasterSebelum), 
        hargaHppSesudah: hppBaruString,
        nilaiPembelianBaru: String(totalNilaiBeliBaru),
        pengeluaranId: newPengeluaran.id, 
        catatan: `Pembelian via pengeluaran (Ref: ${newPengeluaran.id})`,
      });

      // [AKSI 3] Update Cache Stok DAN Otomatis Update Harga Master Terbaru
      await tx.update(produkMasterTable)
        .set({ 
          stokSaatIni: String(stokSesudah), 
          hargaPerSatuanDasar: hppBaruString, // 🚀 FIX: Timpa dengan HPP Moving Average
          updatedAt: new Date()
        })
        .where(eq(produkMasterTable.id, produk.id));

      return {
        ...newPengeluaran,
        _stokUpdateStatus: "Sukses",
        _hargaBaruTercatat: hppBaruString
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

// ==========================================
// 3. GET KATEGORI KEUANGAN (Legacy / Global)
// ==========================================
router.get("/kategori-keuangan", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    // 🚀 FIX: Kembalikan query murni narik dari tabel kategori keuangan
    const data = await db
      .select()
      .from(kategoriKeuanganTable)
      .orderBy(kategoriKeuanganTable.nama);

    res.json({ success: true, data });
  } catch (err) {
    console.error("[GET KATEGORI KEUANGAN ERROR]:", err);
    res.status(500).json({ error: "Gagal mengambil data kategori keuangan." });
  }
});

// ==========================================
// 4. GET DROPDOWN OPTIONS PENGELUARAN 🚀
// ==========================================
router.get("/pengeluaran-dropdown-options", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    // 🚀 FIX: Query areasTable dihapus karena form pengeluaran murni untuk Biaya Umum & Stok
    const dbKategoriKeuangan = await db
      .select()
      .from(kategoriKeuanganTable)
      .where(eq(kategoriKeuanganTable.tipe, 'pengeluaran'))
      .orderBy(kategoriKeuanganTable.nama);

    res.json({ 
      success: true,
      kategoriKeuangan: dbKategoriKeuangan 
    });

  } catch (err) {
    console.error("[GET PENGELUARAN DROPDOWN ERROR]:", err);
    res.status(500).json({ error: "Gagal mengambil opsi dropdown pengeluaran." }); 
  }
});

export default router;
