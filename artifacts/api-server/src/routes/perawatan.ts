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

interface AddPerawatanBody {
  kegiatan: string;
  tanggal: string;
  waktuMulai?: string;
  waktuSelesai?: string;
  labaRugiId?: string; // Bikin opsional
  labaRugiIds?: string[]; // <--- TAMBAHIN INI BUAT MULTI-AREA
  petugasId?: string;
  tags?: string[] | string;
  status: string;
  detailNotes?: Record<string, string>;
  logProduk?: Array<{
    produk: string;
    dosis: string;
  }>;
}

function decodePropertyId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

async function findDatabaseByName(
  userId: string,
  accessToken: string,
  name: string,
): Promise<string | null> {
  try {
    const response = await notionFetch(
      userId,
      accessToken,
      "https://api.notion.com/v1/search",
      {
        method: "POST",
        body: JSON.stringify({
          query: name,
          filter: {
            value: "database",
            property: "object",
          },
        }),
      },
    );

    if (!response.ok) return null;

    const data = (await response.json()) as {
      results: NotionDatabase[];
    };

    const found = data.results.find((r) =>
      r.title?.some((t) =>
        t.plain_text.toLowerCase().includes(name.toLowerCase()),
      ),
    );

    return found?.id ?? null;
  } catch (err) {
    if (err instanceof NotionTokenInvalidError) throw err;
    return null;
  }
}

async function queryAllPages(
  userId: string,
  accessToken: string,
  databaseId: string,
): Promise<Array<{ id: string; name: string }>> {
  try {
    const response = await notionFetch(
      userId,
      accessToken,
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        body: JSON.stringify({
          page_size: 100,
        }),
      },
    );

    if (!response.ok) return [];

    const data = (await response.json()) as {
      results: NotionPage[];
    };

    return data.results.map((page) => {
      const titleProp = Object.values(page.properties).find(
        (p) => p.type === "title",
      );

      const name = titleProp?.title?.[0]?.plain_text ?? "Tanpa Nama";

      return {
        id: page.id,
        name,
      };
    });
  } catch (err) {
    if (err instanceof NotionTokenInvalidError) throw err;
    return [];
  }
}

async function getMappingRow(
  userId: string,
  databaseType: string,
) {
  const [row] = await db
    .select()
    .from(fieldMappingsTable)
    .where(
      and(
        eq(fieldMappingsTable.userId, userId),
        eq(fieldMappingsTable.databaseType, databaseType),
      ),
    );

  return row ?? null;
}

function formatNotionDateTime(dateStr: string): string {
  if (!dateStr) return "";
  // Jika input dari HP ada jamnya (mengandung huruf 'T', contoh: 2026-05-25T08:30)
  if (dateStr.includes("T")) {
    // Kita kunci paksa jadi zona waktu Indonesia / WIB (+07:00)
    return `${dateStr}:00+07:00`;
  }
  // Fallback kalau cuma tanggal doang
  return dateStr;
}

function buildRichText(content: string) {
  return {
    rich_text: [
      {
        type: "text",
        text: {
          content,
        },
      },
    ],
  };
}

function buildNotionBlocks(
  logProduk: Array<{ produk: string; dosis: string }> | undefined,
  detailNotes: string | undefined
): any[] {
  const blocks: any[] = [];

  // 1. Block untuk Detail Notes
  if (detailNotes && detailNotes.trim() !== "") {
    blocks.push({
      object: "block",
      type: "heading_3",
      heading_3: { rich_text: [{ type: "text", text: { content: "📝 Catatan Detail" } }] }
    });
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content: detailNotes.trim() } }] }
    });
  }

  // 2. Block untuk Racikan (Kita pakai bulleted_list_item biar aman dari validasi Notion)
  if (logProduk && logProduk.length > 0) {
    blocks.push({
      object: "block",
      type: "heading_3",
      heading_3: { rich_text: [{ type: "text", text: { content: "🌱 Racikan Bahan / Produk" } }] }
    });
    
    // Kita buat setiap baris produk sebagai bullet list item
    blocks.push(...logProduk.map((p) => ({
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: `${p.produk} ` } },
          { type: "text", text: { content: `(Dosis: ${p.dosis})`, link: null }, annotations: { bold: true, color: "green" } }
        ]
      }
    })));
  }

  return blocks;
}


// Taruh ini tepat di atas fungsi buildPerawatanProperties
const PERAWATAN_FIELDS = [
  { key: "kegiatan", expectedType: "title" },
  { key: "tanggal", expectedType: "date" },
  { key: "tags", expectedType: "select" },
  { key: "status", expectedType: "status" },
  { key: "petugas", expectedType: "relation" },
  { key: "labaRugi", expectedType: "relation" },
];

