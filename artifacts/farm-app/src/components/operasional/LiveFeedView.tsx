import { useMemo } from "react";
import { 
  Sprout, HardHat, Bug, Banknote, ChevronRight, ChevronDown, MapPin, CalendarClock, Trash2 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

// Perpanjang tipe bawaan agar mengenali metaEkstra dari backend tanpa error TS
type RichAgronomyItem = AgronomyItem & {
  metaEkstra?: Record<string, any>;
};

interface LiveFeedViewProps {
  items: RichAgronomyItem[];
  onItemClick: (item: RichAgronomyItem) => void;
  feedMode?: "time" | "area"; 
  onStatusChange?: (id: string, status: string) => void; 
  onDelete?: (id: string, module: string) => void; // 👈 Tambahin baris ini
}

export function LiveFeedView({ 
  items, 
  onItemClick, 
  feedMode = "time", 
  onStatusChange 
}: LiveFeedViewProps) {
  
  // 🧠 LOGIKA GROUPING DINAMIS (WAKTU vs AREA PIVOT)
  const groupedFeed = useMemo(() => {
    if (feedMode === "time") {
      const labels = ["Hari ini", "Kemarin", "Riwayat Lama"];
      return labels.map(label => ({
        label,
        icon: null,
        items: items.filter(item => item.dateLabel === label)
      })).filter(group => group.items.length > 0);
    } 
    
    // Mode "area": Kumpulkan semua aktivitas berdasarkan LabaRugiId / Nama Area
    const areaMap = new Map<string, RichAgronomyItem[]>();
    items.forEach(item => {
      const areaName = item.area || "Area Tanpa Blok";
      if (!areaMap.has(areaName)) areaMap.set(areaName, []);
      areaMap.get(areaName)!.push(item);
    });

    return Array.from(areaMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0])) // Urutkan nama area A-Z
      .map(([label, groupItems]) => ({
        label,
        icon: <MapPin className="h-4 w-4 mr-2 inline-block text-primary" />,
        items: groupItems
      }));
  }, [items, feedMode]);

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground font-bold text-sm border border-border/60 rounded-3xl bg-card shadow-sm">
        Tidak ada aktivitas ditemukan.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupedFeed.map((group) => (
        <div key={group.label} className="space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center">
              {group.icon}
              {group.label}
            </h2>
            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {group.items.length} log
            </span>
          </div>

          <div className="space-y-3">
                      {group.items.map((item) => {
              // 1. LOGIKA WARNA & IKON
              let RenderIcon = <Sprout className="h-4 w-4" />;
              let iconColorClass = "bg-emerald-500/10 text-emerald-600";
              
              if (item.module === "operasional") {
                RenderIcon = <HardHat className="h-4 w-4" />;
                iconColorClass = "bg-blue-500/10 text-blue-600";
              } else if (item.module === "inspeksi") {
                RenderIcon = <Bug className="h-4 w-4" />;
                iconColorClass = "bg-red-500/10 text-red-600";
              } else if (item.module === "finance") {
                RenderIcon = <Banknote className="h-4 w-4" />;
                iconColorClass = item.category === "Pengeluaran" ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600";
              }

              // 2. LOGIKA FORMAT JADWAL 
              const startDate = new Date(item.rawDate);
              const endDate = item.metaEkstra?.waktuSelesai ? new Date(item.metaEkstra.waktuSelesai) : null;
              
              const formatDate = (d: Date) => d.toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
              const formatTime = (d: Date) => d.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
              
              const startDStr = formatDate(startDate);
              const startTStr = formatTime(startDate);
              let scheduleDisplay = `${startDStr} | ${startTStr}`;
              
              if (endDate) {
                const endDStr = formatDate(endDate);
                const endTStr = formatTime(endDate);
                scheduleDisplay = startDStr === endDStr 
                  ? `${startDStr} | ${startTStr} - ${endTStr}` 
                  : `${startDStr} - ${endDStr} | ${startTStr} - ${endTStr}`;
              }

              return (
                // CONTAINER UTAMA (Menyembunyikan konten yang meluber)
                <div key={item.id} className="group relative w-full overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm transition-all hover:shadow-md">
                  
                  {/* CONTAINER SWIPE NATIVE (Bisa digeser ke kiri/kanan di HP) */}
                  <div className="flex w-full overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                    {/* 🌟 MUKA KARTU (Tampilan Depan) */}
                    <div 
                      className="w-full shrink-0 snap-center p-4 cursor-pointer bg-card"
                      onClick={() => onItemClick(item)}
                    >
                      {/* HEADER: Ikon, Modul, dan Jam Sejajar */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", iconColorClass)}>
                            {RenderIcon}
                            {item.isPendingStaging && <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-amber-500 animate-pulse" />}
                          </div>
                          <Badge variant="secondary" className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                            {item.category}
                          </Badge>
                          {item.module === "finance" && item.metaEkstra?.nominal && (
                             <Badge variant="outline" className="rounded-full bg-emerald-500/10 text-emerald-700 border-emerald-500/20 px-2 py-0 text-[10px] font-mono">
                               Rp {(item.metaEkstra.nominal).toLocaleString('id-ID')}
                             </Badge>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground/60 tracking-wide">
                          {item.time}
                        </span>
                      </div>

                      {/* TENGAH: Judul, Area & Panah */}
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1 pr-4">
                          <h3 className="text-base font-black tracking-tight truncate">{item.title}</h3>
                          <p className="mt-0.5 text-sm text-muted-foreground truncate">{item.area}</p>
                        </div>
                        <div className="shrink-0 rounded-full bg-muted/40 p-1.5 transition-colors">
                           <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>

                      {/* BAWAH: Jadwal */}
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground bg-muted/40 w-max px-2.5 py-1 rounded-md">
                        <CalendarClock className="h-3.5 w-3.5 text-primary/70" />
                        {scheduleDisplay}
                      </div>
                    </div>

                    {/* 🌟 AREA BELAKANG (Muncul Pas Di-Swipe Kiri) */}
                    <div className="flex shrink-0 snap-center items-center justify-end gap-3 bg-muted/20 px-5 border-l border-border/40">
                      
                      {/* DROPDOWN STATUS TERSORONG */}
                      <div className="relative inline-block">
                        <select
                          value={item.status}
                          onChange={(e) => onStatusChange?.(item.id, e.target.value)}
                          disabled={item.isPendingStaging}
                          className={cn(
                            "appearance-none rounded-2xl px-4 py-2.5 pr-9 text-[11px] font-bold uppercase tracking-wider outline-none cursor-pointer border transition-all shadow-sm",
                            (item.status === "Selesai" || item.status === "Sudah ditangani") ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" :
                            (item.status === "Dalam proses" || item.status === "Sedang ditangani") ? "border-amber-500/20 bg-amber-500/10 text-amber-700" :
                            "border-muted-foreground/30 bg-background text-foreground",
                            item.isPendingStaging && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {item.module === "inspeksi" ? (
                            <>
                              <option value="Baru ditemukan">Baru</option>
                              <option value="Sedang ditangani">Proses</option>
                              <option value="Sudah ditangani">Selesai</option>
                            </>
                          ) : (
                            <>
                              <option value="Belum dikerjakan">Belum</option>
                              <option value="Dalam proses">Proses</option>
                              <option value="Selesai">Selesai</option>
                            </>
                          )}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none opacity-60" />
                      </div>

                      {/* TOMBOL HAPUS */}
                      <button 
                        onClick={() => onDelete?.(item.id, item.module)}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>

                    </div>

                  </div>
                </div>
              );
            })}

          </div>
        </div>
      ))}
    </div>
  );
}
