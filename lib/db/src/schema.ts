// lib/db/src/schema.ts
export * from "./schema/notionConnections";
export * from "./schema/oauthStates";
export * from "./schema/fieldMappings";
export * from "./schema/stagingData";

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  doublePrecision,
  numeric,
  jsonb,
  date,
  boolean,
  check,
  uniqueIndex,
  index,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm"; // dipakai di check() dan uniqueIndex()

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
  clerkUserId: text("clerk_user_id").unique(), // 🚀 Jembatan emas ke akun login Clerk
  nama: text("nama").notNull(),
  kontak: text("kontak"),
  roleId: uuid("role_id").references(() => pekerjaAtributMasterTable.id, { onDelete: "set null" }),
  jenisTenagaKerjaId: uuid("jenis_tenaga_kerja_id").references(() => pekerjaAtributMasterTable.id, { onDelete: "set null" }),
  statusId: uuid("status_id").references(() => pekerjaAtributMasterTable.id, { onDelete: "set null" }),
  mulaiBekerja: date("mulai_bekerja"),
  deleted: boolean("deleted").default(false).notNull(),
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
  namaSiklus: text("nama_siklus").notNull(),
  tanggalPindahTanam: date("tanggal_pindah_tanam").notNull(),
  status: text("status").default("Aktif").notNull(),
  modalAwal: integer("modal_awal").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => pekerjaTable.id, { onDelete: "set null" }), // 🚀 Audit Trail
  updatedBy: uuid("updated_by").references(() => pekerjaTable.id, { onDelete: "set null" }), // 🚀 Audit Trail
  updatedAt: timestamp("updated_at"), // 🚀 Audit Trail
},
(table) => [
  check("modal_awal_non_negative", sql`${table.modalAwal} >= 0`),
  check("status_siklus_valid", sql`${table.status} IN ('Aktif', 'Selesai', 'Ditutup')`),
]);

// Produk master: stok sekarang tetap disimpan (cache) tetapi gunakan atomic update via trigger/transaction
export const produkMasterTable = pgTable("produk_master", {
  id: uuid("id").defaultRandom().primaryKey(),
  nama: text("nama").notNull(),
  jenis: text("jenis").notNull(),

  // Nutrient fields tetap doublePrecision (atau numeric jika perlu)
  n: doublePrecision("n").default(0),
  p: doublePrecision("p").default(0),
  k: doublePrecision("k").default(0),
  ca: doublePrecision("ca").default(0),
  mg: doublePrecision("mg").default(0),

  bentuk: text("bentuk").default("Solid").notNull(),

  satuanDasar: text("satuan_dasar").default("gram").notNull(),
  satuanTampilan: text("satuan_tampilan").default("kg").notNull(),

  // Harga disimpan sebagai integer (satuan terkecil, mis. cents)
  hargaPerSatuanDasar: integer("harga_per_satuan_dasar").default(0).notNull(),
  // Stok cache: gunakan numeric untuk presisi non-floating
  stokSaatIni: numeric("stok_saat_ini", { precision: 18, scale: 3 }).default(0).notNull(),

  isActive: boolean("is_active").default(true).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
},
(table) => [
  check("stok_non_negative", sql`${table.stokSaatIni} >= 0`),
  check("harga_non_negative", sql`${table.hargaPerSatuanDasar} >= 0`),
  uniqueIndex("produk_master_nama_lower_unique").on(sql`lower(${table.nama})`),
]);

// ==========================================
// 2. TRANSACTIONAL / CORE TABLES (OPERASIONAL)
// ==========================================

