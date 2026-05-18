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
  areaId: varchar("area_id", { length: 255 }).notNull(), // Penanda untuk Sync Engine (Misal: "Blok-A")
  kegiatan: varchar("kegiatan", { length: 255 }).notNull(),
  tanggal: date("tanggal").notNull(),
  status: varchar("status", { length: 100 }), // Rencana / Proses / Selesai
  tags: varchar("tags", { length: 100 }), // Kategori: Pengocoran, Penyemprotan, dll
  petugasId: varchar("petugas_id", { length: 255 }), // ID Pekerja
  pindahTanamId: varchar("pindah_tanam_id", { length: 255 }), // Anchor untuk perhitungan HST

  // 🪄 INI DIA SI KOLOM SAKTI:
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
  pindahTanamId: varchar("pindah_tanam_id", { length: 255 }).notNull(), // Lokasi Area
  
  // JSONB dipakai untuk Multi-select array (bisa nampung >1 hama/penyakit sekaligus)
  hama: jsonb("hama"), 
  penyakit: jsonb("penyakit"), 
  
  // Tipe 'real' (float/desimal) untuk chart dan indikator vital
  tingkatSerangan: real("tingkat_serangan"), // 0.00 sampai 1.00 (persentase)
  radius: real("radius"), // Luasan m2
  phTanah: real("ph_tanah"), // Asam Basa Tanah, misal: 6.5
  
  status: varchar("status", { length: 100 }), // Baru ditemukan / Sedang ditangani
  petugasId: varchar("petugas_id", { length: 255 }), // Inspector
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

