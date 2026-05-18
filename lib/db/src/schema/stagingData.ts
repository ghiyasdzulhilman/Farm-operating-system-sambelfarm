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
// 🌱 1. TABEL STAGING PERAWATAN (Multi-Blok + Log Produk Dinamis)
// =====================================================================
export const stagingPerawatanTable = pgTable("staging_perawatan", {
  id: uuid("id").defaultRandom().primaryKey(),
  areaId: varchar("area_id", { length: 255 }).notNull(), // 🌟 Relasi tunggal ke database Pindah Tanam
  kegiatan: varchar("kegiatan", { length: 255 }).notNull(),
  tanggal: date("tanggal").notNull(),
  status: varchar("status", { length: 100 }), 
  tags: varchar("tags", { length: 100 }), 
  petugasId: varchar("petugas_id", { length: 255 }), 

  // Bakal nyimpen array [{produk: "Trichoderma", dosis: "10gr"}...]
  logProduk: jsonb("log_produk"), 
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// =====================================================================
// 🐛 2. TABEL STAGING INSPEKSI (The Bug Tracker)
// =====================================================================
export const stagingInspeksiTable = pgTable("staging_inspeksi", {
  id: uuid("id").defaultRandom().primaryKey(),
  kegiatan: varchar("kegiatan", { length: 255 }).notNull(),
  tanggal: date("tanggal").notNull(),
  areaId: varchar("area_id", { length: 255 }).notNull(), // 🌟 SINKRON dengan Perawatan
  
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
