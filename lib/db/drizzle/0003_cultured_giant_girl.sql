ALTER TABLE "inspeksi" DROP CONSTRAINT "inspeksi_area_id_areas_id_fk";
--> statement-breakpoint
ALTER TABLE "inspeksi" DROP CONSTRAINT "inspeksi_siklus_id_siklus_tanam_id_fk";
--> statement-breakpoint
ALTER TABLE "inspeksi" DROP CONSTRAINT "inspeksi_created_by_pekerja_id_fk";
--> statement-breakpoint
ALTER TABLE "operasional" DROP CONSTRAINT "operasional_area_id_areas_id_fk";
--> statement-breakpoint
ALTER TABLE "operasional" DROP CONSTRAINT "operasional_siklus_id_siklus_tanam_id_fk";
--> statement-breakpoint
ALTER TABLE "operasional" DROP CONSTRAINT "operasional_kategori_id_kategori_master_id_fk";
--> statement-breakpoint
ALTER TABLE "operasional" DROP CONSTRAINT "operasional_jenis_tenaga_kerja_id_pekerja_atribut_master_id_fk";
--> statement-breakpoint
ALTER TABLE "operasional" DROP CONSTRAINT "operasional_created_by_pekerja_id_fk";
--> statement-breakpoint
ALTER TABLE "perawatan" DROP CONSTRAINT "perawatan_area_id_areas_id_fk";
--> statement-breakpoint
ALTER TABLE "perawatan" DROP CONSTRAINT "perawatan_siklus_id_siklus_tanam_id_fk";
--> statement-breakpoint
ALTER TABLE "perawatan" DROP CONSTRAINT "perawatan_tag_category_id_kategori_master_id_fk";
--> statement-breakpoint
ALTER TABLE "perawatan" DROP CONSTRAINT "perawatan_created_by_pekerja_id_fk";
--> statement-breakpoint
ALTER TABLE "perawatan" DROP CONSTRAINT "perawatan_updated_by_pekerja_id_fk";
--> statement-breakpoint
ALTER TABLE "siklus_tanam" DROP CONSTRAINT "siklus_tanam_area_id_areas_id_fk";
--> statement-breakpoint
ALTER TABLE "siklus_tanam" DROP CONSTRAINT "siklus_tanam_created_by_pekerja_id_fk";
--> statement-breakpoint
ALTER TABLE "siklus_tanam" DROP CONSTRAINT "siklus_tanam_updated_by_pekerja_id_fk";
--> statement-breakpoint
ALTER TABLE "inspeksi" ADD CONSTRAINT "fk_inspeksi_area_org" FOREIGN KEY ("area_id","organisasi_id") REFERENCES "public"."areas"("id","organisasi_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspeksi" ADD CONSTRAINT "fk_inspeksi_siklus_org" FOREIGN KEY ("siklus_id","organisasi_id") REFERENCES "public"."siklus_tanam"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspeksi" ADD CONSTRAINT "fk_inspeksi_createdby_org" FOREIGN KEY ("created_by","organisasi_id") REFERENCES "public"."pekerja"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operasional" ADD CONSTRAINT "fk_operasional_area_org" FOREIGN KEY ("area_id","organisasi_id") REFERENCES "public"."areas"("id","organisasi_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operasional" ADD CONSTRAINT "fk_operasional_siklus_org" FOREIGN KEY ("siklus_id","organisasi_id") REFERENCES "public"."siklus_tanam"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operasional" ADD CONSTRAINT "fk_operasional_kategori_org" FOREIGN KEY ("kategori_id","organisasi_id") REFERENCES "public"."kategori_master"("id","organisasi_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operasional" ADD CONSTRAINT "fk_operasional_jtk_org" FOREIGN KEY ("jenis_tenaga_kerja_id","organisasi_id") REFERENCES "public"."pekerja_atribut_master"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operasional" ADD CONSTRAINT "fk_operasional_createdby_org" FOREIGN KEY ("created_by","organisasi_id") REFERENCES "public"."pekerja"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perawatan" ADD CONSTRAINT "fk_perawatan_area_org" FOREIGN KEY ("area_id","organisasi_id") REFERENCES "public"."areas"("id","organisasi_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perawatan" ADD CONSTRAINT "fk_perawatan_siklus_org" FOREIGN KEY ("siklus_id","organisasi_id") REFERENCES "public"."siklus_tanam"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perawatan" ADD CONSTRAINT "fk_perawatan_tag_org" FOREIGN KEY ("tag_category_id","organisasi_id") REFERENCES "public"."kategori_master"("id","organisasi_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perawatan" ADD CONSTRAINT "fk_perawatan_createdby_org" FOREIGN KEY ("created_by","organisasi_id") REFERENCES "public"."pekerja"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "perawatan" ADD CONSTRAINT "fk_perawatan_updatedby_org" FOREIGN KEY ("updated_by","organisasi_id") REFERENCES "public"."pekerja"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siklus_tanam" ADD CONSTRAINT "fk_siklus_area_org" FOREIGN KEY ("area_id","organisasi_id") REFERENCES "public"."areas"("id","organisasi_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siklus_tanam" ADD CONSTRAINT "fk_siklus_createdby_org" FOREIGN KEY ("created_by","organisasi_id") REFERENCES "public"."pekerja"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "siklus_tanam" ADD CONSTRAINT "fk_siklus_updatedby_org" FOREIGN KEY ("updated_by","organisasi_id") REFERENCES "public"."pekerja"("id","organisasi_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "kategori_id_org_unique" ON "kategori_master" USING btree ("id","organisasi_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pekerja_atribut_id_org_unique" ON "pekerja_atribut_master" USING btree ("id","organisasi_id");