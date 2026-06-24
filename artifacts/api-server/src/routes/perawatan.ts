import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { 
  db, 
  areasTable, 
  perawatanTable, 
  perawatanProdukTable,
  pekerjaTable,
  kategoriTable
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
// 1. ENDPOINT DROPDOWN OPTIONS
// ==========================================
router.get("/notion/perawatan-dropdown-options", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { 
    res.status(401).json({ error: "Unauthorized" }); 
    return; 
  }

  // --- BATAS ATAS PERBAIKAN ---
  try {
    const areas = await db.select().from(areasTable);
    
    const formattedAreas = areas.map(a => ({
      id: a.id,
      name: a.name
    }));

    // 1. Ambil data pekerja aktif langsung dari Supabase
    const dbPekerja = await db.select().from(pekerjaTable);
    
    // 2. Mapping properti 'nama' dari DB menjadi 'name' untuk Frontend
    const formattedPetugas = dbPekerja.map((p) => ({
      id: p.id,
      name: p.nama,
    }));

        // 3. Tarik data kategori spesifik untuk modul perawatan
    const dbKategori = await db.select().from(kategoriTable).where(eq(kategoriTable.module, "perawatan"));
    const formattedKategori = dbKategori.map((k) => ({
      id: k.id,
      name: k.name,
      module: k.module
    }));

    // 4. Kirim data asli ke frontend
    res.json({ areas: formattedAreas, petugas: formattedPetugas, kategori: formattedKategori });
  } catch (err) {
// --- BATAS BAWAH PERBAIKAN --
    res.status(500).json({ error: "Gagal mengambil opsi dropdown dari database." });
  }
});

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
      const tanggalMulaiStr = body.modeTanggal === "broadcast" 
        ? body.tanggalBroadcast 
        : body.tanggalPerArea?.[currentAreaId] || body.tanggalBroadcast;
        
      const tanggalSelesaiStr = body.modeTanggal === "broadcast" 
        ? body.tanggalSelesaiBroadcast 
        : body.tanggalSelesaiPerArea?.[currentAreaId] || body.tanggalSelesaiBroadcast;
        
      const durasiKerjaNum = body.modeTanggal === "broadcast" 
        ? body.durasiKerjaBroadcast 
        : body.durasiKerjaPerArea?.[currentAreaId] || body.durasiKerjaBroadcast;

      const pekerjaIdsArray = body.modePekerja === "broadcast" 
        ? body.petugasBroadcast 
        : body.petugasPerArea?.[currentAreaId] || body.petugasBroadcast;

      const tagCategoryStr = body.modeTags === "broadcast" 
        ? body.tagsBroadcast 
        : body.tagsPerArea?.[currentAreaId] || body.tagsBroadcast;

      const statusStr = body.modeStatus === "broadcast" 
        ? body.statusBroadcast 
        : body.statusPerArea?.[currentAreaId] || body.statusBroadcast;

      const catatanStr = body.modeCatatan === "broadcast" 
        ? body.catatanBroadcast 
        : body.catatanPerArea?.[currentAreaId] || body.catatanBroadcast;

      const produkArray = body.modeProduk === "broadcast" 
        ? body.logProduk 
        : body.produkPerArea?.[currentAreaId] || body.logProduk;

      // 1. Simpan Data Induk
      const [insertedPerawatan] = await db.insert(perawatanTable).values({
        kegiatan: kegiatan,
        areaId: currentAreaId,
        waktuMulai: tanggalMulaiStr ? new Date(tanggalMulaiStr) : new Date(),
        waktuSelesai: tanggalSelesaiStr ? new Date(tanggalSelesaiStr) : null,
        durasiKerja: Number(durasiKerjaNum ?? 0),
        tagCategoryId: tagCategoryStr || null, // 💡 Pakai ID Kategori
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
router.get("/notion/all-perawatan", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { 
    res.status(401).json({ error: "Unauthorized" }); 
    return; 
  }

  try {
    // 1. Ambil data induk perawatan + nama area
    const indukData = await db
      .select({
        id: perawatanTable.id,
        kegiatan: perawatanTable.kegiatan,
        areaId: perawatanTable.areaId,
        areaName: areasTable.name,
        waktuMulai: perawatanTable.waktuMulai,
        waktuSelesai: perawatanTable.waktuSelesai,
        durasiKerja: perawatanTable.durasiKerja,
        tagCategoryId: perawatanTable.tagCategoryId, 
        tagCategoryName: kategoriTable.name, 
        status: perawatanTable.status,
        pekerjaIds: perawatanTable.pekerjaIds,
        catatan: perawatanTable.catatan
      })
      .from(perawatanTable)
      .leftJoin(areasTable, eq(perawatanTable.areaId, areasTable.id))
      .leftJoin(kategoriTable, eq(perawatanTable.tagCategoryId, kategoriTable.id)); 

    // 2. Ambil semua detail produk racikan dari tabel anak
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
        logProduk: racikanBahan // 💡 Kita namakan logProduk agar struktur payload-nya sama persis dengan form input lu!
      };
    });

    res.json({ 
      success: true, 
      data: dataMatang 
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Gagal mengambil riwayat perawatan." });
  }
});

export default router;
