import { pgTable, uuid, text, timestamp, integer, doublePrecision, jsonb } from "drizzle-orm/pg-core";

// ==========================================
// 1. TABEL MASTER: AREA / BLOK KEBUN
// ==========================================
export const areasTable = pgTable("areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // Cth: "Blok A", "Blok B"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// 2. MODUL PERAWATAN (NUTRISI & PUPUK)
// ==========================================
export const perawatanTable = pgTable("perawatan", {
  id: uuid("id").defaultRandom().primaryKey(),
  kegiatan: text("kegiatan").notNull(), // Cth: "Penyemprotan Rutin", "Pengocoran"
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  waktuMulai: timestamp("waktu_mulai").notNull(),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(), // Dalam satuan jam
  tagCategory: text("tag_category").notNull(), // Cth: "Fungisida", "Nutrisi", "Insektisida"
  status: text("status").default("Belum dikerjakan").notNull(), // "Belum dikerjakan" | "Dalam proses" | "Selesai"
  pekerjaIds: jsonb("pekerja_ids").default([]).notNull(), // Menyimpan array ID pekerja/mandor
  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabel khusus racikan bahan/produk kimia/organik per perawatan
export const perawatanProdukTable = pgTable("perawatan_produk", {
  id: uuid("id").defaultRandom().primaryKey(),
  perawatanId: uuid("perawatan_id").references(() => perawatanTable.id, { onDelete: "cascade" }).notNull(),
  namaProduk: text("nama_produk").notNull(), // Cth: "Trichoderma", "Calbovit", "Kalinet"
  dosis: text("dosis").notNull(), // Cth: "2 gr/L", "1 tutup botol"
});

// ==========================================
// 3. MODUL INSPEKSI (KESEHATAN & HAMA)
// ==========================================
export const inspeksiTable = pgTable("inspeksi", {
  id: uuid("id").defaultRandom().primaryKey(),
  kegiatan: text("kegiatan").notNull(), // Cth: "Inspeksi Mingguan"
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  waktuMulai: timestamp("waktu_mulai").notNull(),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  phTanah: doublePrecision("ph_tanah"), // Angka desimal (Cth: 6.5)
  tingkatSerangan: doublePrecision("tingkat_serangan"), // Persentase desimal (Cth: 0.15 untuk 15%)
  radius: doublePrecision("radius"), // Dalam satuan meter persegi (m2)
  status: text("status").default("Baru ditemukan").notNull(), // "Baru ditemukan" | "Sedang ditangani" | "Sudah ditangani"
  pekerjaIds: jsonb("pekerja_ids").default([]).notNull(),
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabel khusus temuan hama atau penyakit di lapangan
export const inspeksiTemuanTable = pgTable("inspeksi_temuan", {
  id: uuid("id").defaultRandom().primaryKey(),
  inspeksiId: uuid("inspeksi_id").references(() => inspeksiTable.id, { onDelete: "cascade" }).notNull(),
  jenisKendala: text("jenis_kendala").notNull(), // "Hama" | "Penyakit"
  namaKendala: text("nama_kendala").notNull(), // Cth: "Thrips", "Kutu Kebul", "Patek"
  catatanKhusus: text("catatan_khusus"), // Detil gejala visual tanaman
});

// ==========================================
// 4. MODUL OPERASIONAL UMUM & MAINTENANCE
// ==========================================
export const operasionalTable = pgTable("operasional", {
  id: uuid("id").defaultRandom().primaryKey(),
  namaPekerjaan: text("nama_pekerjaan").notNull(), // Cth: "Sanitasi Gulma", "Perbaikan Gembor"
  areaId: uuid("area_id").references(() => areasTable.id, { onDelete: "cascade" }).notNull(),
  waktuMulai: timestamp("waktu_mulai").notNull(),
  waktuSelesai: timestamp("waktu_selesai"),
  durasiKerja: integer("durasi_kerja").default(0).notNull(),
  kategori: text("kategori").notNull(), // Cth: "Sanitasi", "Infrastruktur", "Panen"
  prioritas: text("prioritas").default("Medium").notNull(), // "Low" | "Medium" | "High"
  jenisTenagaKerja: text("jenis_tenaga_kerja").notNull(), // "Internal / Karyawan" | "Eksternal / Borongan"
  pekerjaIds: jsonb("pekerja_ids").default([]).notNull(),
  status: text("status").default("Belum dikerjakan").notNull(), // "Belum dikerjakan" | "Dalam proses" | "Selesai"
  catatan: text("catatan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
