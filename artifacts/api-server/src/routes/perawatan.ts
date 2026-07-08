import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, inArray } from "drizzle-orm";
import { 
  db, 
  areasTable, 
  perawatanTable, 
  perawatanProdukTable,
  produkMasterTable,
  kategoriTable,
  siklusTanamTable,
  adjustStock
} from "@workspace/db";

const router: IRouter = Router();

// ==========================================
// 0. HELPER TIMEZONE WIB (NAIVE STRATEGY) 🚀
// ==========================================
const parseWIB = (str?: string | null) => {
  if (!str) return null;
  if (str.includes('Z') || str.match(/[+-]\d{2}:\d{2}$/)) return new Date(str);
  const withSeconds = str.length === 16 ? `${str}:00` : str;
  return new Date(`${withSeconds}+07:00`);
};

const toWIBString = (date: Date | string | null | undefined) => {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).format(d).replace(' ', 'T');
};

interface AddPerawatanBody {
  kegiatan: string;
  labaRugiIds?: string[]; 
  labaRugiId?: string;    
  
  modeTanggal: "broadcast" | "spesifik"; 
  tanggalBroadcast?: string; 
  tanggalSelesaiBroadcast?: string; 
  durasiKerjaBroadcast?: number;
  tanggalPerArea?: Record<string, string>;
  tanggalSelesaiPerArea?: Record<string, string>; 
  durasiKerjaPerArea?: Record<string, number>;
  
  modePekerja: "broadcast" | "spesifik"; 
  petugasBroadcast: string[]; 
  petugasPerArea: Record<string, string[]>;
  
  modeTags: "broadcast" | "spesifik"; 
  tagsBroadcast?: string; 
  tagsPerArea?: Record<string, string>;
  
  modeStatus: "broadcast" | "spesifik"; 
  statusBroadcast?: string; 
  statusPerArea?: Record<string, string>;
  
  modeCatatan: "broadcast" | "spesifik"; 
  catatanBroadcast?: string; 
  catatanPerArea?: Record<string, string>;
  
  modeProduk: "broadcast" | "spesifik"; 
  logProduk: Array<{ produkId: string; kuantitasPemakaian: number }>; 
  produkPerArea: Record<string, Array<{ produkId: string; kuantitasPemakaian: number }>>;
}

// ==========================================
// 1. ENDPOINT DROPDOWN OPTIONS DIALIHKAN KE OPERASIONAL.TS
// ==========================================

