import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, fieldMappingsTable, type FieldMappingData } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getNotionConnection, notionFetch, handleNotionErrors, NotionTokenInvalidError } from "../lib/notionClient";

const router: IRouter = Router();

interface NotionPage { id: string; properties: Record<string, { type: string; title?: Array<{ plain_text: string }> }>; }
interface NotionDatabase { id: string; title?: Array<{ plain_text: string }>; }

// Schema payload dari frontend
interface AddPerawatanBody {
  kegiatan: string;
  labaRugiIds: string[];
  
  modeTanggal: "broadcast" | "spesifik";
  tanggalBroadcast?: string;
  tanggalPerArea?: Record<string, string>;
  
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

function decodePropertyId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

// 🔍 Cari database Notion berdasarkan nama
async function findDatabaseByName(userId: string, accessToken: string, name: string): Promise<string | null> {
  try {
    const response = await notionFetch(userId, accessToken, "https://api.notion.com/v1/search", {
      method: "POST",
      body: JSON.stringify({
        query: name,
        filter: { value: "database", property: "object" }
      })
    });
    
    if (!response.ok) return null;
    
    const data = (await response.json()) as { results: NotionDatabase[] };
    const found = data.results.find(
      (r) => r.title?.some((t) => t.plain_text.toLowerCase().includes(name.toLowerCase()))
    );
    
    return found?.id ?? null;
  } catch (err) {
    if (err instanceof NotionTokenInvalidError) throw err;
    return null;
  }
}

// 🔍 Ambil semua halaman dari database Notion
async function queryAllPages(
  userId: string,
  accessToken: string,
  databaseId: string
): Promise<Array<{ id: string; name: string }>> {
  try {
    const response = await notionFetch(
      userId,
      accessToken,
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        body: JSON.stringify({ page_size: 100 })
      }
    );
    
    if (!response.ok) return [];
    
    const data = (await response.json()) as { results: NotionPage[] };
    return data.results.map((page) => {
      const titleProp = Object.values(page.properties).find((p) => p.type === "title");
      const name = titleProp?.title?.[0]?.plain_text ?? "Tanpa Nama";
      return { id: page.id, name };
    });
  } catch (err) {
    if (err instanceof NotionTokenInvalidError) throw err;
    return [];
  }
}

// 📋 Ambil mapping field dari database lokal
async function getMappingRow(userId: string, databaseType: string) {
  const [row] = await db
    .select()
    .from(fieldMappingsTable)
    .where(
      and(
        eq(fieldMappingsTable.userId, userId),
        eq(fieldMappingsTable.databaseType, databaseType)
      )
    );
  return row ?? null;
}

// 🧱 Bangun blok konten Notion (catatan + produk)
function buildNotionBlocks(
  logProduk: Array<{ produk: string; dosis: string }> | undefined,
  detailNotes: string | undefined
): any[] {
  const blocks: any[] = [];

  // Blok catatan detail
  if (detailNotes && detailNotes.trim() !== "") {
    blocks.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "📝 Catatan Detail" } }]
      }
    });
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: detailNotes.trim() } }]
      }
    });
  }

  // Blok racikan produk
  if (logProduk && logProduk.length > 0) {
    blocks.push({
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "🌱 Racikan Bahan / Produk" } }]
      }
    });
    
    blocks.push(
      ...logProduk.map((p) => ({
        object: "block" as const,
        type: "bulleted_list_item" as const,
        bulleted_list_item: {
          rich_text: [
            { type: "text" as const, text: { content: `${p.produk} ` } },
            {
              type: "text" as const,
              text: { content: `(Dosis: ${p.dosis})`, link: null },
              annotations: { bold: true, color: "green" as const }
            }
          ]
        }
      }))
    );
  }

  return blocks;
}

// 📋 Daftar field standar untuk database Perawatan
const PERAWATAN_FIELDS = [
  { key: "kegiatan", expectedType: "title" },
  { key: "tanggal", expectedType: "date" },
  { key: "tags", expectedType: "select" },
  { key: "status", expectedType: "status" },
  { key: "petugas", expectedType: "relation" },
  { key: "labaRugi", expectedType: "relation" },
];

