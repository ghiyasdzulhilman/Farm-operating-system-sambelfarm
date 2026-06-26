import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, aliasedTable } from "drizzle-orm"; // 💡 Tambahkan aliasedTable
import { 
  db, 
  areasTable, 
  operasionalTable,
  pekerjaTable,
  perawatanTable,
  inspeksiTable,
  kategoriTable,
  siklusTanamTable,
  pekerjaAtributMasterTable
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
    // 💡 REVISI: Join areasTable dengan siklusTanamTable (hanya yang aktif)
    const dbAreas = await db
      .select({
        id: areasTable.id,
        name: areasTable.name,
        namaSiklus: siklusTanamTable.namaSiklus, // Tarik nama tanaman
      })
      .from(areasTable)
      .leftJoin(
        siklusTanamTable,
        and(
          eq(areasTable.id, siklusTanamTable.areaId),
          eq(siklusTanamTable.status, "Aktif")
        )
      );

    // 💡 GABUNGKAN STRING DI SINI SEBELUM DIKIRIM
    const formattedAreas = dbAreas.map(a => ({ 
      id: a.id, 
      name: a.namaSiklus ? `${a.name} - ${a.namaSiklus}` : a.name 
    }));

    // 💡 REVISI: Join dengan tabel atribut untuk ngambil teks 'jenisTenagaKerja'
    const tenagaAtribut = aliasedTable(pekerjaAtributMasterTable, "tenaga_attr");

    const dbPekerja = await db
      .select({
        id: pekerjaTable.id,
        namaAsli: pekerjaTable.nama,
        roleId: pekerjaTable.roleId,
        jenisTenagaKerjaId: pekerjaTable.jenisTenagaKerjaId,
        statusId: pekerjaTable.statusId,
        jenisTenagaName: tenagaAtribut.namaOption, // 💡 Tarik teks nama opsinya
      })
      .from(pekerjaTable)
      .leftJoin(tenagaAtribut, eq(pekerjaTable.jenisTenagaKerjaId, tenagaAtribut.id));

    // 💡 GABUNGKAN NAMA DAN JENIS TENAGA KERJA DI SINI
    const formattedPetugas = dbPekerja.map((p) => ({ 
      id: p.id, 
      name: p.jenisTenagaName ? `${p.namaAsli} - ${p.jenisTenagaName}` : p.namaAsli,
      roleId: p.roleId,
      jenisTenagaKerjaId: p.jenisTenagaKerjaId,
      statusId: p.statusId
    }));

    const dbKategori = await db.select().from(kategoriTable);
    
    // 💡 Fetch Atribut Master (Notion-style tags)
    const dbAtribut = await db.select().from(pekerjaAtributMasterTable);
    const roles = dbAtribut.filter(a => a.jenisAtribut === "role").map(a => ({ id: a.id, name: a.namaOption }));
    const jenisTenaga = dbAtribut.filter(a => a.jenisAtribut === "jenis_tenaga").map(a => ({ id: a.id, name: a.namaOption }));
    const statuses = dbAtribut.filter(a => a.jenisAtribut === "status").map(a => ({ id: a.id, name: a.namaOption }));

    const formattedKategori = dbKategori.map((k) => ({
      id: k.id,
      name: k.name,
      module: k.module
    }));

    res.json({ 
      areas: formattedAreas, 
      petugas: formattedPetugas, 
      kategori: formattedKategori,
      atributPekerja: { roles, jenisTenaga, statuses } // 👈 Tambahkan ini
    });
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
        kategoriId: kategoriStr || null,
        waktuMulai: waktuMulaiStr ? new Date(waktuMulaiStr) : new Date(),
        waktuSelesai: waktuSelesaiStr ? new Date(waktuSelesaiStr) : null,
        durasiKerja: Number(durasiNum ?? 0),
        pekerjaIds: pekerjaArray || [],
        status: statusStr || "Belum dikerjakan",
        prioritas: prioritasStr || "Medium",
        jenisTenagaKerjaId: jenisStr || null,
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
// 4. ENDPOINT GET ALL OPERASIONAL (SUPABASE REALTIME + NAMA AREA & KATEGORI)
// ==========================================
router.get("/notion/all-operasional", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    // 💡 BUAT ALIAS: Supaya aman kalau nanti lu mau join atribut lain (role/status)
    const jenisTenagaAttr = aliasedTable(pekerjaAtributMasterTable, "jenis_tenaga_attr");

    const data = await db
      .select({
        id: operasionalTable.id,
        namaPekerjaan: operasionalTable.namaPekerjaan,
        areaId: operasionalTable.areaId,
        areaName: areasTable.name, 
        kategoriId: operasionalTable.kategoriId, 
        kategoriName: kategoriTable.name, 
        waktuMulai: operasionalTable.waktuMulai,
        waktuSelesai: operasionalTable.waktuSelesai,
        durasiKerja: operasionalTable.durasiKerja,
        pekerjaIds: operasionalTable.pekerjaIds,
        status: operasionalTable.status,
        prioritas: operasionalTable.prioritas,
        // 💡 AMBIL DATA RELASI BARU
        jenisTenagaKerjaId: operasionalTable.jenisTenagaKerjaId,
        jenisTenagaKerjaName: jenisTenagaAttr.namaOption, // 👈 Ini teks yang dibutuhin UI (ex: "Mandor")
        catatan: operasionalTable.catatan,
        tanggalPindahTanam: siklusTanamTable.tanggalPindahTanam 
      })
      .from(operasionalTable)
      .leftJoin(areasTable, eq(operasionalTable.areaId, areasTable.id)) 
      .leftJoin(kategoriTable, eq(operasionalTable.kategoriId, kategoriTable.id))
      // 💡 JOIN KE TABEL MASTER ATRIBUT
      .leftJoin(jenisTenagaAttr, eq(operasionalTable.jenisTenagaKerjaId, jenisTenagaAttr.id))
      .leftJoin(siklusTanamTable, and(
        eq(operasionalTable.areaId, siklusTanamTable.areaId),
        eq(siklusTanamTable.status, "Aktif")
      ));

    res.json({ success: true, data: data });
  } catch (err: any) {
    console.error("[DB ERROR GET ALL OPERASIONAL]:", err);
    res.status(500).json({ error: "Gagal mengambil riwayat operasional.", detail: err.message });
  }
});

