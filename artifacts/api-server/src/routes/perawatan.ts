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
  labaRugiId: string;
  petugasId?: string;
  tags?: string[] | string;
  detailNotes?: string;
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

function buildNotionBlocks(logProduk: Array<{ produk: string; dosis: string }> | undefined): any[] {
  if (!logProduk || logProduk.length === 0) return [];

  return [
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "🌱 Racikan Bahan / Produk" } }]
      }
    },
    ...logProduk.map((p) => ({
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: `${p.produk} ` } },
          { type: "text", text: { content: `(Dosis: ${p.dosis})`, link: null }, annotations: { bold: true, color: "green" } }
        ]
      }
    }))
  ];
}


function buildPerawatanProperties(
  data: AddPerawatanBody,
  mappings: FieldMappingData | undefined,
): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  const setProp = (
  mappingKey: string,
  value: unknown,
  builder: (val: any) => unknown,
) => {

  console.log("MAPPING KEY", mappingKey);
  console.log("MAPPING DATA", mappings?.[mappingKey]);

  const mapping = mappings?.[mappingKey];

  if (!mapping?.propertyId) return;

  props[decodePropertyId(mapping.propertyId)] = builder(value);
};

  setProp("kegiatan", data.kegiatan, (v) => ({
    title: [{ text: { content: String(v) } }],
  }));

  setProp("tanggal", data.tanggal, (v) => ({
    date: { start: String(v) },
  }));

  const tag =
  Array.isArray(data.tags)
    ? data.tags[0]
    : typeof data.tags === "string"
      ? data.tags
      : "";

if (tag) {
  setProp("tags", tag, (value: string) => ({
    select: { name: value },
  }));
}

  if (data.detailNotes?.trim()) {
    setProp("detailNotes", data.detailNotes.trim(), (v) =>
      buildRichText(String(v)),
    );
  }

  setProp("labaRugi", data.labaRugiId, (v) => ({
  relation: [{ id: String(v) }],
}));

if (data.petugasId) {
  setProp("petugas", data.petugasId, (v) => ({
    relation: [{ id: String(v) }],
  }));
}

console.log(
  "PERAWATAN PROPS",
  JSON.stringify(props, null, 2)
);

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

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = req.body as Partial<AddPerawatanBody>;

  const kegiatan = (body.kegiatan ?? "").trim();
  const tanggal = (body.tanggal ?? "").trim();
  const labaRugiId = (body.labaRugiId ?? "").trim();

  if (!kegiatan || !tanggal || !labaRugiId) {
    res.status(400).json({
      error: "Field 'kegiatan', 'tanggal', dan 'labaRugiId' wajib diisi.",
    });
    return;
  }

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

    const properties = buildPerawatanProperties(
      {
        kegiatan,
        tanggal,
        labaRugiId,
        petugasId: body.petugasId,
        tags: body.tags,
        detailNotes: body.detailNotes,
        logProduk: body.logProduk,
      },
      mappings,
    );

    const requiredKeys = ["kegiatan", "tanggal", "labaRugi"];
    const missingRequired = requiredKeys.filter(
      (key) => !mappings?.[key]?.propertyId,
    );

            // 1. Panggil penyihir untuk merakit isi halaman
    const childrenBlocks = buildNotionBlocks(body.logProduk);

    // 2. Siapkan payload dasar (properties)
    const payload: any = {
      parent: { database_id: databaseId },
      properties,
    };

    // 3. Kalau ada racikan produk, suntikkan ke dalam halamannya
    if (childrenBlocks.length > 0) {
      payload.children = childrenBlocks;
    }

    // 4. Tembak ke Notion!
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
