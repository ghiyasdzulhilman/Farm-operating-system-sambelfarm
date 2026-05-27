import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, fieldMappingsTable, type FieldMappingData } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getNotionConnection, notionFetch, handleNotionErrors, NotionTokenInvalidError } from "../lib/notionClient";

const router: IRouter = Router();

// ==========================================
// 1. ENGINE PEMETAAN DINAMIS & TYPE DEFINITION
// ==========================================
interface NotionDatabasePropertyMeta { id: string; type: string; name: string; }

// Daftarkan semua kemungkinan nama kolom di sini (Huruf Kecil Semua)
const OPERASIONAL_PROPERTY_ALIASES: Record<string, string[]> = {
  namaPekerjaan: ["nama pekerjaan", "pekerjaan", "task", "operasional"],
  kategori: ["kategori", "activity", "jenis kegiatan", "aktivitas"],
  status: ["status", "progress", "state"],
  ditugaskanKe: ["ditugaskan ke", "petugas", "pekerja", "worker", "team"],
  jenisTenagaKerja: ["jenis tenaga kerja", "tipe pekerja", "employment type"],
  area: ["area", "blok", "lahan", "blok area", "laba rugi"],
  prioritas: ["prioritas", "priority"],
  waktuPengerjaan: ["waktu pengerjaan", "jam kerja", "start end", "tanggal waktu", "date"],
  durasiKerja: ["durasi kerja", "durasi", "lama kerja", "jam"],
};

interface NotionPage { id: string; properties: Record<string, { type: string; title?: Array<{ plain_text: string }> }>; }
interface NotionDatabase { id: string; title?: Array<{ plain_text: string }>; properties?: Record<string, { id: string; type: string }>; }

// Struktur baru mengakomodasi mode broadcast/spesifik layaknya Perawatan
interface AddOperasionalBody {
  namaPekerjaan: string;
  kategori: string;
  status?: string;
  prioritas?: string;
  jenisTenagaKerja?: string; 
  areaId?: string; 
  areaIds?: string[];
  
  // Waktu
  modeWaktu: "broadcast" | "spesifik"; 
  waktuMulaiBroadcast?: string; 
  waktuSelesaiBroadcast?: string; 
  waktuMulaiPerArea?: Record<string, string>;
  waktuSelesaiPerArea?: Record<string, string>; 
  durasiKerjaPerArea?: Record<string, number>; 
  
  // Pekerja & Catatan
  modePekerja: "broadcast" | "spesifik"; 
  pekerjaBroadcast: string[]; 
  pekerjaPerArea: Record<string, string[]>;
  modeCatatan: "broadcast" | "spesifik"; 
  catatanBroadcast?: string; 
  catatanPerArea?: Record<string, string>;
}

// ==========================================
// 2. HELPER & UTILITIES API NOTION
// ==========================================
function decodePropertyId(id: string): string { try { return decodeURIComponent(id); } catch { return id; } }

async function findDatabaseByName(userId: string, accessToken: string, name: string): Promise<string | null> {
  try {
    const response = await notionFetch(userId, accessToken, "https://api.notion.com/v1/search", { method: "POST", body: JSON.stringify({ query: name, filter: { value: "database", property: "object" } }) });
    if (!response.ok) return null;
    const data = (await response.json()) as { results: NotionDatabase[] };
    const found = data.results.find((r) => r.title?.some((t) => t.plain_text.toLowerCase().includes(name.toLowerCase())));
    return found?.id ?? null;
  } catch (err) { if (err instanceof NotionTokenInvalidError) throw err; return null; }
}

async function queryAllPages(userId: string, accessToken: string, databaseId: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const response = await notionFetch(userId, accessToken, `https://api.notion.com/v1/databases/${databaseId}/query`, { method: "POST", body: JSON.stringify({ page_size: 100 }) });
    if (!response.ok) return [];
    const data = (await response.json()) as { results: NotionPage[] };
    return data.results.map((page) => {
      const titleProp = Object.values(page.properties).find((p) => p.type === "title");
      return { id: page.id, name: titleProp?.title?.[0]?.plain_text ?? "Tanpa Nama" };
    });
  } catch (err) { if (err instanceof NotionTokenInvalidError) throw err; return []; }
}

async function getDatabasePropertyMeta(userId: string, accessToken: string, databaseId: string): Promise<NotionDatabasePropertyMeta[]> {
  const response = await notionFetch(userId, accessToken, `https://api.notion.com/v1/databases/${databaseId}`);
  if (!response.ok) return [];
  const data = (await response.json()) as NotionDatabase;
  const entries = Object.entries(data.properties ?? {});
  return entries.map(([name, value]) => ({ name, id: value.id, type: value.type }));
}

