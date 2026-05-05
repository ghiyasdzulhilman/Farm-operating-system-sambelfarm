import { Router, type IRouter } from "express";
import { type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { randomBytes } from "crypto";
import { db, notionConnectionsTable, oauthStatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  InitiateNotionOAuthResponse,
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

async function handleNotionCallback(req: Request, res: Response): Promise<void> {
  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const error = req.query.error as string | undefined;

  if (error) {
    req.log.warn({ error }, "Notion OAuth denied by user");
    res.redirect("/?notion_error=access_denied");
    return;
  }

  if (!code || !state) {
    res.redirect("/?notion_error=missing_params");
    return;
  }

  const [oauthState] = await db
    .select()
    .from(oauthStatesTable)
    .where(eq(oauthStatesTable.state, state));

  if (!oauthState) {
    req.log.warn({ state }, "Invalid or expired OAuth state");
    res.redirect("/?notion_error=invalid_state");
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
    res.redirect("/?notion_error=token_exchange_failed");
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

  res.redirect("/dashboard");
}

// Handle both paths — Notion may be configured with either
router.get("/notion/callback", handleNotionCallback);
router.get("/notion/oauth-callback", handleNotionCallback);

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
