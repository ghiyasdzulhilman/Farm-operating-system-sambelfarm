import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, desc, and, or } from "drizzle-orm"; 
import { db, produkMasterTable, stockMovementTable, perawatanProdukTable, pengeluaranTable, adjustStock } from "@workspace/db";

const router: IRouter = Router();

// ==========================================
// 1. GET SEMUA PRODUK (Sembunyikan yang di-Soft Delete)
// ==========================================
router.get("/produk", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    // 🚀 FIX: Filter data, jangan kirim yang udah masuk tong sampah
    const rawData = await db
      .select()
      .from(produkMasterTable)
      .where(eq(produkMasterTable.deleted, false))
      .orderBy(desc(produkMasterTable.createdAt));
    
    // 🚀 FIX: Inject riwayat HPP terakhir ke masing-masing produk menggunakan Promise.all
    const data = await Promise.all(rawData.map(async (item) => {
      
    // Cari 1 transaksi pembelian terakhir di buku gudang untuk produk ini
      const [latestPurchase] = await db
        .select({
          hargaHppSebelum: stockMovementTable.hargaHppSebelum,
          hargaHppSesudah: stockMovementTable.hargaHppSesudah,
          nilaiPembelianBaru: stockMovementTable.nilaiPembelianBaru,
          delta: stockMovementTable.delta, // Qty beli
          stokSebelum: stockMovementTable.stokSebelum,
          stokSesudah: stockMovementTable.stokSesudah,
          createdAt: stockMovementTable.createdAt,
          tipe: stockMovementTable.tipe, // 🚀 TAMBAHAN 1: Tarik tipe transaksi dari database
        })
        .from(stockMovementTable)
        .where(
          and(
            eq(stockMovementTable.produkId, item.id),
            // 🚀 FIX BUG: Tambah penyesuaian_harga ke radar pembacaan Popover
            or(
              eq(stockMovementTable.tipe, "pembelian"),
              eq(stockMovementTable.tipe, "stok_awal"),
              eq(stockMovementTable.tipe, "penyesuaian_harga")
            )
          )
        )
        .orderBy(desc(stockMovementTable.createdAt))
        .limit(1);

      return {
        ...item,
        stokSaatIni: parseFloat(String(item.stokSaatIni)) || 0,
        
        // 🚀 TAMBAHAN: Paket data portabel untuk dikonsumsi oleh HppHistoryPopover di frontend
        _hppHistory: latestPurchase ? {
          hargaHppSebelum: parseFloat(String(latestPurchase.hargaHppSebelum)) || 0,
          hargaHppSesudah: parseFloat(String(latestPurchase.hargaHppSesudah)) || 0,
          nilaiPembelianBaru: parseFloat(String(latestPurchase.nilaiPembelianBaru)) || 0,
          qtyBeli: parseFloat(String(latestPurchase.delta)) || 0,
          stokSebelum: parseFloat(String(latestPurchase.stokSebelum)) || 0,
          stokSesudah: parseFloat(String(latestPurchase.stokSesudah)) || 0,
          tanggal: latestPurchase.createdAt,
          tipe: latestPurchase.tipe // 🚀 TAMBAHAN 2: Susupkan variabel tipe ke paket data frontend
        } : null
      };

    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("[GET PRODUK ERROR]:", err);
    res.status(500).json({ error: "Gagal mengambil data produk." });
  }
});

// ==========================================
// 2. TAMBAH PRODUK BARU (+ catat stok awal ke ledger)
// ==========================================
router.post("/produk", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { nama, jenis, bentuk, satuanDasar, satuanTampilan, hargaPerSatuanDasar, stokAwal, n, p, k, ca, mg } = req.body;

  if (!nama || typeof nama !== "string" || nama.trim() === "") {
    res.status(400).json({ error: "Nama produk wajib diisi." }); return;
  }
  if (!jenis) {
    res.status(400).json({ error: "Jenis produk wajib diisi." }); return;
  }

  const stokAwalNum = Number(stokAwal) || 0;
  if (stokAwalNum < 0) {
    res.status(400).json({ error: "Stok awal tidak boleh negatif." }); return;
  }

  try {
    // 💡 Transaction: insert produk + catat baris pertama ledger dalam satu operasi atomik.
    const result = await db.transaction(async (tx) => {
    // 🚀 FIX: Pastikan harga disiapkan sebagai Number buat hitung total nilai
    const hargaNum = Number(hargaPerSatuanDasar) || 0;
    const [newProduk] = await tx.insert(produkMasterTable).values({
        nama: nama.trim(),
        jenis,
        bentuk: bentuk || "Solid",
        satuanDasar: satuanDasar || "gram",
        satuanTampilan: satuanTampilan || "kg",
        hargaPerSatuanDasar: String(Number(hargaPerSatuanDasar) || 0), // 🚀 BUNGKUS DENGAN String()
        stokSaatIni: String(stokAwalNum), // 🚀 BUNGKUS DENGAN String()
        n: n !== undefined ? Number(n) : undefined,
        p: p !== undefined ? Number(p) : undefined,
        k: k !== undefined ? Number(k) : undefined,
        ca: ca !== undefined ? Number(ca) : undefined,
        mg: mg !== undefined ? Number(mg) : undefined,
      }).returning();

      if (stokAwalNum > 0) {
        // 🚀 FIX: Hitung Nilai Beli Baru (Poin B di Popover)
        const totalNilaiAwal = stokAwalNum * hargaNum;

        await tx.insert(stockMovementTable).values({
          produkId: newProduk.id,
          tipe: "stok_awal",
          delta: String(stokAwalNum),
          stokSebelum: "0", 
          stokSesudah: String(stokAwalNum), 
          // 🚀 FIX: Injeksi data sejarah HPP persis kayak di form pengeluaran
          hargaHppSebelum: "0", // Gudang awalnya kosong (Poin A = 0)
          hargaHppSesudah: String(hargaNum),
          nilaiPembelianBaru: String(totalNilaiAwal),
          perawatanProdukId: null,
          catatan: "Stok awal saat produk dibuat",
        });
      }

      // 🚀 FIX: Bongkar newProduk, lalu paksa stokSaatIni jadi Number
      return {
        ...newProduk,
        stokSaatIni: parseFloat(String(newProduk.stokSaatIni)) || 0
      };
    });

    res.status(201).json({ success: true, data: result });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(400).json({ error: "Nama produk ini sudah terdaftar (case-insensitive)." });
      return;
    }
    res.status(500).json({ error: "Gagal menambah produk baru." });
  }
});

