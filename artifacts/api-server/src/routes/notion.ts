import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { randomBytes } from "crypto";
import { db, notionConnectionsTable, oauthStatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  InitiateNotionOAuthResponse,
  HandleNotionOAuthCallbackQueryParams,
  HandleNotionOAuthCallbackResponse,
  GetNotionConnectionStatusResponse,
  DisconnectNotionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const NOTION_CLIENT_ID = process.env.NOTION_CLIENT_ID ?? "";
const NOTION_CLIENT_SECRET = process.env.NOTION_CLIENT_SECRET ?? "";
const NOTION_REDIRECT_URI = process.env.NOTION_REDIRECT_URI ?? "";

router.post("/notion/connect", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const state = randomBytes(32).toString("hex");

  await db.insert(oauthStatesTable).values({ state, userId }).onConflictDoNothing();

  const params = new URLSearchParams({
    client_id: NOTION_CLIENT_ID,
    redirect_uri: NOTION_REDIRECT_URI,
    response_type: "code",
    owner: "user",
    state,
  });

  const url = `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;

  const data = InitiateNotionOAuthResponse.parse({ url, state });
  res.json(data);
});

router.get("/notion/callback", async (req, res): Promise<void> => {
  const parsed = HandleNotionOAuthCallbackQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing code or state" });
    return;
  }

  const { code, state } = parsed.data;

  const [oauthState] = await db
    .select()
    .from(oauthStatesTable)
    .where(eq(oauthStatesTable.state, state));

  if (!oauthState) {
    res.status(400).json({ error: "Invalid or expired state" });
    return;
  }

  const userId = oauthState.userId;

  await db.delete(oauthStatesTable).where(eq(oauthStatesTable.state, state));

  const credentials = Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString("base64");
  const tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: NOTION_REDIRECT_URI,
    }),
  });

  if (!tokenResponse.ok) {
    const err = await tokenResponse.text();
    req.log.error({ err }, "Notion token exchange failed");
    res.status(400).json({ error: "Failed to exchange code for token" });
    return;
  }

  const tokenData = await tokenResponse.json() as {
    access_token: string;
    bot_id: string;
    workspace_id: string;
    workspace_name?: string;
    workspace_icon?: string;
  };

  await db
    .insert(notionConnectionsTable)
    .values({
      userId,
      accessToken: tokenData.access_token,
      workspaceId: tokenData.workspace_id,
      workspaceName: tokenData.workspace_name ?? null,
      workspaceIcon: tokenData.workspace_icon ?? null,
      botId: tokenData.bot_id,
    })
    .onConflictDoUpdate({
      target: notionConnectionsTable.userId,
      set: {
        accessToken: tokenData.access_token,
        workspaceId: tokenData.workspace_id,
        workspaceName: tokenData.workspace_name ?? null,
        workspaceIcon: tokenData.workspace_icon ?? null,
        botId: tokenData.bot_id,
        updatedAt: new Date(),
      },
    });

  req.log.info({ userId }, "Notion connected successfully");

  const data = HandleNotionOAuthCallbackResponse.parse({
    connected: true,
    workspaceName: tokenData.workspace_name ?? null,
    workspaceIcon: tokenData.workspace_icon ?? null,
    connectedAt: new Date().toISOString(),
  });
  res.json(data);
});

router.get("/notion/status", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const [connection] = await db
    .select()
    .from(notionConnectionsTable)
    .where(eq(notionConnectionsTable.userId, userId));

  const data = GetNotionConnectionStatusResponse.parse({
    connected: !!connection,
    workspaceName: connection?.workspaceName ?? null,
    workspaceIcon: connection?.workspaceIcon ?? null,
    connectedAt: connection?.connectedAt?.toISOString() ?? null,
  });
  res.json(data);
});

router.post("/notion/disconnect", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await db.delete(notionConnectionsTable).where(eq(notionConnectionsTable.userId, userId));

  const data = DisconnectNotionResponse.parse({
    connected: false,
    workspaceName: null,
    workspaceIcon: null,
    connectedAt: null,
  });
  res.json(data);
});

export default router;
