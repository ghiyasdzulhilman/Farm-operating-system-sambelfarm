// lib/db/src/schema.ts

import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  doublePrecision,
  numeric,
  date,
  boolean,
  check,
  uniqueIndex,
  index,
  varchar,
  foreignKey,
} from "drizzle-orm/pg-core";

// ==========================================
// 0. TENANT TABLE (MULTI-TENANT FOUNDATION)
// ==========================================

export const organisasiTable = pgTable("organisasi", {
  id: uuid("id").defaultRandom().primaryKey(),
  nama: text("nama").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 1. MASTER TABLES 
// ==========================================

export const areasTable = pgTable("areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisasiId: uuid("organisasi_id").references(() => organisasiTable.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("areas_organisasi_idx").on(table.organisasiId),
  uniqueIndex("areas_id_org_unique").on(table.id, table.organisasiId),
]);

export const pekerjaAtributMasterTable = pgTable("pekerja_atribut_master", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisasiId: uuid("organisasi_id").references(() => organisasiTable.id, { onDelete: "cascade" }).notNull(),
  namaOption: text("nama_option").notNull(),
  jenisAtribut: text("jenis_atribut").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("pekerja_atribut_organisasi_idx").on(table.organisasiId),
  // Unik per organisasi untuk kombinasi opsi dan jenis atribut
  uniqueIndex("pekerja_atribut_nama_jenis_org_unique").on(table.namaOption, table.jenisAtribut, table.organisasiId),
]);

export const pekerjaTable = pgTable("pekerja", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisasiId: uuid("organisasi_id").references(() => organisasiTable.id, { onDelete: "cascade" }).notNull(),
  clerkUserId: text("clerk_user_id").unique(), // Tetap global unique: 1 user Clerk = 1 organisasi di v1
  nama: text("nama").notNull(),
  kontak: text("kontak"),
  roleId: uuid("role_id").references(() => pekerjaAtributMasterTable.id, { onDelete: "set null" }),
  jenisTenagaKerjaId: uuid("jenis_tenaga_kerja_id").references(() => pekerjaAtributMasterTable.id, { onDelete: "set null" }),
  statusId: uuid("status_id").references(() => pekerjaAtributMasterTable.id, { onDelete: "set null" }),
  mulaiBekerja: date("mulai_bekerja"),
  deleted: boolean("deleted").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("pekerja_organisasi_idx").on(table.organisasiId),
  uniqueIndex("pekerja_id_org_unique").on(table.id, table.organisasiId),
]);

export const kategoriTable = pgTable("kategori_master", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisasiId: uuid("organisasi_id").references(() => organisasiTable.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  module: text("module").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("kategori_organisasi_idx").on(table.organisasiId),
]);

export const kendalaMasterTable = pgTable("kendala_master", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisasiId: uuid("organisasi_id").references(() => organisasiTable.id, { onDelete: "cascade" }).notNull(),
  nama: text("nama").notNull(), // Hapus .unique() global
  jenis: text("jenis").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("kendala_organisasi_idx").on(table.organisasiId),
  // Nama kendala unik PER organisasi
  uniqueIndex("kendala_nama_org_unique").on(table.nama, table.organisasiId),
]);

export const siklusTanamTable = pgTable("siklus_tanam", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisasiId: uuid("organisasi_id").references(() => organisasiTable.id, { onDelete: "cascade" }).notNull(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  namaSiklus: text("nama_siklus").notNull(),
  tanggalPindahTanam: date("tanggal_pindah_tanam").notNull(),
  status: text("status").default("Aktif").notNull(),
  modalAwal: integer("modal_awal").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => pekerjaTable.id, { onDelete: "set null" }),
  updatedBy: uuid("updated_by").references(() => pekerjaTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at"),
}, (table) => [
  index("siklus_organisasi_idx").on(table.organisasiId),
  check("modal_awal_non_negative", sql`${table.modalAwal} >= 0`),
  check("status_siklus_valid", sql`${table.status} IN ('Aktif', 'Selesai', 'Ditutup')`),
  uniqueIndex("siklus_tanam_id_org_unique").on(table.id, table.organisasiId),
]);

