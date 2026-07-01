import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, aliasedTable } from "drizzle-orm"; // 💡 Tambah aliasedTable
import { 
  db, 
  areasTable, 
  perawatanTable, 
  perawatanProdukTable,
  pekerjaTable,
  kategoriTable,
  siklusTanamTable,           
  pekerjaAtributMasterTable,  
  inspeksiTable,           
  inspeksiTemuanTable,     
  kendalaMasterTable     
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

// ==========================================
// 1. TYPE DEFINITION (Sesuai Payload iOS/Frontend)
// ==========================================
interface TemuanDetail { 
  nama: string; 
  kendalaMasterId: string; // 🚀 WAJIB DITAMBAH: Supaya TS nggak ngamuk pas lu panggil di bawah
  catatan: string; 
}

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
// 2. ENDPOINT DROPDOWN OPTIONS DIALIHKAN KE OPERASIONAL.TS
// ==========================================

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

            // 🔍 5. CARI SIKLUS TANAM YANG SEDANG AKTIF DI AREA INI
      const [activeCycle] = await db
        .select({ id: siklusTanamTable.id })
        .from(siklusTanamTable)
        .where(
          and(
            eq(siklusTanamTable.areaId, currentAreaId as string), // 🚀 DITAMBAH: as string
            eq(siklusTanamTable.status, "Aktif")
          )
        )
        .limit(1);

      // Simpan Data Induk Inspeksi
      const [insertedInspeksi] = await db.insert(inspeksiTable).values({
        kegiatan: kegiatan,
        areaId: currentAreaId,
        siklusId: activeCycle ? activeCycle.id : null, // 🚀 SUNTIKAN SIKLUS ID
        
        // 🚀 SUNTIKAN ZONA WAKTU WIB
        waktuMulai: parseWIB(waktuMulaiStr) ?? new Date(),
        waktuSelesai: parseWIB(waktuSelesaiStr),
        
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

  // 🚀 1. TANGKAP QUERY FILTER SIKLUS STATUS DARI FRONTEND
  const { statusSiklus } = req.query; 

  try {
    // 1. Ambil data induk inspeksi (Ditambah namaSiklus)
    const indukData = await db
      .select({
        id: inspeksiTable.id,
        kegiatan: inspeksiTable.kegiatan,
        areaId: inspeksiTable.areaId,
        areaName: areasTable.name,
        namaSiklus: siklusTanamTable.namaSiklus, // 💡 Tarik nama tanaman
        waktuMulai: inspeksiTable.waktuMulai,
        waktuSelesai: inspeksiTable.waktuSelesai,
        durasiKerja: inspeksiTable.durasiKerja,
        phTanah: inspeksiTable.phTanah,
        tingkatSerangan: inspeksiTable.tingkatSerangan,
        radius: inspeksiTable.radius,
        status: inspeksiTable.status,
        pekerjaIds: inspeksiTable.pekerjaIds,
        keterangan: inspeksiTable.keterangan,
        
        // 🚀 TARIK JUGA SIKLUS ID DAN TANGGAL UNTUK UI
        siklusId: inspeksiTable.siklusId,
        tanggalPindahTanam: siklusTanamTable.tanggalPindahTanam, 
        statusSiklus: siklusTanamTable.status // 🚀 2. TARIK STATUS SIKLUS
      })
      .from(inspeksiTable)
      .leftJoin(areasTable, eq(inspeksiTable.areaId, areasTable.id))
      // 🚀 SIMPLE JOIN LANGSUNG KE SIKLUS ID!
      .leftJoin(siklusTanamTable, eq(inspeksiTable.siklusId, siklusTanamTable.id));


    // 🚀 3. FILTER DATANYA SEBELUM DI-MAP
    let filteredIndukData = indukData;
    if (statusSiklus === "selesai") {
      // Hanya ambil catatan yang masa tanamnya sudah beres
      filteredIndukData = indukData.filter(item => item.statusSiklus === "Selesai/Panen");
    } else {
      // Default: Ambil yang masih 'Aktif' ATAU yang nggak punya siklus (null)
      filteredIndukData = indukData.filter(item => item.statusSiklus === "Aktif" || !item.statusSiklus);
    }

    // 2. Ambil semua data temuan dan JOIN ke master kendala untuk dapet nama & jenis
    // (Pastikan kendalaMasterTable dan inspeksiTemuanTable di-import di atas!)
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
    // 🚀 PASTIKAN MAPPING MENGGUNAKAN 'filteredIndukData'
      const dataMatang = filteredIndukData.map((inspeksi) => {
      const temuanKhusus = semuaTemuan.filter((t) => t.inspeksiId === inspeksi.id);

      const daftarHama = temuanKhusus.filter((t) => t.jenisKendala?.toLowerCase() === "hama").map((t) => t.namaKendala);
      const daftarPenyakit = temuanKhusus.filter((t) => t.jenisKendala?.toLowerCase() === "penyakit").map((t) => t.namaKendala);
      
      const catatanTemuan = temuanKhusus
        .map((t) => `${t.namaKendala}: ${t.catatanKhusus || "Tanpa catatan khusus"}`)
        .join("\n");

      return {
        ...inspeksi,
        waktuMulai: toWIBString(inspeksi.waktuMulai as Date),
        waktuSelesai: toWIBString(inspeksi.waktuSelesai as Date),
        hama: daftarHama,
        penyakit: daftarPenyakit,

        keterangan: (() => {
          const adaTemuan = temuanKhusus.length > 0;
          const adaCatatan = inspeksi.keterangan && inspeksi.keterangan.trim() !== "";

          if (adaCatatan && adaTemuan) {
            return `${inspeksi.keterangan}\n\n⚠️ Detail Kendala:\n${catatanTemuan}`;
          }
          if (adaCatatan && !adaTemuan) {
            return inspeksi.keterangan;
          }
          if (!adaCatatan && adaTemuan) {
            return `\n\n⚠️ Detail Kendala:\n${catatanTemuan}`;
          }
          return "";
        })()
      };
    });

    res.json({ success: true, data: dataMatang });
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
