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
  adjustStock,
  perawatanPekerjaTable // 🚀 TAMBAHAN BARU
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
        
      // 1. Simpan Data Induk (Tanpa pekerjaIds)
        const [newPerawatan] = await tx.insert(perawatanTable).values({
          kegiatan: kegiatan,
          areaId: currentAreaId,
          siklusId: activeCycle ? activeCycle.id : null,
          waktuMulai: parseWIB(tanggalMulaiStr) ?? new Date(),
          waktuSelesai: parseWIB(tanggalSelesaiStr),
          durasiKerja: Number(durasiKerjaNum ?? 0),
          tagCategoryId: tagCategoryStr || null,
          status: statusStr || "Belum dikerjakan",
          // pekerjaIds: DIHAPUS DARI SINI
          catatan: catatanStr || null,
        }).returning();

        // 🚀 1.5. Simpan Relasi Pekerja ke Tabel Junction
        if (pekerjaIdsArray && pekerjaIdsArray.length > 0) {
          const pekerjaInsertData = pekerjaIdsArray.map((pId: string) => ({
            perawatanId: newPerawatan.id,
            pekerjaId: pId
          }));
          await tx.insert(perawatanPekerjaTable).values(pekerjaInsertData);
        }

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
          let urutanIndex = 0; // 🚀 Siapkan index urutan
          for (const item of produkArray) {
            const produk = produkMap.get(item.produkId)!;

          // Panggil adjustStock — throw "STOK_TIDAK_CUKUP:..." kalau gagal, ditangkap di catch luar.
            await adjustStock(tx, {
              produkId: item.produkId,
              delta: -item.kuantitasPemakaian,
              tipe: "pemakaian",
              perawatanProdukId: null, 
            });

            // 🚀 FIX: Parse harga dari string DB jadi Number buat kalkulasi
            const hargaSatuanNum = Number(produk.hargaPerSatuanDasar) || 0;
            const totalBiaya = Math.round(item.kuantitasPemakaian * hargaSatuanNum);

            await tx.insert(perawatanProdukTable).values({
              perawatanId: newPerawatan.id,
              produkId: item.produkId,
              kuantitasPemakaian: String(item.kuantitasPemakaian), // 🚀 BUNGKUS DENGAN String()
              hargaTercatatPerSatuan: String(hargaSatuanNum), // 🚀 BUNGKUS DENGAN String()
              totalBiaya,
              urutan: urutanIndex++,
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
      // 🚀 UBAH JADI 'Selesai' SESUAI SCHEMA BARU
      filteredIndukData = indukData.filter(item => item.statusSiklus === "Selesai");
    } else {
      filteredIndukData = indukData.filter(item => item.statusSiklus === "Aktif" || !item.statusSiklus);
    }

    // 2. Ambil semua detail produk racikan
    const semuaProduk = await db
      .select({
        perawatanId: perawatanProdukTable.perawatanId,
        produkId: perawatanProdukTable.produkId,
        namaProduk: produkMasterTable.nama,
        kuantitasPemakaian: perawatanProdukTable.kuantitasPemakaian,
        satuanDasar: produkMasterTable.satuanDasar,
        hargaTercatatPerSatuan: perawatanProdukTable.hargaTercatatPerSatuan,
        totalBiaya: perawatanProdukTable.totalBiaya,
        urutan: perawatanProdukTable.urutan, // 🚀 1. Tarik kolom urutan dari DB
      })
      .from(perawatanProdukTable)
      .leftJoin(produkMasterTable, eq(perawatanProdukTable.produkId, produkMasterTable.id));

    // 🚀 2.5 STRATEGI TARIK DATA PEKERJA (RELASIONAL)
    const perawatanIds = filteredIndukData.map(d => d.id);
    const pekerjaMap = new Map<string, string[]>();
    
    if (perawatanIds.length > 0) {
      const pekerjaRelations = await db
        .select({
          perawatanId: perawatanPekerjaTable.perawatanId,
          pekerjaId: perawatanPekerjaTable.pekerjaId
        })
        .from(perawatanPekerjaTable)
        .where(inArray(perawatanPekerjaTable.perawatanId, perawatanIds));

      pekerjaRelations.forEach(rel => {
        if (!pekerjaMap.has(rel.perawatanId)) {
          pekerjaMap.set(rel.perawatanId, []);
        }
        pekerjaMap.get(rel.perawatanId)!.push(rel.pekerjaId);
      });
    }

      // 3. Gabung Data (Map Akhir)
      const dataMatang = filteredIndukData.map((perawatan) => {
      // 🚀 2. Filter milik ID ini, LALU URUTKAN berdasarkan kolom urutan
      const racikanBahan = semuaProduk
        .filter((p) => p.perawatanId === perawatan.id)
        .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0)); 
      
      // 🚀 FIX: Paksa kuantitas & harga (numeric) jadi Number agar UI tidak error
      const racikanBahanFormatted = racikanBahan.map((p) => ({
        ...p,
        kuantitasPemakaian: parseFloat(String(p.kuantitasPemakaian)) || 0,
        hargaTercatatPerSatuan: parseFloat(String(p.hargaTercatatPerSatuan)) || 0 // 🚀 TAMBAHAN PARSING
      }));

      const totalBiayaPerawatan = racikanBahanFormatted.reduce((sum, p) => sum + (p.totalBiaya ?? 0), 0);

      return {
        ...perawatan,
        pekerjaIds: pekerjaMap.get(perawatan.id) || [], 
        waktuMulai: toWIBString(perawatan.waktuMulai as Date),
        waktuSelesai: toWIBString(perawatan.waktuSelesai as Date),
        logProduk: racikanBahanFormatted, // 👈 Pake array yang udah diformat
        totalBiayaProduk: totalBiayaPerawatan, 
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

  // 🚀 HAPUS pekerjaIds DARI ALLOWED BASIC FIELDS
  const allowedBasicFields = ['kegiatan', 'waktuMulai', 'waktuSelesai', 'durasiKerja', 'tagCategoryId', 'status', 'catatan'];

  const basicPayload: Record<string, any> = Object.fromEntries(
    Object.entries(body).filter(([key, v]) => allowedBasicFields.includes(key) && v !== undefined)
  );
  
  // 🚀 TANGKAP PAYLOAD PEKERJA SECARA TERPISAH
  const pekerjaFieldDikirim = 'pekerjaIds' in body;
  const pekerjaIdsBaru = pekerjaFieldDikirim ? (body.pekerjaIds as string[]) : [];

  if (basicPayload.waktuMulai) basicPayload.waktuMulai = parseWIB(basicPayload.waktuMulai);
  if (basicPayload.waktuSelesai) basicPayload.waktuSelesai = parseWIB(basicPayload.waktuSelesai);

  const produkFieldDikirim = 'logProduk' in body && Array.isArray(body.logProduk);
  const produkArray: Array<{ produkId: string; kuantitasPemakaian: number }> = produkFieldDikirim ? body.logProduk : [];

  // 💡 JANGAN LUPA TAMBAH CEK PEKERJA DI SINI
  if (Object.keys(basicPayload).length === 0 && !produkFieldDikirim && !pekerjaFieldDikirim) {
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

      // 🚀 SINKRONISASI RELASI PEKERJA
      if (pekerjaFieldDikirim) {
        // Hapus relasi pekerja lama
        await tx.delete(perawatanPekerjaTable).where(eq(perawatanPekerjaTable.perawatanId, id));
        // Jika ada array baru, masukkan
        if (Array.isArray(pekerjaIdsBaru) && pekerjaIdsBaru.length > 0) {
           const insertPekerja = pekerjaIdsBaru.map(pId => ({ perawatanId: id, pekerjaId: pId }));
           await tx.insert(perawatanPekerjaTable).values(insertPekerja);
        }
      }

     // 🔒 INI ATURAN INTI KAMU: update selektif CUMA jalan kalau field produk eksplisit dikirim.
      if (produkFieldDikirim) {
        // 1. Snapshot Historis
        const produkLama = await tx
          .select()
          .from(perawatanProdukTable)
          .where(eq(perawatanProdukTable.perawatanId, id));

        // Bikin Map biar gampang dicari berdasarkan produkId
        const mapLama = new Map(produkLama.map((p) => [p.produkId, p]));

        const toDelete: typeof produkLama = [];
        const toInsert: Array<{ produkId: string; kuantitasPemakaian: number; urutan: number }> = [];
        const toUpdate: Array<{ produkId: string; kuantitasPemakaian: number; urutan: number; oldData: typeof produkLama[0] }> = [];

        // 2. Pembandingan The Delta Algorithm & Suntik Urutan
        produkArray.forEach((item, index) => {
          if (mapLama.has(item.produkId)) {
            // Ember C: Diubah / Tetap
            toUpdate.push({ ...item, urutan: index, oldData: mapLama.get(item.produkId)! });
            mapLama.delete(item.produkId); // Tandai sudah diproses
          } else {
            // Ember B: Tambah Baru
            toInsert.push({ ...item, urutan: index });
          }
        });

        // Sisa yang ada di mapLama berarti dihapus dari Frontend
        for (const [produkId, oldData] of mapLama.entries()) {
             toDelete.push(oldData); // Ember A: Dihapus
        }

        // --- EKSEKUSI EMBER A: DIHAPUS (Kembalikan stok penuh & hapus baris) ---
        for (const item of toDelete) {
          await adjustStock(tx, {
            produkId: item.produkId,
            delta: item.kuantitasPemakaian, // kembalikan (positif)
            tipe: "reversal_edit",
            perawatanProdukId: null,
          });
          await tx.delete(perawatanProdukTable).where(eq(perawatanProdukTable.id, item.id));
        }

         // --- EKSEKUSI EMBER B: TAMBAH BARU (Potong stok & pakai harga master TERBARU) ---
        if (toInsert.length > 0) {
          const insertIds = toInsert.map((p) => p.produkId);
          const masterRows = await tx.select().from(produkMasterTable).where(inArray(produkMasterTable.id, insertIds));
          const masterMap = new Map(masterRows.map((p) => [p.id, p]));

          for (const item of toInsert) {
            const master = masterMap.get(item.produkId);
            if (!master) throw new Error(`Produk dengan ID ${item.produkId} tidak ditemukan.`);
            
            // 🚀 FIX: Parse harga dari string DB jadi Number
            const hargaMasterNum = Number(master.hargaPerSatuanDasar) || 0;
            
            if (hargaMasterNum === 0) throw new Error(`Produk "${master.nama}" belum punya harga. Set harga dulu.`);
            if (item.kuantitasPemakaian <= 0) throw new Error(`Kuantitas pemakaian "${master.nama}" harus lebih dari 0.`);

            await adjustStock(tx, {
              produkId: item.produkId,
              delta: -item.kuantitasPemakaian, // potong (negatif)
              tipe: "pemakaian",
              perawatanProdukId: null,
            });

            const totalBiaya = Math.round(item.kuantitasPemakaian * hargaMasterNum);
            await tx.insert(perawatanProdukTable).values({
              perawatanId: id,
              produkId: item.produkId,
              kuantitasPemakaian: String(item.kuantitasPemakaian), // 🚀 BUNGKUS String()
              hargaTercatatPerSatuan: String(hargaMasterNum), // 🚀 BUNGKUS String()
              totalBiaya,
              urutan: item.urutan, 
            });
          }
        }

        // --- EKSEKUSI EMBER C: DIUBAH/TETAP (Hitung selisih stok & pakai HARGA HISTORIS) ---
        for (const item of toUpdate) {
          if (item.kuantitasPemakaian <= 0) throw new Error(`Kuantitas pemakaian harus lebih dari 0.`);

          const oldQty = Number(item.oldData.kuantitasPemakaian);
          const newQty = Number(item.kuantitasPemakaian);
          const deltaQty = oldQty - newQty; 
          // Logika adjustStock: positif = masuk gudang (nambah), negatif = keluar gudang (motong)
          // Jika old=10, new=15. delta = 10-15 = -5 (potong 5 dari gudang).
          // Jika old=10, new=8. delta = 10-8 = 2 (masukkan 2 ke gudang).

          if (deltaQty !== 0) {
            await adjustStock(tx, {
              produkId: item.produkId,
              delta: deltaQty,
              tipe: deltaQty > 0 ? "reversal_edit" : "pemakaian", // disamakan tipenya agar log rapi
              perawatanProdukId: null,
            });
          }

          // 🚀 KRUSIAL: Pake harga historis dari oldData, bukan dari produkMaster!
          const hargaHistoris = Number(item.oldData.hargaTercatatPerSatuan);
          const totalBiayaBaru = Math.round(hargaHistoris * newQty);

          await tx.update(perawatanProdukTable)
            .set({
              kuantitasPemakaian: newQty.toString(),
              totalBiaya: totalBiayaBaru,
              urutan: item.urutan // 🚀 Pastikan urutan terbaru tetap terupdate
            })
            .where(eq(perawatanProdukTable.id, item.oldData.id));
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