export const produkMasterTable = pgTable("produk_master", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisasiId: uuid("organisasi_id").references(() => organisasiTable.id, { onDelete: "cascade" }).notNull(),
  nama: text("nama").notNull(),
  jenis: text("jenis").notNull(),

  n: doublePrecision("n").default(0),
  p: doublePrecision("p").default(0),
  k: doublePrecision("k").default(0),
  ca: doublePrecision("ca").default(0),
  mg: doublePrecision("mg").default(0),

  bentuk: text("bentuk").default("Solid").notNull(),

  satuanDasar: text("satuan_dasar").default("gram").notNull(),
  satuanTampilan: text("satuan_tampilan").default("kg").notNull(),

  hargaPerSatuanDasar: numeric("harga_per_satuan_dasar", { precision: 18, scale: 3 }).default("0").notNull(),
  stokSaatIni: numeric("stok_saat_ini", { precision: 18, scale: 3 }).default("0").notNull(),

  isActive: boolean("is_active").default(true).notNull(),
  deleted: boolean("deleted").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("produk_organisasi_idx").on(table.organisasiId),
  check("stok_non_negative", sql`${table.stokSaatIni} >= 0`),
  check("harga_non_negative", sql`${table.hargaPerSatuanDasar} >= 0`),
  // Nama produk (case-insensitive) unik PER organisasi
  uniqueIndex("produk_master_nama_org_lower_unique").on(sql`lower(${table.nama})`, table.organisasiId),
  uniqueIndex("produk_master_id_org_unique").on(table.id, table.organisasiId),
]);

// ==========================================
// 2. TRANSACTIONAL / CORE TABLES (OPERASIONAL)
// ==========================================

export const perawatanTable = pgTable("perawatan", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisasiId: uuid("organisasi_id").references(() => organisasiTable.id, { onDelete: "cascade" }).notNull(),
  kegiatan: text("kegiatan").notNull(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  siklusId: uuid("siklus_id").references(() => siklusTanamTable.id, { onDelete: "set null" }), 

  waktuMulai: timestamp("waktu_mulai").notNull(),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  tagCategoryId: uuid("tag_category_id").references(() => kategoriTable.id, { onDelete: "restrict" }),
  status: text("status").default("Belum dikerjakan").notNull(),
  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => pekerjaTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at"),
  updatedBy: uuid("updated_by").references(() => pekerjaTable.id, { onDelete: "set null" }),
}, (table) => [
  index("perawatan_organisasi_idx").on(table.organisasiId),
  index("perawatan_area_idx").on(table.areaId),
  index("perawatan_siklus_idx").on(table.siklusId),
]);

// Junction table: Tidak butuh organisasiId secara langsung (otomatis aman via FK)
export const perawatanPekerjaTable = pgTable("perawatan_pekerja", {
  id: uuid("id").defaultRandom().primaryKey(),
  perawatanId: uuid("perawatan_id").references(() => perawatanTable.id, { onDelete: "cascade" }).notNull(),
  pekerjaId: uuid("pekerja_id").references(() => pekerjaTable.id, { onDelete: "cascade" }).notNull(),
  peran: varchar("peran", { length: 100 }),
  waktuMulai: timestamp("waktu_mulai"),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("perawatan_pekerja_unique").on(table.perawatanId, table.pekerjaId),
  index("perawatan_pekerja_pekerja_idx").on(table.pekerjaId),
  index("perawatan_pekerja_perawatan_idx").on(table.perawatanId),
]);

// Junction table
export const perawatanProdukTable = pgTable("perawatan_produk", {
  id: uuid("id").defaultRandom().primaryKey(),
  perawatanId: uuid("perawatan_id").references(() => perawatanTable.id, { onDelete: "restrict" }).notNull(),
  produkId: uuid("produk_id").references(() => produkMasterTable.id, { onDelete: "restrict" }).notNull(),
  kuantitasPemakaian: numeric("kuantitas_pemakaian", { precision: 18, scale: 3 }).notNull(),
  hargaTercatatPerSatuan: numeric("harga_tercatat_per_satuan", { precision: 18, scale: 3 }).notNull(),
  totalBiaya: integer("total_biaya").notNull(),
  urutan: integer("urutan").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("perawatan_produk_perawatan_idx").on(table.perawatanId),
  index("perawatan_produk_produk_idx").on(table.produkId),
  check("kuantitas_pemakaian_non_negative", sql`${table.kuantitasPemakaian} >= 0`),
]);