// 🏗️ Bangun properti Notion dari data yang sudah difilter per area
function buildPerawatanProperties(
  data: {
    kegiatan: string;
    labaRugiId: string;
    tanggalValue: string;
    petugasIds: string[];
    tagsValue?: string;
    statusValue?: string;
  },
  mappings: FieldMappingData | undefined
): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  PERAWATAN_FIELDS.forEach((field) => {
    const mapping = mappings?.[field.key as keyof FieldMappingData];
    if (!mapping?.propertyId) return;

    const propertyId = decodePropertyId(mapping.propertyId);
    let value: any = data[field.key as keyof typeof data];

    // Override nilai dari data yang sudah difilter per area
    if (field.key === "labaRugi") value = data.labaRugiId;
    if (field.key === "petugas") value = data.petugasIds;
    if (field.key === "tags") value = data.tagsValue;
    if (field.key === "status") value = data.statusValue;
    if (field.key === "tanggal") value = data.tanggalValue;

    // Skip kalau nilai kosong
    if (!value || (Array.isArray(value) && value.length === 0)) return;

    // Konversi ke format Notion berdasarkan tipe
    switch (field.expectedType) {
      case "title":
        props[propertyId] = {
          title: [{ text: { content: String(value) } }]
        };
        break;

      case "date":
        props[propertyId] = {
          date: { start: String(value) }
        };
        break;

      case "select":
        props[propertyId] = {
          select: { name: String(value) }
        };
        break;

      case "multi_select":
        if (Array.isArray(value)) {
          props[propertyId] = {
            multi_select: value.map((t) => ({ name: String(t) }))
          };
        } else {
          props[propertyId] = {
            multi_select: [{ name: String(value) }]
          };
        }
        break;

      case "status":
        props[propertyId] = {
          status: { name: String(value) }
        };
        break;

      case "relation": {
        const relationIds = Array.isArray(value)
          ? value
              .filter((id) => id && String(id).trim() !== "")
              .map((id) => ({ id: String(id).trim() }))
          : [{ id: String(value).trim() }];
        
        if (relationIds.length > 0) {
          props[propertyId] = { relation: relationIds };
        }
        break;
      }
    }
  });

  return props;
}

// 📥 Fungsi helper: ambil nilai tanggal per area dengan aman
function resolveTanggal(
  body: AddPerawatanBody,
  currentAreaId: string
): string {
  if (body.modeTanggal === "broadcast") {
    // Mode broadcast: pakai tanggalBroadcast
    if (!body.tanggalBroadcast || body.tanggalBroadcast.trim() === "") {
      throw new Error(
        `Tanggal pelaksanaan wajib diisi (mode broadcast). Silakan pilih tanggal.`
      );
    }
    return body.tanggalBroadcast;
  } else {
    // Mode spesifik: cari di tanggalPerArea, fallback ke tanggalBroadcast
    const tanggalSpesifik = body.tanggalPerArea?.[currentAreaId];
    if (tanggalSpesifik && tanggalSpesifik.trim() !== "") {
      return tanggalSpesifik;
    }
    
    // Fallback ke tanggalBroadcast
    if (body.tanggalBroadcast && body.tanggalBroadcast.trim() !== "") {
      return body.tanggalBroadcast;
    }
    
    // Kalau dua-duanya kosong
    throw new Error(
      `Tanggal pelaksanaan untuk area ${currentAreaId} wajib diisi. Silakan pilih tanggal.`
    );
  }
}

// 📥 Fungsi helper: ambil catatan per area
function resolveCatatan(
  body: AddPerawatanBody,
  currentAreaId: string
): string {
  if (body.modeCatatan === "broadcast") {
    return body.catatanBroadcast || "";
  }
  return body.catatanPerArea?.[currentAreaId] || "";
}

// 📥 Fungsi helper: ambil daftar pekerja per area
function resolvePekerja(
  body: AddPerawatanBody,
  currentAreaId: string
): string[] {
  if (body.modePekerja === "broadcast") {
    return body.petugasBroadcast || [];
  }
  return body.petugasPerArea?.[currentAreaId] || [];
}

// 📥 Fungsi helper: ambil daftar produk per area
function resolveProduk(
  body: AddPerawatanBody,
  currentAreaId: string
): Array<{ produk: string; dosis: string }> {
  if (body.modeProduk === "broadcast") {
    return body.logProduk || [];
  }
  return body.produkPerArea?.[currentAreaId] || [];
}

// 📥 Fungsi helper: ambil tags per area
function resolveTags(
  body: AddPerawatanBody,
  currentAreaId: string
): string | undefined {
  if (body.modeTags === "broadcast") {
    return body.tagsBroadcast;
  }
  return body.tagsPerArea?.[currentAreaId];
}

// 📥 Fungsi helper: ambil status per area
function resolveStatus(
  body: AddPerawatanBody,
  currentAreaId: string
): string {
  if (body.modeStatus === "broadcast") {
    return body.statusBroadcast || "Rencana";
  }
  return body.statusPerArea?.[currentAreaId] || "Rencana";
}

