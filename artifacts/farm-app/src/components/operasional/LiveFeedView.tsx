import { useMemo } from "react";
import { 
  Sprout, Leaf, Wrench, Banknote, ChevronRight, ChevronDown, MapPin 
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
  feedMode?: "time" | "area"; // State mode tampilan dari AgronomyHubPage
  onStatusChange?: (id: string, status: string) => void; // Hook mutasi status
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
              // LOGIKA WARNA IKON
              let iconColorClass = "bg-primary/10 text-primary";
              if (item.module === "finance") {
                iconColorClass = item.category === "Pengeluaran" ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600";
              }

              return (
                <div key={item.id} className="group relative w-full rounded-3xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    
                    {/* BAGIAN KIRI: IKON & INDIKATOR STAGING */}
                    <div className={cn("relative mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", iconColorClass)}>
                      {item.icon === "sprout" && <Sprout className="h-5 w-5" />}
                      {item.icon === "leaf" && <Leaf className="h-5 w-5" />}
                      {item.icon === "wrench" && <Wrench className="h-5 w-5" />}
                      {item.icon === "banknote" && <Banknote className="h-5 w-5" />}
                      {item.isPendingStaging && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-amber-500 animate-pulse" title="Menunggu Sync" />}
                    </div>

                    {/* BAGIAN TENGAH: KONTEN UTAMA (KLIKABEL) */}
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onItemClick(item)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">{item.time}</span>
                        <Badge variant="secondary" className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {item.category}
                        </Badge>

                        {/* 💎 INJEKSI RICH DATA DARI BACKEND */}
                        {item.module === "inspeksi" && item.metaEkstra?.hama?.length > 0 && (
                           <Badge variant="outline" className="rounded-full bg-red-500/10 text-red-700 border-red-500/20 px-2 py-0 text-[10px]">
                             🚨 Hama
                           </Badge>
                        )}
                        {item.module === "inspeksi" && item.metaEkstra?.penyakit?.length > 0 && (
                           <Badge variant="outline" className="rounded-full bg-orange-500/10 text-orange-700 border-orange-500/20 px-2 py-0 text-[10px]">
                             🦠 Penyakit
                           </Badge>
                        )}
                        {item.module === "finance" && item.metaEkstra?.nominal && (
                           <Badge variant="outline" className="rounded-full bg-emerald-500/10 text-emerald-700 border-emerald-500/20 px-2 py-0 text-[10px] font-mono">
                             Rp {(item.metaEkstra.nominal).toLocaleString('id-ID')}
                           </Badge>
                        )}
                      </div>

                      <h3 className="mt-2 text-base font-black tracking-tight truncate pr-4">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground truncate">{item.area}</p>
                    </div>

                    {/* BAGIAN KANAN: KONTROL & AKSI */}
                    <div className="flex shrink-0 flex-col items-end justify-between gap-3 h-full">
                      
                      {/* INLINE STATUS MODIFIER (Gaya Badge) */}
                      <div className="relative inline-block">
                        <select
                          value={item.status}
                          onChange={(e) => onStatusChange?.(item.id, e.target.value)}
                          disabled={item.isPendingStaging}
                          className={cn(
                            "appearance-none rounded-full px-2.5 py-1 pr-6 text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer border transition-all shadow-sm",
                            item.status === "Selesai" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20" :
                            item.status === "Dalam proses" ? "border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20" :
                            "border-muted-foreground/20 bg-muted/20 text-muted-foreground hover:bg-muted/40",
                            item.isPendingStaging && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <option value="Belum dikerjakan">Belum</option>
                          <option value="Dalam proses">Proses</option>
                          <option value="Selesai">Selesai</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none opacity-60" />
                      </div>

                      {/* TOMBOL DETAIL ARROW */}
                      <button 
                        onClick={() => onItemClick(item)} 
                        className="rounded-full bg-muted/40 p-1.5 hover:bg-primary/10 hover:text-primary transition-colors"
                        title="Lihat Detail"
                      >
                         <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