function normalizeKey(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// MESIN PENCARI ID KOLOM YANG KEBAL (CODEX ENGINE)
function resolvePropertyId(
  fieldKey: string,
  expectedType: string,
  mappings: FieldMappingData | undefined,
  dbProperties: NotionDatabasePropertyMeta[],
): string | null {
  const mapping = mappings?.[fieldKey as keyof FieldMappingData];
  const mappedId = mapping?.propertyId ? decodePropertyId(mapping.propertyId) : null;

  if (mappedId) {
    // 1. Coba cari tipe yang spesifik diminta
    const matchById = dbProperties.find((p) => decodePropertyId(p.id) === mappedId || p.name === mappedId);
    if (matchById && matchById.type === expectedType) return decodePropertyId(matchById.id);
    
    // 2. HACK KHUSUS: Jika tipenya rollup|select|text, terima apa saja yang cocok ID nya
    if (matchById && expectedType.includes("|")) return decodePropertyId(matchById.id);
  }

  const aliases = OPERASIONAL_PROPERTY_ALIASES[fieldKey] ?? [fieldKey];
  const normalizedAliases = new Set(aliases.map(normalizeKey));
  
  // 3. Cari berdasarkan Alias
  const byAlias = dbProperties.find((p) => (expectedType.includes(p.type) || p.type === expectedType) && normalizedAliases.has(normalizeKey(p.name)));
  if (byAlias) return decodePropertyId(byAlias.id);

  // 4. Terakhir, cari tipe data yang sama
  const firstTypeMatch = dbProperties.find((p) => expectedType.includes(p.type) || p.type === expectedType);
  return firstTypeMatch ? decodePropertyId(firstTypeMatch.id) : null;
}

async function getMappingRow(userId: string, databaseType: string) {
  const [row] = await db.select().from(fieldMappingsTable).where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, databaseType)));
  return row ?? null;
}

// FORMATTER WIB (+07:00) ANTI UTC
function formatToNotionDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  if (dateStr.length === 16 && dateStr.includes("T")) return `${dateStr}:00+07:00`;
  return dateStr;
}

function buildOperasionalBlocks(catatan: string | undefined): any[] {
  if (!catatan || catatan.trim() === "") return [];
  return [
    { object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "📝 Catatan Lapangan" } }] } },
    { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: catatan.trim() } }] } },
  ];
}

// ==========================================
// 3. ENGINE PEMBANGUN PAYLOAD & PROPERTIES
// ==========================================
const OPERASIONAL_FIELDS = [
  { key: "namaPekerjaan", expectedType: "title" },
  { key: "kategori", expectedType: "select" },
  { key: "status", expectedType: "status" },
  { key: "ditugaskanKe", expectedType: "relation" },
  { key: "jenisTenagaKerja", expectedType: "select|rich_text|text" }, // Mendukung multi tipe (karena di skema lu "rollup|select|text")
  { key: "area", expectedType: "relation" },
  { key: "prioritas", expectedType: "select" },
  { key: "waktuPengerjaan", expectedType: "date" },
  { key: "durasiKerja", expectedType: "number" },
];

function buildOperasionalProperties(data: any, mappings: FieldMappingData | undefined, dbProperties: NotionDatabasePropertyMeta[]): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  OPERASIONAL_FIELDS.forEach((field) => {
    const propertyId = resolvePropertyId(field.key, field.expectedType, mappings, dbProperties);
    if (!propertyId) return; // Skip jika kolom gak ditemukan di Notion
    
    let value = data[field.key];
    let valueEnd: any = undefined; 
    
    // Bypass & Pemetaan Khusus
    if (field.key === "area" && data.areaId) value = data.areaId;
    if (field.key === "ditugaskanKe" && data.pekerjaIds) value = data.pekerjaIds;
    if (field.key === "waktuPengerjaan" && data.waktuMulaiValue) {
        value = formatToNotionDate(data.waktuMulaiValue);
        valueEnd = formatToNotionDate(data.waktuSelesaiValue); 
    }
    
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return;

    // Cek tipe asli dari propertyId yang didapat (penting untuk kolom jenisTenagaKerja)
    const actualType = dbProperties.find(p => p.id === propertyId)?.type || field.expectedType.split("|")[0];

    switch (actualType) {
      case "title": props[propertyId] = { title: [{ text: { content: String(value) } }] }; break;
      case "select": props[propertyId] = { select: { name: String(value) } }; break;
      case "status": props[propertyId] = { status: { name: String(value) } }; break;
      case "rich_text": 
      case "text": props[propertyId] = { rich_text: [{ type: "text", text: { content: String(value) } }] }; break;
      case "date": 
        props[propertyId] = { date: { start: String(value), ...(valueEnd ? { end: String(valueEnd) } : {}) } }; 
        break;
      case "relation": {
        const relationIds = Array.isArray(value) ? value.filter((id) => id && String(id).trim() !== "").map((id) => ({ id: String(id).trim() })) : [{ id: String(value).trim() }];
        if (relationIds.length > 0) props[propertyId] = { relation: relationIds };
        break;
      }
      case "number": {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) props[propertyId] = { number: parsed };
        break;
      }
    }
  });
  return props;
}