export const inspeksiTable = pgTable("inspeksi", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisasiId: uuid("organisasi_id").references(() => organisasiTable.id, { onDelete: "cascade" }).notNull(),
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
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => pekerjaTable.id, { onDelete: "set null" }),
}, (table) => [
  index("inspeksi_organisasi_idx").on(table.organisasiId),
  index("inspeksi_area_idx").on(table.areaId),
  index("inspeksi_siklus_idx").on(table.siklusId),
]);

// Junction table
export const inspeksiTemuanTable = pgTable("inspeksi_temuan", {
  id: uuid("id").defaultRandom().primaryKey(),
  inspeksiId: uuid("inspeksi_id").references(() => inspeksiTable.id, { onDelete: "cascade" }).notNull(),
  kendalaMasterId: uuid("kendala_master_id").references(() => kendalaMasterTable.id, { onDelete: "restrict" }).notNull(),
  catatanKhusus: text("catatan_khusus"),
}, (table) => [
  index("inspeksi_temuan_inspeksi_idx").on(table.inspeksiId),
]);

export const operasionalTable = pgTable("operasional", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisasiId: uuid("organisasi_id").references(() => organisasiTable.id, { onDelete: "cascade" }).notNull(),
  namaPekerjaan: text("nama_pekerjaan").notNull(),
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  siklusId: uuid("siklus_id").references(() => siklusTanamTable.id, { onDelete: "set null" }),
  waktuMulai: timestamp("waktu_mulai").notNull(),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  kategoriId: uuid("kategori_id").references(() => kategoriTable.id, { onDelete: "restrict" }),
  prioritas: text("prioritas").default("Medium").notNull(),
  jenisTenagaKerjaId: uuid("jenis_tenaga_kerja_id").references(() => pekerjaAtributMasterTable.id, { onDelete: "set null" }),
  status: text("status").default("Belum dikerjakan").notNull(),
  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => pekerjaTable.id, { onDelete: "set null" }),
}, (table) => [
  index("operasional_organisasi_idx").on(table.organisasiId),
  index("operasional_area_idx").on(table.areaId),
  index("operasional_siklus_idx").on(table.siklusId),
]);

