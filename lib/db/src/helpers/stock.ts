import { eq, and, gte, sql } from "drizzle-orm";
import { produkMasterTable, stockMovementTable } from "../schema";
import type { db as DbInstance } from "../index";

type DbOrTx = Parameters<Parameters<typeof DbInstance.transaction>[0]>[0];

export async function adjustStock(
  tx: DbOrTx,
  params: {
    produkId: string;
    delta: number; // negatif = potong (pemakaian), positif = tambah (reversal)
    tipe: string;
    perawatanProdukId?: string | null;
    catatan?: string | null;
  }
) {
  const { produkId, delta, tipe, perawatanProdukId = null, catatan = null } = params;

  const whereClause = delta < 0
    ? and(eq(produkMasterTable.id, produkId), gte(produkMasterTable.stokSaatIni, -delta))
    : eq(produkMasterTable.id, produkId);

  const updated = await tx
    .update(produkMasterTable)
    .set({ stokSaatIni: sql`${produkMasterTable.stokSaatIni} + ${delta}` })
    .where(whereClause)
    .returning({ stokSesudah: produkMasterTable.stokSaatIni });

  if (updated.length === 0) {
    throw new Error(`STOK_TIDAK_CUKUP:${produkId}`);
  }

  const stokSesudah = updated[0].stokSesudah;
  const stokSebelum = stokSesudah - delta;

  await tx.insert(stockMovementTable).values({
    produkId, tipe, delta, stokSebelum, stokSesudah, perawatanProdukId, catatan,
  });

  return stokSesudah;
}
