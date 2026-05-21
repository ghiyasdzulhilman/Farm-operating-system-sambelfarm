import { pgTable, text, timestamp, json, uuid, date, jsonb, real, varchar } from "drizzle-orm/pg-core";

export type StagingStatus = "pending" | "synced" | "failed";

export const stagingDataTable = pgTable("staging_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  databaseType: text("database_type").notNull(),
  data: json("data").$type<Record<string, unknown>>().notNull(),
  status: text("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type StagingData = typeof stagingDataTable.$inferSelect;
export type InsertStagingData = typeof stagingDataTable.$inferInsert;

