import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and } from "drizzle-orm";
import { 
  db, 
  areasTable, 
  inspeksiTable, 
  inspeksiTemuanTable,
  pekerjaTable,
  kendalaMasterTable,
  siklusTanamTable
} from "@workspace/db";

const router: IRouter = Router();

// ==========================================
// 1. TYPE DEFINITION (Sesuai Payload iOS/Frontend)
// ==========================================
interface TemuanDetail { nama: string; catatan: string; }

interface AddInspeksiBody {
  kegiatan: string;
  areaIds: string[]; 

  modeWaktu: "broadcast" | "spesifik"; 
  waktuMulaiBroadcast?: string; waktuSelesaiBroadcast?: string; durasiKerjaBroadcast?: number;
  waktuMulaiPerArea?: Record<string, string>; waktuSelesaiPerArea?: Record<string, string>; durasiKerjaPerArea?: Record<string, number>;
  
  modeKendala: "broadcast" | "spesifik"; 
  hamaBroadcast?: string[]; penyakitBroadcast?: string[];
  hamaPerArea?: Record<string, string[]>; penyakitPerArea?: Record<string, string[]>;
  temuanBroadcast?: TemuanDetail[]; temuanPerArea?: Record<string, TemuanDetail[]>; 

  modeAngka: "broadcast" | "spesifik"; 
  tingkatSeranganBroadcast?: number | string; radiusBroadcast?: number | string; phTanahBroadcast?: number | string;
  tingkatSeranganPerArea?: Record<string, number | string>; radiusPerArea?: Record<string, number | string>; phTanahPerArea?: Record<string, number | string>;

  modePekerja: "broadcast" | "spesifik"; 
  petugasBroadcast?: string[]; petugasPerArea?: Record<string, string[]>;
  
  modeAtribut: "broadcast" | "spesifik";
  statusBroadcast?: string; statusPerArea?: Record<string, string>;

  modeCatatan: "broadcast" | "spesifik"; 
  keteranganBroadcast?: string; keteranganPerArea?: Record<string, string>;
}

// ==========================================
// 2. ENDPOINT DROPDOWN OPTIONS
// ==========================================
router.get("/notion/inspeksi-dropdown-options", async (req, res): Promise<void> => {
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

    const dbPekerja = await db.select().from(pekerjaTable);
    const formattedPetugas = dbPekerja.map((p) => ({
      id: p.id,
      name: p.nama,
    }));

    // Ambil data master hama & penyakit
    const dbKendala = await db.select().from(kendalaMasterTable);
    const formattedKendala = dbKendala.map((k) => ({
      id: k.id,
      name: k.nama,
      jenis: k.jenis // 'hama' atau 'penyakit'
    }));

    // Kirim data ke frontend
    res.json({ 
      areas: formattedAreas, 
      petugas: formattedPetugas, 
      kendalaMaster: formattedKendala
    });
    
    } catch (err: any) { 
    res.status(500).json({ error: err.message || "Gagal mengambil opsi dropdown dari database." }); 
  }
});