// Junction table
export const inspeksiPekerjaTable = pgTable("inspeksi_pekerja", {
  id: uuid("id").defaultRandom().primaryKey(),
  inspeksiId: uuid("inspeksi_id").references(() => inspeksiTable.id, { onDelete: "cascade" }).notNull(),
  pekerjaId: uuid("pekerja_id").references(() => pekerjaTable.id, { onDelete: "cascade" }).notNull(),
  peran: varchar("peran", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("inspeksi_pekerja_unique").on(table.inspeksiId, table.pekerjaId),
  index("inspeksi_pekerja_pekerja_idx").on(table.pekerjaId),
]);

// Junction table
export const operasionalPekerjaTable = pgTable("operasional_pekerja", {
  id: uuid("id").defaultRandom().primaryKey(),
  operasionalId: uuid("operasional_id").references(() => operasionalTable.id, { onDelete: "cascade" }).notNull(),
  pekerjaId: uuid("pekerja_id").references(() => pekerjaTable.id, { onDelete: "cascade" }).notNull(),
  peran: varchar("peran", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("operasional_pekerja_unique").on(table.operasionalId, table.pekerjaId),
  index("operasional_pekerja_pekerja_idx").on(table.pekerjaId),
]);

// ==========================================
// 3. FINANCE & ACCOUNTING TABLES
// ==========================================

export const kategoriKeuanganTable = pgTable("kategori_keuangan", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisasiId: uuid("organisasi_id").references(() => organisasiTable.id, { onDelete: "cascade" }).notNull(),
  nama: varchar("nama", { length: 100 }).notNull(),
  tipe: varchar("tipe", { length: 50 }).notNull(), 
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: uuid("created_by").references(() => pekerjaTable.id, { onDelete: "set null" }),
}, (table) => [
  index("kat_keuangan_organisasi_idx").on(table.organisasiId),
  check("tipe_valid", sql`${table.tipe} IN ('pengeluaran', 'pendapatan')`),
  // Kategori keuangan spesifik per organisasi
  uniqueIndex("kategori_keuangan_nama_org_lower_unique").on(sql`lower(${table.nama})`, table.organisasiId),
  uniqueIndex("kategori_keuangan_id_org_unique").on(table.id, table.organisasiId),
]);

export const pengeluaranTable = pgTable("pengeluaran", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisasiId: uuid("organisasi_id").references(() => organisasiTable.id, { onDelete: "cascade" }).notNull(),
  areaId: uuid("area_id"),
  siklusId: uuid("siklus_id"),
  kategoriId: uuid("kategori_id"),
  produkId: uuid("produk_id"),
  pekerjaId: uuid("pekerja_id"),

  tanggal: timestamp("tanggal").defaultNow().notNull(),
  namaItem: text("nama_item").notNull(),

  satuanKerja: text("satuan_kerja").default("lumpsum").notNull(),
  kuantitas: numeric("kuantitas", { precision: 18, scale: 3 }).notNull(),
  hargaSatuan: numeric("harga_satuan", { precision: 18, scale: 3 }).notNull(),
  totalBiaya: integer("total_biaya").notNull(),

  isPembelianStok: boolean("is_pembelian_stok").default(false).notNull(),

  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
}, (table) => [
  index("pengeluaran_organisasi_idx").on(table.organisasiId),
  check("kuantitas_non_negative", sql`${table.kuantitas} >= 0`),
  check("harga_satuan_non_negative", sql`${table.hargaSatuan} >= 0`),
  check("satuan_kerja_valid_v2", sql`${table.satuanKerja} IN ('lumpsum', 'jam', 'hari', 'unit', 'kg', 'liter', 'botol', 'gram', 'ml')`),
  check("total_biaya_konsisten_v2", sql`ABS(${table.totalBiaya} - ROUND(${table.kuantitas} * ${table.hargaSatuan})) <= (ROUND(${table.kuantitas}) + 100)`),
  check("pembelian_stok_konsisten", sql`(${table.isPembelianStok} = true AND ${table.produkId} IS NOT NULL) OR (${table.isPembelianStok} = false AND ${table.produkId} IS NULL)`),
  index("pengeluaran_area_idx").on(table.areaId),
  index("pengeluaran_siklus_idx").on(table.siklusId),
  index("pengeluaran_tanggal_idx").on(table.tanggal),

  // Composite Foreign Keys (Memaksa referensi wajib dari organisasi yang sama)
  foreignKey({
    columns: [table.areaId, table.organisasiId],
    foreignColumns: [areasTable.id, areasTable.organisasiId],
  }).onDelete("set null"),
  foreignKey({
    columns: [table.siklusId, table.organisasiId],
    foreignColumns: [siklusTanamTable.id, siklusTanamTable.organisasiId],
  }).onDelete("set null"),
  foreignKey({
    columns: [table.kategoriId, table.organisasiId],
    foreignColumns: [kategoriKeuanganTable.id, kategoriKeuanganTable.organisasiId],
  }).onDelete("set null"),
  foreignKey({
    columns: [table.produkId, table.organisasiId],
    foreignColumns: [produkMasterTable.id, produkMasterTable.organisasiId],
  }).onDelete("set null"),
  foreignKey({
    columns: [table.pekerjaId, table.organisasiId],
    foreignColumns: [pekerjaTable.id, pekerjaTable.organisasiId],
  }).onDelete("set null"),
  foreignKey({
    columns: [table.createdBy, table.organisasiId],
    foreignColumns: [pekerjaTable.id, pekerjaTable.organisasiId],
  }).onDelete("set null"),
]);