// ==========================================
// 2. ENDPOINT SAVE DATA PERAWATAN KEBUN
// ==========================================
router.post("/notion/add-perawatan", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { 
    res.status(401).json({ error: "Unauthorized" }); 
    return; 
  }

  const body = req.body as Partial<AddPerawatanBody>;
  const kegiatan = (body.kegiatan ?? "").trim();
  
  const areaIds: string[] = Array.isArray(body.labaRugiIds) 
    ? body.labaRugiIds.filter(Boolean) 
    : body.labaRugiId ? [body.labaRugiId] : [];

  if (!kegiatan || areaIds.length === 0) { 
    res.status(400).json({ error: "Field 'kegiatan' dan area wajib diisi (minimal 1)." }); 
    return; 
  }

  try {
    const recordsCreated: any[] = [];

    for (const currentAreaId of areaIds) {
      // 💡 PERBAIKAN: Jaring pengaman nilai null/undefined dan prioritas baca mode spesifik
      const tanggalMulaiStr = (body.modeTanggal === "spesifik" && body.tanggalPerArea?.[currentAreaId]) 
        ? body.tanggalPerArea[currentAreaId] 
        : body.tanggalBroadcast;
        
      const tanggalSelesaiStr = (body.modeTanggal === "spesifik" && body.tanggalSelesaiPerArea?.[currentAreaId]) 
        ? body.tanggalSelesaiPerArea[currentAreaId] 
        : body.tanggalSelesaiBroadcast;
        
      // Pakai Nullish Coalescing (??) agar nilai 0 tidak dianggap false
      const durasiKerjaNum = (body.modeTanggal === "spesifik" && body.durasiKerjaPerArea?.[currentAreaId] !== undefined) 
        ? body.durasiKerjaPerArea[currentAreaId] 
        : (body.durasiKerjaBroadcast ?? 0);

      const pekerjaIdsArray = (body.modePekerja === "spesifik" && body.petugasPerArea?.[currentAreaId] && body.petugasPerArea[currentAreaId].length > 0) 
        ? body.petugasPerArea[currentAreaId] 
        : (body.petugasBroadcast || []);

      const tagCategoryStr = (body.modeTags === "spesifik" && body.tagsPerArea?.[currentAreaId]) 
        ? body.tagsPerArea[currentAreaId] 
        : body.tagsBroadcast;

      const statusStr = (body.modeStatus === "spesifik" && body.statusPerArea?.[currentAreaId]) 
        ? body.statusPerArea[currentAreaId] 
        : (body.statusBroadcast || "Belum dikerjakan");

      const catatanStr = (body.modeCatatan === "spesifik" && body.catatanPerArea?.[currentAreaId]) 
        ? body.catatanPerArea[currentAreaId] 
        : body.catatanBroadcast;

      const produkArray = (body.modeProduk === "spesifik" && body.produkPerArea?.[currentAreaId] && body.produkPerArea[currentAreaId].length > 0) 
        ? body.produkPerArea[currentAreaId] 
        : (body.logProduk || []);

      // 🔍 CARI SIKLUS TANAM YANG SEDANG AKTIF DI AREA INI
      const [activeCycle] = await db
        .select({ id: siklusTanamTable.id })
        .from(siklusTanamTable)
        .where(
          and(
            eq(siklusTanamTable.areaId, currentAreaId),
            eq(siklusTanamTable.status, "Aktif")
          )
        )
        .limit(1);

       // 🔒 Transaction membungkus: insert perawatan + validasi produk + potong stok + insert perawatan_produk.
      // Kalau salah satu produk gagal (stok kurang / harga 0), SELURUH blok area ini di-rollback —
      // termasuk insert perawatanTable-nya, supaya tidak ada "perawatan tanpa produk" nyangkut di DB
      // akibat kegagalan di tengah proses.
      const insertedPerawatan = await db.transaction(async (tx) => {
        // 1. Simpan Data Induk
        const [newPerawatan] = await tx.insert(perawatanTable).values({
          kegiatan: kegiatan,
          areaId: currentAreaId,
          siklusId: activeCycle ? activeCycle.id : null,
          waktuMulai: parseWIB(tanggalMulaiStr) ?? new Date(),
          waktuSelesai: parseWIB(tanggalSelesaiStr),
          durasiKerja: Number(durasiKerjaNum ?? 0),
          tagCategoryId: tagCategoryStr || null,
          status: statusStr || "Belum dikerjakan",
          pekerjaIds: pekerjaIdsArray || [],
          catatan: catatanStr || null,
        }).returning();

        // 2. Validasi SEMUA produk dulu, sebelum ada mutation stok apapun —
        // supaya tidak ada produk ke-1,2 yang sudah kepotong sebelum produk ke-3 ketahuan gagal.
        if (produkArray && produkArray.length > 0) {
          const produkIds = produkArray.map((p) => p.produkId);
          const produkRows = await tx
            .select()
            .from(produkMasterTable)
            .where(inArray(produkMasterTable.id, produkIds));

          const produkMap = new Map(produkRows.map((p) => [p.id, p]));

          for (const item of produkArray) {
            const produk = produkMap.get(item.produkId);
            if (!produk) {
              throw new Error(`Produk dengan ID ${item.produkId} tidak ditemukan.`);
            }
            if (produk.hargaPerSatuanDasar === 0) {
              throw new Error(`Produk "${produk.nama}" belum punya harga. Set harga dulu di Manajemen Produk.`);
            }
            if (item.kuantitasPemakaian <= 0) {
              throw new Error(`Kuantitas pemakaian "${produk.nama}" harus lebih dari 0.`);
            }
          }

          // 3. Baru potong stok + insert baris perawatan_produk, satu per satu
          for (const item of produkArray) {
            const produk = produkMap.get(item.produkId)!;

            // Panggil adjustStock — throw "STOK_TIDAK_CUKUP:..." kalau gagal, ditangkap di catch luar.
            await adjustStock(tx, {
              produkId: item.produkId,
              delta: -item.kuantitasPemakaian,
              tipe: "pemakaian",
              perawatanProdukId: null, // diisi belakangan setelah insert, lihat catatan di bawah
            });

            const totalBiaya = Math.round(item.kuantitasPemakaian * produk.hargaPerSatuanDasar);

            await tx.insert(perawatanProdukTable).values({
              perawatanId: newPerawatan.id,
              produkId: item.produkId,
              kuantitasPemakaian: item.kuantitasPemakaian,
              hargaTercatatPerSatuan: produk.hargaPerSatuanDasar,
              totalBiaya,
            });
          }
        }

        return newPerawatan;
      });

      recordsCreated.push({
        id: insertedPerawatan.id,
        kegiatan: insertedPerawatan.kegiatan,
        areaId: currentAreaId
      });
    }

    res.status(201).json({ 
      success: true, 
      message: `Berhasil mencatat perawatan kebun untuk ${areaIds.length} area.`, 
      data: recordsCreated 
    });

    } catch (err: any) {
    console.error("[DB ERROR ADD PERAWATAN]:", err);
    console.error("[CAUSE]:", err.cause);
    if (typeof err.message === 'string' && err.message.startsWith('STOK_TIDAK_CUKUP:')) {
      const produkId = err.message.split(':')[1];
      
      // 🚀 CARI NAMA PRODUK KE DB BIAR PESAN ERROR HUMAN-READABLE
      const [produkGagal] = await db
        .select({ nama: produkMasterTable.nama })
        .from(produkMasterTable)
        .where(eq(produkMasterTable.id, produkId));
        
      const namaProduk = produkGagal ? produkGagal.nama : `ID ${produkId}`;

      res.status(400).json({ error: `Stok tidak cukup untuk produk "${namaProduk}".` });
      return;
    }

    res.status(400).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
  }
});


