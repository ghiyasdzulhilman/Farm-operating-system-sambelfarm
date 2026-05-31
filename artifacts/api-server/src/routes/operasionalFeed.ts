import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, fieldMappingsTable, stagingDataTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale"; // Bahasa Indonesia untuk relative time
import {
  getNotionConnection,
  notionFetch,
  handleNotionErrors,
} from "../lib/notionClient";
import { notionCache, delay } from "../lib/notionCache";

const router: IRouter = Router();

// --- 1. UTILITY: FORMAT WAKTU RELATIF ---
function formatRelativeTime(dateString?: string) {
  if (!dateString) return "Baru saja";
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: id });
  } catch {
    return "Baru saja";
  }
}

// --- 2. UTILITY: EKSTRAKTOR DATA NOTION KEBAL BUG ---
function extractNotionProp(page: any, propId: string, type: string) {
  if (!propId || !page?.properties) return null;
  const prop = Object.values(page.properties).find((p: any) => p.id === propId) as any;
  if (!prop) return null;

  try {
    switch (type) {
      case "title":
        return prop.title?.[0]?.plain_text || "";
      case "status":
        return prop.status?.name || "";
      case "select":
        return prop.select?.name || "";
      case "multi_select":
        return prop.multi_select?.map((m: any) => m.name) || [];
      case "number":
        return prop.number ?? 0;
      case "formula_number": // Untuk handle formula yang balikin angka
        return prop.formula?.number ?? 0;
      case "date":
        return prop.date?.start || prop.created_time || "";
      case "relation":
        return prop.relation?.map((r: any) => r.id) || [];
      default:
        return null;
    }
  } catch (error) {
    return null; // Fallback aman jika struktur objek Notion meleset
  }
}