// ==========================================
// 5. ENDPOINT DYNAMIC EDIT (STATUS & DATA LAINNYA)
// ==========================================
router.patch("/notion/edit-activity/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { 
    res.status(401).json({ error: "Unauthorized" }); 
    return; 
  }

  const { id } = req.params;
  // 💡 Kita pisahkan 'module' dari sisa data yang mau di-update
  const { module, ...updateData } = req.body; 

  if (!id || !module) {
    res.status(400).json({ error: "Parameter 'id' dan 'module' wajib diisi." });
    return;
  }

  try {
    let result;
    
    // 💡 Bersihkan objek dari nilai undefined biar Drizzle gak error
    const cleanPayload = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );

    // 🔴 KONVERSI STRING KE DATE: Wajib agar Drizzle PostgreSQL tidak error
    if (cleanPayload.waktuMulai) {
      cleanPayload.waktuMulai = new Date(cleanPayload.waktuMulai as string);
    }
    if (cleanPayload.waktuSelesai) {
      cleanPayload.waktuSelesai = new Date(cleanPayload.waktuSelesai as string);
    }

    if (Object.keys(cleanPayload).length === 0) {
       res.status(400).json({ error: "Tidak ada data yang dikirim untuk diupdate." });
       return;
    }

    // 💡 Deteksi modul dan tembak ke tabel yang sesuai secara dinamis
    if (module === "operasional") {
      result = await db.update(operasionalTable)
        .set(cleanPayload)
        .where(eq(operasionalTable.id, id))
        .returning();
    } else if (module === "perawatan") {
      result = await db.update(perawatanTable)
        .set(cleanPayload)
        .where(eq(perawatanTable.id, id))
        .returning();
    } else if (module === "inspeksi") {
      result = await db.update(inspeksiTable)
        .set(cleanPayload)
        .where(eq(inspeksiTable.id, id))
        .returning();
    } else {
      res.status(400).json({ error: "Modul tidak valid." });
      return;
    }

    if (!result || result.length === 0) {
      res.status(404).json({ error: "Data tidak ditemukan di database." });
      return;
    }

    res.json({ 
      success: true, 
      message: `Data pada modul ${module} berhasil diperbarui.`, 
      data: result[0] 
    });

  } catch (err) {
    console.error("Error update activity:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
  }
});

