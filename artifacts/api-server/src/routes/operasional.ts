import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { 
  db, 
  areasTable, 
  operasionalTable,
  pekerjaTable 
} from "@workspace/db";

const router: IRouter = Router();

// ==========================================
// 1. TYPE DEFINITION (Sesuai Payload iOS/Frontend)
// ==========================================
interface AddOperasionalBody {
  namaPekerjaan: string;
  areaIds: string[]; 
  
  modeKategori: "broadcast" | "spesifik";
  kategoriBroadcast?: string; 
  kategoriPerArea?: Record<string, string>;

  modeWaktu: "broadcast" | "spesifik"; 
  waktuMulaiBroadcast?: string; waktuSelesaiBroadcast?: string; 
  durasiKerjaBroadcast?: number; 
  waktuMulaiPerArea?: Record<string, string>; waktuSelesaiPerArea?: Record<string, string>; 
  durasiKerjaPerArea?: Record<string, number>; 
  
  modePekerja: "broadcast" | "spesifik"; 
  pekerjaBroadcast: string[]; pekerjaPerArea: Record<string, string[]>;
  
  modeAtribut: "broadcast" | "spesifik";
  statusBroadcast?: string; statusPerArea?: Record<string, string>;
  prioritasBroadcast?: string; prioritasPerArea?: Record<string, string>;
  jenisTenagaKerjaBroadcast?: string; jenisTenagaKerjaPerArea?: Record<string, string>;

  modeCatatan: "broadcast" | "spesifik"; 
  catatanBroadcast?: string; catatanPerArea?: Record<string, string>;
}

// ==========================================
// 2. ENDPOINT DROPDOWN OPTIONS
// ==========================================
router.get("/notion/operasional-dropdown-options", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { 
    res.status(401).json({ error: "Unauthorized" }); 
    return; 
  }

  try {
    const areas = await db.select().from(areasTable);
    
    const formattedAreas = areas.map(a => ({
      id: a.id,
      name: a.name
    }));

    // Ambil data pekerja aktif langsung dari Supabase
    const dbPekerja = await db.select().from(pekerjaTable);
    
    // Mapping properti 'nama' dari DB menjadi 'name' untuk Frontend
    const formattedPetugas = dbPekerja.map((p) => ({
      id: p.id,
      name: p.nama,
    }));

    // Kirim data asli ke frontend
    res.json({ areas: formattedAreas, petugas: formattedPetugas });
  } catch (err) {

    res.status(500).json({ error: "Gagal mengambil opsi dropdown dari database." }); 
  }
});

