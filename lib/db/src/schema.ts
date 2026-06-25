export * from "./schema/notionConnections";
export * from "./schema/oauthStates";
export * from "./schema/fieldMappings";
export * from "./schema/stagingData";

import { pgTable, uuid, text, timestamp, integer, doublePrecision, jsonb, date } from "drizzle-orm/pg-core";

// ==========================================
// 1. MASTER TABLES (Taruh di atas biar bisa di-refer tabel lain)
// ==========================================

export const areasTable = pgTable("areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pekerjaTable = pgTable("pekerja", {
  id: uuid("id").defaultRandom().primaryKey(),
  nama: text("nama").notNull(),
  kontak: text("kontak"), 
  role: text("role").default("Karyawan Kebun").notNull(), 
  jenisTenagaKerja: text("jenis_tenaga_kerja").default("Internal").notNull(), 
  status: text("status").default("Aktif").notNull(), 
  mulaiBekerja: date("mulai_bekerja"), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const kategoriTable = pgTable("kategori_master", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  module: text("module").notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const kendalaMasterTable = pgTable("kendala_master", {
  id: uuid("id").defaultRandom().primaryKey(),
  nama: text("nama").notNull().unique(), 
  jenis: text("jenis").notNull(),        
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const siklusTanamTable = pgTable("siklus_tanam", {
  id: uuid("id").defaultRandom().primaryKey(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  namaSiklus: text("nama_siklus").notNull(), // Cth: "Cabai Rawit Kloter A"
  tanggalPindahTanam: date("tanggal_pindah_tanam").notNull(),
  status: text("status").default("Aktif").notNull(), // "Aktif" atau "Selesai/Panen"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 2. TRANSACTIONAL / CORE TABLES
// ==========================================

export const perawatanTable = pgTable("perawatan", {
  id: uuid("id").defaultRandom().primaryKey(),
  kegiatan: text("kegiatan").notNull(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  waktuMulai: timestamp("waktu_mulai").notNull(),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  tagCategoryId: uuid("tag_category_id").references(() => kategoriTable.id, { onDelete: "cascade" }), 
  status: text("status").default("Belum dikerjakan").notNull(),
  pekerjaIds: jsonb("pekerja_ids").default([]).notNull(),
  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const perawatanProdukTable = pgTable("perawatan_produk", {
  id: uuid("id").defaultRandom().primaryKey(),
  perawatanId: uuid("perawatan_id").references(() => perawatanTable.id, { onDelete: "cascade" }).notNull(),
  namaProduk: text("nama_produk").notNull(),
  dosis: text("dosis").notNull(),
});

export const inspeksiTable = pgTable("inspeksi", {
  id: uuid("id").defaultRandom().primaryKey(),
  kegiatan: text("kegiatan").notNull(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  waktuMulai: timestamp("waktu_mulai").notNull(),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  phTanah: doublePrecision("ph_tanah"),
  tingkatSerangan: doublePrecision("tingkat_serangan"),
  radius: doublePrecision("radius"),
  status: text("status").default("Baru ditemukan").notNull(),
  pekerjaIds: jsonb("pekerja_ids").default([]).notNull(),
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inspeksiTemuanTable = pgTable("inspeksi_temuan", {
  id: uuid("id").defaultRandom().primaryKey(),
  inspeksiId: uuid("inspeksi_id").references(() => inspeksiTable.id, { onDelete: "cascade" }).notNull(),
  // Sekarang aman diakses karena kendalaMasterTable udah dideklarasikan di atas 🚀
  kendalaMasterId: uuid("kendala_master_id").references(() => kendalaMasterTable.id, { onDelete: "restrict" }).notNull(),
  catatanKhusus: text("catatan_khusus"),
});

export const operasionalTable = pgTable("operasional", {
  id: uuid("id").defaultRandom().primaryKey(),
  namaPekerjaan: text("nama_pekerjaan").notNull(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  waktuMulai: timestamp("waktu_mulai").notNull(),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  kategoriId: uuid("kategori_id").references(() => kategoriTable.id, { onDelete: "cascade" }), 
  prioritas: text("prioritas").default("Medium").notNull(),
  jenisTenagaKerja: text("jenis_tenaga_kerja").notNull(),
  pekerjaIds: jsonb("pekerja_ids").default([]).notNull(),
  status: text("status").default("Belum dikerjakan").notNull(),
  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