// ==========================================
// 6. ENDPOINT ADD & DELETE MASTER AREA
// ==========================================
router.post("/notion/areas", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { name } = req.body;
  if (!name || typeof name !== "string" || name.trim() === "") {
    res.status(400).json({ error: "Nama area wajib diisi." }); return;
  }

  try {
    const [newArea] = await db.insert(areasTable)
      .values({ name: name.trim() })
      .returning();
      
    res.status(201).json({ success: true, data: newArea });
  } catch (err) {
    res.status(500).json({ error: "Gagal menambah area baru." });
  }
});

router.delete("/notion/areas/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { id } = req.params;
  if (!id) { res.status(400).json({ error: "ID area wajib disertakan." }); return; }

  try {
    // Ingat: Karena efek cascade di schema, ini akan menghapus riwayat operasional terkait juga
    const [deletedArea] = await db.delete(areasTable)
      .where(eq(areasTable.id, id))
      .returning();

    if (!deletedArea) {
      res.status(404).json({ error: "Area tidak ditemukan." }); return;
    }
    
    res.json({ success: true, message: "Area dan riwayat terkait berhasil dihapus.", data: deletedArea });
  } catch (err) {
    res.status(500).json({ error: "Gagal menghapus area." });
  }
});

// ==========================================
// 7. ENDPOINT ADD, EDIT, & DELETE MASTER PEKERJA
// ==========================================
router.post("/notion/pekerja", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  // 💡 PERBAIKAN: Tangkap ID Relasi, bukan teks manual lama
  const { nama, kontak, roleId, jenisTenagaKerjaId, statusId } = req.body;
  
  if (!nama || typeof nama !== "string" || nama.trim() === "") {
    res.status(400).json({ error: "Nama pekerja wajib diisi." }); return;
  }

  try {
    const [newPekerja] = await db.insert(pekerjaTable)
      .values({ 
        nama: nama.trim(),
        kontak: kontak || null,
        roleId: roleId || null,
        jenisTenagaKerjaId: jenisTenagaKerjaId || null,
        statusId: statusId || null
      })
      .returning();
      
    res.status(201).json({ success: true, data: newPekerja });
  } catch (err) {
    res.status(500).json({ error: "Gagal menambah pekerja baru." });
  }
});

// 💡 FITUR BARU: Endpoint Edit Pekerja (PATCH) untuk Inline Editing Badge
router.patch("/notion/pekerja/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { id } = req.params;
  const { roleId, jenisTenagaKerjaId, statusId } = req.body;

  try {
    // Hanya update kolom yang dikirim dari frontend, buang yang undefined
    const cleanPayload = Object.fromEntries(
      Object.entries({ roleId, jenisTenagaKerjaId, statusId }).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(cleanPayload).length === 0) {
      res.status(400).json({ error: "Tidak ada data yang diupdate." }); return;
    }

    const [updatedPekerja] = await db.update(pekerjaTable)
      .set(cleanPayload)
      .where(eq(pekerjaTable.id, id))
      .returning();

    res.json({ success: true, message: "Data pekerja diperbarui.", data: updatedPekerja });
  } catch (err) { 
    res.status(500).json({ error: "Gagal update pekerja." }); 
  }
});

router.delete("/notion/pekerja/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { id } = req.params;
  if (!id) { res.status(400).json({ error: "ID pekerja wajib disertakan." }); return; }

  try {
    const [deletedPekerja] = await db.delete(pekerjaTable)
      .where(eq(pekerjaTable.id, id))
      .returning();

    if (!deletedPekerja) {
      res.status(404).json({ error: "Pekerja tidak ditemukan." }); return;
    }
    
    res.json({ success: true, message: "Pekerja berhasil dihapus.", data: deletedPekerja });
  } catch (err) {
    res.status(500).json({ error: "Gagal menghapus pekerja." });
  }
});