// ==========================================
// 3. EDIT PRODUK — TOLAK EKSPLISIT EDIT STOK LANGSUNG
// ==========================================
router.patch("/produk/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { id } = req.params;
  const body = req.body;

  // ⚠️ Jaring pengaman arsitektur: stok_saat_ini WAJIB hanya berubah lewat adjustStock().
  if ('stokSaatIni' in body) {
    res.status(400).json({ error: "stokSaatIni tidak bisa diubah langsung lewat endpoint ini." });
    return;
  }

  const allowedFields = ['nama', 'jenis', 'bentuk', 'satuanDasar', 'satuanTampilan', 'hargaPerSatuanDasar', 'isActive', 'n', 'p', 'k', 'ca', 'mg'];
  const cleanPayload: Record<string, any> = Object.fromEntries(
    Object.entries(body).filter(([key, v]) => allowedFields.includes(key) && v !== undefined)
  );

  if (Object.keys(cleanPayload).length === 0) {
    res.status(400).json({ error: "Tidak ada data valid untuk diupdate." }); return;
  }

  if ('hargaPerSatuanDasar' in cleanPayload) {
    const harga = Number(cleanPayload.hargaPerSatuanDasar);
    if (harga < 0) {
      res.status(400).json({ error: "Harga tidak boleh negatif." }); return;
    }
    cleanPayload.hargaPerSatuanDasar = harga;
  }

    cleanPayload.updatedAt = new Date();

  try {
    // 🚀 FIX BUG: Bungkus dalam transaction untuk mencatat "Penyesuaian Harga" ke ledger
    const updatedData = await db.transaction(async (tx) => {
      // 1. Ambil data sebelum diupdate
      const [oldData] = await tx.select().from(produkMasterTable).where(eq(produkMasterTable.id, id));
      if (!oldData) throw new Error("NOT_FOUND");

      // 2. Eksekusi update master
      const [updated] = await tx.update(produkMasterTable)
        .set(cleanPayload)
        .where(eq(produkMasterTable.id, id))
        .returning();

      // 3. Cek apakah hargaHpp (hargaPerSatuanDasar) diedit
      if ('hargaPerSatuanDasar' in cleanPayload) {
        const hargaLama = Number(oldData.hargaPerSatuanDasar) || 0;
        const hargaBaru = Number(cleanPayload.hargaPerSatuanDasar) || 0;
        
        if (hargaLama !== hargaBaru) {
          const stokTerkini = parseFloat(String(oldData.stokSaatIni)) || 0;
          
          // 🧮 LOGIKA REVALUASI ASET: (Stok x Harga Baru) - (Stok x Harga Lama)
          // Ini bikin matematika Moving Average di Popover tetep akurat 100%
          const nilaiAsetLama = stokTerkini * hargaLama;
          const nilaiAsetBaru = stokTerkini * hargaBaru;
          const selisihRevaluasi = nilaiAsetBaru - nilaiAsetLama;

          await tx.insert(stockMovementTable).values({
            produkId: id,
            tipe: "penyesuaian_harga",
            delta: "0",
            stokSebelum: String(stokTerkini),
            stokSesudah: String(stokTerkini),
            hargaHppSebelum: String(hargaLama),
            hargaHppSesudah: String(hargaBaru),
            nilaiPembelianBaru: String(selisihRevaluasi), // Suntik selisih valuasi ke Poin B
            catatan: "Revaluasi HPP manual via Edit Produk",
          });
        }
      }

      return updated;
    });

    res.json({ 
      success: true, 
      data: {
        ...updatedData,
        stokSaatIni: parseFloat(String(updatedData.stokSaatIni)) || 0
      } 
    });

  } catch (err: any) {
    if (err.message === "NOT_FOUND") {
      res.status(404).json({ error: "Produk tidak ditemukan." }); return;
    }
    if (err.code === '23505') {
      res.status(400).json({ error: "Nama produk ini sudah terdaftar." });
      return;
    }
    res.status(500).json({ error: "Gagal memperbarui produk." });
  }
});

