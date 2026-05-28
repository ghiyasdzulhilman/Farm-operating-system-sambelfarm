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

// ALIAS KUSUS INSPEKSI DARI SKEMA LU
const INSPEKSI_PROPERTY_ALIASES: Record<string, string[]> = {
  kegiatan: ["kegiatan", "judul", "nama", "task", "operasional", "treatment", "inspeksi"],
  labaRugi: ["area", "blok", "lahan", "pindah tanam"],
  tanggal: ["tanggal", "date", "waktu", "hari", "created"],
  hst: ["hst", "hari setelah tanam"],
  hama: ["hama", "serangga", "kutu", "ulat"],
  penyakit: ["penyakit", "jamur", "virus", "bakteri", "bercak"],
  tingkatSerangan: ["tingkat serangan", "tingkat serangan (%)", "tingkat", "persentase"],
  radius: ["radius", "radius (m2)", "luas", "meter"],
  phTanah: ["ph tanah", "ph"],
  petugas: ["petugas", "petugas lapangan", "petugaslapangan", "pekerja", "team", "operator"],
  status: ["status"],
};

interface NotionPage { id: string; properties: Record<string, { type: string; title?: Array<{ plain_text: string }> }>; }
interface NotionDatabase { id: string; title?: Array<{ plain_text: string }>; properties?: Record<string, { id: string; type: string }>; }

interface TemuanDetail { nama: string; catatan: string; }

// STRUKTUR MULTI-AREA ANCHOR
interface AddInspeksiBody {
  kegiatan: string;
  areaIds: string[]; // ANCHOR UTAMA

  modeTanggal: "broadcast" | "spesifik"; 
  tanggalBroadcast?: string; 
  tanggalPerArea?: Record<string, string>; 
  
  modeKendala: "broadcast" | "spesifik"; 
  hamaBroadcast?: string[]; penyakitBroadcast?: string[];
  hamaPerArea?: Record<string, string[]>; penyakitPerArea?: Record<string, string[]>;
  temuanBroadcast?: TemuanDetail[]; temuanPerArea?: Record<string, TemuanDetail[]>; // Bawaan form lama lu

  modeAngka: "broadcast" | "spesifik"; 
  tingkatSeranganBroadcast?: number | string; radiusBroadcast?: number | string; phTanahBroadcast?: number | string;
  tingkatSeranganPerArea?: Record<string, number | string>; 
  radiusPerArea?: Record<string, number | string>; 
  phTanahPerArea?: Record<string, number | string>;

  modePekerja: "broadcast" | "spesifik"; 
  petugasBroadcast?: string[]; 
  petugasPerArea?: Record<string, string[]>;
  
  modeAtribut: "broadcast" | "spesifik";
  statusBroadcast?: string; 
  statusPerArea?: Record<string, string>;

  modeCatatan: "broadcast" | "spesifik"; 
  keteranganBroadcast?: string; // Bawaan form lama lu (catatan umum)
  keteranganPerArea?: Record<string, string>;
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

function normalizeKey(input: string): string { return input.toLowerCase().replace(/[^a-z0-9]/g, ""); }

function resolvePropertyId(fieldKey: string, expectedType: string, mappings: FieldMappingData | undefined, dbProperties: NotionDatabasePropertyMeta[]): string | null {
  const mapping = mappings?.[fieldKey as keyof FieldMappingData];
  const mappedId = mapping?.propertyId ? decodePropertyId(mapping.propertyId) : null;
  if (mappedId) {
    const matchById = dbProperties.find((p) => decodePropertyId(p.id) === mappedId || p.name === mappedId);
    if (matchById && matchById.type === expectedType) return decodePropertyId(matchById.id);
    if (matchById && expectedType.includes("|")) return decodePropertyId(matchById.id);
  }
  const aliases = INSPEKSI_PROPERTY_ALIASES[fieldKey] ?? [fieldKey];
  const normalizedAliases = new Set(aliases.map(normalizeKey));
  const byAlias = dbProperties.find((p) => (expectedType.includes(p.type) || p.type === expectedType) && normalizedAliases.has(normalizeKey(p.name)));
  if (byAlias) return decodePropertyId(byAlias.id);
  const firstTypeMatch = dbProperties.find((p) => expectedType.includes(p.type) || p.type === expectedType);
  return firstTypeMatch ? decodePropertyId(firstTypeMatch.id) : null;
}

async function getMappingRow(userId: string, databaseType: string) {
  const [row] = await db.select().from(fieldMappingsTable).where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, databaseType)));
  return row ?? null;
}

