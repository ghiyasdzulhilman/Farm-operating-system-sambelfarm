import { Router } from "express";
import { db, pengeluaranTable, produkMasterTable, stockMovementTable, kategoriKeuanganTable, areasTable, siklusTanamTable } from "@workspace/db";
import { eq, desc, and, or, isNull } from "drizzle-orm";
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
    if (!req.organisasiId) { res.status(403).json({ error: "BELUM_ONBOARDING" }); return; } // 🚀 PROTEKSI TENANT

    // 1. Tangkap parameter filter dari frontend
    const statusSiklus = req.query.statusSiklus as string;

    // 2. Siapkan kondisi filter
    // 🚀 INJEKSI TENANT SEBAGAI KONDISI WAJIB PERTAMA
    let conditions = [eq(pengeluaranTable.organisasiId, req.organisasiId)];

    if (statusSiklus === "aktif") {
      // Tampilkan Biaya Umum (siklus NULL) ATAU Siklus yang masih Aktif
      conditions.push(
        or(
          eq(siklusTanamTable.status, "Aktif"),
          isNull(pengeluaranTable.siklusId)
        )
      );
    } else if (statusSiklus === "selesai") {
      // Tampilkan hanya yang benar-benar masuk siklus yang sudah Selesai
      conditions.push(eq(siklusTanamTable.status, "Selesai"));
    }

    // 3. Tarik data relasi nama area, siklus, dan kategori sekalian
    const data = await db
      .select({
        id: pengeluaranTable.id,
        areaId: pengeluaranTable.areaId,
        siklusId: pengeluaranTable.siklusId,
        kategoriId: pengeluaranTable.kategoriId,
        produkId: pengeluaranTable.produkId,
        pekerjaId: pengeluaranTable.pekerjaId,
        tanggal: pengeluaranTable.tanggal,
        namaItem: pengeluaranTable.namaItem,
        satuanKerja: pengeluaranTable.satuanKerja,
        kuantitas: pengeluaranTable.kuantitas,
        hargaSatuan: pengeluaranTable.hargaSatuan,
        totalBiaya: pengeluaranTable.totalBiaya,
        isPembelianStok: pengeluaranTable.isPembelianStok,
        catatan: pengeluaranTable.catatan,
        createdAt: pengeluaranTable.createdAt,
        
        // Data Join Tambahan (Resolusi Nama)
        areaName: areasTable.name,
        namaSiklus: siklusTanamTable.namaSiklus,
        kategoriName: kategoriKeuanganTable.nama,
      })
      .from(pengeluaranTable)
      .leftJoin(areasTable, eq(pengeluaranTable.areaId, areasTable.id))
      .leftJoin(siklusTanamTable, eq(pengeluaranTable.siklusId, siklusTanamTable.id))
      .leftJoin(kategoriKeuanganTable, eq(pengeluaranTable.kategoriId, kategoriKeuanganTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
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
      isPembelianStok,
      produkId,
      kuantitas,
      areaId // 🚀 SUNTIKAN BARU: Tangkap areaId dari frontend
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

   // 🚀 PINDAHKAN CEK TENANT KE ATAS BIAR NGGAK ADA QUERY DATABASE YANG JALAN SIA-SIA
    if (!req.organisasiId) { res.status(403).json({ error: "BELUM_ONBOARDING" }); return; }

    // 🚀 SUNTIKAN BARU: Cari Siklus Tanam yang Aktif jika areaId dikirim
    let activeSiklusId = null;
    if (areaId) {
      const [activeCycle] = await db
        .select({ id: siklusTanamTable.id })
        .from(siklusTanamTable)
        .where(
          and(
            eq(siklusTanamTable.areaId, areaId),
            eq(siklusTanamTable.status, "Aktif"),
            eq(siklusTanamTable.organisasiId, req.organisasiId) // 🚀 FILTER TENANT
          )
        )
        .limit(1);
      
      if (activeCycle) {
        activeSiklusId = activeCycle.id;
      }
    }

    // Lacak identitas pekerja yang melakukan input
    const pekerjaId = await getPekerjaIdFromClerk(userId);

    // Ambil nama kategori & data produk master
    const [kategoriData] = await db.select({ nama: kategoriKeuanganTable.nama })
      .from(kategoriKeuanganTable)
      .where(
        and(eq(kategoriKeuanganTable.id, kategoriId), eq(kategoriKeuanganTable.organisasiId, req.organisasiId)) // 🚀 WAJIB FILTER TENANT
      );
      
    let produkNama = null;
    let produkSatuan = "lumpsum";

    if (isPembelianStok) {

      // 🚀 FILTER TENANT: Pastikan yang dicari beneran produk dari organisasinya
      const [p] = await db.select({ nama: produkMasterTable.nama, satuanDasar: produkMasterTable.satuanDasar })
        .from(produkMasterTable)
        .where(
          and(eq(produkMasterTable.id, produkId), eq(produkMasterTable.organisasiId, req.organisasiId))
        );

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
        organisasiId: req.organisasiId, // 🚀 INJEKSI TENANT KE PENGELUARAN
        
        // 🚀 FIX: Masukkan areaId dan siklusId secara dinamis!
        areaId: areaId || null, 
        siklusId: activeSiklusId, 
        
        kategoriId,
        tanggal: new Date(tanggal),
        namaItem: fallbackNamaItem, // ✅ SEKARANG MURNI NAMA ITEM AJA

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
        .where(
          and(eq(produkMasterTable.id, produkId), eq(produkMasterTable.organisasiId, req.organisasiId)) // 🚀 FILTER TENANT
        );

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
        organisasiId: req.organisasiId, // 🚀 INJEKSI TENANT KE LEDGER
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
        .where(
          and(eq(produkMasterTable.id, produk.id), eq(produkMasterTable.organisasiId, req.organisasiId)) // 🚀 FILTER TENANT
        );

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

        if (!req.organisasiId) { res.status(403).json({ error: "BELUM_ONBOARDING" }); return; }

    // 🚀 FIX: Kembalikan query murni narik dari tabel kategori keuangan
    const data = await db
      .select()
      .from(kategoriKeuanganTable)
      .where(eq(kategoriKeuanganTable.organisasiId, req.organisasiId)) // 🚀 FILTER TENANT
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

    if (!req.organisasiId) { res.status(403).json({ error: "BELUM_ONBOARDING" }); return; }

    // 1. Tarik Kategori Keuangan
    const dbKategoriKeuangan = await db
      .select()
      .from(kategoriKeuanganTable)
      .where(
        and(
          eq(kategoriKeuanganTable.tipe, 'pengeluaran'),
          eq(kategoriKeuanganTable.organisasiId, req.organisasiId) // 🚀 FILTER TENANT
        )
      )
      .orderBy(kategoriKeuanganTable.nama);

    // 🚀 SUNTIKAN BARU: Tarik Data Area + Siklus Aktif (Sama persis kayak di harvest.ts)
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
      )
      .where(eq(areasTable.organisasiId, req.organisasiId)); // 🚀 FILTER TENANT

    const formattedAreas = dbAreas.map(a => ({ 
      id: a.id, 
      name: a.namaSiklus ? `${a.name} - ${a.namaSiklus}` : a.name 
    }));

    res.json({ 
      success: true,
      kategoriKeuangan: dbKategoriKeuangan,
      areas: formattedAreas // 🚀 Kirim array area ke frontend!
    });

  } catch (err) {
    console.error("[GET PENGELUARAN DROPDOWN ERROR]:", err);
    res.status(500).json({ error: "Gagal mengambil opsi dropdown pengeluaran." }); 
  }
});


export default router;
