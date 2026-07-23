import React from "react";
import { Columns } from "lucide-react"; // 🚀 1. Import Ikon

interface FinanceTableViewProps {
  items: any[];
  onDelete: (id: string, module: string) => void;
}

export const FinanceTableView: React.FC<FinanceTableViewProps> = ({ items, onDelete }) => {
  const pengeluaran = items.filter((i) => i.module === "pengeluaran");
  const panen = items.filter((i) => i.module === "panen");

    // State untuk Filter Kolom Pengeluaran
  const [showPengeluaranMenu, setShowPengeluaranMenu] = React.useState(false);
  const [colPengeluaran, setColPengeluaran] = React.useState({
    tanggal: true,
    kategori: true,
    namaItem: true,
    qty: true,
    hargaSatuan: true,
    totalBiaya: true,
    aksi: true,
  });

  const toggleColPengeluaran = (key: keyof typeof colPengeluaran) => {
    setColPengeluaran((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // 🚀 1. State untuk Filter Kolom Panen
  const [showPanenMenu, setShowPanenMenu] = React.useState(false);
  const [colPanen, setColPanen] = React.useState({
    tanggal: true,
    areaSiklus: true,
    kegiatan: true,
    kuantitas: true,
    hargaJual: true,
    totalPendapatan: true,
    aksi: true,
  });

  const toggleColPanen = (key: keyof typeof colPanen) => {
    setColPanen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80">

          {/* HEADER CARD - MINIMALIST */}
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-[13px] font-black text-slate-800 tracking-wider uppercase">Pengeluaran</h3>
            
            {/* 🚀 Wrapper Dropdown Interaktif */}
            <div className="relative">
              <button 
                type="button" 
                onClick={() => setShowPengeluaranMenu(!showPengeluaranMenu)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-all shadow-sm text-xs font-bold ${
                  showPengeluaranMenu 
                    ? "bg-slate-100 border-slate-300 text-slate-900" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Columns className="h-3.5 w-3.5" /> Kolom
              </button>

              {/* Menu Checkbox Kolom */}
              {showPengeluaranMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-10 p-2 animate-in fade-in zoom-in-95">
                  <div className="text-[10px] font-bold text-slate-400 mb-2 px-2 uppercase tracking-wider">Tampilkan Kolom</div>
                  {Object.keys(colPengeluaran).map((key) => (
                    <label key={key} className="flex items-center gap-3 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-slate-800 focus:ring-slate-400"
                        checked={colPengeluaran[key as keyof typeof colPengeluaran]} 
                        onChange={() => toggleColPengeluaran(key as keyof typeof colPengeluaran)} 
                      />
                      <span className="text-xs font-medium text-slate-700 capitalize">
                        {key === "namaItem" ? "Nama Item" : key === "hargaSatuan" ? "Harga Satuan" : key === "totalBiaya" ? "Total Biaya" : key}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              {/* THEAD - UPPERCASE ELEGAN */}
              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                <tr>
                  {colPengeluaran.tanggal && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Tanggal</th>}
                  {colPengeluaran.kategori && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Kategori</th>}
                  {colPengeluaran.namaItem && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Nama Item</th>}
                  {colPengeluaran.qty && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Qty</th>}
                  {colPengeluaran.hargaSatuan && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Harga Satuan</th>}
                  {colPengeluaran.totalBiaya && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Total Biaya</th>}
                  {colPengeluaran.aksi && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-center">Aksi</th>}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100/80">
                {pengeluaran.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {colPengeluaran.tanggal && (
                      <td className="px-5 py-4 whitespace-nowrap text-slate-600 font-medium">
                        {new Date(item.rawDate).toLocaleDateString("id-ID")}
                      </td>
                    )}
                    {colPengeluaran.kategori && (
                      <td className="px-5 py-4">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-semibold">
                          {item.category}
                        </span>
                      </td>
                    )}
                    {colPengeluaran.namaItem && (
                      <td className="px-5 py-4 font-bold text-slate-800">{item.title}</td>
                    )}
                    {colPengeluaran.qty && (
                      <td className="px-5 py-4 text-right text-slate-600 font-medium">
                        {item.metaEkstra?.kuantitas || 1} {item.metaEkstra?.satuanKerja}
                      </td>
                    )}
                    {colPengeluaran.hargaSatuan && (
                      <td className="px-5 py-4 text-right text-slate-600 font-medium">
                        {formatRupiah(Number(item.metaEkstra?.hargaSatuan))}
                      </td>
                    )}
                    {colPengeluaran.totalBiaya && (
                      <td className="px-5 py-4 text-right font-black text-slate-800">
                        {formatRupiah(item.metaEkstra?.totalBiaya)}
                      </td>
                    )}
                    {colPengeluaran.aksi && (
                      <td className="px-5 py-4 text-center">
                        <button 
                          onClick={() => onDelete(item.id, "pengeluaran")} 
                          className="text-slate-400 hover:text-red-600 transition-colors font-bold text-xs uppercase tracking-wider"
                        >
                          Hapus
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    {/* 🟢 TABEL PANEN */}
      {panen.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-[13px] font-black text-slate-800 tracking-wider uppercase">Panen</h3>
            
            {/* 🚀 2. Wrapper Dropdown Panen */}
            <div className="relative">
              <button 
                type="button" 
                onClick={() => setShowPanenMenu(!showPanenMenu)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-all shadow-sm text-xs font-bold ${
                  showPanenMenu 
                    ? "bg-slate-100 border-slate-300 text-slate-900" 
                    : "border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Columns className="h-3.5 w-3.5" /> Kolom
              </button>

              {/* Menu Checkbox Kolom Panen */}
              {showPanenMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-10 p-2 animate-in fade-in zoom-in-95">
                  <div className="text-[10px] font-bold text-slate-400 mb-2 px-2 uppercase tracking-wider">Tampilkan Kolom</div>
                  {Object.keys(colPanen).map((key) => (
                    <label key={key} className="flex items-center gap-3 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-slate-800 focus:ring-slate-400"
                        checked={colPanen[key as keyof typeof colPanen]} 
                        onChange={() => toggleColPanen(key as keyof typeof colPanen)} 
                      />
                      <span className="text-xs font-medium text-slate-700 capitalize">
                        {key === "areaSiklus" ? "Area & Siklus" : key === "hargaJual" ? "Harga Jual / Kg" : key === "totalPendapatan" ? "Total Pendapatan" : key}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              {/* THEAD - UPPERCASE ELEGAN */}
             <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                <tr>
                  {colPanen.tanggal && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Tanggal</th>}
                  {colPanen.areaSiklus && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Area & Siklus</th>}
                  {colPanen.kegiatan && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider">Kegiatan</th>}
                  {colPanen.kuantitas && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Kuantitas</th>}
                  {colPanen.hargaJual && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Harga Jual / Kg</th>}
                  {colPanen.totalPendapatan && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-right">Total Pendapatan</th>}
                  {colPanen.aksi && <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-center">Aksi</th>}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100/80">
                {panen.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {colPanen.tanggal && (
                      <td className="px-5 py-4 whitespace-nowrap text-slate-600 font-medium">
                        {new Date(item.rawDate).toLocaleDateString("id-ID")}
                      </td>
                    )}
                    {colPanen.areaSiklus && (
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800">{item.area}</div>
                        <div className="text-[11px] font-medium text-slate-500 mt-0.5">{item.namaSiklus}</div>
                      </td>
                    )}
                    {colPanen.kegiatan && (
                      <td className="px-5 py-4 font-bold text-slate-800">{item.title}</td>
                    )}
                    {colPanen.kuantitas && (
                      <td className="px-5 py-4 text-right text-slate-600 font-medium">
                        {item.metaEkstra?.kuantitasKg} Kg
                      </td>
                    )}
                    {colPanen.hargaJual && (
                      <td className="px-5 py-4 text-right text-slate-600 font-medium">
                        {formatRupiah(item.metaEkstra?.hargaJualPerKg)}
                      </td>
                    )}
                    {colPanen.totalPendapatan && (
                      <td className="px-5 py-4 text-right font-black text-slate-800">
                        {formatRupiah(item.metaEkstra?.totalPendapatan)}
                      </td>
                    )}
                    {colPanen.aksi && (
                      <td className="px-5 py-4 text-center">
                        <button 
                          onClick={() => onDelete(item.id, "panen")} 
                          className="text-slate-400 hover:text-red-600 transition-colors font-bold text-xs uppercase tracking-wider"
                        >
                          Hapus
                        </button>
                      </td>
                    )}
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
