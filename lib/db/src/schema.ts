export * from "./schema/notionConnections";
export * from "./schema/oauthStates";
export * from "./schema/fieldMappings";
export * from "./schema/stagingData";

import { 
  pgTable, uuid, text, timestamp, integer, doublePrecision, 
  jsonb, date, boolean, check, uniqueIndex 
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm"; // WAJIB, dipakai di check() dan uniqueIndex()

// ==========================================
// 1. MASTER TABLES 
// ==========================================

export const areasTable = pgTable("areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pekerjaAtributMasterTable = pgTable("pekerja_atribut_master", {
  id: uuid("id").defaultRandom().primaryKey(),
  namaOption: text("nama_option").notNull(), 
  jenisAtribut: text("jenis_atribut").notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pekerjaTable = pgTable("pekerja", {
  id: uuid("id").defaultRandom().primaryKey(),
  nama: text("nama").notNull(),
  kontak: text("kontak"), 
  roleId: uuid("role_id").references(() => pekerjaAtributMasterTable.id, { onDelete: "set null" }), 
  jenisTenagaKerjaId: uuid("jenis_tenaga_kerja_id").references(() => pekerjaAtributMasterTable.id, { onDelete: "set null" }), 
  statusId: uuid("status_id").references(() => pekerjaAtributMasterTable.id, { onDelete: "set null" }), 
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

// 💡 BENTUK SIKLUS TANAM TETAP DI SINI SEBAGAI ACUAN UTAMA FORIEGN KEY
export const siklusTanamTable = pgTable("siklus_tanam", {
  id: uuid("id").defaultRandom().primaryKey(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  namaSiklus: text("nama_siklus").notNull(), 
  tanggalPindahTanam: date("tanggal_pindah_tanam").notNull(),
  status: text("status").default("Aktif").notNull(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const produkMasterTable = pgTable(
  "produk_master",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nama: text("nama").notNull(), // TANPA .unique() bawaan — diganti uniqueIndex di bawah
    jenis: text("jenis").notNull(),

    n: doublePrecision("n").default(0),
    p: doublePrecision("p").default(0),
    k: doublePrecision("k").default(0),
    ca: doublePrecision("ca").default(0),
    mg: doublePrecision("mg").default(0),
    bentuk: text("bentuk").default("Solid").notNull(),

    satuanDasar: text("satuan_dasar").default("gram").notNull(),
    satuanTampilan: text("satuan_tampilan").default("kg").notNull(),

    hargaPerSatuanDasar: integer("harga_per_satuan_dasar").default(0).notNull(),
    stokSaatIni: doublePrecision("stok_saat_ini").default(0).notNull(),

    isActive: boolean("is_active").default(true).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    check("stok_non_negative", sql`${table.stokSaatIni} >= 0`),
    check("harga_non_negative", sql`${table.hargaPerSatuanDasar} >= 0`),
    uniqueIndex("produk_master_nama_lower_unique").on(sql`lower(${table.nama})`),
  ]
);

// ==========================================
// 2. TRANSACTIONAL / CORE TABLES (SUNTIK SIKLUS ID 🚀)
// ==========================================

export const perawatanTable = pgTable("perawatan", {
  id: uuid("id").defaultRandom().primaryKey(),
  kegiatan: text("kegiatan").notNull(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  
  // 🚀 SUNTIKAN BARU: Referensi langsung ke ID tanaman musim berjalan
  siklusId: uuid("siklus_id").references(() => siklusTanamTable.id, { onDelete: "set null" }),
  
  waktuMulai: timestamp("waktu_mulai").notNull(),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  tagCategoryId: uuid("tag_category_id").references(() => kategoriTable.id, { onDelete: "restrict" }),
  status: text("status").default("Belum dikerjakan").notNull(),
  pekerjaIds: jsonb("pekerja_ids").default([]).notNull(),
  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const perawatanProdukTable = pgTable("perawatan_produk", {
  id: uuid("id").defaultRandom().primaryKey(),
  perawatanId: uuid("perawatan_id")
    .references(() => perawatanTable.id, { onDelete: "restrict" })
    .notNull(),
  produkId: uuid("produk_id")
    .references(() => produkMasterTable.id, { onDelete: "restrict" })
    .notNull(),

  kuantitasPemakaian: doublePrecision("kuantitas_pemakaian").notNull(),
  hargaTercatatPerSatuan: integer("harga_tercatat_per_satuan").notNull(),
  totalBiaya: integer("total_biaya").notNull(), // dihitung di app code, bukan generated column

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inspeksiTable = pgTable("inspeksi", {
  id: uuid("id").defaultRandom().primaryKey(),
  kegiatan: text("kegiatan").notNull(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  
  // 🚀 SUNTIKAN BARU: Referensi langsung ke ID tanaman musim berjalan
  siklusId: uuid("siklus_id").references(() => siklusTanamTable.id, { onDelete: "set null" }),
  
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
  kendalaMasterId: uuid("kendala_master_id").references(() => kendalaMasterTable.id, { onDelete: "restrict" }).notNull(),
  catatanKhusus: text("catatan_khusus"),
});

export const operasionalTable = pgTable("operasional", {
  id: uuid("id").defaultRandom().primaryKey(),
  namaPekerjaan: text("nama_pekerjaan").notNull(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  
  // 🚀 SUNTIKAN BARU: Referensi langsung ke ID tanaman musim berjalan
  siklusId: uuid("siklus_id").references(() => siklusTanamTable.id, { onDelete: "set null" }),
  
  waktuMulai: timestamp("waktu_mulai").notNull(),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  kategoriId: uuid("kategori_id").references(() => kategoriTable.id, { onDelete: "restrict" }), 
  prioritas: text("prioritas").default("Medium").notNull(),
  jenisTenagaKerjaId: uuid("jenis_tenaga_kerja_id").references(() => pekerjaAtributMasterTable.id, { onDelete: "set null" }), 
  pekerjaIds: jsonb("pekerja_ids").default([]).notNull(),
  status: text("status").default("Belum dikerjakan").notNull(),
  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockMovementTable = pgTable("stock_movement", {
  id: uuid("id").defaultRandom().primaryKey(),
  produkId: uuid("produk_id")
    .references(() => produkMasterTable.id, { onDelete: "restrict" })
    .notNull(),

  tipe: text("tipe").notNull(),
  delta: doublePrecision("delta").notNull(),
  stokSebelum: doublePrecision("stok_sebelum").notNull(),
  stokSesudah: doublePrecision("stok_sesudah").notNull(),

  perawatanProdukId: uuid("perawatan_produk_id").references(() => perawatanProdukTable.id, { onDelete: "set null" }),
  catatan: text("catatan"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

