import { useMemo } from "react";
import { 
  Sprout, HardHat, Bug, Banknote, ChevronRight, ChevronDown, MapPin, CalendarClock, Trash2, GripVertical 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

type RichAgronomyItem = AgronomyItem & {
  metaEkstra?: Record<string, any>;
};

interface LiveFeedViewProps {
  items: RichAgronomyItem[];
  onItemClick: (item: RichAgronomyItem) => void;
  feedMode?: "time" | "area"; 
  onStatusChange?: (id: string, status: string) => void; 
  onDelete?: (id: string, module: string) => void; 
}

export function LiveFeedView({ 
  items, 
  onItemClick, 
  feedMode = "time", 
  onStatusChange,
  onDelete 
}: LiveFeedViewProps) {
  
  const groupedFeed = useMemo(() => {
    if (feedMode === "time") {
      const labels = ["Hari ini", "Kemarin", "Riwayat Lama"];
      return labels.map(label => ({
        label,
        icon: null,
        items: items.filter(item => item.dateLabel === label)
      })).filter(group => group.items.length > 0);
    } 
    
    const areaMap = new Map<string, RichAgronomyItem[]>();
    items.forEach(item => {
      const areaName = item.area || "Area Tanpa Blok";
      if (!areaMap.has(areaName)) areaMap.set(areaName, []);
      areaMap.get(areaName)!.push(item);
    });

    return Array.from(areaMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0])) 
      .map(([label, groupItems]) => ({
        label,
        icon: <MapPin className="h-4 w-4 mr-2 inline-block text-primary" />,
        items: groupItems
      }));
  }, [items, feedMode]);

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground font-medium text-sm border border-border/60 rounded-3xl bg-card/50 backdrop-blur-sm shadow-sm">
        Tidak ada aktivitas ditemukan.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groupedFeed.map((group) => (
        <div key={group.label} className="space-y-3.5">
          
          {/* ✨ HEADER GRUP: Tipografi dihaluskan, tidak lagi 'font-black' */}
          <div className="flex items-center justify-between border-b border-border/40 pb-2.5 px-1">
            <h2 className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground/80 flex items-center">
              {group.icon}
              {group.label}
            </h2>
            <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/40">
              {group.items.length} log
            </span>
          </div>

          <div className="space-y-3">
            {group.items.map((item) => {
              // 1. LOGIKA WARNA & IKON MODUL (Sinkron dengan palet modern kita)
              let RenderIcon = <Sprout className="h-4 w-4" />;
              let iconColorClass = "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
              
              if (item.module === "operasional") {
                RenderIcon = <HardHat className="h-4 w-4" />;
                iconColorClass = "bg-teal-500/10 text-teal-600 border border-teal-500/20"; // ✨ Pakai Teal biar konsisten
              } else if (item.module === "inspeksi") {
                RenderIcon = <Bug className="h-4 w-4" />;
                iconColorClass = "bg-rose-500/10 text-rose-600 border border-rose-500/20"; // ✨ Pakai Rose untuk alert
              } else if (item.module === "finance") {
                RenderIcon = <Banknote className="h-4 w-4" />;
                iconColorClass = item.category === "Pengeluaran" 
                  ? "bg-rose-500/10 text-rose-600 border border-rose-500/20" 
                  : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
              }

              // ✨ 2. LOGIKA WARNA STATUS DOT (Biar user tahu status tanpa swipe)
              let statusDot = "bg-slate-400";
              if (item.status === "Selesai" || item.status === "Sudah ditangani") statusDot = "bg-emerald-500";
              else if (item.status === "Dalam proses" || item.status === "Sedang ditangani") statusDot = "bg-amber-500";

              // 3. LOGIKA FORMAT JADWAL 
              const startDate = new Date(item.rawDate);
              const endDate = item.metaEkstra?.waktuSelesai ? new Date(item.metaEkstra.waktuSelesai) : null;
              
              const formatDate = (d: Date) => d.toLocaleDateString("id-ID", { day: '2-digit', month: '2-digit', year: 'numeric' });
              const formatTime = (d: Date) => d.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
              
              const startDStr = formatDate(startDate);
              const startTStr = formatTime(startDate);
              let scheduleDisplay = `${startDStr} • ${startTStr}`; // ✨ Pakai bullet agar lebih rapi dari pipe |
              
              if (endDate) {
                const endDStr = formatDate(endDate);
                const endTStr = formatTime(endDate);
                scheduleDisplay = startDStr === endDStr 
                  ? `${startDStr} • ${startTStr} - ${endTStr}` 
                  : `${startDStr} - ${endDStr} • ${startTStr} - ${endTStr}`;
              }

              return (
                <div key={item.id} className="group relative w-full overflow-hidden rounded-[1.25rem] border border-border/50 bg-card/80 backdrop-blur-sm shadow-[0_4px_16px_-4px_rgba(0,0,0,0.03)] transition-all duration-300 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.06)] hover:border-border">
                  
                  <div className="flex w-full overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                    {/* 🌟 MUKA KARTU (Tampilan Depan) */}
                    <div 
                      className="w-full shrink-0 snap-center p-4 cursor-pointer bg-transparent transition-colors hover:bg-muted/10"
                      onClick={() => onItemClick(item)}
                    >
                      {/* HEADER: Ikon, Kategori, Nominal & Waktu Relatif */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className={cn("relative flex h-8 w-8 items-center justify-center rounded-xl shadow-sm", iconColorClass)}>
                            {RenderIcon}
                            {item.isPendingStaging && <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />}
                          </div>
                          
                          <Badge variant="secondary" className="rounded-lg bg-muted/70 text-muted-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-border/30">
                            {item.category}
                          </Badge>

                          {item.module === "finance" && item.metaEkstra?.nominal && (
                            <Badge variant="outline" className="rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 px-2 py-0.5 text-[11px] font-mono font-bold">
                              Rp {(item.metaEkstra.nominal).toLocaleString('id-ID')}
                            </Badge>
                          )}
                        </div>

                        {/* Waktu Relatif & Status Dot */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn("h-2 w-2 rounded-full", statusDot)} title={`Status: ${item.status}`} />
                          <span className="text-[11px] font-medium text-muted-foreground/80 tracking-tight">
                            {item.time}
                          </span>
                        </div>
                      </div>

                      {/* TENGAH: Judul, Area & Grip Hint */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 pr-1">
                          {/* ✨ Judul pakai font-bold (bukan font-black) dan text-sm/text-base */}
                          <h3 className="text-[15px] font-bold text-foreground tracking-tight leading-snug truncate">
                            {item.title}
                          </h3>
                          
                          <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80 truncate">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                            <span className="truncate">
                              {item.namaSiklus && item.namaSiklus !== "-" ? `${item.area} - ${item.namaSiklus}` : item.area}
                            </span>
                          </div>
                        </div>

                        {/* ✨ SWIPE AFFORDANCE HINT: Ikon Grip + Chevron yang memberi tahu kartu bisa digeser */}
                        <div className="flex items-center gap-0.5 shrink-0 self-center text-muted-foreground/40 group-hover:text-muted-foreground/80 transition-colors">
                          <GripVertical className="h-4 w-4 hidden md:inline-block" title="Geser ke kiri untuk aksi" />
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>

                      {/* BAWAH: Jadwal */}
                      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/90 pt-2 border-t border-border/30">
                        <CalendarClock className="h-3.5 w-3.5 text-primary/80 shrink-0" />
                        <span className="truncate font-mono">{scheduleDisplay}</span>
                      </div>

                    </div>

                    {/* 🌟 AREA BELAKANG (Muncul Pas Di-Swipe Kiri) */}
                    <div className="flex shrink-0 snap-center items-center justify-end gap-2.5 bg-muted/40 px-5 border-l border-border/50">
                      
                      {/* DROPDOWN STATUS TERSORONG (Sinkron dengan warna Slate/Amber/Emerald) */}
                      <div className="relative inline-block">
                        <select
                          value={item.status}
                          onChange={(e) => onStatusChange?.(item.id, e.target.value)}
                          disabled={item.isPendingStaging}
                          className={cn(
                            "appearance-none rounded-xl px-3.5 py-2 pr-8 text-[11px] font-bold uppercase tracking-wider outline-none cursor-pointer border transition-all shadow-sm",
                            (item.status === "Selesai" || item.status === "Sudah ditangani") ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                            (item.status === "Dalam proses" || item.status === "Sedang ditangani") ? "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                            "border-slate-500/30 bg-slate-500/15 text-slate-700 dark:text-slate-400",
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
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none opacity-70" />
                      </div>

                      {/* TOMBOL HAPUS */}
                      <button 
                        onClick={() => onDelete?.(item.id, item.module)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all shadow-sm hover:scale-105"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
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
