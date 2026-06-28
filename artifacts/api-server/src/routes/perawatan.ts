import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import { 
  db, 
  areasTable, 
  perawatanTable, 
  perawatanProdukTable,
  pekerjaTable,
  kategoriTable,
  siklusTanamTable
} from "@workspace/db";

const router: IRouter = Router();

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
  logProduk: Array<{ produk: string; dosis: string }>; 
  produkPerArea: Record<string, Array<{ produk: string; dosis: string }>>;
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

      // 1. Simpan Data Induk
      const [insertedPerawatan] = await db.insert(perawatanTable).values({
        kegiatan: kegiatan,
        areaId: currentAreaId,
        siklusId: activeCycle ? activeCycle.id : null, // 🚀 SUNTIKAN SIKLUS ID
        waktuMulai: tanggalMulaiStr ? new Date(tanggalMulaiStr) : new Date(),
        waktuSelesai: tanggalSelesaiStr ? new Date(tanggalSelesaiStr) : null,
        durasiKerja: Number(durasiKerjaNum ?? 0),
        tagCategoryId: tagCategoryStr || null, 
        status: statusStr || "Belum dikerjakan",
        pekerjaIds: pekerjaIdsArray || [], 
        catatan: catatanStr || null,
      }).returning();

      // 2. Simpan Racikan Produk (Jika ada)
      if (produkArray && produkArray.length > 0) {
        const dataProduk = produkArray.map((p) => ({
          perawatanId: insertedPerawatan.id,
          namaProduk: p.produk,
          dosis: p.dosis,
        }));
        
        await db.insert(perawatanProdukTable).values(dataProduk);
      }

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

  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
  }
});

// ==========================================
// 3. ENDPOINT GET ALL PERAWATAN (SUPABASE REALTIME + NAMA AREA + DETAIL PRODUK)
// ==========================================
// ==========================================
// 3. ENDPOINT GET ALL PERAWATAN (SUPABASE REALTIME + NAMA AREA + DETAIL PRODUK)
// ==========================================
router.get("/notion/all-perawatan", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { 
    res.status(401).json({ error: "Unauthorized" }); 
    return; 
  }

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
        tanggalPindahTanam: siklusTanamTable.tanggalPindahTanam 
      })
      .from(perawatanTable)
      .leftJoin(areasTable, eq(perawatanTable.areaId, areasTable.id))
      .leftJoin(kategoriTable, eq(perawatanTable.tagCategoryId, kategoriTable.id))
      // 🚀 SIMPLE JOIN LANGSUNG KE SIKLUS ID!
      .leftJoin(siklusTanamTable, eq(perawatanTable.siklusId, siklusTanamTable.id));


    // 2. Ambil semua detail produk racikan dari tabel anak
    // (Pastikan perawatanProdukTable sudah di-import di atas)
    const semuaProduk = await db.select().from(perawatanProdukTable);

    // 3. Gabungkan produk ke masing-masing induk perawatan yang cocok
    const dataMatang = indukData.map((perawatan) => {
      const racikanBahan = semuaProduk
        .filter((p) => p.perawatanId === perawatan.id)
        .map((p) => ({
          produk: p.namaProduk,
          dosis: p.dosis
        }));

      return {
        ...perawatan,
        logProduk: racikanBahan 
      };
    });

    res.json({ 
      success: true, 
      data: dataMatang 
    });
  
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal mengambil riwayat perawatan." });
  }
});

export default router;