// ==========================================
// 3. ENDPOINT SAVE DATA OPERASIONAL
// ==========================================
router.post("/notion/add-operasional", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { 
    res.status(401).json({ error: "Unauthorized" }); 
    return; 
  }
  
  const body = req.body as Partial<AddOperasionalBody>;
  const namaPekerjaan = (body.namaPekerjaan ?? "").trim();
  const areaIds: string[] = Array.isArray(body.areaIds) ? body.areaIds.filter(Boolean) : [];

  if (!namaPekerjaan || areaIds.length === 0) {
    res.status(400).json({ error: "Field 'namaPekerjaan' dan 'areaIds' wajib diisi." }); 
    return;
  }

  try {
    const recordsCreated: any[] = [];

    for (const currentAreaId of areaIds) {
      // 1. Ekstrak Kategori
      const kategoriStr = body.modeKategori === "broadcast" ? (body.kategoriBroadcast || "") : (body.kategoriPerArea?.[currentAreaId] || body.kategoriBroadcast || "");

      // 2. Ekstrak Waktu & Durasi
      const waktuMulaiStr = body.modeWaktu === "broadcast" ? body.waktuMulaiBroadcast : (body.waktuMulaiPerArea?.[currentAreaId] || body.waktuMulaiBroadcast);
      const waktuSelesaiStr = body.modeWaktu === "broadcast" ? body.waktuSelesaiBroadcast : (body.waktuSelesaiPerArea?.[currentAreaId] || body.waktuSelesaiBroadcast);
      const durasiNum = body.modeWaktu === "broadcast" ? body.durasiKerjaBroadcast : body.durasiKerjaPerArea?.[currentAreaId];
      
      // 3. Ekstrak Pekerja
      const pekerjaArray = body.modePekerja === "broadcast" ? (body.pekerjaBroadcast || []) : (body.pekerjaPerArea?.[currentAreaId] || []);
      
      // 4. Ekstrak Atribut (Status, Prioritas, Jenis Pekerja)
      const statusStr = body.modeAtribut === "broadcast" ? body.statusBroadcast : (body.statusPerArea?.[currentAreaId] || body.statusBroadcast);
      const prioritasStr = body.modeAtribut === "broadcast" ? body.prioritasBroadcast : (body.prioritasPerArea?.[currentAreaId] || body.prioritasBroadcast);
      const jenisStr = body.modeAtribut === "broadcast" ? body.jenisTenagaKerjaBroadcast : (body.jenisTenagaKerjaPerArea?.[currentAreaId] || body.jenisTenagaKerjaBroadcast);

      // 5. Ekstrak Catatan
      const catatanStr = body.modeCatatan === "broadcast" ? (body.catatanBroadcast || "") : (body.catatanPerArea?.[currentAreaId] || "");

      // Simpan Data Induk Operasional
      const [insertedOperasional] = await db.insert(operasionalTable).values({
        namaPekerjaan: namaPekerjaan,
        areaId: currentAreaId,
        kategori: kategoriStr || "Umum",
        waktuMulai: waktuMulaiStr ? new Date(waktuMulaiStr) : new Date(),
        waktuSelesai: waktuSelesaiStr ? new Date(waktuSelesaiStr) : null,
        durasiKerja: Number(durasiNum ?? 0),
        pekerjaIds: pekerjaArray || [],
        status: statusStr || "Belum dikerjakan",
        prioritas: prioritasStr || "Medium",
        jenisTenagaKerja: jenisStr || "Harian",
        catatan: catatanStr || null,
      }).returning();

      recordsCreated.push({
        id: insertedOperasional.id,
        namaPekerjaan: insertedOperasional.namaPekerjaan,
        areaId: currentAreaId
      });
    }

    res.status(201).json({ 
      success: true, 
      message: `Berhasil mencatat operasional untuk ${areaIds.length} area.`, 
      data: recordsCreated 
    });

  } catch (err) { 
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" }); 
  }
});

// ==========================================
// 4. ENDPOINT GET ALL OPERASIONAL (SUPABASE REALTIME + NAMA AREA)
// ==========================================
router.get("/notion/all-operasional", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { 
    res.status(401).json({ error: "Unauthorized" }); 
    return; 
  }

  try {
    // Tarik data operasional real-time dari Supabase + join nama area lokasinya
    const data = await db
      .select({
        id: operasionalTable.id,
        namaPekerjaan: operasionalTable.namaPekerjaan,
        areaId: operasionalTable.areaId,
        areaName: areasTable.name, // 💡 Nama area dari tabel sebelah
        kategori: operasionalTable.kategori,
        waktuMulai: operasionalTable.waktuMulai,
        waktuSelesai: operasionalTable.waktuSelesai,
        durasiKerja: operasionalTable.durasiKerja,
        pekerjaIds: operasionalTable.pekerjaIds,
        status: operasionalTable.status,
        prioritas: operasionalTable.prioritas,
        jenisTenagaKerja: operasionalTable.jenisTenagaKerja,
        catatan: operasionalTable.catatan
      })
      .from(operasionalTable)
      .leftJoin(areasTable, eq(operasionalTable.areaId, areasTable.id)); // 🔗 Hubungkan relasi ID

    res.json({ 
      success: true, 
      data: data 
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Gagal mengambil riwayat operasional." });
  }
});


export default router;
