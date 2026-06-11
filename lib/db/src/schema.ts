import { pgTable, uuid, text, timestamp, integer, doublePrecision, jsonb } from "drizzle-orm/pg-core";

export const areasTable = pgTable("areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const perawatanTable = pgTable("perawatan", {
  id: uuid("id").defaultRandom().primaryKey(),
  kegiatan: text("kegiatan").notNull(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  waktuMulai: timestamp("waktu_mulai").notNull(),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  tagCategory: text("tag_category").notNull(),
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
  jenisKendala: text("jenis_kendala").notNull(),
  namaKendala: text("nama_kendala").notNull(),
  catatanKhusus: text("catatan_khusus"),
});

export const operasionalTable = pgTable("operasional", {
  id: uuid("id").defaultRandom().primaryKey(),
  namaPekerjaan: text("nama_pekerjaan").notNull(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  waktuMulai: timestamp("waktu_mulai").notNull(),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  kategori: text("kategori").notNull(),
  prioritas: text("prioritas").default("Medium").notNull(),
  jenisTenagaKerja: text("jenis_tenaga_kerja").notNull(),
  pekerjaIds: jsonb("pekerja_ids").default([]).notNull(),
  status: text("status").default("Belum dikerjakan").notNull(),
  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
