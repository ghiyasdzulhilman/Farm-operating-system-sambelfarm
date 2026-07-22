import React from "react";

// Definisikan tipe data props biar TypeScript lu ngga ngomel
interface FinanceTableViewProps {
  items: any[];
  onDelete: (id: string, module: string) => void;
}

export const FinanceTableView: React.FC<FinanceTableViewProps> = ({ items, onDelete }) => {
  // Pisahkan data berdasarkan modulnya
  const pengeluaran = items.filter((i) => i.module === "pengeluaran");
  const panen = items.filter((i) => i.module === "panen");

  // Helper untuk format mata uang Rupiah
  const formatRupiah = (angka: number) =>
    new Intl.NumberFormat("id-ID", { 
      style: "currency", 
      currency: "IDR", 
      maximumFractionDigits: 0 
    }).format(angka || 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 🟢 SAKLAR KOSONG TOTAL: Muncul kalau ngga ada data sama sekali dari filter */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
          <p className="text-slate-500 font-medium">
            Tidak ada data keuangan yang ditemukan untuk filter saat ini.
          </p>
        </div>
      )}

      {/* 🔴 TABEL PENGELUARAN (UANG KELUAR) */}
      {/* SAKLAR: Hanya render blok ini JIKA data pengeluaran lebih dari 0 */}
      {pengeluaran.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex justify-between items-center">
            <h3 className="font-semibold text-red-700">Riwayat Pengeluaran (Uang Keluar)</h3>
            <span className="text-sm font-medium text-red-600 bg-red-100 px-2 py-1 rounded-md">
              {pengeluaran.length} Transaksi
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Kategori</th>
                  <th className="px-4 py-3 font-medium">Nama Item</th>
                  <th className="px-4 py-3 font-medium text-right">Qty</th>
                  <th className="px-4 py-3 font-medium text-right">Harga Satuan</th>
                  <th className="px-4 py-3 font-medium text-right">Total Biaya</th>
                  <th className="px-4 py-3 font-medium text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pengeluaran.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(item.rawDate).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{item.title}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {item.metaEkstra?.kuantitas || 1} {item.metaEkstra?.satuanKerja}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatRupiah(Number(item.metaEkstra?.hargaSatuan))}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-600">
                      {formatRupiah(item.metaEkstra?.totalBiaya)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => onDelete(item.id, "pengeluaran")} 
                        className="text-slate-400 hover:text-red-600 transition-colors font-medium"
                        title="Hapus Data"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🟢 TABEL PANEN (UANG MASUK) */}
      {/* SAKLAR: Hanya render blok ini JIKA data panen lebih dari 0 */}
      {panen.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-green-50 px-4 py-3 border-b border-green-100 flex justify-between items-center">
            <h3 className="font-semibold text-green-700">Riwayat Panen (Pendapatan)</h3>
            <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded-md">
              {panen.length} Transaksi
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Area & Siklus</th>
                  <th className="px-4 py-3 font-medium">Kegiatan</th>
                  <th className="px-4 py-3 font-medium text-right">Kuantitas</th>
                  <th className="px-4 py-3 font-medium text-right">Harga Jual / Kg</th>
                  <th className="px-4 py-3 font-medium text-right">Total Pendapatan</th>
                  <th className="px-4 py-3 font-medium text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {panen.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(item.rawDate).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{item.area}</div>
                      <div className="text-xs text-slate-500">{item.namaSiklus}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{item.title}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {item.metaEkstra?.kuantitasKg} Kg
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatRupiah(item.metaEkstra?.hargaJualPerKg)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                      {formatRupiah(item.metaEkstra?.totalPendapatan)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => onDelete(item.id, "panen")} 
                        className="text-slate-400 hover:text-red-600 transition-colors font-medium"
                        title="Hapus Data"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default FinanceTableView;
