import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notionConnectionsTable = pgTable("notion_connections", {
  userId: text("user_id").primaryKey(),
  accessToken: text("access_token").notNull(),
  workspaceId: text("workspace_id").notNull(),
  workspaceName: text("workspace_name"),
  workspaceIcon: text("workspace_icon"),
  botId: text("bot_id").notNull(),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNotionConnectionSchema = createInsertSchema(notionConnectionsTable).omit({ connectedAt: true, updatedAt: true });
export type InsertNotionConnection = z.infer<typeof insertNotionConnectionSchema>;
export type NotionConnection = typeof notionConnectionsTable.$inferSelect;