// ==========================================
// 4. DELETE PRODUK (THE SMART DELETE)
// ==========================================
router.delete("/produk/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { id } = req.params;

  try {
    // 🚀 CEK DULU KE GUDANG: Produk ini udah punya riwayat transaksi selain stok_awal belum?
    const riwayatStok = await db.select().from(stockMovementTable).where(eq(stockMovementTable.produkId, id));
    
    // Status Clean: Belum ada riwayat, atau cuma ada 1 yaitu stok awal pas pertama dibikin.
    const isClean = riwayatStok.length === 0 || (riwayatStok.length === 1 && riwayatStok[0].tipe === "stok_awal");

    if (isClean) {
      // 🟢 KONDISI A: HARD DELETE (Bersih tak bersisa)
      await db.transaction(async (tx) => {
        await tx.delete(stockMovementTable).where(eq(stockMovementTable.produkId, id));
        await tx.delete(produkMasterTable).where(eq(produkMasterTable.id, id));
      });
      res.json({ success: true, message: "Produk berhasil dihapus permanen." });
    } else {
      // 🟡 KONDISI B: SOFT DELETE (Amankan data laporan)
      await db.update(produkMasterTable)
        .set({ 
          deleted: true, 
          isActive: false, 
          updatedAt: new Date() 
        })
        .where(eq(produkMasterTable.id, id));
        
      res.json({ success: true, message: "Produk disembunyikan untuk menjaga riwayat laporan." });
    }

  } catch (err: any) {
    console.error("[DELETE PRODUK ERROR]:", err);
    res.status(500).json({ error: "Gagal menghapus produk. Terjadi kesalahan pada server." });
  }
});

