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

  // 🚀 FIX: Bungkus nilai -delta ke dalam String() biar Drizzle (TypeScript) nggak protes saat ngebandingin tipe numeric
  const whereClause = delta < 0
    ? and(eq(produkMasterTable.id, produkId), gte(produkMasterTable.stokSaatIni, String(-delta)))
    : eq(produkMasterTable.id, produkId);

    const updated = await tx
    .update(produkMasterTable)
    .set({ stokSaatIni: sql`${produkMasterTable.stokSaatIni} + ${delta}` })
    .where(whereClause)
    .returning({ 
      stokSesudah: produkMasterTable.stokSaatIni,
      hargaHpp: produkMasterTable.hargaPerSatuanDasar // 🚀 TAMBAHAN: Tarik sekalian HPP saat ini
    });

    if (updated.length === 0) {
    throw new Error(`STOK_TIDAK_CUKUP:${produkId}`);
  }

  // 🚀 FIX FASE 1: Konversi paksa dari String (numeric Postgres) menjadi Number
  // Pakai String() dulu untuk mencegah TS ngambek kalau type aslinya nggak kebaca
  const stokSesudahNum = parseFloat(String(updated[0].stokSesudah)) || 0;
  // 🚀 TAMBAHAN: Tangkap nilai HPP untuk dicatat di riwayat (wajib bentuk String)
  const hargaHppTerkini = String(updated[0].hargaHpp || "0"); 
  
  // Karena stokSesudahNum sekarang 100% Number, kalkulasi matematika ini bebas dari string concatenation
  const stokSebelumNum = stokSesudahNum - delta;

  await tx.insert(stockMovementTable).values({
    produkId, 
    tipe, 
    // 💡 BEST PRACTICE: Kita kembalikan jadi String ke DB supaya presisi numeric(18,3) terjaga
    delta: String(delta), 
    stokSebelum: String(stokSebelumNum), 
    stokSesudah: String(stokSesudahNum), 
    // 🚀 FIX FASE 2: Injeksi jejak rekam HPP ke buku gudang
    hargaHppSebelum: hargaHppTerkini, 
    hargaHppSesudah: hargaHppTerkini, // Karena cuma pemakaian/refund, HPP rata-rata TIDAK BERUBAH
    nilaiPembelianBaru: "0", // Bukan transaksi beli, jadi dipatok 0
    perawatanProdukId, 
    catatan,
  });

  // Return sebagai Number supaya jika ada fungsi lain yang manggil adjustStock, 
  // mereka gampang memprosesnya tanpa error.
  return stokSesudahNum; 
}

