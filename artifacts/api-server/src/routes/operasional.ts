import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { eq, and, aliasedTable, inArray } from "drizzle-orm"; 

import { 
  db, 
  areasTable, 
  operasionalTable,
  pekerjaTable,
  perawatanTable,
  inspeksiTable,
  kategoriTable,
  siklusTanamTable,
  pekerjaAtributMasterTable,
  kendalaMasterTable,
  // 🚀 TAMBAHAN BARU
  operasionalPekerjaTable,
  perawatanPekerjaTable,
  inspeksiPekerjaTable
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
        jenisTenagaName: tenagaAtribut.namaOption, 
        deleted: pekerjaTable.deleted, // 🚀 TARIK STATUS BENDERANYA
      })

      .from(pekerjaTable)
      .leftJoin(tenagaAtribut, eq(pekerjaTable.jenisTenagaKerjaId, tenagaAtribut.id));

    // 💡 GABUNGKAN NAMA DAN JENIS TENAGA KERJA DI SINI
    const formattedPetugas = dbPekerja.map((p) => ({ 
      id: p.id, 
      name: p.jenisTenagaName ? `${p.namaAsli} - ${p.jenisTenagaName}` : p.namaAsli,
      roleId: p.roleId,
      jenisTenagaKerjaId: p.jenisTenagaKerjaId,
      statusId: p.statusId,
      deleted: p.deleted // 🚀 MASUKKAN KE FORMAT DATA FRONTEND
    }));

    const dbKategori = await db.select().from(kategoriTable);
    
    // 💡 Fetch Atribut Master (Notion-style tags)
    const dbAtribut = await db.select().from(pekerjaAtributMasterTable);
    const roles = dbAtribut.filter(a => a.jenisAtribut === "role").map(a => ({ id: a.id, name: a.namaOption }));
    const jenisTenaga = dbAtribut.filter(a => a.jenisAtribut === "jenis_tenaga").map(a => ({ id: a.id, name: a.namaOption }));
    const statuses = dbAtribut.filter(a => a.jenisAtribut === "status").map(a => ({ id: a.id, name: a.namaOption }));

    // 💡 SINKRONISASI INSPEKSI: Tarik master hama & penyakit (Pastikan kendalaMasterTable diimport di atas)
    const dbKendala = await db.select().from(kendalaMasterTable);
    const formattedKendala = dbKendala.map((k) => ({
      id: k.id,
      name: k.nama,
      jenis: k.jenis 
    }));

    const formattedKategori = dbKategori.map((k) => ({
      id: k.id,
      name: k.name,
      module: k.module
    }));

    res.json({ 
      areas: formattedAreas, 
      petugas: formattedPetugas, 
      kategori: formattedKategori,
      atributPekerja: { roles, jenisTenaga, statuses },
      kendalaMaster: formattedKendala // 👈 Jembatan krusial dikirim di sini!
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

      // 🔍 6. CARI SIKLUS TANAM YANG SEDANG AKTIF DI AREA INI
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

     // 🚀 UBAH JADI TRANSACTION: Simpan Data Induk lalu Simpan Relasi Pekerja
      const insertedOperasional = await db.transaction(async (tx) => {
    // 1. Insert ke tabel induk (TANPA pekerjaIds)
        const [inserted] = await tx.insert(operasionalTable).values({
          namaPekerjaan: namaPekerjaan,
          areaId: currentAreaId,
          siklusId: activeCycle ? activeCycle.id : null, 
          kategoriId: kategoriStr || null,
          waktuMulai: parseWIB(waktuMulaiStr) ?? new Date(),
          waktuSelesai: parseWIB(waktuSelesaiStr),
          durasiKerja: Number(durasiNum ?? 0),
          // pekerjaIds: DIHAPUS DARI SINI
          status: statusStr || "Belum dikerjakan",
          prioritas: prioritasStr || "Medium",
          jenisTenagaKerjaId: jenisStr || null,
          catatan: catatanStr || null,
        }).returning();

        // 2. Jika ada pekerja, insert ke tabel junction (operasionalPekerjaTable)
        if (pekerjaArray && pekerjaArray.length > 0) {
          const pekerjaInsertData = pekerjaArray.map((pekerjaId: string) => ({
            operasionalId: inserted.id,
            pekerjaId: pekerjaId
          }));
          
          await tx.insert(operasionalPekerjaTable).values(pekerjaInsertData);
        }

        return inserted;
      });

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

  // 🚀 1. TANGKAP QUERY FILTER SIKLUS STATUS DARI FRONTEND
  const { statusSiklus } = req.query; 

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
        // pekerjaIds: DIHAPUS DARI SINI
        status: operasionalTable.status,
        prioritas: operasionalTable.prioritas,
        jenisTenagaKerjaId: operasionalTable.jenisTenagaKerjaId,
        jenisTenagaKerjaName: jenisTenagaAttr.namaOption, 
        catatan: operasionalTable.catatan,
        siklusId: operasionalTable.siklusId,
        namaSiklus: siklusTanamTable.namaSiklus,
        tanggalPindahTanam: siklusTanamTable.tanggalPindahTanam,
        statusSiklus: siklusTanamTable.status
      })
      .from(operasionalTable)
      .leftJoin(areasTable, eq(operasionalTable.areaId, areasTable.id)) 
      .leftJoin(kategoriTable, eq(operasionalTable.kategoriId, kategoriTable.id))
      .leftJoin(jenisTenagaAttr, eq(operasionalTable.jenisTenagaKerjaId, jenisTenagaAttr.id))
      .leftJoin(siklusTanamTable, eq(operasionalTable.siklusId, siklusTanamTable.id));

    // 🚀 NEW: STRATEGI TARIK DATA PEKERJA (RELASIONAL)
    // 1. Kumpulkan semua ID operasional yang didapat
    const operasionalIds = data.map(d => d.id);
    
    // 2. Map penampung untuk pekerja
    const pekerjaMap = new Map<string, string[]>();

    // 3. Jika ada operasional, query tabel junction-nya
    if (operasionalIds.length > 0) {
      const pekerjaRelations = await db
        .select({
          operasionalId: operasionalPekerjaTable.operasionalId,
          pekerjaId: operasionalPekerjaTable.pekerjaId
        })
        .from(operasionalPekerjaTable)
        .where(inArray(operasionalPekerjaTable.operasionalId, operasionalIds));

      // 4. Kelompokkan pekerjaId berdasarkan operasionalId
      pekerjaRelations.forEach(rel => {
        if (!pekerjaMap.has(rel.operasionalId)) {
          pekerjaMap.set(rel.operasionalId, []);
        }
        pekerjaMap.get(rel.operasionalId)!.push(rel.pekerjaId);
      });
    }

    // 5. Gabungkan kembali array pekerjaIds ke data asli
    const dataWithPekerja = data.map(item => ({
      ...item,
      pekerjaIds: pekerjaMap.get(item.id) || []
    }));

    // 🚀 3. FILTER DATANYA SEBELUM DIKIRIM KE FRONTEND
    let filteredData = dataWithPekerja; // Gunakan data yang sudah ada pekerjanya
    
    if (statusSiklus === "selesai") {
      // 🚀 UBAH JADI 'Selesai' SESUAI SCHEMA BARU
      filteredData = dataWithPekerja.filter(item => item.statusSiklus === "Selesai");
    } else {
      filteredData = dataWithPekerja.filter(item => item.statusSiklus === "Aktif" || !item.statusSiklus);
    }

        // 🚀 SERIALIZE KE FORMAT WIB STRING SEBELUM DIKIRIM
    const serializedData = filteredData.map(item => ({ 
      ...item,
      waktuMulai: toWIBString(item.waktuMulai as Date),
      waktuSelesai: toWIBString(item.waktuSelesai as Date),
    }));

    res.json({ success: true, data: serializedData });
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

    // 🚀 KONVERSI STRING KE DATE DENGAN PAKSAAN ZONA WAKTU WIB
    if (cleanPayload.waktuMulai) {
      cleanPayload.waktuMulai = parseWIB(cleanPayload.waktuMulai as string);
    }
    if (cleanPayload.waktuSelesai) {
      cleanPayload.waktuSelesai = parseWIB(cleanPayload.waktuSelesai as string);
    }

    if (Object.keys(cleanPayload).length === 0) {
       res.status(400).json({ error: "Tidak ada data yang dikirim untuk diupdate." });
       return;
    }

