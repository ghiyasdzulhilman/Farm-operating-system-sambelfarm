import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, notionConnectionsTable, fieldMappingsTable, type FieldMappingData } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { AddHarvestBody, GetHarvestDropdownOptionsResponse } from "@workspace/api-zod";

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

async function findDatabaseByName(accessToken: string, name: string): Promise<string | null> {
  const response = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
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
}

async function queryAllPages(
  accessToken: string,
  databaseId: string,
): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({ page_size: 100 }),
  });
  if (!response.ok) return [];
  const data = await response.json() as { results: NotionPage[] };
  return data.results.map((page) => {
    const titleProp = Object.values(page.properties).find((p) => p.type === "title");
    const name = titleProp?.title?.[0]?.plain_text ?? "Tanpa Nama";
    return { id: page.id, name };
  });
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

  const [connection] = await db
    .select()
    .from(notionConnectionsTable)
    .where(eq(notionConnectionsTable.userId, userId));

  if (!connection) {
    res.status(404).json({ error: "Notion tidak terhubung." });
    return;
  }

  const { accessToken } = connection;

  // Load saved mapping
  const mappingRow = await getMappingRow(userId, "panen");
  const mappings = mappingRow?.mappings;

  // KABEL DISAMBUNG: Ganti pencarian ke mappings.labaRugi
  const [pindahTanamDbId, labaRugiDbId] = await Promise.all([
    mappings?.areaPindahTanam?.relatedDatabaseId
      ? Promise.resolve(mappings.areaPindahTanam.relatedDatabaseId)
      : findDatabaseByName(accessToken, "Pindah Tanam"),
    mappings?.labaRugi?.relatedDatabaseId
      ? Promise.resolve(mappings.labaRugi.relatedDatabaseId)
      : findDatabaseByName(accessToken, "Laba Rugi"),
  ]);

  req.log.info({ userId, pindahTanamDbId, labaRugiDbId }, "Harvest dropdown options resolved");

  const [pindahTanam, labaRugi] = await Promise.all([
    pindahTanamDbId ? queryAllPages(accessToken, pindahTanamDbId) : Promise.resolve([]),
    labaRugiDbId ? queryAllPages(accessToken, labaRugiDbId) : Promise.resolve([]),
  ]);

  const data = GetHarvestDropdownOptionsResponse.parse({ pindahTanam, labaRugi });
  res.json(data);
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

  // Ambil tanggal dari request body (buat jaga-jaga kalau schema Zod bawaan belum update)
  const tanggal = req.body.tanggal; 

  const [connection] = await db
    .select()
    .from(notionConnectionsTable)
    .where(eq(notionConnectionsTable.userId, userId));

  if (!connection) {
    res.status(404).json({ error: "Notion tidak terhubung." });
    return;
  }

  const { accessToken } = connection;

  // Load full mapping row
  const mappingRow = await getMappingRow(userId, "panen");
  const mappings = mappingRow?.mappings;

  // Use stored notionDatabaseId if available, otherwise fall back to name search
  const panenDbId =
    mappingRow?.notionDatabaseId ||
    (await findDatabaseByName(accessToken, "Panen"));

  req.log.info(
    { userId, panenDbId, usingStoredId: !!mappingRow?.notionDatabaseId },
    "Add harvest: resolved Panen database ID",
  );

  if (!panenDbId) {
    res.status(404).json({ error: "Database 'Panen' tidak ditemukan. Pilih database di halaman Pengaturan." });
    return;
  }

  // Build Notion properties safely (hindari kirim relation kosong)
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

  // Masukin tanggal kalau user ngisi
  if (tanggal) {
    properties[pk(mappings, "tanggal", "Tanggal")] = {
      date: { start: tanggal },
    };
  }

  // Masukin area pindah tanam kalau user milih
  if (pindahTanamId) {
    properties[pk(mappings, "areaPindahTanam", "Area Pindah Tanam")] = {
      relation: [{ id: pindahTanamId }],
    };
  }

  // KABEL DISAMBUNG: Pastikan pake kunci "labaRugi"
  if (labaRugiId) {
    properties[pk(mappings, "labaRugi", "Area Laba Rugi")] = {
      relation: [{ id: labaRugiId }],
    };
  }

  const notionBody = {
    parent: { database_id: panenDbId },
    properties: properties,
  };

  const response = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
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
});

export default router;