// Note: pekerjaIds JSONB REMOVED and replaced by junction table perawatan_pekerja below.
export const perawatanTable = pgTable("perawatan", {
  id: uuid("id").defaultRandom().primaryKey(),
  kegiatan: text("kegiatan").notNull(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  siklusId: uuid("siklus_id").references(() => siklusTanamTable.id, { onDelete: "set null" }), // boleh null jika bukan scoped

  waktuMulai: timestamp("waktu_mulai").notNull(),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  tagCategoryId: uuid("tag_category_id").references(() => kategoriTable.id, { onDelete: "restrict" }),
  status: text("status").default("Belum dikerjakan").notNull(),
  // pekerjaIds removed: use perawatan_pekerja for assignment history/query
  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => pekerjaTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at"),
  updatedBy: uuid("updated_by").references(() => pekerjaTable.id, { onDelete: "set null" }),
},
(table) => [
  index("perawatan_area_idx").on(table.areaId),
  index("perawatan_siklus_idx").on(table.siklusId),
]);

// Junction table: perawatan <-> pekerja (normalisasi)
// Menyimpan peran/assignment detail dan memungkinkan query worker-centric
export const perawatanPekerjaTable = pgTable("perawatan_pekerja", {
  id: uuid("id").defaultRandom().primaryKey(),
  perawatanId: uuid("perawatan_id").references(() => perawatanTable.id, { onDelete: "cascade" }).notNull(),
  pekerjaId: uuid("pekerja_id").references(() => pekerjaTable.id, { onDelete: "cascade" }).notNull(),
  peran: varchar("peran", { length: 100 }),
  waktuMulai: timestamp("waktu_mulai"),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
},
(table) => [
  uniqueIndex("perawatan_pekerja_unique").on(table.perawatanId, table.pekerjaId),
  index("perawatan_pekerja_pekerja_idx").on(table.pekerjaId),
  index("perawatan_pekerja_perawatan_idx").on(table.perawatanId),
]);

export const perawatanProdukTable = pgTable("perawatan_produk", {
  id: uuid("id").defaultRandom().primaryKey(),
  perawatanId: uuid("perawatan_id").references(() => perawatanTable.id, { onDelete: "restrict" }).notNull(),
  produkId: uuid("produk_id").references(() => produkMasterTable.id, { onDelete: "restrict" }).notNull(),

  // kuantitas pakai: gunakan numeric untuk presisi
  kuantitasPemakaian: numeric("kuantitas_pemakaian", { precision: 18, scale: 3 }).notNull(),
  hargaTercatatPerSatuan: integer("harga_tercatat_per_satuan").notNull(),
  totalBiaya: integer("total_biaya").notNull(), // dihitung di app code / transaction

  urutan: integer("urutan").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
},
(table) => [
  index("perawatan_produk_perawatan_idx").on(table.perawatanId),
  index("perawatan_produk_produk_idx").on(table.produkId),
  check("kuantitas_pemakaian_non_negative", sql`${table.kuantitasPemakaian} >= 0`),
]);

export const inspeksiTable = pgTable("inspeksi", {
  id: uuid("id").defaultRandom().primaryKey(),
  kegiatan: text("kegiatan").notNull(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  siklusId: uuid("siklus_id").references(() => siklusTanamTable.id, { onDelete: "set null" }),

  waktuMulai: timestamp("waktu_mulai").notNull(),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  phTanah: doublePrecision("ph_tanah"),
  tingkatSerangan: doublePrecision("tingkat_serangan"),
  radius: doublePrecision("radius"),
  status: text("status").default("Baru ditemukan").notNull(),
  // pekerjaIds removed -> use inspeksi_pekerja
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => pekerjaTable.id, { onDelete: "set null" }),
},
(table) => [
  index("inspeksi_area_idx").on(table.areaId),
  index("inspeksi_siklus_idx").on(table.siklusId),
]);

export const inspeksiTemuanTable = pgTable("inspeksi_temuan", {
  id: uuid("id").defaultRandom().primaryKey(),
  inspeksiId: uuid("inspeksi_id").references(() => inspeksiTable.id, { onDelete: "cascade" }).notNull(),
  kendalaMasterId: uuid("kendala_master_id").references(() => kendalaMasterTable.id, { onDelete: "restrict" }).notNull(),
  catatanKhusus: text("catatan_khusus"),
},
(table) => [
  index("inspeksi_temuan_inspeksi_idx").on(table.inspeksiId),
]);

export const operasionalTable = pgTable("operasional", {
  id: uuid("id").defaultRandom().primaryKey(),
  namaPekerjaan: text("nama_pekerjaan").notNull(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  siklusId: uuid("siklus_id").references(() => siklusTanamTable.id, { onDelete: "set null" }),

  waktuMulai: timestamp("waktu_mulai").notNull(),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  kategoriId: uuid("kategori_id").references(() => kategoriTable.id, { onDelete: "restrict" }),
  prioritas: text("prioritas").default("Medium").notNull(),
  jenisTenagaKerjaId: uuid("jenis_tenaga_kerja_id").references(() => pekerjaAtributMasterTable.id, { onDelete: "set null" }),
  // pekerjaIds removed -> use operasional_pekerja
  status: text("status").default("Belum dikerjakan").notNull(),
  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => pekerjaTable.id, { onDelete: "set null" }),
},
(table) => [
  index("operasional_area_idx").on(table.areaId),
  index("operasional_siklus_idx").on(table.siklusId),
]);

// Junction tables for inspeksi & operasional
export const inspeksiPekerjaTable = pgTable("inspeksi_pekerja", {
  id: uuid("id").defaultRandom().primaryKey(),
  inspeksiId: uuid("inspeksi_id").references(() => inspeksiTable.id, { onDelete: "cascade" }).notNull(),
  pekerjaId: uuid("pekerja_id").references(() => pekerjaTable.id, { onDelete: "cascade" }).notNull(),
  peran: varchar("peran", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
},
(table) => [
  uniqueIndex("inspeksi_pekerja_unique").on(table.inspeksiId, table.pekerjaId),
  index("inspeksi_pekerja_pekerja_idx").on(table.pekerjaId),
]);

export const operasionalPekerjaTable = pgTable("operasional_pekerja", {
  id: uuid("id").defaultRandom().primaryKey(),
  operasionalId: uuid("operasional_id").references(() => operasionalTable.id, { onDelete: "cascade" }).notNull(),
  pekerjaId: uuid("pekerja_id").references(() => pekerjaTable.id, { onDelete: "cascade" }).notNull(),
  peran: varchar("peran", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
},
(table) => [
  uniqueIndex("operasional_pekerja_unique").on(table.operasionalId, table.pekerjaId),
  index("operasional_pekerja_pekerja_idx").on(table.pekerjaId),
]);

// ==========================================
// 3. FINANCE & ACCOUNTING TABLES
// ==========================================

export const kategoriKeuanganTable = pgTable("kategori_keuangan", {
  id: uuid("id").defaultRandom().primaryKey(),
  nama: varchar("nama", { length: 100 }).notNull(),
  tipe: varchar("tipe", { length: 50 }).notNull(), // 'pengeluaran' atau 'pendapatan'
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => pekerjaTable.id, { onDelete: "set null" }),
},
(table) => [
  check("tipe_valid", sql`${table.tipe} IN ('pengeluaran', 'pendapatan')`),
  uniqueIndex("kategori_keuangan_nama_lower_unique").on(sql`lower(${table.nama})`),
]);

export const pengeluaranTable = pgTable("pengeluaran", {
  id: uuid("id").defaultRandom().primaryKey(),
  siklusId: uuid("siklus_id").references(() => siklusTanamTable.id, { onDelete: "set null" }),
  kategoriId: uuid("kategori_id").references(() => kategoriKeuanganTable.id, { onDelete: "set null" }),
  produkId: uuid("produk_id").references(() => produkMasterTable.id, { onDelete: "set null" }),
  pekerjaId: uuid("pekerja_id").references(() => pekerjaTable.id, { onDelete: "set null" }),

  tanggal: timestamp("tanggal").defaultNow().notNull(),
  namaItem: text("nama_item").notNull(),

  satuanKerja: text("satuan_kerja").default("lumpsum").notNull(),
  kuantitas: numeric("kuantitas", { precision: 18, scale: 3 }).notNull(),
  hargaSatuan: integer("harga_satuan").notNull(), // money in cents
  totalBiaya: integer("total_biaya").notNull(),

  isPembelianStok: boolean("is_pembelian_stok").default(false).notNull(),

  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => pekerjaTable.id, { onDelete: "set null" }),
},
(table) => [
  check("kuantitas_non_negative", sql`${table.kuantitas} >= 0`),
  check("harga_satuan_non_negative", sql`${table.hargaSatuan} >= 0`),
  check("satuan_kerja_valid", sql`${table.satuanKerja} IN ('lumpsum', 'jam', 'hari', 'unit', 'kg', 'liter', 'botol')`),
  check("total_biaya_konsisten", sql`ABS(${table.totalBiaya} - ROUND(${table.kuantitas} * ${table.hargaSatuan})) <= 1`),
  check("pembelian_stok_konsisten", sql`(${table.isPembelianStok} = true AND ${table.produkId} IS NOT NULL) OR (${table.isPembelianStok} = false AND ${table.produkId} IS NULL)`),
  index("pengeluaran_siklus_idx").on(table.siklusId),
  index("pengeluaran_tanggal_idx").on(table.tanggal),
]);

export const panenTable = pgTable("panen", {
  id: uuid("id").defaultRandom().primaryKey(),
  siklusId: uuid("siklus_id").references(() => siklusTanamTable.id, { onDelete: "set null" }), 

  tanggal: timestamp("tanggal").defaultNow().notNull(),
  kegiatan: text("kegiatan").notNull(),

  kuantitasKg: numeric("kuantitas_kg", { precision: 18, scale: 3 }).notNull(),
  hargaJualPerKg: integer("harga_jual_per_kg").notNull(),
  totalPendapatan: integer("total_pendapatan").notNull(),

  kualitas: varchar("kualitas", { length: 50 }),
  channelPenjualan: varchar("channel_penjualan", { length: 100 }),
  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => pekerjaTable.id, { onDelete: "set null" }),
},
(table) => [
  check("kuantitas_kg_non_negative", sql`${table.kuantitasKg} >= 0`),
  check("harga_jual_non_negative", sql`${table.hargaJualPerKg} >= 0`),
  check("total_pendapatan_konsisten", sql`ABS(${table.totalPendapatan} - ROUND(${table.kuantitasKg} * ${table.hargaJualPerKg})) <= 1`),
  index("panen_siklus_idx").on(table.siklusId),
  index("panen_tanggal_idx").on(table.tanggal),
]);