// 🔑 ATOMIC UPDATE: Jika areaId berubah, cari siklus aktif di area baru
// dan sertakan siklusId baru ke payload sebelum disimpan
if (cleanPayload.areaId) {
  const [activeCycle] = await db
    .select({ id: siklusTanamTable.id })
    .from(siklusTanamTable)
    .where(
      and(
        eq(siklusTanamTable.areaId, cleanPayload.areaId as string), // 🚀 AMAN: Cast ke string
        eq(siklusTanamTable.status, "Aktif")
      )
    )
    .limit(1);

  // Timpa siklusId dengan yang aktif di area baru (null jika belum ada siklus)
  cleanPayload.siklusId = activeCycle ? activeCycle.id : null;
}

// 💡 EKSTRAK pekerjaIds SEBELUM MASUK KE LOGIKA UPDATE
const { pekerjaIds, ...mainPayload } = cleanPayload;

if (module === "operasional") {
  // 🚀 HAPUS pekerjaIds DARI ALLOWED
  const allowed = ["namaPekerjaan", "areaId", "siklusId", "waktuMulai", "waktuSelesai", "durasiKerja", "kategoriId", "prioritas", "jenisTenagaKerjaId", "status", "catatan"];
  const filteredPayload = Object.fromEntries(Object.entries(mainPayload).filter(([k]) => allowed.includes(k)));

  result = await db.transaction(async (tx) => {
    let updatedRecord = [];
    
    // 1. Update tabel utama JIKA ada perubahan di luar pekerja
    if (Object.keys(filteredPayload).length > 0) {
      updatedRecord = await tx.update(operasionalTable)
        .set(filteredPayload)
        .where(eq(operasionalTable.id, id))
        .returning();
    } else {
      // Kalau yg di-edit CUMA pekerja, ambil record lamanya biar variabel result gak kosong
      updatedRecord = await tx.select().from(operasionalTable).where(eq(operasionalTable.id, id));
    }

    // 2. Sinkronisasi Relasi Pekerja (Junction Table)
    if (pekerjaIds !== undefined) {
      // Hapus semua relasi pekerja yang lama untuk operasional ini
      await tx.delete(operasionalPekerjaTable).where(eq(operasionalPekerjaTable.operasionalId, id));
      
      // Insert relasi baru jika array tidak kosong
      if (Array.isArray(pekerjaIds) && pekerjaIds.length > 0) {
        const insertData = pekerjaIds.map((pId: string) => ({ operasionalId: id, pekerjaId: pId }));
        await tx.insert(operasionalPekerjaTable).values(insertData);
      }
    }
    return updatedRecord;
  });

} else if (module === "inspeksi") {
  // 🚀 HAPUS pekerjaIds DARI ALLOWED
  const allowed = ["kegiatan", "areaId", "siklusId", "waktuMulai", "waktuSelesai", "durasiKerja", "phTanah", "tingkatSerangan", "radius", "status", "keterangan"];
  const filteredPayload = Object.fromEntries(Object.entries(mainPayload).filter(([k]) => allowed.includes(k)));

  result = await db.transaction(async (tx) => {
    let updatedRecord = [];
    
    if (Object.keys(filteredPayload).length > 0) {
      updatedRecord = await tx.update(inspeksiTable)
        .set(filteredPayload)
        .where(eq(inspeksiTable.id, id))
        .returning();
    } else {
      updatedRecord = await tx.select().from(inspeksiTable).where(eq(inspeksiTable.id, id));
    }

    // Sinkronisasi Relasi Pekerja
    if (pekerjaIds !== undefined) {
      await tx.delete(inspeksiPekerjaTable).where(eq(inspeksiPekerjaTable.inspeksiId, id));
      
      if (Array.isArray(pekerjaIds) && pekerjaIds.length > 0) {
        const insertData = pekerjaIds.map((pId: string) => ({ inspeksiId: id, pekerjaId: pId }));
        await tx.insert(inspeksiPekerjaTable).values(insertData);
      }
    }
    return updatedRecord;
  });
}
      
      else {
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
    const [deletedArea] = await db.delete(areasTable)
      .where(eq(areasTable.id, id))
      .returning();

    if (!deletedArea) {
      res.status(404).json({ error: "Area tidak ditemukan." }); return;
    }
    
    res.json({ success: true, message: "Area berhasil dihapus.", data: deletedArea });
    } catch (err: any) {
    // 💡 Tampilkan error asli di terminal Replit untuk keperluan debugging
    console.error("[DB ERROR HAPUS AREA]:", err);

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
      res.status(400).json({ 
        error: "Gagal dihapus! Area ini masih terikat dengan riwayat aktivitas Perawatan atau penggunaan Stok Produk. Silakan bersihkan data terkait terlebih dahulu demi keamanan data." 
      });
      return;
    }
    
    // Error umum lainnya
    res.status(500).json({ error: "Gagal menghapus area. Terjadi kesalahan pada server." });
  }
});


