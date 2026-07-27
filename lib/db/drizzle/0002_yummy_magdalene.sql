ALTER TABLE "panen" DROP CONSTRAINT "panen_area_id_organisasi_id_areas_id_organisasi_id_fk";
--> statement-breakpoint
ALTER TABLE "panen" DROP CONSTRAINT "panen_siklus_id_organisasi_id_siklus_tanam_id_organisasi_id_fk";
--> statement-breakpoint
ALTER TABLE "panen" DROP CONSTRAINT "panen_created_by_organisasi_id_pekerja_id_organisasi_id_fk";
--> statement-breakpoint
ALTER TABLE "pengeluaran" DROP CONSTRAINT "pengeluaran_area_id_organisasi_id_areas_id_organisasi_id_fk";
--> statement-breakpoint
ALTER TABLE "pengeluaran" DROP CONSTRAINT "pengeluaran_siklus_id_organisasi_id_siklus_tanam_id_organisasi_id_fk";
--> statement-breakpoint
ALTER TABLE "pengeluaran" DROP CONSTRAINT "pengeluaran_kategori_id_organisasi_id_kategori_keuangan_id_organisasi_id_fk";
--> statement-breakpoint
ALTER TABLE "pengeluaran" DROP CONSTRAINT "pengeluaran_produk_id_organisasi_id_produk_master_id_organisasi_id_fk";
--> statement-breakpoint
ALTER TABLE "pengeluaran" DROP CONSTRAINT "pengeluaran_pekerja_id_organisasi_id_pekerja_id_organisasi_id_fk";
--> statement-breakpoint
ALTER TABLE "pengeluaran" DROP CONSTRAINT "pengeluaran_created_by_organisasi_id_pekerja_id_organisasi_id_fk";
--> statement-breakpoint
ALTER TABLE "stock_movement" DROP CONSTRAINT "stock_movement_produk_id_organisasi_id_produk_master_id_organisasi_id_fk";
--> statement-breakpoint
ALTER TABLE "panen" ADD CONSTRAINT "fk_panen_area_org" FOREIGN KEY ("area_id","organisasi_id") REFERENCES "public"."areas"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "panen" ADD CONSTRAINT "fk_panen_siklus_org" FOREIGN KEY ("siklus_id","organisasi_id") REFERENCES "public"."siklus_tanam"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "panen" ADD CONSTRAINT "fk_panen_createdby_org" FOREIGN KEY ("created_by","organisasi_id") REFERENCES "public"."pekerja"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengeluaran" ADD CONSTRAINT "fk_pengeluaran_area_org" FOREIGN KEY ("area_id","organisasi_id") REFERENCES "public"."areas"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengeluaran" ADD CONSTRAINT "fk_pengeluaran_siklus_org" FOREIGN KEY ("siklus_id","organisasi_id") REFERENCES "public"."siklus_tanam"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengeluaran" ADD CONSTRAINT "fk_pengeluaran_kategori_org" FOREIGN KEY ("kategori_id","organisasi_id") REFERENCES "public"."kategori_keuangan"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengeluaran" ADD CONSTRAINT "fk_pengeluaran_produk_org" FOREIGN KEY ("produk_id","organisasi_id") REFERENCES "public"."produk_master"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengeluaran" ADD CONSTRAINT "fk_pengeluaran_pekerja_org" FOREIGN KEY ("pekerja_id","organisasi_id") REFERENCES "public"."pekerja"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengeluaran" ADD CONSTRAINT "fk_pengeluaran_createdby_org" FOREIGN KEY ("created_by","organisasi_id") REFERENCES "public"."pekerja"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "fk_stockmovement_produk_org" FOREIGN KEY ("produk_id","organisasi_id") REFERENCES "public"."produk_master"("id","organisasi_id") ON DELETE restrict ON UPDATE no action;