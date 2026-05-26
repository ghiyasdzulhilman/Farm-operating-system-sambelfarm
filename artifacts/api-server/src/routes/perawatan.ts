import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, fieldMappingsTable, type FieldMappingData } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getNotionConnection, notionFetch, handleNotionErrors, NotionTokenInvalidError } from "../lib/notionClient";

const router: IRouter = Router();

interface NotionPage { id: string; properties: Record<string, { type: string; title?: Array<{ plain_text: string }> }>; }
interface NotionDatabase { id: string; title?: Array<{ plain_text: string }>; }

// Bikin schema fleksibel
interface AddPerawatanBody {
  kegiatan: string;
  tanggal?: string; // Jaga-jaga kalo masih ada sisa bawaan
  labaRugiId?: string; 
  labaRugiIds?: string[]; 
  
  modeTanggal: "broadcast" | "spesifik"; tanggalBroadcast?: string; tanggalPerArea?: Record<string, string>;
  modePekerja: "broadcast" | "spesifik"; petugasBroadcast: string[]; petugasPerArea: Record<string, string[]>;
  modeTags: "broadcast" | "spesifik"; tagsBroadcast?: string; tagsPerArea?: Record<string, string>;
  modeStatus: "broadcast" | "spesifik"; statusBroadcast?: string; statusPerArea?: Record<string, string>;
  modeCatatan: "broadcast" | "spesifik"; catatanBroadcast?: string; catatanPerArea?: Record<string, string>;
  modeProduk: "broadcast" | "spesifik"; logProduk: Array<{ produk: string; dosis: string }>; produkPerArea: Record<string, Array<{ produk: string; dosis: string }>>;
}

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
      const name = titleProp?.title?.[0]?.plain_text ?? "Tanpa Nama";
      return { id: page.id, name };
    });
  } catch (err) { if (err instanceof NotionTokenInvalidError) throw err; return []; }
}

async function getMappingRow(userId: string, databaseType: string) {
  const [row] = await db.select().from(fieldMappingsTable).where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, databaseType)));
  return row ?? null;
}

function buildNotionBlocks(logProduk: Array<{ produk: string; dosis: string }> | undefined, detailNotes: string | undefined): any[] {
  const blocks: any[] = [];
  if (detailNotes && detailNotes.trim() !== "") {
    blocks.push({ object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "📝 Catatan Detail" } }] } });
    blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: detailNotes.trim() } }] } });
  }
  if (logProduk && logProduk.length > 0) {
    blocks.push({ object: "block", type: "heading_3", heading_3: { rich_text: [{ type: "text", text: { content: "🌱 Racikan Bahan / Produk" } }] } });
    blocks.push(...logProduk.map((p) => ({ object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ type: "text", text: { content: `${p.produk} ` } }, { type: "text", text: { content: `(Dosis: ${p.dosis})`, link: null }, annotations: { bold: true, color: "green" } }] } })));
  }
  return blocks;
}

const PERAWATAN_FIELDS = [
  { key: "kegiatan", expectedType: "title" },
  { key: "tanggal", expectedType: "date" },
  { key: "tags", expectedType: "select" },
  { key: "status", expectedType: "status" },
  { key: "petugas", expectedType: "relation" },
  { key: "labaRugi", expectedType: "relation" },
];

function buildPerawatanProperties(data: any, mappings: FieldMappingData | undefined): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  PERAWATAN_FIELDS.forEach((field) => {
    const mapping = mappings?.[field.key as keyof FieldMappingData];
    if (!mapping?.propertyId) return;

    const propertyId = decodePropertyId(mapping.propertyId);
    let value = data[field.key];
    
    // 👇👇👇 KUNCI ANTI-BEBAL: PAKSA OVERRIDE! 👇👇👇
    // Kalau ada value custom dari looping (tanggalValue), HANCURKAN tanggal bawaan!
    if (field.key === "labaRugi" && data.labaRugiId) value = data.labaRugiId;
    if (field.key === "petugas" && data.petugasIds) value = data.petugasIds;
    if (field.key === "tags" && data.tagsValue) value = data.tagsValue; 
    if (field.key === "status" && data.statusValue) value = data.statusValue;
    if (field.key === "tanggal" && data.tanggalValue) value = data.tanggalValue; 
    
    if (!value || (Array.isArray(value) && value.length === 0)) return;

    switch (field.expectedType) {
      case "title": props[propertyId] = { title: [{ text: { content: String(value) } }] }; break;
      case "date": props[propertyId] = { date: { start: String(value) } }; break;
      case "select": props[propertyId] = { select: { name: String(value) } }; break;
      case "multi_select": 
        if (Array.isArray(value)) props[propertyId] = { multi_select: value.map((t) => ({ name: String(t) })) };
        else props[propertyId] = { multi_select: [{ name: String(value) }] };
        break;
      case "status": props[propertyId] = { status: { name: String(value) } }; break;
      case "relation": {
        const relationIds = Array.isArray(value) ? value.filter((id) => id && String(id).trim() !== "").map((id) => ({ id: String(id).trim() })) : [{ id: String(value).trim() }];
        if (relationIds.length > 0) props[propertyId] = { relation: relationIds };
        break;
      }
    }
  });
  return props;
}