function buildPerawatanProperties(
  data: AddPerawatanBody,
  mappings: FieldMappingData | undefined,
): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  // Sekarang dia baca dari variabel PERAWATAN_FIELDS di atas
  PERAWATAN_FIELDS.forEach((field) => {
    const mapping = mappings?.[field.key as keyof FieldMappingData];
    if (!mapping?.propertyId) return;

    const propertyId = decodePropertyId(mapping.propertyId);
    
    let value = data[field.key as keyof AddPerawatanBody];
    
    // Trik toleransi ID relasi
    if (!value && field.key === "labaRugi") value = (data as any).labaRugiId;
    if (!value && field.key === "petugas") value = (data as any).petugasId;
    
    if (!value) return;

    switch (field.expectedType) {
      case "title":
        props[propertyId] = { title: [{ text: { content: String(value) } }] };
        break;
      case "date":
        props[propertyId] = { date: { start: String(value) } };
        break;
      case "select":
        props[propertyId] = { select: { name: String(value) } };
        break;
      case "multi_select":
        if (Array.isArray(value)) {
          props[propertyId] = { multi_select: value.map((t) => ({ name: String(t) })) };
        } else {
          props[propertyId] = { multi_select: [{ name: String(value) }] };
        }
        break;
      case "status":
        props[propertyId] = { status: { name: String(value) } };
        break;
      case "relation":
        props[propertyId] = { relation: [{ id: String(value) }] };
        break;
    }
  });

  return props;
}


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

    const [labaRugiDbId, petugasDbId] = await Promise.all([
      mappings?.labaRugi?.relatedDatabaseId ||
        findDatabaseByName(userId, accessToken, "Laba Rugi"),
      mappings?.petugas?.relatedDatabaseId ||
        findDatabaseByName(userId, accessToken, "Data pekerja"),
    ]);

    const [labaRugi, petugas] = await Promise.all([
      labaRugiDbId
        ? queryAllPages(userId, accessToken, labaRugiDbId)
        : Promise.resolve([]),
      petugasDbId
        ? queryAllPages(userId, accessToken, petugasDbId)
        : Promise.resolve([]),
    ]);

console.log("PETUGAS DB ID", petugasDbId);
console.log("PETUGAS DATA", petugas);

    res.json({
      areas: labaRugi,
      petugas,
    });
  } catch (err) {
    if (handleNotionErrors(res, err)) return;

    res.status(500).json({
      error: "Internal Server Error",
    });
  }
});

router.post("/notion/add-perawatan", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const body = req.body as Partial<AddPerawatanBody>;
  const kegiatan = (body.kegiatan ?? "").trim();
  const tanggal = (body.tanggal ?? "").trim();

  // Pengaman payload area dari Front-End (Bisa nerima 1 atau banyak area)
  const areaIds: string[] = Array.isArray(body.labaRugiIds) 
    ? body.labaRugiIds.filter(Boolean) 
    : body.labaRugiId ? [body.labaRugiId] : [];

  if (!kegiatan || !tanggal || areaIds.length === 0) {
    res.status(400).json({
      error: "Field 'kegiatan', 'tanggal', dan area wajib diisi (minimal 1).",
    });
    return;
  }

  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;
    const mappingRow = await getMappingRow(userId, "perawatan");
    const mappings = mappingRow?.mappings as FieldMappingData | undefined;

    const databaseId = mappingRow?.notionDatabaseId || (await findDatabaseByName(userId, accessToken, "Perawatan"));
    if (!databaseId) {
      res.status(404).json({ error: "Database 'Perawatan' tidak ditemukan di Notion." });
      return;
    }

    // --- DI SINI MAGIC-NYA: KITA LOOPING SESUAI JUMLAH AREA ---
    const requests = areaIds.map(async (currentAreaId) => {
            // 1. Ambil catatan spesifik untuk area yang sedang di-looping
      const catatanAreaIni = body.detailNotes?.[currentAreaId] || "";

        const properties = buildPerawatanProperties(
        {
          kegiatan,
          tanggal, 
          labaRugiId: currentAreaId,
          petugasId: body.petugasId,
          tags: body.tags,
          status: body.status || "Rencana",
          detailNotes: catatanAreaIni,
          logProduk: body.logProduk,
        },
        mappings,
      );

      // 👇 TAMBAHKAN JURUS HACK NOTION INI DI SINI 👇
      // Ini bakal nimpain settingan tanggal biasa menjadi rentang waktu WIB (+07:00)
      if (body.waktuMulai) {
        properties["Date"] = { // Pastikan nama kolom di Notion beneran "Date"
          date: {
            start: `${tanggal}T${body.waktuMulai}:00+07:00`,
            ...(body.waktuSelesai ? { end: `${tanggal}T${body.waktuSelesai}:00+07:00` } : {})
          }
        };
      }

      // 2. Rakit block Notion menggunakan catatan spesifik tersebut
      const childrenBlocks = buildNotionBlocks(body.logProduk, catatanAreaIni);

      const payload: any = {
        parent: { database_id: databaseId },
        properties,
      };

      if (childrenBlocks.length > 0) {
        payload.children = childrenBlocks;
      }

      const response = await notionFetch(userId, accessToken, "https://api.notion.com/v1/pages", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Gagal menyimpan untuk area ${currentAreaId}`);
      }

      const created = await response.json();
      
      // Kita kembalikan ID dan URL sekalian buat persiapan Target No 3 nanti
      return { 
        pageId: created.id,
        notionUrl: created.url 
      };
    });

    // Tangkap semua respon dari Notion
    const results = await Promise.all(requests);

    res.status(201).json({
      success: true,
      message: `Berhasil mencatat perawatan untuk ${areaIds.length} area.`,
      data: results // Array data halaman yang berhasil dibuat
    });
  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

export default router;
