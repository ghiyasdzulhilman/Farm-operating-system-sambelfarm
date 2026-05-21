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

// =====================================================================
// 🐛 2. TABEL STAGING INSPEKSI (Revisi: +userId, +errorMessage)
// =====================================================================
export const stagingInspeksiTable = pgTable("staging_inspeksi", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(), // ✨ WAJIB ADA
  kegiatan: varchar("kegiatan", { length: 255 }).notNull(),
  tanggal: date("tanggal").notNull(),
  areaId: varchar("area_id", { length: 255 }).notNull(), 
  errorMessage: text("error_message"), // ✨ WAJIB ADA
  hama: jsonb("hama"), 
  penyakit: jsonb("penyakit"), 
  tingkatSerangan: real("tingkat_serangan"), 
  radius: real("radius"), 
  phTanah: real("ph_tanah"), 
  status: varchar("status", { length: 100 }), 
  petugasId: varchar("petugas_id", { length: 255 }), 
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