// ==========================================
// 4. INVENTORY LOGS (STOCK JOURNAL)
// ==========================================

export const stockMovementTable = pgTable("stock_movement", {
  id: uuid("id").defaultRandom().primaryKey(),
  produkId: uuid("produk_id").references(() => produkMasterTable.id, { onDelete: "restrict" }).notNull(),

  tipe: text("tipe").notNull(), // 'in','out','adjustment','transfer', dll.
  delta: numeric("delta", { precision: 18, scale: 3 }).notNull(), // perubahan stok
  stokSebelum: numeric("stok_sebelum", { precision: 18, scale: 3 }).notNull(),
  stokSesudah: numeric("stok_sesudah", { precision: 18, scale: 3 }).notNull(),

  perawatanProdukId: uuid("perawatan_produk_id").references(() => perawatanProdukTable.id, { onDelete: "set null" }),
  pengeluaranId: uuid("pengeluaran_id").references(() => pengeluaranTable.id, { onDelete: "set null" }),

  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
},
(table) => [
  check("stock_movement_source_exclusive", sql`NOT (${table.perawatanProdukId} IS NOT NULL AND ${table.pengeluaranId} IS NOT NULL)`),
  index("stock_movement_produk_idx").on(table.produkId),
  index("stock_movement_created_idx").on(table.createdAt),
]);

