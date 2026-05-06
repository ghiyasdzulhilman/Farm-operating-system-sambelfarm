import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, notionConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

  const [pindahTanamDbId, labaRugiDbId] = await Promise.all([
    findDatabaseByName(accessToken, "Pindah Tanam"),
    findDatabaseByName(accessToken, "Laba Rugi"),
  ]);

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

  const [connection] = await db
    .select()
    .from(notionConnectionsTable)
    .where(eq(notionConnectionsTable.userId, userId));

  if (!connection) {
    res.status(404).json({ error: "Notion tidak terhubung." });
    return;
  }

  const { accessToken } = connection;

  const panenDbId = await findDatabaseByName(accessToken, "Panen");
  if (!panenDbId) {
    res.status(404).json({ error: "Database 'Panen' tidak ditemukan di workspace Notion Anda." });
    return;
  }

  const notionBody = {
    parent: { database_id: panenDbId },
    properties: {
      Kegiatan: {
        title: [{ text: { content: kegiatan } }],
      },
      "Jumlah Panen (kg)": {
        number: jumlahPanen,
      },
      "Harga Jual per (Kg)": {
        number: hargaJualPerKg,
      },
      Kualitas: {
        select: { name: kualitas },
      },
      "Channel Penjualan": {
        select: { name: channelPenjualan },
      },
      "Area Pindah Tanam": {
        relation: [{ id: pindahTanamId }],
      },
      "Area Laba Rugi": {
        relation: [{ id: labaRugiId }],
      },
    },
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
      const parsed = JSON.parse(errBody) as { message?: string };
      if (parsed.message) userMessage = `Notion: ${parsed.message}`;
    } catch {
      // keep default message
    }
    res.status(400).json({ error: userMessage });
    return;
  }

  const created = await response.json() as { id: string };
  req.log.info({ userId, pageId: created.id }, "Harvest created in Notion");

  res.status(201).json({ success: true, pageId: created.id });
});

export default router;