// ==========================================
// 5. PENYESUAIAN STOK MANUAL (STOCK ADJUSTMENT)
// ==========================================
router.post("/produk/:id/adjust", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { id } = req.params;
  const { stokFisik, catatan } = req.body;

  if (stokFisik === undefined || stokFisik === null) {
    res.status(400).json({ error: "Stok fisik terbaru wajib diisi." }); return;
  }

  const stokBaruNum = Number(stokFisik);
  if (stokBaruNum < 0) {
    res.status(400).json({ error: "Stok fisik tidak boleh negatif." }); return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Ambil data produk dan angka stok sistem saat ini
      const [produk] = await tx
        .select()
        .from(produkMasterTable)
        .where(eq(produkMasterTable.id, id));

      if (!produk) {
        throw new Error("PRODUK_NOT_FOUND");
      }

      const stokSebelum = parseFloat(String(produk.stokSaatIni)) || 0;
      const delta = stokBaruNum - stokSebelum;

     // Cegah transaksi jika tidak ada perbedaan fisik vs sistem
      if (delta === 0) {
        throw new Error("NO_CHANGE");
      }

      // 🚀 FIX: Panggil Si Orang Gudang (adjustStock) biar jejak HPP otomatis dicatat!
      // Nggak perlu manual update master table atau insert stock movement lagi, 
      // karena fungsi ini udah nge-handle semuanya (All-in-One).
      await adjustStock(tx, {
        produkId: id,
        delta: delta, 
        tipe: "stok_opname", // 🚀 Ubah tipe biar lebih deskriptif di buku gudang
        catatan: catatan || `Penyesuaian stok manual (Selisih: ${delta > 0 ? '+' : ''}${delta})`,
      });

      // 🚀 Ambil data master terbaru yang udah di-update sama adjustStock buat dikirim balik ke Frontend
      const [updatedProduk] = await tx
        .select()
        .from(produkMasterTable)
        .where(eq(produkMasterTable.id, id));

      return {
        ...updatedProduk,
        stokSaatIni: parseFloat(String(updatedProduk.stokSaatIni)) || 0
      };
    });

    res.json({ success: true, message: "Stok berhasil disesuaikan.", data: result });
  } catch (err: any) {
    console.error("[DB ERROR ADJUST STOCK]:", err);
    if (err.message === "PRODUK_NOT_FOUND") {
      res.status(404).json({ error: "Produk tidak ditemukan." }); return;
    }
    if (err.message === "NO_CHANGE") {
      res.status(400).json({ error: "Stok fisik sama dengan stok sistem, tidak ada penyesuaian yang disimpan." }); return;
    }
    res.status(500).json({ error: "Gagal melakukan penyesuaian stok." });
  }
});