// ==========================================
// 3. ENDPOINT SAVE DATA INSPEKSI
// ==========================================
router.post("/notion/add-inspeksi", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { 
    res.status(401).json({ error: "Unauthorized" }); 
    return; 
  }
  
  const body = req.body as Partial<AddInspeksiBody>;
  const kegiatan = (body.kegiatan ?? "").trim();
  const areaIds: string[] = Array.isArray(body.areaIds) ? body.areaIds.filter(Boolean) : [];

  if (!kegiatan || areaIds.length === 0) {
    res.status(400).json({ error: "Field 'kegiatan' dan 'areaIds' (minimal 1) wajib diisi." }); 
    return;
  }

  try {
    const recordsCreated: any[] = [];

    for (const currentAreaId of areaIds) {
      
      // 1. Ekstrak Waktu & Durasi
      const waktuMulaiStr = body.modeWaktu === "broadcast" ? body.waktuMulaiBroadcast : (body.waktuMulaiPerArea?.[currentAreaId] || body.waktuMulaiBroadcast);
      const waktuSelesaiStr = body.modeWaktu === "broadcast" ? body.waktuSelesaiBroadcast : (body.waktuSelesaiPerArea?.[currentAreaId] || body.waktuSelesaiBroadcast);
      const durasiNum = body.modeWaktu === "broadcast" ? body.durasiKerjaBroadcast : body.durasiKerjaPerArea?.[currentAreaId];
      
      // 2. Ekstrak Angka (Serangan, Radius, pH)
      const seranganVal = body.modeAngka === "broadcast" ? body.tingkatSeranganBroadcast : body.tingkatSeranganPerArea?.[currentAreaId];
      const radiusVal = body.modeAngka === "broadcast" ? body.radiusBroadcast : body.radiusPerArea?.[currentAreaId];
      const phVal = body.modeAngka === "broadcast" ? body.phTanahBroadcast : body.phTanahPerArea?.[currentAreaId];
      
      // 3. Ekstrak Pekerja, Status, dan Catatan
      const petugasArray = body.modePekerja === "broadcast" ? (body.petugasBroadcast || []) : (body.petugasPerArea?.[currentAreaId] || []);
      const statusStr = body.modeAtribut === "broadcast" ? body.statusBroadcast : (body.statusPerArea?.[currentAreaId] || body.statusBroadcast);
      const catatanStr = body.modeCatatan === "broadcast" ? (body.keteranganBroadcast || "") : (body.keteranganPerArea?.[currentAreaId] || "");
      
      // 4. Ekstrak Detail Temuan
      const temuanArray = body.modeKendala === "broadcast" ? (body.temuanBroadcast || []) : (body.temuanPerArea?.[currentAreaId] || []);

      // Simpan Data Induk Inspeksi
      const [insertedInspeksi] = await db.insert(inspeksiTable).values({
        kegiatan: kegiatan,
        areaId: currentAreaId,
        waktuMulai: waktuMulaiStr ? new Date(waktuMulaiStr) : new Date(),
        waktuSelesai: waktuSelesaiStr ? new Date(waktuSelesaiStr) : null,
        durasiKerja: Number(durasiNum ?? 0),
        phTanah: phVal ? Number(phVal) : null,
        tingkatSerangan: seranganVal ? Number(seranganVal) : null,
        radius: radiusVal ? Number(radiusVal) : null,
        status: statusStr || "Baru ditemukan",
        pekerjaIds: petugasArray || [],
        keterangan: catatanStr || null,
      }).returning();

      // Simpan Detail Temuan Hama/Penyakit (Jika Ada)
      if (temuanArray && temuanArray.length > 0) {
        const dataTemuan = temuanArray.map((t) => ({
          inspeksiId: insertedInspeksi.id,
          kendalaMasterId: t.kendalaMasterId, // 👈 Langsung pakai ID yang dikirim frontend
          catatanKhusus: t.catatan || null,
        }));

        await db.insert(inspeksiTemuanTable).values(dataTemuan);
      }

      recordsCreated.push({
        id: insertedInspeksi.id,
        kegiatan: insertedInspeksi.kegiatan,
        areaId: currentAreaId
      });
    }
    
    res.status(201).json({ 
      success: true, 
      message: `Berhasil mencatat laporan inspeksi untuk ${areaIds.length} area.`, 
      data: recordsCreated 
    });

  } catch (err) { 
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" }); 
  }
});