// ==========================================
// 7. ENDPOINT ADD, EDIT, & DELETE MASTER PEKERJA
// ==========================================
router.post("/notion/pekerja", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

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

    // 🚀 FIX: Mengembalikan fungsi update atribut yang benar
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
    // 🚀 UBAH JADI UPDATE BENDERA SOFT DELETE
    const [updatedPekerja] = await db.update(pekerjaTable)
      .set({ deleted: true })
      .where(eq(pekerjaTable.id, id))
      .returning();

    if (!updatedPekerja) {
      res.status(404).json({ error: "Pekerja tidak ditemukan." }); return;
    }
    
    // 🚀 FIX: Variabel sudah benar pakai updatedPekerja
    res.json({ success: true, message: "Pekerja berhasil dihapus.", data: updatedPekerja });
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
    } catch (err: any) {
    // 💡 Tampilkan error asli di terminal Replit biar gampang di-debug kalau ada apa-apa
    console.error("[DB ERROR KATEGORI]:", err);

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
      res.status(400).json({ error: "Gagal dihapus! Kategori ini sudah dipakai di riwayat operasional atau perawatan. Silakan bersihkan data terkait terlebih dahulu." });
      return;
    }
    
    res.status(500).json({ error: "Gagal menghapus kategori. Terjadi kesalahan pada server." });
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