router.get("/notion/perawatan-dropdown-options", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;
    const mappingRow = await getMappingRow(userId, "perawatan");
    const mappings = mappingRow?.mappings as FieldMappingData | undefined;
    const [labaRugiDbId, petugasDbId] = await Promise.all([ mappings?.labaRugi?.relatedDatabaseId || findDatabaseByName(userId, accessToken, "Laba Rugi"), mappings?.petugas?.relatedDatabaseId || findDatabaseByName(userId, accessToken, "Data pekerja") ]);
    const [labaRugi, petugas] = await Promise.all([ labaRugiDbId ? queryAllPages(userId, accessToken, labaRugiDbId) : Promise.resolve([]), petugasDbId ? queryAllPages(userId, accessToken, petugasDbId) : Promise.resolve([]) ]);
    res.json({ areas: labaRugi, petugas });
  } catch (err) { if (handleNotionErrors(res, err)) return; res.status(500).json({ error: "Internal Server Error" }); }
});

router.post("/notion/add-perawatan", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const body = req.body as Partial<AddPerawatanBody>;
  const kegiatan = (body.kegiatan ?? "").trim();
  
  const areaIds: string[] = Array.isArray(body.labaRugiIds) ? body.labaRugiIds.filter(Boolean) : body.labaRugiId ? [body.labaRugiId] : [];

  if (!kegiatan || areaIds.length === 0) { res.status(400).json({ error: "Field 'kegiatan' dan area wajib diisi (minimal 1)." }); return; }

  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;
    const mappingRow = await getMappingRow(userId, "perawatan");
    const mappings = mappingRow?.mappings as FieldMappingData | undefined;
    const databaseId = mappingRow?.notionDatabaseId || (await findDatabaseByName(userId, accessToken, "Perawatan"));
    if (!databaseId) { res.status(404).json({ error: "Database 'Perawatan' tidak ditemukan di Notion." }); return; }

    const requests = areaIds.map(async (currentAreaId) => {
      // MASTER FILTER PER AREA
      const fallbackDate = body.tanggal || new Date().toISOString().split("T")[0]; // Prioritaskan tanggal bawaan kalo ada
      const tanggalAreaIni = body.modeTanggal === "broadcast" ? (body.tanggalBroadcast || fallbackDate) : (body.tanggalPerArea?.[currentAreaId] || body.tanggalBroadcast || fallbackDate);
      
      const catatanAreaIni = body.modeCatatan === "broadcast" ? (body.catatanBroadcast || "") : (body.catatanPerArea?.[currentAreaId] || "");
      const pekerjaAreaIni = body.modePekerja === "broadcast" ? (body.petugasBroadcast || []) : (body.petugasPerArea?.[currentAreaId] || []);
      const produkAreaIni = body.modeProduk === "broadcast" ? (body.logProduk || []) : (body.produkPerArea?.[currentAreaId] || []);
      const tagsAreaIni = body.modeTags === "broadcast" ? body.tagsBroadcast : body.tagsPerArea?.[currentAreaId];
      const statusAreaIni = body.modeStatus === "broadcast" ? (body.statusBroadcast || "Rencana") : (body.statusPerArea?.[currentAreaId] || "Rencana");

      const properties = buildPerawatanProperties({
          kegiatan,
          labaRugiId: currentAreaId,
          tanggalValue: tanggalAreaIni, // <--- Lempar tanggal sakti ke atas
          petugasIds: pekerjaAreaIni,
          tagsValue: tagsAreaIni, 
          statusValue: statusAreaIni, 
        }, mappings);

      const childrenBlocks = buildNotionBlocks(produkAreaIni, catatanAreaIni);
      const payload: any = { parent: { database_id: databaseId }, properties };
      if (childrenBlocks.length > 0) payload.children = childrenBlocks;

      const response = await notionFetch(userId, accessToken, "https://api.notion.com/v1/pages", { method: "POST", body: JSON.stringify(payload) });
      if (!response.ok) { const errText = await response.text(); throw new Error(errText || `Gagal menyimpan untuk area ${currentAreaId}`); }
      const created = await response.json();
      return { pageId: created.id, notionUrl: created.url };
    });

    const results = await Promise.all(requests);
    res.status(201).json({ success: true, message: `Berhasil mencatat perawatan untuk ${areaIds.length} area.`, data: results });
  } catch (err) { if (handleNotionErrors(res, err)) return; res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" }); }
});

export default router;