// --- 3. CORE LOGIC: PENARIK & PENYETRIKA DATA ---
async function fetchSingleDatabaseFeed(
  userId: string,
  accessToken: string,
  databaseId: string,
  dbType: string,
  mappings: any
) {
  const items: any[] = [];
  try {
    // Ambil maksimal 15 data terbaru per modul biar load awal super cepat
    const response = await notionFetch(
      userId,
      accessToken,
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      { method: "POST", body: JSON.stringify({ page_size: 15 }) }
    );

    if (!response.ok) return [];
    const data = await response.json();

    for (const page of data.results) {
      // Identifikasi ID Properti secara dinamis dari settingan user
      const titleId = mappings?.kegiatan?.propertyId || mappings?.namaPekerjaan?.propertyId || mappings?.pengeluaran?.propertyId;
      const dateId = mappings?.tanggal?.propertyId || mappings?.date?.propertyId || mappings?.waktuPengerjaan?.propertyId;
      const statusId = mappings?.status?.propertyId;
      const areaId = mappings?.labaRugi?.propertyId || mappings?.area?.propertyId;
      const workersId = mappings?.petugas?.propertyId || mappings?.ditugaskanKe?.propertyId;

      const rawTitle = extractNotionProp(page, titleId, "title") || "Aktivitas Tanpa Judul";
      const rawDate = extractNotionProp(page, dateId, "date") || page.created_time || new Date().toISOString();
      const rawStatus = extractNotionProp(page, statusId, "status") || "Belum dikerjakan";
      const relatedAreaIds = extractNotionProp(page, areaId, "relation") || [];
      const relatedWorkerIds = extractNotionProp(page, workersId, "relation") || [];

      

            // ==========================================
      // 🧠 SMART STATUS NORMALIZER (ANTI-DIRTY DATA)
      // ==========================================
      let statusStyle: "Selesai" | "Dalam proses" | "Belum dikerjakan" = "Belum dikerjakan";

      // 👇 1. ATURAN VIP FINANCE (Mutlak, gak boleh diganggu gugat)
      if (dbType === "panen" || dbType === "expenses") {
        statusStyle = "Selesai";
      } 
      // 👇 2. ATURAN AGRONOMI (Baru jalan kalau bukan finance)
      else {
        const safeStatus = (rawStatus || "").toString().toLowerCase().trim();

      // 1. Sapu Jagat untuk status SELESAI
      if (
        safeStatus.includes("selesai") || 
        safeStatus.includes("done") || 
        safeStatus.includes("lunas") || 
        safeStatus.includes("Sudah ditangani") || 
        safeStatus.includes("complete") ||
        safeStatus.includes("berhasil")
      ) {
        statusStyle = "Selesai";
      } 
      // 2. Sapu Jagat untuk status DALAM PROSES
      else if (
        safeStatus.includes("Dalam proses") || 
        safeStatus.includes("progress") || 
        safeStatus.includes("jalan") || 
        safeStatus.includes("Sedang ditangani") || 
        safeStatus.includes("on going") ||
        safeStatus.includes("working") ||
        safeStatus.includes("proses")
      ) {
        statusStyle = "Dalam proses";
      }
      // 3. Sapu Jagat untuk status RENCANA / BELUM (Lebih Aman & Eksplisit)
      else if (
        safeStatus.includes("rencana") ||
        safeStatus.includes("plan") ||
        safeStatus.includes("to do") ||
        safeStatus.includes("todo") ||
        safeStatus.includes("belum") ||
        safeStatus.includes("pending") ||
        safeStatus.includes("baru di temukan") ||
        safeStatus.includes("draft")
      ) {
        statusStyle = "Belum dikerjakan";
      }
      }

      // Template Dasar (Sesuai AgronomyItem Type)
      let normalizedItem: any = {
        id: page.id,
        title: rawTitle,
        time: new Date(rawDate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        rawDate: rawDate,
        status: statusStyle,
        areaId: relatedAreaIds[0] || null,
        workers: [], // Akan diisi di proses mapping akhir
        workerIds: relatedWorkerIds,
        priority: "Medium",
        attachments: [], // Siap diisi fitur file upload ke depannya
        history: [{ time: "Notion Sync", text: "Data disinkronisasi dari database utama." }]
      };

      // Injeksi Spesifik per Domain Agronomi / Finance
      if (dbType === "perawatan") {
        const tagId = mappings?.tags?.propertyId;
        const durationId = mappings?.durasiKerja?.propertyId;
        normalizedItem.module = "perawatan";
        normalizedItem.icon = "sprout";
        normalizedItem.category = extractNotionProp(page, tagId, "select") || "Treatment";
        normalizedItem.duration = `${extractNotionProp(page, durationId, "number") || 0} jam`;
        normalizedItem.notes = `Kegiatan perawatan reguler pada area tercatat.`;
      } 
      else if (dbType === "inspeksi") {
        const durationId = mappings?.durasiKerja?.propertyId;
        const hstId = mappings?.hst?.propertyId;
        const hamaId = mappings?.hama?.propertyId;
        const penyakitId = mappings?.penyakit?.propertyId;

        normalizedItem.module = "inspeksi";
        normalizedItem.icon = "leaf";
        normalizedItem.category = "Diagnosis";
        normalizedItem.duration = `${extractNotionProp(page, durationId, "number") || 0} jam`;

        const hamas = extractNotionProp(page, hamaId, "multi_select") || [];
        const penyakits = extractNotionProp(page, penyakitId, "multi_select") || [];
        const hst = extractNotionProp(page, hstId, "formula_number") || extractNotionProp(page, hstId, "number") || 0;

        normalizedItem.notes = (hamas.length || penyakits.length) 
          ? `Temuan Lapangan (${hst} HST): Hama [${hamas.join(", ") || "-"}] • Penyakit [${penyakits.join(", ") || "-"}].`
          : `Kondisi tanaman terpantau aman terkendali pada usia ${hst} HST.`;
      } 
      else if (dbType === "operasional") {
        const catId = mappings?.kategori?.propertyId;
        const priorityId = mappings?.prioritas?.propertyId;
        const durationId = mappings?.durasiKerja?.propertyId;

        normalizedItem.module = "operasional";
        normalizedItem.icon = "wrench";
        normalizedItem.category = extractNotionProp(page, catId, "select") || "Operasional";
        normalizedItem.priority = extractNotionProp(page, priorityId, "select") || "Medium";
        normalizedItem.duration = `${extractNotionProp(page, durationId, "number") || 0} jam`;
        normalizedItem.notes = `Tugas operasional umum dan maintenance kebun.`;
      }
      else if (dbType === "panen") {
        const weightId = mappings?.jumlahPanen?.propertyId;
        const priceId = mappings?.hargaJualPerKg?.propertyId;
        const weight = extractNotionProp(page, weightId, "number") || 0;
        const price = extractNotionProp(page, priceId, "number") || 0;

        normalizedItem.module = "finance";
        normalizedItem.icon = "banknote"; // Nanti di UI kita tangkap untuk kasih icon duit
        normalizedItem.category = "Pendapatan";
        normalizedItem.title = `Panen: ${rawTitle}`;
        normalizedItem.duration = "0 jam";
        normalizedItem.notes = `Hasil timbangan bruto: ${weight}kg. Nilai estimasi transaksi: Rp${(weight * price).toLocaleString("id-ID")}.`;
      }
      else if (dbType === "expenses") {
        const qtyId = mappings?.qty?.propertyId;
        const priceId = mappings?.hargaPerPcs?.propertyId;
        const qty = extractNotionProp(page, qtyId, "number") || 0;
        const price = extractNotionProp(page, priceId, "number") || 0;

        normalizedItem.module = "finance";
        normalizedItem.icon = "banknote";
        normalizedItem.category = "Pengeluaran";
        normalizedItem.priority = "High";
        normalizedItem.duration = "0 jam";
        normalizedItem.notes = `Pembelian operasional: ${qty} unit dengan total biaya Rp${(qty * price).toLocaleString("id-ID")}.`;
      }

      items.push(normalizedItem);
    }
  } catch (err) {
    console.error(`Gagal narik feed untuk ${dbType}:`, err);
  }
  return items;
}

// --- 4. ENDPOINT UTAMA: UNIFIED ACTIVITY FEED ---
router.get("/operasional/feed", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const connection = await getNotionConnection(userId);
    const cacheKey = `operasional:feed:${userId}`;

    // Ambil Data Mapping Kompas
    const savedMappings = await db
      .select()
      .from(fieldMappingsTable)
      .where(eq(fieldMappingsTable.userId, userId));

    let cachedData = notionCache.get<{ feed: any[], cachedAt: string }>(cacheKey);
    let masterFeed = cachedData?.feed || [];
    let cacheTimeMs = cachedData ? new Date(cachedData.cachedAt).getTime() : 0;

    // JIKA CACHE KOSONG, GASS KE DAPUR NOTION
    if (!cachedData) {
      req.log.info({ userId }, "Operasional Feed: Cache miss, nembak ke Notion...");
      const targetDbTypes = ["perawatan", "inspeksi", "operasional", "panen", "expenses"];

      for (const dbType of targetDbTypes) {
        const config = savedMappings.find((m) => m.databaseType === dbType);
        if (config?.notionDatabaseId) {
          const singleFeed = await fetchSingleDatabaseFeed(
            userId, connection.accessToken, config.notionDatabaseId, dbType, config.mappings || {}
          );
          masterFeed = [...masterFeed, ...singleFeed];
          await delay(350); // Rem aman anti rate-limit
        }
      }

      cacheTimeMs = new Date().getTime();
      notionCache.set(cacheKey, { feed: masterFeed, cachedAt: new Date().toISOString() }, 180);
    } else {
      req.log.info({ userId }, "Operasional Feed: Cache hit!");
    }

    // --- PEMETAAN NAMA AREA & PEKERJA (SELF-HEALING: AMBIL DARI NOTION JIKA CACHE KOSONG) ---
    const areaMap: Record<string, string> = {};
    const workerMap: Record<string, string> = {};
    const cacheDashboard = notionCache.get<any>(`dashboard:summary:${userId}`);

    // 1. Coba dapatkan data area dari cache
    if (cacheDashboard?.resultLabaRugi?.areas) {
      cacheDashboard.resultLabaRugi.areas.forEach((a: any) => { areaMap[a.id] = a.name; });
    }
    // 2. Coba dapatkan data pekerja dari cache
    if (cacheDashboard?.resultPekerja?.petugas) {
      cacheDashboard.resultPekerja.petugas.forEach((p: any) => { workerMap[p.id] = p.name; });
    }

    // 3. JIKA CACHE KOSONG, AMBIL LANGSUNG DARI NOTION (OBAT MANJUR!)
    if (Object.keys(areaMap).length === 0 || Object.keys(workerMap).length === 0) {
      try {
        // Cari database "Laba Rugi" dan "Data Pekerja" dari daftar mapping yang sudah ada
        const areaConfig = savedMappings.find(m => m.databaseType === 'perawatan' || m.databaseType === 'operasional');
        const workerConfig = savedMappings.find(m => m.databaseType === 'operasional' || m.databaseType === 'perawatan');

        // Ambil ID database dari mapping, atau cari manual
        const areaDbId = areaConfig?.mappings?.labaRugi?.relatedDatabaseId || areaConfig?.mappings?.area?.relatedDatabaseId;
        const workerDbId = workerConfig?.mappings?.petugas?.relatedDatabaseId || workerConfig?.mappings?.ditugaskanKe?.relatedDatabaseId;

        // Fungsi cepat untuk mencari database (tanpa import tambahan, gunakan fetch manual)
        const quickFetch = async (dbId: string) => {
          const res = await notionFetch(userId, connection.accessToken, `https://api.notion.com/v1/databases/${dbId}/query`, {
            method: 'POST', body: JSON.stringify({ page_size: 100 })
          });
          if (!res.ok) return [];
          const data = await res.json();
          return data.results.map((p: any) => {
            const titleProp = Object.values(p.properties).find((prop: any) => prop.type === 'title') as any;
            return { id: p.id, name: titleProp?.title?.[0]?.plain_text || 'Tanpa Nama' };
          });
        };

        // Jalankan pencarian jika ID database ada
        if (areaDbId && Object.keys(areaMap).length === 0) {
          const areas = await quickFetch(areaDbId);
          areas.forEach((a: any) => { areaMap[a.id] = a.name; });
        }
        if (workerDbId && Object.keys(workerMap).length === 0) {
          const workers = await quickFetch(workerDbId);
          workers.forEach((w: any) => { workerMap[w.id] = w.name; });
        }
      } catch (err) {
        console.error("Gagal mengambil data area/pekerja dari Notion:", err);
        // Biarkan map kosong, akan fallback ke "Area Tanpa Blok" / "Tim Lapangan"
      }
    }

    // --- BUFFERING STAGING (ANTI-DOBEL TIME WINDOW) ---
    const stagingRecords = await db
      .select()
      .from(stagingDataTable)
      .where(and(
        eq(stagingDataTable.userId, userId),
        or(eq(stagingDataTable.status, "pending"), eq(stagingDataTable.status, "synced"))
      ));

    const validStagingRecords = stagingRecords.filter(record => {
      if (record.status === "pending") return true;
      // Kunci Anti-Dobel: Tampilkan yang synced TAPI belum masuk hitungan Cache Notion
      return new Date(record.createdAt).getTime() > cacheTimeMs;
    });

    const pendingFeedItems = validStagingRecords.map((record) => {
      const d = record.data;
      let isFinance = record.databaseType === "panen" || record.databaseType === "expenses";
      let moduleName = isFinance ? "finance" : record.databaseType;
      
      return {
        id: `staging-${record.id}`,
        module: moduleName,
        icon: isFinance ? "banknote" : (moduleName === "perawatan" ? "sprout" : (moduleName === "inspeksi" ? "leaf" : "wrench")),
        title: d.kegiatan || d.namaPekerjaan || d.pengeluaran || "Data Antrean Cloud",
        time: "Sekarang",
        rawDate: record.createdAt || new Date().toISOString(),
        status: record.status === "pending" ? "Belum dikerjakan" : "Dalam proses",
        areaId: d.labaRugiId || d.areaId || null,
        workers: ["Sistem Pending"],
        duration: "0 jam",
        priority: "High",
        category: record.databaseType === "panen" ? "Pendapatan" : "Sinkronisasi",
        notes: "Data sedang dalam antrean atau proses indexing oleh Notion. Harap tunggu sesaat.",
        attachments: [],
        history: [{ time: "Local", text: "Dibuat di perangkat lokal, menunggu awan." }]
      };
    });

    // --- GABUNGKAN & FINISHING SENTUHAN UI ---
    const finalFeed = [...pendingFeedItems, ...masterFeed]
      .map(item => {
        const itemDate = new Date(item.rawDate);
        
        // ✅ AMBIL NAMA PEKERJA ASLI DARI workerMap
        let resolvedWorkers: string[];
        if (item.workerIds && item.workerIds.length > 0) {
          resolvedWorkers = item.workerIds
            .map((id: string) => workerMap[id] || null)
            .filter(Boolean) as string[];
        }
        // Fallback ke item.workers (misal dari staging) atau "Tim Lapangan"
        if (!resolvedWorkers || resolvedWorkers.length === 0) {
          resolvedWorkers = item.workers.length ? item.workers : ["Tim Lapangan"];
        }

        return {
          ...item,
          area: areaMap[item.areaId] || "Area Tanpa Blok",
          workers: resolvedWorkers, // ✅ GUNAKAN NAMA ASLI
          dateLabel: itemDate.toDateString() === new Date().toDateString() ? "Hari ini" : 
                    (itemDate.toDateString() === new Date(Date.now() - 86400000).toDateString() ? "Kemarin" : "Riwayat Lama"),
          timeLabel: formatRelativeTime(item.rawDate)
        };
      })

      .sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());

    res.json({
      success: true,
      feed: finalFeed,
      meta: {
        totalItems: finalFeed.length,
        stagingCount: pendingFeedItems.length,
        lastSynced: cachedData ? cachedData.cachedAt : new Date().toISOString()
      }
    });

  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
