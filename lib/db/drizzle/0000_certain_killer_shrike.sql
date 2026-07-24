-- ============================================================
-- MIGRATION 0000: Tambah tabel "organisasi" + kolom organisasi_id
-- ============================================================
-- Strategi aman untuk database produksi yang sudah berisi data:
--   1. Buat tabel "organisasi" (baru, belum ada).
--   2. Dalam satu blok DO $$:
--      a. Insert 1 baris organisasi default.
--      b. ADD COLUMN organisasi_id sebagai NULLABLE ke semua tabel.
--      c. UPDATE semua baris lama dengan UUID default org.
--      d. SET NOT NULL setelah semua baris terisi.
--   3. Drop constraint/index lama yang konflik (UNIQUE global).
--   4. Tambah FK constraint ke tabel "organisasi".
--   5. Tambah index baru (semuanya IF NOT EXISTS).
-- ============================================================

CREATE TABLE "organisasi" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Backfill aman: nullable → isi data → NOT NULL
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    -- Ambil UUID organisasi default yang baru saja dibuat
    INSERT INTO "organisasi" ("nama") VALUES ('Organisasi Default') RETURNING "id" INTO default_org_id;

    -- ── Tambah kolom sebagai NULLABLE ──────────────────────────
    ALTER TABLE "areas"                ADD COLUMN IF NOT EXISTS "organisasi_id" uuid;
    ALTER TABLE "pekerja_atribut_master" ADD COLUMN IF NOT EXISTS "organisasi_id" uuid;
    ALTER TABLE "pekerja"              ADD COLUMN IF NOT EXISTS "organisasi_id" uuid;
    ALTER TABLE "kategori_master"      ADD COLUMN IF NOT EXISTS "organisasi_id" uuid;
    ALTER TABLE "kendala_master"       ADD COLUMN IF NOT EXISTS "organisasi_id" uuid;
    ALTER TABLE "siklus_tanam"         ADD COLUMN IF NOT EXISTS "organisasi_id" uuid;
    ALTER TABLE "produk_master"        ADD COLUMN IF NOT EXISTS "organisasi_id" uuid;
    ALTER TABLE "perawatan"            ADD COLUMN IF NOT EXISTS "organisasi_id" uuid;
    ALTER TABLE "inspeksi"             ADD COLUMN IF NOT EXISTS "organisasi_id" uuid;
    ALTER TABLE "operasional"          ADD COLUMN IF NOT EXISTS "organisasi_id" uuid;
    ALTER TABLE "kategori_keuangan"    ADD COLUMN IF NOT EXISTS "organisasi_id" uuid;
    ALTER TABLE "pengeluaran"          ADD COLUMN IF NOT EXISTS "organisasi_id" uuid;
    ALTER TABLE "panen"                ADD COLUMN IF NOT EXISTS "organisasi_id" uuid;
    ALTER TABLE "stock_movement"       ADD COLUMN IF NOT EXISTS "organisasi_id" uuid;

    -- ── Backfill semua baris lama ───────────────────────────────
    UPDATE "areas"                 SET "organisasi_id" = default_org_id WHERE "organisasi_id" IS NULL;
    UPDATE "pekerja_atribut_master" SET "organisasi_id" = default_org_id WHERE "organisasi_id" IS NULL;
    UPDATE "pekerja"               SET "organisasi_id" = default_org_id WHERE "organisasi_id" IS NULL;
    UPDATE "kategori_master"       SET "organisasi_id" = default_org_id WHERE "organisasi_id" IS NULL;
    UPDATE "kendala_master"        SET "organisasi_id" = default_org_id WHERE "organisasi_id" IS NULL;
    UPDATE "siklus_tanam"          SET "organisasi_id" = default_org_id WHERE "organisasi_id" IS NULL;
    UPDATE "produk_master"         SET "organisasi_id" = default_org_id WHERE "organisasi_id" IS NULL;
    UPDATE "perawatan"             SET "organisasi_id" = default_org_id WHERE "organisasi_id" IS NULL;
    UPDATE "inspeksi"              SET "organisasi_id" = default_org_id WHERE "organisasi_id" IS NULL;
    UPDATE "operasional"           SET "organisasi_id" = default_org_id WHERE "organisasi_id" IS NULL;
    UPDATE "kategori_keuangan"     SET "organisasi_id" = default_org_id WHERE "organisasi_id" IS NULL;
    UPDATE "pengeluaran"           SET "organisasi_id" = default_org_id WHERE "organisasi_id" IS NULL;
    UPDATE "panen"                 SET "organisasi_id" = default_org_id WHERE "organisasi_id" IS NULL;
    UPDATE "stock_movement"        SET "organisasi_id" = default_org_id WHERE "organisasi_id" IS NULL;

    -- ── Kunci kolom menjadi NOT NULL ────────────────────────────
    ALTER TABLE "areas"                ALTER COLUMN "organisasi_id" SET NOT NULL;
    ALTER TABLE "pekerja_atribut_master" ALTER COLUMN "organisasi_id" SET NOT NULL;
    ALTER TABLE "pekerja"              ALTER COLUMN "organisasi_id" SET NOT NULL;
    ALTER TABLE "kategori_master"      ALTER COLUMN "organisasi_id" SET NOT NULL;
    ALTER TABLE "kendala_master"       ALTER COLUMN "organisasi_id" SET NOT NULL;
    ALTER TABLE "siklus_tanam"         ALTER COLUMN "organisasi_id" SET NOT NULL;
    ALTER TABLE "produk_master"        ALTER COLUMN "organisasi_id" SET NOT NULL;
    ALTER TABLE "perawatan"            ALTER COLUMN "organisasi_id" SET NOT NULL;
    ALTER TABLE "inspeksi"             ALTER COLUMN "organisasi_id" SET NOT NULL;
    ALTER TABLE "operasional"          ALTER COLUMN "organisasi_id" SET NOT NULL;
    ALTER TABLE "kategori_keuangan"    ALTER COLUMN "organisasi_id" SET NOT NULL;
    ALTER TABLE "pengeluaran"          ALTER COLUMN "organisasi_id" SET NOT NULL;
    ALTER TABLE "panen"                ALTER COLUMN "organisasi_id" SET NOT NULL;
    ALTER TABLE "stock_movement"       ALTER COLUMN "organisasi_id" SET NOT NULL;