// ==========================================
// 3. ENDPOINT GET ALL PERAWATAN (SUPABASE REALTIME + NAMA AREA + DETAIL PRODUK)
// ==========================================
router.get("/notion/all-perawatan", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { 
    res.status(401).json({ error: "Unauthorized" }); 
    return; 
  }

  // 🚀 1. TANGKAP QUERY FILTER SIKLUS STATUS DARI FRONTEND
  const { statusSiklus } = req.query;

  try {
    // 1. Ambil data induk perawatan + nama area + NAMA TANAMAN
    const indukData = await db
      .select({
        id: perawatanTable.id,
        kegiatan: perawatanTable.kegiatan,
        areaId: perawatanTable.areaId,
        areaName: areasTable.name,
        namaSiklus: siklusTanamTable.namaSiklus, // 💡 KUNCI UTAMA: Tarik nama tanaman!
        waktuMulai: perawatanTable.waktuMulai,
        waktuSelesai: perawatanTable.waktuSelesai,
        durasiKerja: perawatanTable.durasiKerja,
        tagCategoryId: perawatanTable.tagCategoryId, 
        tagCategoryName: kategoriTable.name, 
        status: perawatanTable.status,
        pekerjaIds: perawatanTable.pekerjaIds,
        catatan: perawatanTable.catatan,
        
        // 🚀 TARIK JUGA SIKLUS ID UNTUK UI
        siklusId: perawatanTable.siklusId,
        tanggalPindahTanam: siklusTanamTable.tanggalPindahTanam, // 👈 KOMA SUDAH AMAN
        statusSiklus: siklusTanamTable.status // 🚀 2. TARIK STATUS SIKLUS
      })
      .from(perawatanTable)
      .leftJoin(areasTable, eq(perawatanTable.areaId, areasTable.id))
      .leftJoin(kategoriTable, eq(perawatanTable.tagCategoryId, kategoriTable.id))
      // 🚀 SIMPLE JOIN LANGSUNG KE SIKLUS ID!
      .leftJoin(siklusTanamTable, eq(perawatanTable.siklusId, siklusTanamTable.id));


    // 🚀 3. FILTER DATANYA SEBELUM DI-MAP
    let filteredIndukData = indukData;
    if (statusSiklus === "selesai") {
      // Hanya ambil catatan yang masa tanamnya sudah beres
      filteredIndukData = indukData.filter(item => item.statusSiklus === "Selesai/Panen");
    } else {
      // Default: Ambil yang masih 'Aktif' ATAU yang nggak punya siklus (null)
      filteredIndukData = indukData.filter(item => item.statusSiklus === "Aktif" || !item.statusSiklus);
    }

        // 2. Ambil semua detail produk racikan + JOIN nama produk dari master
    const semuaProduk = await db
      .select({
        perawatanId: perawatanProdukTable.perawatanId,
        produkId: perawatanProdukTable.produkId,
        namaProduk: produkMasterTable.nama,
        kuantitasPemakaian: perawatanProdukTable.kuantitasPemakaian,
        satuanDasar: produkMasterTable.satuanDasar,
        hargaTercatatPerSatuan: perawatanProdukTable.hargaTercatatPerSatuan,
        totalBiaya: perawatanProdukTable.totalBiaya,
      })
      .from(perawatanProdukTable)
      .leftJoin(produkMasterTable, eq(perawatanProdukTable.produkId, produkMasterTable.id));

    const dataMatang = filteredIndukData.map((perawatan) => {
      const racikanBahan = semuaProduk.filter((p) => p.perawatanId === perawatan.id);
      const totalBiayaPerawatan = racikanBahan.reduce((sum, p) => sum + (p.totalBiaya ?? 0), 0);

      return {
        ...perawatan,
        waktuMulai: toWIBString(perawatan.waktuMulai as Date),
        waktuSelesai: toWIBString(perawatan.waktuSelesai as Date),
        logProduk: racikanBahan,
        totalBiayaProduk: totalBiayaPerawatan, // 🆕 dipakai Step 4 (detail sheet)
      };
    });

    res.json({ 
      success: true, 
      data: dataMatang 
    });
  
  } catch (err: any) {
    console.error("[DB ERROR GET ALL PERAWATAN]:", err);
    res.status(500).json({ error: err.message || "Gagal mengambil riwayat perawatan." });
  }
});