function formatToNotionDate(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  if (dateStr.length === 16 && dateStr.includes("T")) return `${dateStr}:00+07:00`;
  return dateStr;
}

// Bawaan fungsi lama lu (diubah sedikt biar kompatibel)
function buildNotionBlocks(temuan: TemuanDetail[] | undefined, detailNotes: string | undefined): any[] {
  const blocks: any[] = [];
  if (detailNotes && detailNotes.trim() !== "") {
    blocks.push({ object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "📝 Catatan Umum" } }] } });
    blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: detailNotes.trim() } }] } });
  }
  if (temuan && temuan.length > 0) {
    blocks.push({ object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "🐛 Detail Temuan" } }] } });
    blocks.push(...temuan.map((t) => ({
      object: "block", type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: `${t.nama} `, link: null }, annotations: { bold: true } },
          { type: "text", text: { content: t.catatan ? `— ${t.catatan}` : "" } }
        ]
      }
    })));
  }
  return blocks;
}

// ==========================================
// 3. ENGINE PEMBANGUN PAYLOAD
// ==========================================
const INSPEKSI_FIELDS = [
  { key: "kegiatan", expectedType: "title" },
  { key: "labaRugi", expectedType: "relation" },
  { key: "tanggal", expectedType: "date" },
  { key: "hama", expectedType: "multi_select" },
  { key: "penyakit", expectedType: "multi_select" },
  { key: "tingkatSerangan", expectedType: "number" },
  { key: "radius", expectedType: "number" },
  { key: "phTanah", expectedType: "number" },
  { key: "petugas", expectedType: "relation" },
  { key: "status", expectedType: "status|select" },
];