END $$;
--> statement-breakpoint

-- ── Drop constraint/index lama yang konflik ─────────────────────
-- kendala_master: dulu UNIQUE global pada "nama", sekarang UNIQUE per-organisasi
ALTER TABLE "kendala_master" DROP CONSTRAINT IF EXISTS "kendala_master_nama_unique";
--> statement-breakpoint
-- kategori_keuangan: dulu UNIQUE global pada lower(nama), sekarang per-organisasi
DROP INDEX IF EXISTS "kategori_keuangan_nama_lower_unique";
--> statement-breakpoint
-- produk_master: dulu UNIQUE global pada lower(nama), sekarang per-organisasi
DROP INDEX IF EXISTS "produk_master_nama_lower_unique";
--> statement-breakpoint

-- ── FK constraints ke tabel organisasi (semua baru) ─────────────
ALTER TABLE "areas" ADD CONSTRAINT "areas_organisasi_id_organisasi_id_fk" FOREIGN KEY ("organisasi_id") REFERENCES "public"."organisasi"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pekerja_atribut_master" ADD CONSTRAINT "pekerja_atribut_master_organisasi_id_organisasi_id_fk" FOREIGN KEY ("organisasi_id") REFERENCES "public"."organisasi"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pekerja" ADD CONSTRAINT "pekerja_organisasi_id_organisasi_id_fk" FOREIGN KEY ("organisasi_id") REFERENCES "public"."organisasi"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "kategori_master" ADD CONSTRAINT "kategori_master_organisasi_id_organisasi_id_fk" FOREIGN KEY ("organisasi_id") REFERENCES "public"."organisasi"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "kendala_master" ADD CONSTRAINT "kendala_master_organisasi_id_organisasi_id_fk" FOREIGN KEY ("organisasi_id") REFERENCES "public"."organisasi"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "siklus_tanam" ADD CONSTRAINT "siklus_tanam_organisasi_id_organisasi_id_fk" FOREIGN KEY ("organisasi_id") REFERENCES "public"."organisasi"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "produk_master" ADD CONSTRAINT "produk_master_organisasi_id_organisasi_id_fk" FOREIGN KEY ("organisasi_id") REFERENCES "public"."organisasi"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "perawatan" ADD CONSTRAINT "perawatan_organisasi_id_organisasi_id_fk" FOREIGN KEY ("organisasi_id") REFERENCES "public"."organisasi"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inspeksi" ADD CONSTRAINT "inspeksi_organisasi_id_organisasi_id_fk" FOREIGN KEY ("organisasi_id") REFERENCES "public"."organisasi"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "operasional" ADD CONSTRAINT "operasional_organisasi_id_organisasi_id_fk" FOREIGN KEY ("organisasi_id") REFERENCES "public"."organisasi"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "kategori_keuangan" ADD CONSTRAINT "kategori_keuangan_organisasi_id_organisasi_id_fk" FOREIGN KEY ("organisasi_id") REFERENCES "public"."organisasi"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pengeluaran" ADD CONSTRAINT "pengeluaran_organisasi_id_organisasi_id_fk" FOREIGN KEY ("organisasi_id") REFERENCES "public"."organisasi"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "panen" ADD CONSTRAINT "panen_organisasi_id_organisasi_id_fk" FOREIGN KEY ("organisasi_id") REFERENCES "public"."organisasi"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_organisasi_id_organisasi_id_fk" FOREIGN KEY ("organisasi_id") REFERENCES "public"."organisasi"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- ── Index baru (semua IF NOT EXISTS) ────────────────────────────
CREATE INDEX IF NOT EXISTS "areas_organisasi_idx" ON "areas" USING btree ("organisasi_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pekerja_atribut_organisasi_idx" ON "pekerja_atribut_master" USING btree ("organisasi_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pekerja_atribut_nama_jenis_org_unique" ON "pekerja_atribut_master" USING btree ("nama_option","jenis_atribut","organisasi_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pekerja_organisasi_idx" ON "pekerja" USING btree ("organisasi_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kategori_organisasi_idx" ON "kategori_master" USING btree ("organisasi_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kendala_organisasi_idx" ON "kendala_master" USING btree ("organisasi_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "kendala_nama_org_unique" ON "kendala_master" USING btree ("nama","organisasi_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "siklus_organisasi_idx" ON "siklus_tanam" USING btree ("organisasi_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "produk_organisasi_idx" ON "produk_master" USING btree ("organisasi_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "produk_master_nama_org_lower_unique" ON "produk_master" USING btree (lower("nama"),"organisasi_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "perawatan_organisasi_idx" ON "perawatan" USING btree ("organisasi_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inspeksi_organisasi_idx" ON "inspeksi" USING btree ("organisasi_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "operasional_organisasi_idx" ON "operasional" USING btree ("organisasi_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kat_keuangan_organisasi_idx" ON "kategori_keuangan" USING btree ("organisasi_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "kategori_keuangan_nama_org_lower_unique" ON "kategori_keuangan" USING btree (lower("nama"),"organisasi_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pengeluaran_organisasi_idx" ON "pengeluaran" USING btree ("organisasi_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "panen_organisasi_idx" ON "panen" USING btree ("organisasi_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movement_organisasi_idx" ON "stock_movement" USING btree ("organisasi_id");