// ==========================================
// 4. ENDPOINT DELETE PERAWATAN (DENGAN REVERSAL STOK)
// ⚠️ Endpoint ini MENGGANTIKAN pemanggilan generic DELETE /notion/activity/perawatan/:id
// dari frontend. Endpoint generic itu sekarang akan SELALU GAGAL untuk perawatan yang
// punya produk terkait (FK restrict), jadi frontend WAJIB dialihkan ke path ini.
// ==========================================
router.delete("/notion/perawatan/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { id } = req.params;

  try {
    await db.transaction(async (tx) => {
      const produkRows = await tx
        .select()
        .from(perawatanProdukTable)
        .where(eq(perawatanProdukTable.perawatanId, id));

      // Reverse stok untuk tiap produk yang pernah dipakai — HARUS sebelum baris
      // perawatan_produk dihapus, kalau tidak kita kehilangan info kuantitas yang perlu dikembalikan.
      for (const row of produkRows) {
        await adjustStock(tx, {
          produkId: row.produkId,
          delta: row.kuantitasPemakaian, // positif = kembalikan stok
          tipe: "reversal_delete",
          perawatanProdukId: null,
        });
      }

      await tx.delete(perawatanProdukTable).where(eq(perawatanProdukTable.perawatanId, id));

      const [deleted] = await tx.delete(perawatanTable).where(eq(perawatanTable.id, id)).returning();

      if (!deleted) {
        throw new Error("PERAWATAN_TIDAK_DITEMUKAN");
      }
    });

    res.json({ success: true, message: "Perawatan dan riwayat stok terkait berhasil dihapus & dikembalikan." });
  } catch (err: any) {
    if (err.message === "PERAWATAN_TIDAK_DITEMUKAN") {
      res.status(404).json({ error: "Data perawatan tidak ditemukan." });
      return;
    }
    console.error("Error delete perawatan:", err);
    res.status(500).json({ error: "Gagal menghapus perawatan." });
  }
});

// ==========================================
// 5. Endpoint Baru PATCH /notion/perawatan/:id
// ==========================================

