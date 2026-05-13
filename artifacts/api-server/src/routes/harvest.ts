import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, fieldMappingsTable, type FieldMappingData } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { AddHarvestBody, GetHarvestDropdownOptionsResponse } from "@workspace/api-zod";
import {
  getNotionConnection,
  notionFetch,
  handleNotionErrors,
  NotionTokenInvalidError,
} from "../lib/notionClient";

const router: IRouter = Router();

interface NotionPage {
  id: string;
  properties: Record<string, {
    type: string;
    title?: Array<{ plain_text: string }>;
    rich_text?: Array<{ plain_text: string }>;
  }>;
}

interface NotionDatabase {
  id: string;
  title?: Array<{ plain_text: string }>;
}

// ---- Notion helpers ---------------------------------------------------------

async function findDatabaseByName(
  userId: string,
  accessToken: string,
  name: string,
): Promise<string | null> {
  try {
    const response = await notionFetch(userId, accessToken, "https://api.notion.com/v1/search", {
      method: "POST",
      body: JSON.stringify({
        query: name,
        filter: { value: "database", property: "object" },
      }),
    });
    if (!response.ok) return null;
    const data = await response.json() as { results: NotionDatabase[] };
    const found = data.results.find((r) =>
      r.title?.some((t) => t.plain_text.toLowerCase().includes(name.toLowerCase()))
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
      { method: "POST", body: JSON.stringify({ page_size: 100 }) },
    );
    if (!response.ok) return [];
    const data = await response.json() as { results: NotionPage[] };
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

// ---- Mapping helpers --------------------------------------------------------

interface MappingRow {
  notionDatabaseId: string | null;
  mappings: FieldMappingData;
}

async function getMappingRow(userId: string, databaseType: string): Promise<MappingRow | null> {
  const [row] = await db
    .select()
    .from(fieldMappingsTable)
    .where(and(
      eq(fieldMappingsTable.userId, userId),
      eq(fieldMappingsTable.databaseType, databaseType),
    ));
  if (!row) return null;
  return {
    notionDatabaseId: row.notionDatabaseId ?? null,
    mappings: (row.mappings as FieldMappingData) ?? {},
  };
}

/** Returns property ID from mapping if set, otherwise returns the fallback name. */
function pk(mappings: FieldMappingData | undefined, field: string, fallback: string): string {
  return mappings?.[field]?.propertyId ?? fallback;
}

// ---- Routes -----------------------------------------------------------------

// GET /notion/harvest-dropdown-options
router.get("/notion/harvest-dropdown-options", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;

    const mappingRow = await getMappingRow(userId, "panen");
    const mappings = mappingRow?.mappings;

    const [pindahTanamDbId, labaRugiDbId] = await Promise.all([
      mappings?.areaPindahTanam?.relatedDatabaseId
        ? Promise.resolve(mappings.areaPindahTanam.relatedDatabaseId)
        : findDatabaseByName(userId, accessToken, "Pindah Tanam"),
      mappings?.labaRugi?.relatedDatabaseId
        ? Promise.resolve(mappings.labaRugi.relatedDatabaseId)
        : findDatabaseByName(userId, accessToken, "Laba Rugi"),
    ]);

    req.log.info({ userId, pindahTanamDbId, labaRugiDbId }, "Harvest dropdown options resolved");

    const [pindahTanam, labaRugi] = await Promise.all([
      pindahTanamDbId ? queryAllPages(userId, accessToken, pindahTanamDbId) : Promise.resolve([]),
      labaRugiDbId ? queryAllPages(userId, accessToken, labaRugiDbId) : Promise.resolve([]),
    ]);

    const data = GetHarvestDropdownOptionsResponse.parse({ pindahTanam, labaRugi });
    res.json(data);
  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    throw err;
  }
});

// POST /notion/add-harvest
router.post("/notion/add-harvest", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = AddHarvestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    kegiatan,
    jumlahPanen,
    hargaJualPerKg,
    kualitas,
    channelPenjualan,
    pindahTanamId,
    labaRugiId,
  } = parsed.data;

  const tanggal = req.body.tanggal;

  try {
    const connection = await getNotionConnection(userId);
    const { accessToken } = connection;

    const mappingRow = await getMappingRow(userId, "panen");
    const mappings = mappingRow?.mappings;

    const panenDbId =
      mappingRow?.notionDatabaseId ||
      (await findDatabaseByName(userId, accessToken, "Panen"));

    req.log.info(
      { userId, panenDbId, usingStoredId: !!mappingRow?.notionDatabaseId },
      "Add harvest: resolved Panen database ID",
    );

    if (!panenDbId) {
      res.status(404).json({ error: "Database 'Panen' tidak ditemukan. Pilih database di halaman Pengaturan." });
      return;
    }

    const properties: any = {
      [pk(mappings, "kegiatan", "Kegiatan")]: {
        title: [{ text: { content: kegiatan } }],
      },
      [pk(mappings, "jumlahPanen", "Jumlah Panen (kg)")]: {
        number: jumlahPanen,
      },
      [pk(mappings, "hargaJualPerKg", "Harga Jual per Kg")]: {
        number: hargaJualPerKg,
      },
      [pk(mappings, "kualitas", "Kualitas")]: {
        select: { name: kualitas },
      },
      [pk(mappings, "channelPenjualan", "Channel Penjualan")]: {
        select: { name: channelPenjualan },
      },
    };

    if (tanggal) {
      properties[pk(mappings, "tanggal", "Tanggal")] = {
        date: { start: tanggal },
      };
    }

    if (pindahTanamId) {
      properties[pk(mappings, "areaPindahTanam", "Area Pindah Tanam")] = {
        relation: [{ id: pindahTanamId }],
      };
    }

    if (labaRugiId) {
      properties[pk(mappings, "labaRugi", "Area Laba Rugi")] = {
        relation: [{ id: labaRugiId }],
      };
    }

    const notionBody = {
      parent: { database_id: panenDbId },
      properties,
    };

    const response = await notionFetch(userId, accessToken, "https://api.notion.com/v1/pages", {
      method: "POST",
      body: JSON.stringify(notionBody),
    });

    if (!response.ok) {
      const errBody = await response.text();
      req.log.error({ statusCode: response.status, errBody }, "Notion rejected add-harvest");
      let userMessage = "Gagal menyimpan data panen ke Notion.";
      try {
        const errParsed = JSON.parse(errBody) as { message?: string };
        if (errParsed.message) userMessage = `Notion: ${errParsed.message}`;
      } catch { /* keep default */ }
      res.status(400).json({ error: userMessage });
      return;
    }

    const created = await response.json() as { id: string };
    req.log.info({ userId, pageId: created.id }, "Harvest created in Notion");

    res.status(201).json({ success: true, pageId: created.id });
  } catch (err) {
    if (handleNotionErrors(res, err)) return;
    throw err;
  }
});

export default router;
