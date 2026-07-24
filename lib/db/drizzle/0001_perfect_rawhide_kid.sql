ALTER TABLE "panen" DROP CONSTRAINT "panen_area_id_areas_id_fk";
--> statement-breakpoint
ALTER TABLE "panen" DROP CONSTRAINT "panen_siklus_id_siklus_tanam_id_fk";
--> statement-breakpoint
ALTER TABLE "panen" DROP CONSTRAINT "panen_created_by_pekerja_id_fk";
--> statement-breakpoint
ALTER TABLE "pengeluaran" DROP CONSTRAINT "pengeluaran_area_id_areas_id_fk";
--> statement-breakpoint
ALTER TABLE "pengeluaran" DROP CONSTRAINT "pengeluaran_siklus_id_siklus_tanam_id_fk";
--> statement-breakpoint
ALTER TABLE "pengeluaran" DROP CONSTRAINT "pengeluaran_kategori_id_kategori_keuangan_id_fk";
--> statement-breakpoint
ALTER TABLE "pengeluaran" DROP CONSTRAINT "pengeluaran_produk_id_produk_master_id_fk";
--> statement-breakpoint
ALTER TABLE "pengeluaran" DROP CONSTRAINT "pengeluaran_pekerja_id_pekerja_id_fk";
--> statement-breakpoint
ALTER TABLE "pengeluaran" DROP CONSTRAINT "pengeluaran_created_by_pekerja_id_fk";
--> statement-breakpoint
ALTER TABLE "stock_movement" DROP CONSTRAINT "stock_movement_produk_id_produk_master_id_fk";
--> statement-breakpoint
ALTER TABLE "panen" ADD CONSTRAINT "panen_area_id_organisasi_id_areas_id_organisasi_id_fk" FOREIGN KEY ("area_id","organisasi_id") REFERENCES "public"."areas"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "panen" ADD CONSTRAINT "panen_siklus_id_organisasi_id_siklus_tanam_id_organisasi_id_fk" FOREIGN KEY ("siklus_id","organisasi_id") REFERENCES "public"."siklus_tanam"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "panen" ADD CONSTRAINT "panen_created_by_organisasi_id_pekerja_id_organisasi_id_fk" FOREIGN KEY ("created_by","organisasi_id") REFERENCES "public"."pekerja"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengeluaran" ADD CONSTRAINT "pengeluaran_area_id_organisasi_id_areas_id_organisasi_id_fk" FOREIGN KEY ("area_id","organisasi_id") REFERENCES "public"."areas"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengeluaran" ADD CONSTRAINT "pengeluaran_siklus_id_organisasi_id_siklus_tanam_id_organisasi_id_fk" FOREIGN KEY ("siklus_id","organisasi_id") REFERENCES "public"."siklus_tanam"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengeluaran" ADD CONSTRAINT "pengeluaran_kategori_id_organisasi_id_kategori_keuangan_id_organisasi_id_fk" FOREIGN KEY ("kategori_id","organisasi_id") REFERENCES "public"."kategori_keuangan"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengeluaran" ADD CONSTRAINT "pengeluaran_produk_id_organisasi_id_produk_master_id_organisasi_id_fk" FOREIGN KEY ("produk_id","organisasi_id") REFERENCES "public"."produk_master"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengeluaran" ADD CONSTRAINT "pengeluaran_pekerja_id_organisasi_id_pekerja_id_organisasi_id_fk" FOREIGN KEY ("pekerja_id","organisasi_id") REFERENCES "public"."pekerja"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengeluaran" ADD CONSTRAINT "pengeluaran_created_by_organisasi_id_pekerja_id_organisasi_id_fk" FOREIGN KEY ("created_by","organisasi_id") REFERENCES "public"."pekerja"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_produk_id_organisasi_id_produk_master_id_organisasi_id_fk" FOREIGN KEY ("produk_id","organisasi_id") REFERENCES "public"."produk_master"("id","organisasi_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "areas_id_org_unique" ON "areas" USING btree ("id","organisasi_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kategori_keuangan_id_org_unique" ON "kategori_keuangan" USING btree ("id","organisasi_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pekerja_id_org_unique" ON "pekerja" USING btree ("id","organisasi_id");--> statement-breakpoint
CREATE UNIQUE INDEX "produk_master_id_org_unique" ON "produk_master" USING btree ("id","organisasi_id");--> statement-breakpoint
CREATE UNIQUE INDEX "siklus_tanam_id_org_unique" ON "siklus_tanam" USING btree ("id","organisasi_id");