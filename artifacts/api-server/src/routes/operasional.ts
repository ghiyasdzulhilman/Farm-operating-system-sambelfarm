import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  db,
  fieldMappingsTable,
  type FieldMappingData,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  getNotionConnection,
  notionFetch,
  handleNotionErrors,
  NotionTokenInvalidError,
} from "../lib/notionClient";

const router: IRouter = Router();

interface NotionPage {
  id: string;
  properties: Record<
    string,
    {
      type: string;
      title?: Array<{ plain_text: string }>;
    }
  >;
}

interface NotionDatabase {
  id: string;
  title?: Array<{ plain_text: string }>;
}

interface AddOperasionalBody {
  namaPekerjaan: string;
  kategori: string;
  status?: string;
  ditugaskanKeId: string | string[];
  areaId?: string; 
  areaIds?: string[];
  prioritas?: string;
  waktuPengerjaan?: string | { start: string; end?: string; };
  waktuMulai?: string;
  waktuSelesai?: string;
  durasiKerja?: number;
  catatan?: string;
  lampiran?: Array<string | { url: string; name?: string; }>;
}

function decodePropertyId(id: string): string {
  try { return decodeURIComponent(id); } catch { return id; }
}

async function findDatabaseByName(userId: string, accessToken: string, name: string): Promise<string | null> {
  try {
    const response = await notionFetch(userId, accessToken, "https://api.notion.com/v1/search", {
      method: "POST",
      body: JSON.stringify({ query: name, filter: { value: "database", property: "object" } }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { results: NotionDatabase[] };
    const found = data.results.find((r) => r.title?.some((t) => t.plain_text.toLowerCase().includes(name.toLowerCase())));
    return found?.id ?? null;
  } catch (err) {
    if (err instanceof NotionTokenInvalidError) throw err;
    return null;
  }
}

async function queryAllPages(userId: string, accessToken: string, databaseId: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const response = await notionFetch(userId, accessToken, `https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: "POST", body: JSON.stringify({ page_size: 100 }),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { results: NotionPage[] };
    return data.results.map((page) => {
      const titleProp = Object.values(page.properties).find((p) => p.type === "title");
      return { id: page.id, name: titleProp?.title?.[0]?.plain_text ?? "Tanpa Nama" };
    });
  } catch (err) {
    if (err instanceof NotionTokenInvalidError) throw err;
    return [];
  }
}

async function getMappingRow(userId: string, databaseType: string) {
  const [row] = await db.select().from(fieldMappingsTable).where(and(eq(fieldMappingsTable.userId, userId), eq(fieldMappingsTable.databaseType, databaseType)));
  return row ?? null;
}

function buildRichText(content: string) {
  return { rich_text: [{ type: "text", text: { content } }] };
}

// FORMATTER TANGGAL (BYPASS TIMEZONE NOTION DENGAN FAKE UTC)
function formatNotionDate(dateString: string): string | undefined {
  if (!dateString) return undefined;
  const str = dateString.trim();
  
  // Jika formatnya YYYY-MM-DD (tanpa jam), biarkan saja
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  
  // Tangkap format datetime-local dari HP (YYYY-MM-DDTHH:mm)
  // Paksa jadikan format UTC absolut dengan menambahkan :00.000Z
  // Ini bikin Notion pasrah dan nyatet jam persis seperti yang kita ketik
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str)) {
    return `${str}:00.000Z`;
  }
  
  // Fallback standar kalau formatnya aneh
  const d = new Date(str);
  if (isNaN(d.getTime())) return undefined;
  
  return d.toISOString();
}

  const d = new Date(str);
  if (isNaN(d.getTime())) return undefined;
  
  // Fallback aman jika format lain masuk
  return str;
}

function normalizeDateRange(
  value: string | { start: string; end?: string; } | undefined,
  waktuMulai?: string,
  waktuSelesai?: string,
) {
  let startStr: string | undefined;
  let endStr: string | undefined;

  if (typeof value === "string") startStr = value;
  else if (value && typeof value === "object") { startStr = value.start; endStr = value.end; }
  else { startStr = waktuMulai; endStr = waktuSelesai; }

  const formattedStart = startStr ? formatNotionDate(startStr) : undefined;
  const formattedEnd = endStr ? formatNotionDate(endStr) : undefined;

  if (!formattedStart) return null;
  const normalized: { start: string; end?: string } = { start: formattedStart };

  if (formattedEnd) {
    const startTime = new Date(formattedStart).getTime();
    const endTime = new Date(formattedEnd).getTime();
    if (endTime >= startTime) normalized.end = formattedEnd;
  }
  return normalized;
}

function isValidUrl(str: string) {
  try { new URL(str); return true; } catch { return false; }
}

function normalizeFiles(lampiran: AddOperasionalBody["lampiran"]) {
  if (!Array.isArray(lampiran) || lampiran.length === 0) return null;
  const files = lampiran.map((item, index) => {
    if (typeof item === "string" && isValidUrl(item.trim())) {
      return { name: `Lampiran ${index + 1}`, type: "external" as const, external: { url: item.trim() } };
    }
    if (item && typeof item === "object" && typeof item.url === "string" && isValidUrl(item.url.trim())) {
      return { name: item.name?.trim() || `Lampiran ${index + 1}`, type: "external" as const, external: { url: item.url.trim() } };
    }
    return null;
  }).filter(Boolean);
  return files.length > 0 ? files : null;
}

const OPERASIONAL_FIELDS = [
  { key: "namaPekerjaan", expectedType: "title" },
  { key: "kategori", expectedType: "select" },
  { key: "status", expectedType: "status" },
  { key: "ditugaskanKe", expectedType: "relation" },
  { key: "area", expectedType: "relation" },
  { key: "prioritas", expectedType: "select" },
  { key: "waktuPengerjaan", expectedType: "date" },
  { key: "durasiKerja", expectedType: "number" },
  { key: "catatan", expectedType: "rich_text" },
  { key: "lampiran", expectedType: "files" },
] as const;

function buildOperasionalProperties(data: AddOperasionalBody, mappings: FieldMappingData | undefined): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  OPERASIONAL_FIELDS.forEach((field) => {
    const mapping = mappings?.[field.key as keyof FieldMappingData];
    if (!mapping?.propertyId) return;

    const propertyId = decodePropertyId(mapping.propertyId);
    let value: unknown;

    if (field.key === "namaPekerjaan") value = data.namaPekerjaan;
    if (field.key === "kategori") value = data.kategori;
    if (field.key === "status") value = data.status;
    if (field.key === "ditugaskanKe") value = data.ditugaskanKeId;
    if (field.key === "area") value = data.areaId;
    if (field.key === "prioritas") value = data.prioritas;
    if (field.key === "waktuPengerjaan") value = normalizeDateRange(data.waktuPengerjaan, data.waktuMulai, data.waktuSelesai);
    if (field.key === "durasiKerja") value = data.durasiKerja;
    if (field.key === "catatan") value = data.catatan;
    if (field.key === "lampiran") value = data.lampiran;

    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return;

    switch (field.expectedType) {
      case "title": props[propertyId] = { title: [{ text: { content: String(value) } }] }; break;
      case "select": props[propertyId] = { select: { name: String(value) } }; break;
      case "status": props[propertyId] = { status: { name: String(value) } }; break;
      case "relation": {
        const relationIds = Array.isArray(value)
          ? value.filter((id) => id && String(id).trim() !== "").map((id) => ({ id: String(id).trim() }))
          : value && String(value).trim() !== "" ? [{ id: String(value).trim() }] : [];
        if (relationIds.length > 0) props[propertyId] = { relation: relationIds };
        break;
      }
      case "date": if (typeof value === "object" && value && "start" in value) props[propertyId] = { date: value }; break;
      case "number": {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) props[propertyId] = { number: parsed };
        break;
      }
      case "rich_text": props[propertyId] = buildRichText(String(value)); break;
      case "files": {
        const files = normalizeFiles(value as AddOperasionalBody["lampiran"]);
        if (files) props[propertyId] = { files };
        break;
      }
    }
  });

  return props;
}

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
  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/notion/add-operasional", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const body = req.body as Partial<AddOperasionalBody>;

  const namaPekerjaan = (body.namaPekerjaan ?? "").trim();
  const kategori = (body.kategori ?? "").trim();
  const status = (body.status ?? "").trim();
  const waktuMulai = (body.waktuMulai ?? "").trim();

  // Pengaman payload area dari Front-End
  const areaIds: string[] = Array.isArray(body.areaIds) ? body.areaIds.filter(Boolean) : body.areaId ? [body.areaId] : [];
  const ditugaskanKeId = Array.isArray(body.ditugaskanKeId) ? body.ditugaskanKeId.filter(Boolean) : (body.ditugaskanKeId ?? "");
  const hasWorker = Array.isArray(ditugaskanKeId) ? ditugaskanKeId.length > 0 : !!ditugaskanKeId;

  if (!namaPekerjaan || !kategori || areaIds.length === 0 || !waktuMulai || !hasWorker) {
    res.status(400).json({
      error: "Field 'namaPekerjaan', 'kategori', 'areaIds' (minimal 1), 'waktuMulai', dan 'ditugaskanKeId' wajib diisi.",
    });
    return;
  }

  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;
    const mappingRow = await getMappingRow(userId, "operasional");
    const mappings = mappingRow?.mappings as FieldMappingData | undefined;

    const databaseId = mappingRow?.notionDatabaseId || (await findDatabaseByName(userId, accessToken, "Operasional Kebun"));
    if (!databaseId) {
      res.status(404).json({ error: "Database 'Operasional Kebun' tidak ditemukan di Notion." });
      return;
    }

    const requests = areaIds.map(async (currentAreaId) => {
      const properties = buildOperasionalProperties(
        {
          namaPekerjaan, kategori, status, ditugaskanKeId,
          areaId: currentAreaId, // Tembak ID perulangan ke Notion
          prioritas: body.prioritas, waktuPengerjaan: body.waktuPengerjaan,
          waktuMulai, waktuSelesai: body.waktuSelesai,
          durasiKerja: body.durasiKerja, catatan: body.catatan, lampiran: body.lampiran,
        },
        mappings
      );

      const response = await notionFetch(userId, accessToken, "https://api.notion.com/v1/pages", {
        method: "POST", body: JSON.stringify({ parent: { database_id: databaseId }, properties }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Gagal menyimpan untuk area ${currentAreaId}`);
      }
      return response.json();
    });

    await Promise.all(requests);
    res.status(201).json({ success: true, message: `Berhasil mencatat kegiatan untuk ${areaIds.length} area.` });
  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal Server Error" });
  }
});

export default router;
