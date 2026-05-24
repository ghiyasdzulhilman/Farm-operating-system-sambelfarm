// packages/api-zod/src/operasional.ts
import * as zod from "zod";

export const AddOperasionalBody = zod.object({
  namaPekerjaan: zod.string().min(1, "Nama pekerjaan wajib diisi"),
  kategori: zod.string().min(1, "Kategori wajib diisi"),
  status: zod.string().optional().default("Belum Mulai"),
  ditugaskanKeId: zod.union([
    zod.string().min(1), 
    zod.array(zod.string().min(1))
  ], {
    required_error: "Ditugaskan ke (Pekerja) wajib diisi",
  }),
  areaId: zod.string().min(1, "Area wajib diisi"),
  prioritas: zod.string().optional(),
  waktuPengerjaan: zod.union([
    zod.string(),
    zod.object({
      start: zod.string(),
      end: zod.string().optional()
    })
  ]).optional(),
  waktuMulai: zod.string().min(1, "Waktu mulai wajib diisi"),
  waktuSelesai: zod.string().optional(),
  durasiKerja: zod.number().optional(),
  catatan: zod.string().optional(),
  lampiran: zod.array(
    zod.union([
      zod.string().url(),
      zod.object({
        url: zod.string().url(),
        name: zod.string().optional()
      })
    ])
  ).optional()
});

export type AddOperasionalBodyType = zod.infer<typeof AddOperasionalBody>;
