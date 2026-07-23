import React from "react";
import { Columns } from "lucide-react"; // Pastikan ini di-import

interface FinanceTableViewProps {
  items: any[];
  onDelete: (id: string, module: string) => void;
}

export const FinanceTableView: React.FC<FinanceTableViewProps> = ({ items, onDelete }) => {
  const pengeluaran = items.filter((i) => i.module === "pengeluaran");
  const panen = items.filter((i) => i.module === "panen");

  const formatRupiah = (angka: number) =>
    new Intl.NumberFormat("id-ID", { 
      style: "currency", 
      currency: "IDR", 
      maximumFractionDigits: 0 
    }).format(angka || 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 🟢 SAKLAR KOSONG TOTAL */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
          <p className="text-slate-500 font-medium">
            Tidak ada data keuangan yang ditemukan untuk filter saat ini.
          </p>
        </div>
      )}

      {/* 🔴 TABEL PENGELUARAN */}
      {pengeluaran.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* HEADER CARD - MINIMALIST */}
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-[13px] font-black text-slate-800 tracking-wider uppercase">Pengeluaran</h3>
            <button 
              type="button" 
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
            >
              <Columns className="h-3.5 w-3.5" /> Kolom
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              {/* THEAD - UPPERCASE ELEGAN */}
              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Tanggal</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Kategori</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Nama Item</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Qty</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Harga Satuan</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Total Biaya</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {pengeluaran.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-slate-600 font-medium">
                      {new Date(item.rawDate).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-5 py-4">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-semibold">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-800">{item.title}</td>
                    <td className="px-5 py-4 text-right text-slate-600 font-medium">
                      {item.metaEkstra?.kuantitas || 1} {item.metaEkstra?.satuanKerja}
                    </td>
                    <td className="px-5 py-4 text-right text-slate-600 font-medium">
                      {formatRupiah(Number(item.metaEkstra?.hargaSatuan))}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-slate-800">
                      {formatRupiah(item.metaEkstra?.totalBiaya)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button 
                        onClick={() => onDelete(item.id, "pengeluaran")} 
                        className="text-slate-400 hover:text-red-600 transition-colors font-bold text-xs uppercase tracking-wider"
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

      {/* 🟢 TABEL PANEN */}
      {panen.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          {/* HEADER CARD - MINIMALIST */}
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-[13px] font-black text-slate-800 tracking-wider uppercase">Panen</h3>
            <button 
              type="button" 
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
            >
              <Columns className="h-3.5 w-3.5" /> Kolom
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              {/* THEAD - UPPERCASE ELEGAN */}
              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Tanggal</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Area & Siklus</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Kegiatan</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Kuantitas</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Harga Jual / Kg</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Total Pendapatan</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {panen.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-slate-600 font-medium">
                      {new Date(item.rawDate).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800">{item.area}</div>
                      <div className="text-[11px] font-medium text-slate-500 mt-0.5">{item.namaSiklus}</div>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-800">{item.title}</td>
                    <td className="px-5 py-4 text-right text-slate-600 font-medium">
                      {item.metaEkstra?.kuantitasKg} Kg
                    </td>
                    <td className="px-5 py-4 text-right text-slate-600 font-medium">
                      {formatRupiah(item.metaEkstra?.hargaJualPerKg)}
                    </td>
                    <td className="px-5 py-4 text-right font-black text-slate-800">
                      {formatRupiah(item.metaEkstra?.totalPendapatan)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button 
                        onClick={() => onDelete(item.id, "panen")} 
                        className="text-slate-400 hover:text-red-600 transition-colors font-bold text-xs uppercase tracking-wider"
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