/*
  IMPORTANT:
  - stock_movement is the audit/source-of-truth (insert-only journal).
  - produk_master.stokSaatIni is a cache and MUST be updated atomically together with inserting stock_movement.
    Implement updates in application-level transactions:
      BEGIN;
        SELECT stok_saat_ini FROM produk_master WHERE id = <produk_id> FOR UPDATE;
        INSERT INTO stock_movement (...) VALUES (..., stok_before, stok_after, ...);
        UPDATE produk_master SET stok_saat_ini = stok_after WHERE id = <produk_id>;
      COMMIT;
  - Alternatively, implement a DB trigger function to update produk_master.stokSaatIni after insert on stock_movement.
    Example trigger (SQL) below (tweak naming/permissions as needed):

    -- EXAMPLE TRIGGER (execute separately as migration SQL)
    CREATE OR REPLACE FUNCTION fn_update_product_stock() RETURNS trigger AS $$
    BEGIN
      -- assume NEW.produk_id, NEW.stokSesudah are provided
      UPDATE produk_master SET stok_saat_ini = NEW.stok_sesudah WHERE id = NEW.produk_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_stock_movement_after_insert
      AFTER INSERT ON stock_movement
      FOR EACH ROW
      EXECUTE FUNCTION fn_update_product_stock();

    Note: prefer transactional application pattern if you need to handle business logic / validation before updating product cache.
*/

/*
  Partitioning & scaling notes (apply as migration/DB-admin step when needed):
  - Consider PARTITION BY RANGE (created_at) for tables: stock_movement, pengeluaran, panen, perawatan.
  - Or PARTITION BY LIST/HASH on siklus_id if most queries scoped by siklus.
  - Add composite indexes for frequent query patterns, e.g. (siklus_id, tanggal), (produk_id, created_at).
*/

// End of revised schema