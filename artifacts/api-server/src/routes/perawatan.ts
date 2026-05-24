import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import {
  db,
  fieldMappingsTable,
  type FieldMappingData,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

// 1. IMPORT SKEMA ZOD PERAWATAN YANG KITA BIKIN KEMARIN
import { AddPerawatanBody, type AddPerawatanBodyType } from "@workspace/api-zod";

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

  // 2. Block untuk Racikan
  if (logProduk && logProduk.length > 0) {
    blocks.push({
      object: "block",
      type: "heading_3",
      heading_3: { rich_text: [{ type: "text", text: { content: "🌱 Racikan Bahan / Produk" } }] }
    });
    
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

const PERAWATAN_FIELDS = [
  { key: "kegiatan", expectedType: "title" },
  { key: "tanggal", expectedType: "date" },
  { key: "tags", expectedType: "select" }, // Asumsi di Notion lu pakai multi_select (di-handle di switch bawah)
  { key: "status", expectedType: "status" },
  { key: "petugas", expectedType: "relation" },
  { key: "labaRugi", expectedType: "relation" },
] as const;

// 2. TIPE DATA MENGGUNAKAN BAWAAN ZOD
function buildPerawatanProperties(
  data: AddPerawatanBodyType,
  mappings: FieldMappingData | undefined,
): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  PERAWATAN_FIELDS.forEach((field) => {
    const mapping = mappings?.[field.key as keyof FieldMappingData];
    if (!mapping?.propertyId) return;

    const propertyId = decodePropertyId(mapping.propertyId);
    
    // Sinkronisasi penamaan field lokal ke skema Zod
    let value: unknown;
    if (field.key === "kegiatan") value = data.kegiatan;
    if (field.key === "tanggal") value = data.tanggal;
    if (field.key === "tags") value = data.tags;
    if (field.key === "status") value = data.status;
    if (field.key === "petugas") value = data.petugasId;
    if (field.key === "labaRugi") value = data.labaRugiId;
    
    if (value === undefined || value === null || value === "") return;

    switch (field.expectedType) {
      case "title":
        props[propertyId] = { title: [{ text: { content: String(value) } }] };
        break;
      case "date":
        props[propertyId] = { date: { start: String(value) } };
        break;
      case "select":
      // Notion API nolak format string biasa kalau property-nya bertipe multi_select
      // Tapi kita cek kondisi, apakah Notion di-set jadi `select` biasa atau `multi_select`
      // Di kode lama lu lu siapin `multi_select`, jadi kita amankan:
        if (Array.isArray(value)) {
          props[propertyId] = { multi_select: value.map((t) => ({ name: String(t) })) };
        } else {
          // Tetep jaga kompatibilitas sama select biasa
          // (Pastikan config di Notion sesuai sama mapping lu)
          props[propertyId] = { multi_select: [{ name: String(value) }] };
        }
        break;
      case "status":
        props[propertyId] = { status: { name: String(value) } };
        break;
      case "relation":
        // 3. PENGAMANAN RELASI (Mencegah Error 400 Bad Request dari Notion)
        if (Array.isArray(value)) {
          props[propertyId] = { relation: value.filter(id => id.trim()).map(id => ({ id: String(id) })) };
        } else if (String(value).trim()) {
          props[propertyId] = { relation: [{ id: String(value).trim() }] };
        } else {
           props[propertyId] = { relation: [] }; // Aman
        }
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

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // 4. MENGGUNAKAN ZOD UNTUK VALIDASI (Bye-bye logika if-else manual yang panjang!)
  const parsed = AddPerawatanBody.safeParse(req.body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message || "Request data tidak valid.";
    res.status(400).json({ error: firstError });
    return;
  }

  // 5. Data sudah dijamin valid dan bersih (termasuk auto-trim dan default status="Rencana")
  const validData = parsed.data;

  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;

    const mappingRow = await getMappingRow(userId, "perawatan");
    const mappings = mappingRow?.mappings as FieldMappingData | undefined;

    const databaseId =
      mappingRow?.notionDatabaseId ||
      (await findDatabaseByName(userId, accessToken, "Perawatan"));

    if (!databaseId) {
      res.status(404).json({
        error: "Database 'Perawatan' tidak ditemukan di Notion.",
      });
      return;
    }

    // Builder Properties
    const properties = buildPerawatanProperties(validData, mappings);

    // Builder Blocks untuk Catatan Panjang / Detail Produk
    const childrenBlocks = buildNotionBlocks(validData.logProduk, validData.detailNotes);

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
      res.status(502).json({
        error: "Notion error",
        detail: errText.slice(0, 500),
      });
      return;
    }

    const created = (await response.json()) as { id: string };

    res.status(201).json({
      success: true,
      notionPageId: created.id,
    });
  } catch (err) {
    if (handleNotionErrors(res, err)) return;

    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal Server Error",
    });
  }
});

export default router;