function buildInspeksiProperties(data: any, mappings: FieldMappingData | undefined, dbProperties: NotionDatabasePropertyMeta[]): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  INSPEKSI_FIELDS.forEach((field) => {
    const propertyId = resolvePropertyId(field.key, field.expectedType, mappings, dbProperties);
    if (!propertyId) return; 
    
    let value = data[field.key];
    if (field.key === "labaRugi" && data.areaId) value = data.areaId;
    if (field.key === "petugas" && data.petugasIds) value = data.petugasIds;
    if (field.key === "hama" && data.hamaIds) value = data.hamaIds;
    if (field.key === "penyakit" && data.penyakitIds) value = data.penyakitIds;
    if (field.key === "tanggal" && data.tanggalValue) value = formatToNotionDate(data.tanggalValue);
    
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return;
    
    const actualType = dbProperties.find(p => p.id === propertyId)?.type || field.expectedType.split("|")[0];
    
    switch (actualType) {
      case "title": props[propertyId] = { title: [{ text: { content: String(value) } }] }; break;
      case "select": props[propertyId] = { select: { name: String(value) } }; break;
      case "status": props[propertyId] = { status: { name: String(value) } }; break;
      case "date": props[propertyId] = { date: { start: String(value) } }; break;
      case "multi_select": 
        if (Array.isArray(value)) {
            const valid = value.filter(v => v && String(v).trim() !== "");
            if (valid.length > 0) props[propertyId] = { multi_select: valid.map(v => ({ name: String(v) })) };
        }
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
router.get("/notion/inspeksi-dropdown-options", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;
    const mappingRow = await getMappingRow(userId, "inspeksi");
    const mappings = mappingRow?.mappings as FieldMappingData | undefined;
    const [areaDbId, pekerjaDbId] = await Promise.all([
      mappings?.labaRugi?.relatedDatabaseId || findDatabaseByName(userId, accessToken, "Laba Rugi"),
      mappings?.petugas?.relatedDatabaseId || findDatabaseByName(userId, accessToken, "Data pekerja"),
    ]);
    const [areas, petugas] = await Promise.all([
      areaDbId ? queryAllPages(userId, accessToken, areaDbId) : Promise.resolve([]),
      pekerjaDbId ? queryAllPages(userId, accessToken, pekerjaDbId) : Promise.resolve([]),
    ]);
    res.json({ areas, petugas });
  } catch (err) { if (handleNotionErrors(res, err)) return; res.status(500).json({ error: "Internal Server Error" }); }
});

router.post("/notion/add-inspeksi", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  
  const body = req.body as Partial<AddInspeksiBody>;
  const kegiatan = (body.kegiatan ?? "").trim();
  const areaIds: string[] = Array.isArray(body.areaIds) ? body.areaIds.filter(Boolean) : [];

  if (!kegiatan || areaIds.length === 0) {
    res.status(400).json({ error: "Field 'kegiatan' dan 'areaIds' (minimal 1) wajib diisi." }); return;
  }

  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;
    const mappingRow = await getMappingRow(userId, "inspeksi");
    const mappings = mappingRow?.mappings as FieldMappingData | undefined;
    
    // Cari nama DB sesuai form lama lu ("Inspeksi") atau ("Inspeksi Rutin")
    const databaseId = mappingRow?.notionDatabaseId || (await findDatabaseByName(userId, accessToken, "Inspeksi")) || (await findDatabaseByName(userId, accessToken, "Inspeksi Rutin"));
    if (!databaseId) { res.status(404).json({ error: "Database 'Inspeksi' tidak ditemukan di Notion." }); return; }
    
    const dbProperties = await getDatabasePropertyMeta(userId, accessToken, databaseId);

    const requests = areaIds.map(async (currentAreaId) => {
      
      // 1. Resolve Waktu
      const tanggalAreaIni = body.modeTanggal === "broadcast" ? body.tanggalBroadcast : (body.tanggalPerArea?.[currentAreaId] || body.tanggalBroadcast);
      
      // 2. Resolve Kendala (Hama & Penyakit)
      const hamaAreaIni = body.modeKendala === "broadcast" ? (body.hamaBroadcast || []) : (body.hamaPerArea?.[currentAreaId] || []);
      const penyakitAreaIni = body.modeKendala === "broadcast" ? (body.penyakitBroadcast || []) : (body.penyakitPerArea?.[currentAreaId] || []);

      // 3. Resolve Angka (Serangan, Radius, pH)
      const seranganAreaIni = body.modeAngka === "broadcast" ? body.tingkatSeranganBroadcast : body.tingkatSeranganPerArea?.[currentAreaId];
      const radiusAreaIni = body.modeAngka === "broadcast" ? body.radiusBroadcast : body.radiusPerArea?.[currentAreaId];
      const phAreaIni = body.modeAngka === "broadcast" ? body.phTanahBroadcast : body.phTanahPerArea?.[currentAreaId];
      
      // 4. Resolve Pekerja
      const petugasAreaIni = body.modePekerja === "broadcast" ? (body.petugasBroadcast || []) : (body.petugasPerArea?.[currentAreaId] || []);
      
      // 5. Resolve Atribut (Status)
      const statusAreaIni = body.modeAtribut === "broadcast" ? body.statusBroadcast : (body.statusPerArea?.[currentAreaId] || body.statusBroadcast);
      
      // 6. Resolve Catatan & Temuan Detail
      const catatanAreaIni = body.modeCatatan === "broadcast" ? (body.keteranganBroadcast || "") : (body.keteranganPerArea?.[currentAreaId] || "");
      const temuanAreaIni = body.modeKendala === "broadcast" ? (body.temuanBroadcast || []) : (body.temuanPerArea?.[currentAreaId] || []);

      const properties = buildInspeksiProperties({
          kegiatan, 
          areaId: currentAreaId, 
          tanggalValue: tanggalAreaIni, 
          hamaIds: hamaAreaIni, 
          penyakitIds: penyakitAreaIni, 
          tingkatSerangan: seranganAreaIni, 
          radius: radiusAreaIni, 
          phTanah: phAreaIni, 
          petugasIds: petugasAreaIni,
          status: statusAreaIni, 
        }, mappings, dbProperties);

      // Rakit block anak halaman (Catatan umum & list hama)
      const childrenBlocks = buildNotionBlocks(temuanAreaIni, catatanAreaIni);
      
      const payload: any = { parent: { database_id: databaseId }, properties };
      if (childrenBlocks.length > 0) payload.children = childrenBlocks;

      const response = await notionFetch(userId, accessToken, "https://api.notion.com/v1/pages", { method: "POST", body: JSON.stringify(payload) });
      if (!response.ok) { const errText = await response.text(); throw new Error(errText || `Gagal menyimpan untuk area ${currentAreaId}`); }
      const created = await response.json();
      return { pageId: created.id, notionUrl: created.url };
    });

    const results = await Promise.all(requests);
    
    // Nyesuaiin response JSON form lama lu yang nyari `notionPageId`
    res.status(201).json({ 
      success: true, 
      notionPageId: results[0]?.pageId, // Kompatibilitas frontend lama
      data: results // Data lengkap multi-area
    });
  } catch (err) { if (handleNotionErrors(res, err)) return; res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" }); }
});

export default router;