// ──────────────────────────────────────────────
// 🚀 ROUTE: Ambil opsi dropdown (area + petugas)
// ──────────────────────────────────────────────
router.get("/notion/perawatan-dropdown-options", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;
    const mappingRow = await getMappingRow(userId, "perawatan");
    const mappings = mappingRow?.mappings as FieldMappingData | undefined;

    // Cari database Laba Rugi dan Data Pekerja
    const [labaRugiDbId, petugasDbId] = await Promise.all([
      mappings?.labaRugi?.relatedDatabaseId ||
        findDatabaseByName(userId, accessToken, "Laba Rugi"),
      mappings?.petugas?.relatedDatabaseId ||
        findDatabaseByName(userId, accessToken, "Data pekerja"),
    ]);

    // Ambil data dari kedua database
    const [labaRugi, petugas] = await Promise.all([
      labaRugiDbId ? queryAllPages(userId, accessToken, labaRugiDbId) : Promise.resolve([]),
      petugasDbId ? queryAllPages(userId, accessToken, petugasDbId) : Promise.resolve([]),
    ]);

    res.json({ areas: labaRugi, petugas });
  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ──────────────────────────────────────────────
// 🚀 ROUTE: Tambah data perawatan ke Notion
// ──────────────────────────────────────────────
router.post("/notion/add-perawatan", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body as Partial<AddPerawatanBody>;
  const kegiatan = (body.kegiatan ?? "").trim();

  // Ambil daftar area yang dipilih
  const areaIds: string[] = Array.isArray(body.labaRugiIds)
    ? body.labaRugiIds.filter(Boolean)
    : [];

  // Validasi awal
  if (!kegiatan || areaIds.length === 0) {
    res.status(400).json({
      error: "Field 'kegiatan' dan area wajib diisi (minimal 1)."
    });
    return;
  }

  // Validasi field wajib lainnya
  if (!body.modeTanggal) {
    res.status(400).json({ error: "Mode tanggal wajib dipilih (broadcast/spesifik)." });
    return;
  }

  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;
    const mappingRow = await getMappingRow(userId, "perawatan");
    const mappings = mappingRow?.mappings as FieldMappingData | undefined;

    // Cari database Perawatan di Notion
    const databaseId =
      mappingRow?.notionDatabaseId ||
      (await findDatabaseByName(userId, accessToken, "Perawatan"));

    if (!databaseId) {
      res.status(404).json({
        error: "Database 'Perawatan' tidak ditemukan di Notion."
      });
      return;
    }

    // Cast body ke tipe lengkap setelah validasi
    const safeBody = body as AddPerawatanBody;

    // Proses setiap area yang dipilih
    const requests = areaIds.map(async (currentAreaId) => {
      // ✅ Ambil tanggal dengan resolver yang aman (TANPA fallback ke hari ini!)
      let tanggalAreaIni: string;
      try {
        tanggalAreaIni = resolveTanggal(safeBody, currentAreaId);
      } catch (err) {
        throw new Error(
          `Gagal memproses area ${currentAreaId}: ${err instanceof Error ? err.message : "Tanggal tidak valid"}`
        );
      }

      // Ambil data lain per area
      const catatanAreaIni = resolveCatatan(safeBody, currentAreaId);
      const pekerjaAreaIni = resolvePekerja(safeBody, currentAreaId);
      const produkAreaIni = resolveProduk(safeBody, currentAreaId);
      const tagsAreaIni = resolveTags(safeBody, currentAreaId);
      const statusAreaIni = resolveStatus(safeBody, currentAreaId);

      // Bangun properti Notion
      const properties = buildPerawatanProperties(
        {
          kegiatan,
          labaRugiId: currentAreaId,
          tanggalValue: tanggalAreaIni,
          petugasIds: pekerjaAreaIni,
          tagsValue: tagsAreaIni,
          statusValue: statusAreaIni,
        },
        mappings
      );

      // Bangun blok konten (catatan + produk)
      const childrenBlocks = buildNotionBlocks(produkAreaIni, catatanAreaIni);

      // Payload untuk Notion API
      const payload: any = {
        parent: { database_id: databaseId },
        properties,
      };

      if (childrenBlocks.length > 0) {
        payload.children = childrenBlocks;
      }

      // Kirim ke Notion API
      const response = await notionFetch(
        userId,
        accessToken,
        "https://api.notion.com/v1/pages",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Gagal menyimpan untuk area ${currentAreaId}`);
      }

      const created = await response.json();
      return {
        pageId: created.id,
        notionUrl: created.url,
      };
    });

    // Jalankan semua request paralel
    const results = await Promise.all(requests);

    res.status(201).json({
      success: true,
      message: `Berhasil mencatat perawatan untuk ${areaIds.length} area.`,
      data: results,
    });
  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

export default router;