// ==========================================
// 6. GET PRODUK DI TONG SAMPAH (Recycle Bin)
// ==========================================
router.get("/produk/trash", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    // Ambil data produk yang status deleted-nya TRUE
    const rawData = await db
      .select()
      .from(produkMasterTable)
      .where(eq(produkMasterTable.deleted, true))
      .orderBy(desc(produkMasterTable.updatedAt));
    
    // 🚀 FIX: Inject riwayat HPP terakhir sama persis kayak di GET produk aktif
    const data = await Promise.all(rawData.map(async (item) => {
      
      // Cari 1 transaksi pembelian terakhir di buku gudang untuk produk ini
      const [latestPurchase] = await db
        .select({
          hargaHppSebelum: stockMovementTable.hargaHppSebelum,
          hargaHppSesudah: stockMovementTable.hargaHppSesudah,
          nilaiPembelianBaru: stockMovementTable.nilaiPembelianBaru,
          delta: stockMovementTable.delta, 
          stokSebelum: stockMovementTable.stokSebelum,
          stokSesudah: stockMovementTable.stokSesudah,
          createdAt: stockMovementTable.createdAt,
          tipe: stockMovementTable.tipe, 
        })
        .from(stockMovementTable)
        .where(
          and(
            eq(stockMovementTable.produkId, item.id),
            or(
              eq(stockMovementTable.tipe, "pembelian"),
              eq(stockMovementTable.tipe, "stok_awal"),
              eq(stockMovementTable.tipe, "penyesuaian_harga")
            )
          )
        )
        .orderBy(desc(stockMovementTable.createdAt))
        .limit(1);

      return {
        ...item,
        stokSaatIni: parseFloat(String(item.stokSaatIni)) || 0,
        
        // 🚀 FIX: Bawa paket data _hppHistory ke frontend biar popover gak kosong
        _hppHistory: latestPurchase ? {
          hargaHppSebelum: parseFloat(String(latestPurchase.hargaHppSebelum)) || 0,
          hargaHppSesudah: parseFloat(String(latestPurchase.hargaHppSesudah)) || 0,
          nilaiPembelianBaru: parseFloat(String(latestPurchase.nilaiPembelianBaru)) || 0,
          qtyBeli: parseFloat(String(latestPurchase.delta)) || 0,
          stokSebelum: parseFloat(String(latestPurchase.stokSebelum)) || 0,
          stokSesudah: parseFloat(String(latestPurchase.stokSesudah)) || 0,
          tanggal: latestPurchase.createdAt,
          tipe: latestPurchase.tipe 
        } : null
      };

    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("[GET TRASH ERROR]:", err);
    res.status(500).json({ error: "Gagal mengambil data tong sampah." });
  }
});

// ==========================================
// 7. PULIHKAN PRODUK (Restore dari Tong Sampah)
// ==========================================
router.post("/produk/:id/restore", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { id } = req.params;

    // Balikin status deleted jadi false, dan aktifkan kembali produknya
    await db.update(produkMasterTable)
      .set({ 
        deleted: false, 
        isActive: true, 
        updatedAt: new Date() 
      })
      .where(eq(produkMasterTable.id, id));

    res.json({ success: true, message: "Produk berhasil dipulihkan kembali." });
  } catch (err) {
    console.error("[RESTORE PRODUK ERROR]:", err);
    res.status(500).json({ error: "Gagal memulihkan produk." });
  }
});

// ==========================================
// 8. HAPUS PERMANEN + RIWAYAT TOTAL (Force Delete)
// ==========================================
router.delete("/produk/:id/force", async (req, res): Promise<void> => {
  try {
    const { userId } = getAuth(req);
    if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { id } = req.params;

    // 🚀 Eksekusi berantai di dalam satu transaksi aman (All or Nothing)
    await db.transaction(async (tx) => {
      // 1. Hapus riwayat di buku gudang (stock movement)
      await tx.delete(stockMovementTable).where(eq(stockMovementTable.produkId, id));
      
      // 2. Hapus riwayat pemakaian barang di modul perawatan kebun
      await tx.delete(perawatanProdukTable).where(eq(perawatanProdukTable.produkId, id));
      
      // 3. Hapus transaksi pembelian uangnya di modul pengeluaran
      // Kita hapus karena tabel pengeluaran lu punya check constraint ketat (pembelian_stok_konsisten)
      await tx.delete(pengeluaranTable).where(eq(pengeluaranTable.produkId, id));
      
      // 4. Setelah semua anaknya bersih, hapus produk induknya dari master produk
      await tx.delete(produkMasterTable).where(eq(produkMasterTable.id, id));
    });

    res.json({ success: true, message: "Produk beserta seluruh riwayatnya berhasil dimusnahkan selamanya." });
  } catch (err) {
    console.error("[FORCE DELETE ERROR]:", err);
    res.status(500).json({ error: "Gagal menghapus produk secara permanen." });
  }
});

export default router;