// ==========================================
// 12. ENDPOINT MASTER KENDALA (HAMA & PENYAKIT) 🚀
// ==========================================
router.post("/notion/kendala", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { nama, jenis } = req.body;
  if (!nama || typeof nama !== "string" || nama.trim() === "") {
    res.status(400).json({ error: "Nama kendala wajib diisi." }); return;
  }
  if (!jenis) {
    res.status(400).json({ error: "Jenis kendala wajib diisi." }); return;
  }

  try {
    const [newKendala] = await db.insert(kendalaMasterTable)
      .values({ nama: nama.trim(), jenis })
      .returning();
      
    res.status(201).json({ success: true, data: newKendala });
  } catch (err: any) {
    // 💡 TANGKAP ERROR UNIK (Kalau namanya udah ada di database)
    if (err.code === '23505') { 
      res.status(400).json({ error: "Nama kendala ini sudah terdaftar." });
      return;
    }
    res.status(500).json({ error: "Gagal menambah master kendala." });
  }
});

router.delete("/notion/kendala/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { id } = req.params;
  try {
    const [deletedKendala] = await db.delete(kendalaMasterTable)
      .where(eq(kendalaMasterTable.id, id))
      .returning();

    if (!deletedKendala) {
      res.status(404).json({ error: "Data kendala tidak ditemukan." }); return;
    }

    res.json({ success: true, message: "Berhasil dihapus", data: deletedKendala });
  } catch (err: any) {
    // 💡 Tampilkan error asli di terminal Replit biar gampang di-debug
    console.error("[DB ERROR KENDALA]:", err);

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
      res.status(400).json({ error: "Gagal dihapus! Hama/Penyakit ini sudah tercatat di dalam riwayat temuan inspeksi lapangan. Silakan hapus atau ubah riwayat inspeksi tersebut terlebih dahulu." });
      return;
    }
    
    res.status(500).json({ error: "Gagal menghapus data kendala. Terjadi kesalahan pada server." });
  }
});

export default router;
