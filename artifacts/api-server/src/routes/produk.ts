import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, produkMasterTable, stockMovementTable } from "@workspace/db";

const router: IRouter = Router();

// ==========================================
// 1. GET SEMUA PRODUK
// ==========================================
router.get("/produk", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const data = await db.select().from(produkMasterTable);
    res.json({ success: true, data });
  } catch (err) {
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
    // Ini asumsi db.transaction() tersedia dari instance drizzle di @workspace/db — belum pernah
    // terlihat dipakai di operasional.ts, jadi INI PERLU DIVERIFIKASI jalan di setup kamu. [Medium confidence]
    const result = await db.transaction(async (tx) => {
      const [newProduk] = await tx.insert(produkMasterTable).values({
        nama: nama.trim(),
        jenis,
        bentuk: bentuk || "Solid",
        satuanDasar: satuanDasar || "gram",
        satuanTampilan: satuanTampilan || "kg",
        hargaPerSatuanDasar: Number(hargaPerSatuanDasar) || 0,
        stokSaatIni: stokAwalNum,
        n: n !== undefined ? Number(n) : undefined,
        p: p !== undefined ? Number(p) : undefined,
        k: k !== undefined ? Number(k) : undefined,
        ca: ca !== undefined ? Number(ca) : undefined,
        mg: mg !== undefined ? Number(mg) : undefined,
      }).returning();

      if (stokAwalNum > 0) {
        await tx.insert(stockMovementTable).values({
          produkId: newProduk.id,
          tipe: "stok_awal",
          delta: stokAwalNum,
          stokSebelum: 0,
          stokSesudah: stokAwalNum,
          perawatanProdukId: null,
          catatan: "Stok awal saat produk dibuat",
        });
      }

      return newProduk;
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
  // Kalau baris ini dihapus suatu saat karena "biar simpel", ledger stock_movement langsung
  // jadi tidak bisa dipercaya sebagai audit trail lengkap.
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
    const [updated] = await db.update(produkMasterTable)
      .set(cleanPayload)
      .where(eq(produkMasterTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Produk tidak ditemukan." }); return;
    }

    res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(400).json({ error: "Nama produk ini sudah terdaftar." });
      return;
    }
    res.status(500).json({ error: "Gagal memperbarui produk." });
  }
});

// ==========================================
// 4. DELETE PRODUK — TANGKAP FK RESTRICT & HAPUS STOK AWAL
// ==========================================
router.delete("/produk/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { id } = req.params;
  try {
    // 💡 Pakai transaction: Hapus log stok dulu, baru hapus produknya
    const deletedData = await db.transaction(async (tx) => {
      // 1. Bersihkan riwayat stok yang nyangkut (stok awal)
      await tx.delete(stockMovementTable).where(eq(stockMovementTable.produkId, id));
      
      // 2. Baru hajar produk master-nya
      const [deleted] = await tx.delete(produkMasterTable)
        .where(eq(produkMasterTable.id, id))
        .returning();
        
      return deleted;
    });

  if (!deletedData) {
      res.status(404).json({ error: "Produk tidak ditemukan." }); return;
    }

    res.json({ success: true, message: "Produk berhasil dihapus.", data: deletedData });
  } catch (err: any) {
    // 💡 Tampilkan error asli di terminal Replit biar gampang di-debug
    console.error("[DB ERROR HAPUS PRODUK]:", err);

    // 🚀 FIX: Buka bungkus error Drizzle untuk ambil error asli Postgres (err.cause)
    const dbError = err.cause || err;
    const errorCode = dbError.code || err.code;
    const errorString = (String(err) + " " + String(dbError)).toLowerCase();

    const isForeignKeyError = 
      errorCode === '23503' || 
      errorString.includes('foreign key constraint') || 
      errorString.includes('23503') ||
      errorString.includes('violates foreign key');

    if (isForeignKeyError) {
      // Kalau masih masuk sini, berarti beneran udah nyangkut di tabel perawatan_produk
      res.status(400).json({ error: "Produk tidak bisa dihapus karena sudah tercatat di riwayat pemakaian perawatan kebun. Nonaktifkan saja produk ini agar tidak muncul lagi di pilihan." });
      return;
    }
    
    res.status(500).json({ error: "Gagal menghapus produk. Terjadi kesalahan pada server." });
  }
});



export default router;
