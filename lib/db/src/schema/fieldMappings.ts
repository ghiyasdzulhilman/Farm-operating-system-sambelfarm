import { pgTable, text, timestamp, json, primaryKey } from "drizzle-orm/pg-core";

export interface FieldMappingEntry {
  propertyId: string;
  propertyName: string;
  relatedDatabaseId?: string | null;
}

export type FieldMappingData = Record<string, FieldMappingEntry>;

export const fieldMappingsTable = pgTable(
  "field_mappings",
  {
    userId: text("user_id").notNull(),
    databaseType: text("database_type").notNull(),
    notionDatabaseId: text("notion_database_id"),
    mappings: json("mappings").$type<FieldMappingData>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.userId, t.databaseType] })],
);

export type FieldMapping = typeof fieldMappingsTable.$inferSelect;