router.patch("/notion/perawatan/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { id } = req.params;
  const body = req.body;

  // ⚠️ areaId sengaja TIDAK termasuk allowed fields — keputusan eksplisit: edit area
  // tidak didukung lewat endpoint ini. Kalau frontend kirim areaId, diabaikan diam-diam
  // di sini (bukan error) karena UI sudah di-lock terpisah di dua file frontend.
  const allowedBasicFields = ['kegiatan', 'waktuMulai', 'waktuSelesai', 'durasiKerja', 'tagCategoryId', 'status', 'pekerjaIds', 'catatan'];

  const basicPayload: Record<string, any> = Object.fromEntries(
    Object.entries(body).filter(([key, v]) => allowedBasicFields.includes(key) && v !== undefined)
  );

  if (basicPayload.waktuMulai) basicPayload.waktuMulai = parseWIB(basicPayload.waktuMulai);
  if (basicPayload.waktuSelesai) basicPayload.waktuSelesai = parseWIB(basicPayload.waktuSelesai);

  // 🔑 KUNCI dari desain kamu: bedakan "field tidak dikirim" vs "field dikirim kosong".
  // 'logProduk' in body menangkap KEDUANYA benar: array isi, MAUPUN array kosong eksplisit.
  const produkFieldDikirim = 'logProduk' in body && Array.isArray(body.logProduk);
  const produkArray: Array<{ produkId: string; kuantitasPemakaian: number }> = produkFieldDikirim ? body.logProduk : [];

  if (Object.keys(basicPayload).length === 0 && !produkFieldDikirim) {
    res.status(400).json({ error: "Tidak ada data valid untuk diupdate." });
    return;
  }

  try {
    const updated = await db.transaction(async (tx) => {
      let updatedPerawatan;

      if (Object.keys(basicPayload).length > 0) {
        [updatedPerawatan] = await tx.update(perawatanTable)
          .set(basicPayload)
          .where(eq(perawatanTable.id, id))
          .returning();
      } else {
        [updatedPerawatan] = await tx.select().from(perawatanTable).where(eq(perawatanTable.id, id));
      }

      if (!updatedPerawatan) {
        throw new Error("PERAWATAN_TIDAK_DITEMUKAN");
      }

      // 🔒 INI ATURAN INTI KAMU: reverse-reapply CUMA jalan kalau field produk eksplisit dikirim.
      // Field-only update (basicPayload doang) tidak pernah sampai ke blok ini sama sekali.
      if (produkFieldDikirim) {
        // 1. REVERSE — kembalikan semua stok yang tercatat lama untuk perawatan ini
        const produkLama = await tx
          .select()
          .from(perawatanProdukTable)
          .where(eq(perawatanProdukTable.perawatanId, id));

        for (const row of produkLama) {
          await adjustStock(tx, {
            produkId: row.produkId,
            delta: row.kuantitasPemakaian, // kembalikan (positif)
            tipe: "reversal_edit",
            perawatanProdukId: null,
          });
        }

        await tx.delete(perawatanProdukTable).where(eq(perawatanProdukTable.perawatanId, id));

        // 2. REAPPLY — proses ulang array baru, identik dengan logika create.
        // Kalau produkArray kosong ([]), loop ini tidak jalan sama sekali — hasilnya
        // perawatan itu benar-benar tanpa produk, sesuai niat "kosongkan semua".
        if (produkArray.length > 0) {
          const produkIds = produkArray.map((p) => p.produkId);
          const produkRows = await tx.select().from(produkMasterTable).where(inArray(produkMasterTable.id, produkIds));
          const produkMap = new Map(produkRows.map((p) => [p.id, p]));

          for (const item of produkArray) {
            const produk = produkMap.get(item.produkId);
            if (!produk) throw new Error(`Produk dengan ID ${item.produkId} tidak ditemukan.`);
            if (produk.hargaPerSatuanDasar === 0) throw new Error(`Produk "${produk.nama}" belum punya harga. Set harga dulu di Manajemen Produk.`);
            if (item.kuantitasPemakaian <= 0) throw new Error(`Kuantitas pemakaian "${produk.nama}" harus lebih dari 0.`);
          }

          for (const item of produkArray) {
            const produk = produkMap.get(item.produkId)!;
            await adjustStock(tx, {
              produkId: item.produkId,
              delta: -item.kuantitasPemakaian,
              tipe: "pemakaian",
              perawatanProdukId: null,
            });
            const totalBiaya = Math.round(item.kuantitasPemakaian * produk.hargaPerSatuanDasar);
            await tx.insert(perawatanProdukTable).values({
              perawatanId: id,
              produkId: item.produkId,
              kuantitasPemakaian: item.kuantitasPemakaian,
              hargaTercatatPerSatuan: produk.hargaPerSatuanDasar,
              totalBiaya,
            });
          }
        }
      }

      return updatedPerawatan;
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    if (err.message === "PERAWATAN_TIDAK_DITEMUKAN") {
      res.status(404).json({ error: "Data perawatan tidak ditemukan." });
      return;
    }
        console.error("[DB ERROR EDIT PERAWATAN]:", err);
    console.error("[CAUSE]:", err.cause);
    if (typeof err.message === 'string' && err.message.startsWith('STOK_TIDAK_CUKUP:')) {
      const produkId = err.message.split(':')[1];
      
      // 🚀 CARI NAMA PRODUK KE DB BIAR PESAN ERROR HUMAN-READABLE
      const [produkGagal] = await db
        .select({ nama: produkMasterTable.nama })
        .from(produkMasterTable)
        .where(eq(produkMasterTable.id, produkId));
        
      const namaProduk = produkGagal ? produkGagal.nama : `ID ${produkId}`;

      res.status(400).json({ error: `Stok tidak cukup untuk produk "${namaProduk}".` });
      return;
    }

    res.status(400).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
  }
});

export default router;
