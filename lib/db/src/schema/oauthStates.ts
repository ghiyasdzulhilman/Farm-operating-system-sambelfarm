import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const oauthStatesTable = pgTable("oauth_states", {
  state: text("state").primaryKey(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOauthStateSchema = createInsertSchema(oauthStatesTable).omit({ createdAt: true });
export type InsertOauthState = z.infer<typeof insertOauthStateSchema>;
export type OauthState = typeof oauthStatesTable.$inferSelect;