export const panenTable = pgTable("panen", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisasiId: uuid("organisasi_id").references(() => organisasiTable.id, { onDelete: "cascade" }).notNull(),
  areaId: uuid("area_id"),
  siklusId: uuid("siklus_id"), 

  tanggal: timestamp("tanggal").defaultNow().notNull(),
  kegiatan: text("kegiatan").notNull(),

  kuantitasKg: numeric("kuantitas_kg", { precision: 18, scale: 3 }).notNull(),
  hargaJualPerKg: integer("harga_jual_per_kg").notNull(),
  totalPendapatan: integer("total_pendapatan").notNull(),
  kualitas: varchar("kualitas", { length: 50 }),
  catatan: text("catatan"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
}, (table) => [
  index("panen_organisasi_idx").on(table.organisasiId),
  check("kuantitas_kg_non_negative", sql`${table.kuantitasKg} >= 0`),
  check("harga_jual_non_negative", sql`${table.hargaJualPerKg} >= 0`),
  check("total_pendapatan_konsisten", sql`ABS(${table.totalPendapatan} - ROUND(${table.kuantitasKg} * ${table.hargaJualPerKg})) <= 1`),
  index("panen_area_idx").on(table.areaId),
  index("panen_siklus_idx").on(table.siklusId),
  index("panen_tanggal_idx").on(table.tanggal),

  // Composite Foreign Keys (Memaksa referensi wajib dari organisasi yang sama)
  foreignKey({
    columns: [table.areaId, table.organisasiId],
    foreignColumns: [areasTable.id, areasTable.organisasiId],
  }).onDelete("set null"),
  foreignKey({
    columns: [table.siklusId, table.organisasiId],
    foreignColumns: [siklusTanamTable.id, siklusTanamTable.organisasiId],
  }).onDelete("set null"),
  foreignKey({
    columns: [table.createdBy, table.organisasiId],
    foreignColumns: [pekerjaTable.id, pekerjaTable.organisasiId],
  }).onDelete("set null"),
]);

// ==========================================
// 4. INVENTORY LOGS (STOCK JOURNAL)
// ==========================================

export const stockMovementTable = pgTable("stock_movement", {
  id: uuid("id").defaultRandom().primaryKey(),
  organisasiId: uuid("organisasi_id").references(() => organisasiTable.id, { onDelete: "cascade" }).notNull(),
  produkId: uuid("produk_id").notNull(),

  tipe: text("tipe").notNull(), 
  delta: numeric("delta", { precision: 18, scale: 3 }).notNull(), 
  stokSebelum: numeric("stok_sebelum", { precision: 18, scale: 3 }).notNull(),
  stokSesudah: numeric("stok_sesudah", { precision: 18, scale: 3 }).notNull(),
  
  hargaHppSebelum: numeric("harga_hpp_sebelum", { precision: 18, scale: 3 }),
  hargaHppSesudah: numeric("harga_hpp_sesudah", { precision: 18, scale: 3 }),
  nilaiPembelianBaru: numeric("nilai_pembelian_baru", { precision: 18, scale: 3 }),

  perawatanProdukId: uuid("perawatan_produk_id").references(() => perawatanProdukTable.id, { onDelete: "set null" }),
  pengeluaranId: uuid("pengeluaran_id").references(() => pengeluaranTable.id, { onDelete: "set null" }),

  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("stock_movement_organisasi_idx").on(table.organisasiId),
  check("stock_movement_source_exclusive", sql`NOT (${table.perawatanProdukId} IS NOT NULL AND ${table.pengeluaranId} IS NOT NULL)`),
  index("stock_movement_produk_idx").on(table.produkId),
  index("stock_movement_created_idx").on(table.createdAt),

  // Composite Foreign Key (Memaksa referensi produk wajib dari organisasi yang sama)
  foreignKey({
    columns: [table.produkId, table.organisasiId],
    foreignColumns: [produkMasterTable.id, produkMasterTable.organisasiId],
  }).onDelete("restrict"),
]);