// ==========================================
// 8. ENDPOINT DELETE ACTIVITY ROW (BARIS TABEL)
// ==========================================
router.delete("/notion/activity/:module/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { id, module } = req.params;

  try {
    let result;
    if (module === "operasional") {
      result = await db.delete(operasionalTable).where(eq(operasionalTable.id, id)).returning();
    } else if (module === "perawatan") {
      result = await db.delete(perawatanTable).where(eq(perawatanTable.id, id)).returning();
    } else if (module === "inspeksi") {
      result = await db.delete(inspeksiTable).where(eq(inspeksiTable.id, id)).returning();
    } else {
      res.status(400).json({ error: "Modul tidak valid." }); return;
    }

    if (!result || result.length === 0) {
      res.status(404).json({ error: "Data tidak ditemukan." }); return;
    }

    res.json({ success: true, message: "Baris data berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: "Gagal menghapus baris data" });
  }
});

// ==========================================
// 9. ENDPOINT ADD & DELETE KATEGORI
// ==========================================
router.post("/notion/kategori", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { name, module } = req.body;
  if (!name || typeof name !== "string" || name.trim() === "") {
    res.status(400).json({ error: "Nama kategori wajib diisi." }); return;
  }
  if (!module || (module !== "operasional" && module !== "perawatan")) {
    res.status(400).json({ error: "Module tidak valid." }); return;
  }

  try {
    const [newKategori] = await db.insert(kategoriTable)
      .values({ name: name.trim(), module })
      .returning();
    res.status(201).json({ success: true, data: newKategori });
  } catch (err) {
    res.status(500).json({ error: "Gagal menambah kategori." });
  }
});

router.delete("/notion/kategori/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { id } = req.params;
  try {
    const [deletedKategori] = await db.delete(kategoriTable)
      .where(eq(kategoriTable.id, id))
      .returning();
    if (!deletedKategori) {
      res.status(404).json({ error: "Kategori tidak ditemukan." }); return;
    }
    res.json({ success: true, message: "Berhasil dihapus", data: deletedKategori });
  } catch (err) {
    res.status(500).json({ error: "Gagal menghapus kategori." });
  }
});

// ==========================================
// 10. ENDPOINT MANAGEMENT SIKLUS TANAM
// ==========================================

// A. Ambil semua siklus tanam aktif beserta nama areanya
router.get("/notion/siklus-tanam", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const data = await db
      .select({
        id: siklusTanamTable.id,
        areaId: siklusTanamTable.areaId,
        areaName: areasTable.name,
        namaSiklus: siklusTanamTable.namaSiklus,
        tanggalPindahTanam: siklusTanamTable.tanggalPindahTanam,
        status: siklusTanamTable.status,
      })
      .from(siklusTanamTable)
      .leftJoin(areasTable, eq(siklusTanamTable.areaId, areasTable.id));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: "Gagal mengambil data siklus tanam." });
  }
});

// B. Tambah/Daftarkan Siklus Tanam Baru (Pindah Tanam)
router.post("/notion/siklus-tanam", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { areaId, namaSiklus, tanggalPindahTanam } = req.body;
  if (!areaId || !namaSiklus || !tanggalPindahTanam) {
    res.status(400).json({ error: "Area, Nama Siklus, dan Tanggal Pindah Tanam wajib diisi." });
    return;
  }

  try {
    // Opsional: Otomatis ubah siklus lama di area yang sama menjadi "Selesai" jika ada siklus baru aktif
    await db.update(siklusTanamTable)
      .set({ status: "Selesai/Panen" })
      .where(and(eq(siklusTanamTable.areaId, areaId), eq(siklusTanamTable.status, "Aktif")));

    const [newSiklus] = await db.insert(siklusTanamTable)
      .values({
        areaId,
        namaSiklus,
        tanggalPindahTanam: tanggalPindahTanam, // Format YYYY-MM-DD dari frontend
        status: "Aktif"
      })
      .returning();

    res.status(201).json({ success: true, data: newSiklus });
  } catch (err) {
    res.status(500).json({ error: "Gagal menambahkan siklus tanam baru." });
  }
});

// ==========================================
// 11. ENDPOINT PEKERJA ATRIBUT MASTER (NEW 🚀)
// ==========================================
router.post("/notion/pekerja-atribut", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { namaOption, jenisAtribut } = req.body;
  try {
    const [newAtribut] = await db.insert(pekerjaAtributMasterTable)
      .values({ namaOption: namaOption.trim(), jenisAtribut })
      .returning();
    res.status(201).json({ success: true, data: newAtribut });
  } catch (err) { res.status(500).json({ error: "Gagal menambah atribut." }); }
});

router.delete("/notion/pekerja-atribut/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { id } = req.params;
  try {
    await db.delete(pekerjaAtributMasterTable).where(eq(pekerjaAtributMasterTable.id, id));
    res.json({ success: true, message: "Berhasil dihapus" });
  } catch (err) { res.status(500).json({ error: "Gagal menghapus atribut." }); }
});


export default router;
