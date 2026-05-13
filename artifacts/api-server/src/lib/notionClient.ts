import { db, notionConnectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Response } from "express";

export class NotionTokenInvalidError extends Error {
  constructor() {
    super("Token Notion tidak valid atau telah dicabut");
    this.name = "NotionTokenInvalidError";
  }
}

export class NotionNotConnectedError extends Error {
  constructor() {
    super("Notion belum terhubung");
    this.name = "NotionNotConnectedError";
  }
}

export async function getNotionConnection(userId: string) {
  const [connection] = await db
    .select()
    .from(notionConnectionsTable)
    .where(eq(notionConnectionsTable.userId, userId));

  if (!connection) throw new NotionNotConnectedError();
  if (connection.tokenStatus === "invalid") throw new NotionTokenInvalidError();

  return connection;
}

async function markTokenInvalid(userId: string): Promise<void> {
  await db
    .update(notionConnectionsTable)
    .set({ tokenStatus: "invalid", updatedAt: new Date() })
    .where(eq(notionConnectionsTable.userId, userId));
}

export async function notionFetch(
  userId: string,
  accessToken: string,
  url: string,
  options: RequestInit = {},
): Promise<globalThis.Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (response.status === 401) {
    await markTokenInvalid(userId);
    throw new NotionTokenInvalidError();
  }

  return response;
}

export function handleNotionErrors(res: Response, err: unknown): boolean {
  if (err instanceof NotionNotConnectedError) {
    res.status(404).json({ error: "Notion tidak terhubung." });
    return true;
  }
  if (err instanceof NotionTokenInvalidError) {
    res.status(401).json({
      error: "notion_token_invalid",
      message:
        "Koneksi Notion terputus. Silakan hubungkan ulang akun Notion Anda di halaman Pengaturan.",
    });
    return true;
  }
  return false;
}
