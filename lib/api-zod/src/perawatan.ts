// Lokasi: packages/api-zod/src/perawatan.ts
import * as zod from "zod";

export const AddPerawatanBody = zod.object({
  kegiatan: zod.string().min(1, "Nama kegiatan perawatan wajib diisi"),
  tanggal: zod.string().min(1, "Tanggal perawatan wajib diisi"), // Format ISO YYYY-MM-DD
  labaRugiId: zod.string().min(1, "ID Area (Laba Rugi) wajib diisi"),
  petugasId: zod.string().optional(),
  // Tags bisa nerima string tunggal atau array dari iOS Shortcuts
  tags: zod.union([zod.string(), zod.array(zod.string())]).optional(),
  status: zod.string().optional().default("Rencana"),
  detailNotes: zod.string().optional(),
  // Log produk untuk racikan pupuk/pestisida
  logProduk: zod.array(
    zod.object({
      produk: zod.string().min(1, "Nama produk wajib diisi"),
      dosis: zod.string().min(1, "Dosis aplikasi wajib diisi"),
    })
  ).optional(),
});

// Export tipenya biar TypeScript di backend lu paham
export type AddPerawatanBodyType = zod.infer<typeof AddPerawatanBody>;
