import { Clipboard, Inbox, Timer, Calendar, ShoppingBasket, MapPin, Package, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

// 🚀 THE FIX: Tambahkan prop `mode` dengan default "agronomi"
export function SummaryHeader({ 
  feedData, 
  meta, 
  mode = "agronomi" 
}: { 
  feedData: AgronomyItem[], 
  meta?: any, 
  mode?: "agronomi" | "finance" 
}) {
  
  // ==========================================
  // 1. KALKULASI MODE AGRONOMI
  // ==========================================
  const todayCount = feedData.filter((i) => i.dateLabel === "Hari ini").length;
  const doneCount = feedData.filter((i) => i.status === "Selesai" || i.status === "Sudah ditangani").length;
  const progressCount = feedData.filter((i) => i.status === "Dalam proses" || i.status === "Sedang ditangani").length;
  const todoCount = feedData.filter((i) => i.status === "Belum dikerjakan" || i.status === "Baru ditemukan").length;

  // ==========================================
  // 2. KALKULASI MODE FINANCE
  // ==========================================
  let totalPanenRp = 0, totalPanenKg = 0;
  let biayaArea = 0, biayaStok = 0, biayaUmum = 0;

  if (mode === "finance") {
    feedData.forEach(item => {
      if (item.module === "panen") {
        totalPanenRp += (item.metaEkstra?.totalPendapatan || 0);
        totalPanenKg += Number(item.metaEkstra?.kuantitasKg || 0);
      } else if (item.module === "pengeluaran") {
        const biaya = item.metaEkstra?.totalBiaya || 0;
        if (item.metaEkstra?.isPembelianStok) {
          biayaStok += biaya;
        } else if (!item.areaId || item.area === "Area Master" || item.area === "-") {
          biayaUmum += biaya;
        } else {
          biayaArea += biaya;
        }
      }
    });
  }

  // HELPER: Format Angka Cerdas (Singkat M/Jt untuk nominal besar biar rapi di HP)
  const formatUang = (angka: number) => {
    if (angka >= 1_000_000_000) return `Rp ${(angka / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
    if (angka >= 1_000_000) return `Rp ${(angka / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} Jt`;
    return `Rp ${angka.toLocaleString('id-ID')}`;
  };

  // ==========================================
  // 3. RENDER KARTU FINANCE
  // ==========================================
  if (mode === "finance") {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* 1. Panen - Emerald */}
        <SummaryCard 
          title="Hasil Panen" 
          value={formatUang(totalPanenRp)} 
          detail={`${totalPanenKg.toLocaleString('id-ID')} Kg ditarik`} 
          icon={ShoppingBasket} 
          tint="bg-emerald-500/10 text-emerald-600" 
          hoverGlow="hover:shadow-[0_16px_40px_-4px_rgba(16,185,129,0.15)] hover:border-emerald-500/30"
        />
        {/* 2. Biaya Kebun - Indigo */}
        <SummaryCard 
          title="Biaya Kebun" 
          value={formatUang(biayaArea)} 
          detail="operasional area" 
          icon={MapPin} 
          tint="bg-indigo-500/10 text-indigo-600" 
          hoverGlow="hover:shadow-[0_16px_40px_-4px_rgba(99,102,241,0.15)] hover:border-indigo-500/30"
        />
        {/* 3. Aset Gudang - Teal */}
        <SummaryCard 
          title="Beli Stok" 
          value={formatUang(biayaStok)} 
          detail="masuk gudang" 
          icon={Package} 
          tint="bg-teal-500/10 text-teal-600" 
          hoverGlow="hover:shadow-[0_16px_40px_-4px_rgba(20,184,166,0.15)] hover:border-teal-500/30"
        />
        {/* 4. Biaya Umum - Rose */}
        <SummaryCard 
          title="Biaya Umum" 
          value={formatUang(biayaUmum)} 
          detail="gaji & overhead" 
          icon={Building2} 
          tint="bg-rose-500/10 text-rose-600" 
          hoverGlow="hover:shadow-[0_16px_40px_-4px_rgba(244,63,94,0.15)] hover:border-rose-500/30"
        />
      </div>
    );
  }

  // ==========================================
  // 4. RENDER KARTU AGRONOMI (BAWAAN)
  // ==========================================
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {/* 1. Aktivitas - Teal & Clipboard */}
      <SummaryCard 
        title="Aktivitas" 
        value={todayCount} 
        detail="hari ini" 
        icon={Clipboard} 
        tint="bg-teal-500/10 text-teal-600" 
        hoverGlow="hover:shadow-[0_16px_40px_-4px_rgba(20,184,166,0.15)] hover:border-teal-500/30"
      />
      {/* 2. Selesai - Emerald & Inbox */}
      <SummaryCard 
        title="Selesai" 
        value={doneCount} 
        detail="sudah ditutup" 
        icon={Inbox} 
        tint="bg-emerald-500/10 text-emerald-600" 
        hoverGlow="hover:shadow-[0_16px_40px_-4px_rgba(16,185,129,0.15)] hover:border-emerald-500/30"
      />
      {/* 3. Proses - Amber & Timer */}
      <SummaryCard 
        title="Proses" 
        value={progressCount} 
        detail="sedang jalan" 
        icon={Timer} 
        tint="bg-amber-500/10 text-amber-600" 
        hoverGlow="hover:shadow-[0_16px_40px_-4px_rgba(245,158,11,0.15)] hover:border-amber-500/30"
      />
      {/* 4. Tertunda - Slate & Calendar */}
      <SummaryCard 
        title="Tertunda" 
        value={todoCount} 
        detail="belum selesai" 
        icon={Calendar} 
        tint="bg-slate-500/10 text-slate-600" 
        hoverGlow="hover:shadow-[0_16px_40px_-4px_rgba(100,116,139,0.15)] hover:border-slate-500/30"
      />
    </div>
  );
}

// Komponen Card tidak berubah, tetap di bawah sini
function SummaryCard({ title, value, detail, icon: Icon, tint, hoverGlow }: any) {
  return (
    <div className={cn(
      "group relative rounded-[1.5rem] border border-border/40 bg-card/60 backdrop-blur-md p-5 text-left",
      "shadow-[0_12px_30px_-4px_rgba(0,0,0,0.06)] transition-all duration-500 ease-out hover:-translate-y-0.5",
      hoverGlow
    )}>
      
      <div className="pr-12">
        {/* ✨ Sengaja pake truncate biar kalau layarnya kekecilan teksnya tetap rapi */}
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 truncate">{title}</p>
        <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground truncate" title={String(value)}>{value}</p>
        <p className="mt-1 text-[11px] font-medium tracking-wide text-muted-foreground/80 truncate">{detail}</p>
      </div>

      <div className={cn(
        "absolute right-5 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-2xl",
        "transition-all duration-500 group-hover:scale-110",
        "shadow-[0_4px_10px_rgba(0,0,0,0.05)] shadow-[inset_0_1px_4px_rgba(255,255,255,0.4)] border border-white/20", 
        tint
      )}>
        <Icon className="h-[22px] w-[22px]" strokeWidth={2.5} />
      </div>
      
    </div>
  );
}