// ==========================================
// 4. ENDPOINT GET ALL INSPEKSI (SUPABASE REALTIME + NAMA AREA + DETAIL TEMUAN)
// ==========================================
router.get("/notion/all-inspeksi", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { 
    res.status(401).json({ error: "Unauthorized" }); 
    return; 
  }

  try {
        // 1. Ambil data induk inspeksi
    const indukData = await db
      .select({
        id: inspeksiTable.id,
        kegiatan: inspeksiTable.kegiatan,
        areaId: inspeksiTable.areaId,
        areaName: areasTable.name,
        waktuMulai: inspeksiTable.waktuMulai,
        waktuSelesai: inspeksiTable.waktuSelesai,
        durasiKerja: inspeksiTable.durasiKerja,
        phTanah: inspeksiTable.phTanah,
        tingkatSerangan: inspeksiTable.tingkatSerangan,
        radius: inspeksiTable.radius,
        status: inspeksiTable.status,
        pekerjaIds: inspeksiTable.pekerjaIds,
        keterangan: inspeksiTable.keterangan,
        tanggalPindahTanam: siklusTanamTable.tanggalPindahTanam // 💡 Ekstrak tanggal tanam untuk dikirim ke frontend
      })
      .from(inspeksiTable)
      .leftJoin(areasTable, eq(inspeksiTable.areaId, areasTable.id))
      // 💡 HUBUNGKAN RELASI: Ambil siklus tanam yang areanya sama DAN statusnya masih Aktif
      .leftJoin(siklusTanamTable, and(
        eq(inspeksiTable.areaId, siklusTanamTable.areaId),
        eq(siklusTanamTable.status, "Aktif")
      ));

    // 2. Ambil semua data temuan dan JOIN ke master kendala untuk dapet nama & jenis
    const semuaTemuan = await db
      .select({
        inspeksiId: inspeksiTemuanTable.inspeksiId,
        catatanKhusus: inspeksiTemuanTable.catatanKhusus,
        namaKendala: kendalaMasterTable.nama,
        jenisKendala: kendalaMasterTable.jenis,
      })
      .from(inspeksiTemuanTable)
      .leftJoin(kendalaMasterTable, eq(inspeksiTemuanTable.kendalaMasterId, kendalaMasterTable.id));

    // 3. Petakan temuan masuk ke induk inspeksi masing-masing
    const dataMatang = indukData.map((inspeksi) => {
      const temuanKhusus = semuaTemuan.filter((t) => t.inspeksiId === inspeksi.id);

      // Pastikan disesuaikan valuenya dengan jenis dari DB lu (lowercase atau uppercase)
      const daftarHama = temuanKhusus.filter((t) => t.jenisKendala?.toLowerCase() === "hama").map((t) => t.namaKendala);
      const daftarPenyakit = temuanKhusus.filter((t) => t.jenisKendala?.toLowerCase() === "penyakit").map((t) => t.namaKendala);
      
      // Kumpulkan catatan detail temuan lapangan (sebagai pengganti children block Notion)
      const catatanTemuan = temuanKhusus
        .map((t) => `${t.namaKendala}: ${t.catatanKhusus || "Tanpa catatan khusus"}`)
        .join("\n");

      return {
        ...inspeksi,
        hama: daftarHama,
        penyakit: daftarPenyakit,
        // Gabungkan keterangan induk dengan rincian catatan dari tabel anak kendala
        keterangan: inspeksi.keterangan 
          ? `${inspeksi.keterangan}\n\n⚠️ Detail Kendala:\n${catatanTemuan}`
          : catatanTemuan || "Kondisi tanaman terpantau aman terkendali."
      };
    });

        res.json({ 
      success: true, 
      data: dataMatang 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal mengambil riwayat inspeksi." });
  }
});

// ==========================================
// 5. ENDPOINT TAMBAH MASTER HAMA/PENYAKIT BARU
// ==========================================
router.post("/notion/kendala-master", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { 
    res.status(401).json({ error: "Unauthorized" }); 
    return; 
  }

  try {
    const { nama, jenis } = req.body;
    
    if (!nama || !jenis) {
      res.status(400).json({ error: "Nama dan jenis wajib diisi" });
      return;
    }

    // Insert ke tabel master
    const [newKendala] = await db.insert(kendalaMasterTable).values({
      nama: nama.trim(),
      jenis: jenis.toLowerCase() // pastikan masuk ke DB sebagai 'hama' atau 'penyakit'
    }).returning();

        res.status(201).json({ success: true, data: newKendala });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal menyimpan data master baru. Mungkin nama sudah ada?" });
  }
});

export default router;