// ==========================================
// 4. ROUTER ENDPOINTS
// ==========================================
router.get("/notion/operasional-dropdown-options", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;
    const mappingRow = await getMappingRow(userId, "operasional");
    const mappings = mappingRow?.mappings as FieldMappingData | undefined;

    const [areaDbId, pekerjaDbId] = await Promise.all([
      mappings?.area?.relatedDatabaseId || findDatabaseByName(userId, accessToken, "Laba Rugi"),
      mappings?.ditugaskanKe?.relatedDatabaseId || findDatabaseByName(userId, accessToken, "Data Pekerja"),
    ]);

    const [areas, petugas] = await Promise.all([
      areaDbId ? queryAllPages(userId, accessToken, areaDbId) : Promise.resolve([]),
      pekerjaDbId ? queryAllPages(userId, accessToken, pekerjaDbId) : Promise.resolve([]),
    ]);

    res.json({ areas, petugas });
  } catch (err) { if (handleNotionErrors(res, err)) return; res.status(500).json({ error: "Internal Server Error" }); }
});

router.post("/notion/add-operasional", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const body = req.body as Partial<AddOperasionalBody>;
  
  const namaPekerjaan = (body.namaPekerjaan ?? "").trim();
  const kategori = (body.kategori ?? "").trim();
  const areaIds: string[] = Array.isArray(body.areaIds) ? body.areaIds.filter(Boolean) : body.areaId ? [body.areaId] : [];

  if (!namaPekerjaan || !kategori || areaIds.length === 0) {
    res.status(400).json({ error: "Field 'namaPekerjaan', 'kategori', dan 'areaIds' (minimal 1) wajib diisi." }); return;
  }

  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;
    const mappingRow = await getMappingRow(userId, "operasional");
    const mappings = mappingRow?.mappings as FieldMappingData | undefined;
    
    const databaseId = mappingRow?.notionDatabaseId || (await findDatabaseByName(userId, accessToken, "Operasional Kebun"));
    if (!databaseId) { res.status(404).json({ error: "Database 'Operasional Kebun' tidak ditemukan di Notion." }); return; }

    // Ambil struktur asli kolom dari Notion (kunci utama ketangguhan form Perawatan)
    const dbProperties = await getDatabasePropertyMeta(userId, accessToken, databaseId);

    // LOOPING EKSEKUSI PER AREA
    const requests = areaIds.map(async (currentAreaId) => {
      
      const waktuMulaiAreaIni = body.modeWaktu === "broadcast" ? body.waktuMulaiBroadcast : (body.waktuMulaiPerArea?.[currentAreaId] || body.waktuMulaiBroadcast);
      const waktuSelesaiAreaIni = body.modeWaktu === "broadcast" ? body.waktuSelesaiBroadcast : (body.waktuSelesaiPerArea?.[currentAreaId] || body.waktuSelesaiBroadcast);
      const durasiAreaIni = body.durasiKerjaPerArea?.[currentAreaId];
      const pekerjaAreaIni = body.modePekerja === "broadcast" ? (body.pekerjaBroadcast || []) : (body.pekerjaPerArea?.[currentAreaId] || []);
      const catatanAreaIni = body.modeCatatan === "broadcast" ? (body.catatanBroadcast || "") : (body.catatanPerArea?.[currentAreaId] || "");

      const properties = buildOperasionalProperties({
          namaPekerjaan, 
          kategori, 
          status: body.status, 
          prioritas: body.prioritas,
          jenisTenagaKerja: body.jenisTenagaKerja,
          areaId: currentAreaId, 
          pekerjaIds: pekerjaAreaIni,
          waktuMulaiValue: waktuMulaiAreaIni, 
          waktuSelesaiValue: waktuSelesaiAreaIni, 
          durasiKerja: durasiAreaIni, 
        }, mappings, dbProperties);

      const childrenBlocks = buildOperasionalBlocks(catatanAreaIni);
      const payload: any = { parent: { database_id: databaseId }, properties };
      if (childrenBlocks.length > 0) payload.children = childrenBlocks;

      const response = await notionFetch(userId, accessToken, "https://api.notion.com/v1/pages", { method: "POST", body: JSON.stringify(payload) });
      if (!response.ok) { const errText = await response.text(); throw new Error(errText || `Gagal menyimpan untuk area ${currentAreaId}`); }
      const created = await response.json();
      return { pageId: created.id, notionUrl: created.url };
    });

    const results = await Promise.all(requests);
    res.status(201).json({ success: true, message: `Berhasil mencatat operasional untuk ${areaIds.length} area.`, data: results });
  } catch (err) { if (handleNotionErrors(res, err)) return; res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" }); }
});

export default router;
