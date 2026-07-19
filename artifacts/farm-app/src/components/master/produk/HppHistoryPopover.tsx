import { useState } from "react";
import { format } from "date-fns";
import { Info, Calculator, Receipt, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface HppHistoryProps {
  history: any; // Menerima data _hppHistory dari backend
  satuanDasar: string;
}

export function HppHistoryPopover({ history, satuanDasar }: HppHistoryProps) {
  const [open, setOpen] = useState(false);

  // Helper pemformatan uang bulat
  const formatRp = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(angka);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className="flex items-center justify-center h-6 w-6 rounded-full text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all focus:outline-none"
          title="Detail Kalkulasi HPP"
          onClick={(e) => e.stopPropagation()} // Cegah trigger klik ke elemen induk
        >
          <Info className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      
      {/* z-[9999] memastikan popover mengambang di atas semua elemen lain */}
      <PopoverContent 
        className="w-[300px] p-0 rounded-2xl shadow-xl border-border/50 z-[9999] overflow-hidden" 
        side="top" 
        align="end"
        sideOffset={8}
      >
        {/* HEADER POPOVER */}
        <div className="bg-muted/30 p-3.5 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary shadow-sm">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-[11px] font-black uppercase tracking-wider text-foreground">Detail Kalkulasi HPP</h4>
              <p className="text-[9px] text-muted-foreground font-medium mt-0.5">
                {history?.tanggal ? `Update: ${format(new Date(history.tanggal), "dd MMM yyyy, HH:mm")}` : "Harga Awal / Input Manual"}
              </p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-muted-foreground/50 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

       {/* BODY (ISI STRUK) */}
        <div className="p-4 text-xs space-y-4.5 bg-card">
          {!history ? (
        // KONDISI A: BELUM ADA TRANSAKSI PEMBELIAN
            <div className="text-center text-muted-foreground py-3">
              <Calculator className="h-8 w-8 opacity-20 mx-auto mb-2" />
              <p className="font-bold text-foreground/70 text-[11px]">Belum ada riwayat pembelian.</p>
              <p className="text-[9px] mt-1 leading-relaxed">
                HPP saat ini murni menggunakan harga dari input manual atau nilai stok awal.
              </p>
            </div>
          ) : (
       // KONDISI B: ADA TRANSAKSI PEMBELIAN ATAU STOK AWAL
            <>
              {/* Bagian A: Aset Lama */}
              <div className="space-y-1.5">
                <div className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] border border-border/50">A</span>
                  Sisa Gudang (Aset Lama)
                </div>
                <div className="pl-5.5 font-medium flex justify-between items-end border-b border-dashed border-border/50 pb-2">
                  <div className="text-muted-foreground/80 text-[10px]">
                    {history.stokSebelum} {satuanDasar} <span className="text-[9px] mx-0.5">×</span> {formatRp(history.hargaHppSebelum)}
                  </div>
                  <div className="font-bold text-foreground">
                    {formatRp(history.stokSebelum * history.hargaHppSebelum)}
                  </div>
                </div>
              </div>

            {/* Bagian B: Dinamis */}
              <div className="space-y-1.5">
                <div className="font-bold text-primary uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[9px] border border-primary/20">B</span>
                  {/* 🚀 FIX: Tambah deteksi teks Koreksi HPP */}
                  {history.tipe === "stok_awal" ? "Stok Awal (Input Master)" : history.tipe === "penyesuaian_harga" ? "Koreksi Valuasi Manual" : "Beli Baru (Via Nota)"}
                </div>
                <div className="pl-5.5 font-medium flex justify-between items-end border-b border-dashed border-border/50 pb-2">
                  {/* 🚀 FIX: Kosongkan rincian qty x harga khusus buat penyesuaian manual karena ini adalah nilai selisih murni */}
                  {history.tipe === "penyesuaian_harga" ? (
                    <div className="text-muted-foreground/80 text-[10px] italic">
                      Selisih revaluasi aset
                    </div>
                  ) : (
                    <div className="text-muted-foreground/80 text-[10px]">
                      {history.qtyBeli} {satuanDasar} <span className="text-[9px] mx-0.5">×</span> {formatRp(history.qtyBeli > 0 ? history.nilaiPembelianBaru / history.qtyBeli : 0)}
                    </div>
                  )}
                  <div className="font-bold text-foreground">
                    {formatRp(history.nilaiPembelianBaru)}
                  </div>
                </div>
              </div>

              {/* Bagian C: Dinamis */}
              <div className="space-y-2 pt-1">
                <div className="font-bold text-emerald-600 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-[9px] border border-emerald-500/20">C</span>
                  {/* 🚀 FIX: Teks kesimpulan yang relevan dengan tipe */}
                  {history.tipe === "stok_awal" ? "Penetapan HPP Awal" : history.tipe === "penyesuaian_harga" ? "HPP Setelah Dikoreksi" : "Rata-rata Tertimbang"}
                </div>

                <div className="pl-5.5 space-y-1.5 bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Total Aset (A + B)</span>
                    <span className="font-semibold text-foreground/80">{formatRp((history.stokSebelum * history.hargaHppSebelum) + history.nilaiPembelianBaru)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground border-b border-emerald-500/10 pb-1.5">
                    <span>Total Fisik Gudang</span>
                    <span className="font-semibold text-foreground/80">{history.stokSesudah} {satuanDasar}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5">
                    <span className="font-bold text-foreground text-[11px]">HPP Baru</span>
                    <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                      {formatRp(history.hargaHppSesudah)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* FOOTER DISCLAIMER */}
        <div className="bg-amber-500/10 p-2.5 text-[9px] text-amber-700 dark:text-amber-500/90 text-center border-t border-amber-500/20">
          Angka per <b>{satuanDasar}</b> dihitung via metode Rata-rata Tertimbang (Moving Average).
        </div>
      </PopoverContent>
    </Popover>
  );
}
