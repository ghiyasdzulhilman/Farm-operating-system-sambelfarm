import { useMemo } from "react";
import { 
  Sprout, Banknote, ChevronRight, MapPin, 
  HardHat, Bug, Clock
} from "lucide-react";
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
}

export function LiveFeedView({ 
  items, 
  onItemClick, 
  feedMode = "time", 
  onStatusChange
}: LiveFeedViewProps) {
  
  // 🧠 LOGIKA GROUPING DINAMIS
  const groupedFeed = useMemo(() => {
    if (feedMode === "time") {
      const labels = ["Hari ini", "Kemarin", "Riwayat Lama"];
      return labels.map(label => ({
        label,
        icon: <Clock className="h-3.5 w-3.5 mr-1.5 inline-block text-muted-foreground" />,
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
        icon: <MapPin className="h-3.5 w-3.5 mr-1.5 inline-block text-muted-foreground" />,
        items: groupItems
      }));
  }, [items, feedMode]);

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground font-medium text-sm">
        Tidak ada aktivitas ditemukan.
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {groupedFeed.map((group) => (
        <div key={group.label} className="space-y-2.5">
          {/* GROUP LABEL CLEAN */}
          <div className="flex items-center px-1">
            <h2 className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest flex items-center">
              {group.icon}
              {group.label}
              <span className="ml-2 px-1.5 py-0.5 bg-muted rounded-md text-[9px] font-bold tracking-normal">{group.items.length} LOG</span>
            </h2>
          </div>

          {/* LIST WRAPPER */}
          <div className="grid grid-cols-1 gap-2">
            {group.items.map((item) => {
              
              // LOGIKA UTAMA IKON SINKRON FORM
              let RenderIcon = <Sprout className="h-4 w-4" />;
              let iconBgClass = "bg-emerald-500/10 text-emerald-600";
              
              if (item.module === "operasional") {
                RenderIcon = <HardHat className="h-4 w-4" />;
                iconBgClass = "bg-blue-500/10 text-blue-600";
              } else if (item.module === "perawatan") {
                RenderIcon = <Sprout className="h-4 w-4" />;
                iconBgClass = "bg-emerald-500/10 text-emerald-600";
              } else if (item.module === "inspeksi") {
                RenderIcon = <Bug className="h-4 w-4" />;
                iconBgClass = "bg-red-500/10 text-red-600";
              } else if (item.module === "finance") {
                const isOut = item.category === "Pengeluaran";
                RenderIcon = <Banknote className="h-4 w-4" />;
                iconBgClass = isOut ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600";
              }

              // LOGIKA STATUS BADGE MINIMALIS
              const isDone = item.status === "Selesai" || item.status === "Sudah ditangani";
              const isProgress = item.status === "Dalam proses" || item.status === "Sedang ditangani";
              const statusStyle = isDone ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                                  isProgress ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
                                  "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";

              return (
                <div 
                  key={item.id} 
                  onClick={() => onItemClick(item)}
                  className="group flex items-center justify-between p-3.5 bg-background border border-border/40 rounded-2xl shadow-sm transition-all duration-200 hover:bg-muted/20 hover:border-border cursor-pointer"
                >
                  {/* SISI KIRI: ICON + TEXT DETAILS */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* AVATAR ICON */}
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105", iconBgClass)}>
                      {RenderIcon}
                    </div>

                    {/* METADATA BLOCK */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold tracking-tight text-foreground/90 truncate group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      
                      {/* SUB-PROPERTIES (HORIZONTAL ALA NOTION COLS) */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] font-medium text-muted-foreground/80">
                        <span className="bg-muted/60 px-1.5 py-0.2 rounded text-[10px] uppercase font-bold tracking-wider">{item.category}</span>
                        <span>•</span>
                        <span className="truncate max-w-[150px]">{item.area}</span>
                        <span>•</span>
                        <span>{item.time}</span>

                        {/* CONDITIONAL INJEKSI BADGE HAMA/PENYAKIT */}
                        {item.module === "inspeksi" && item.metaEkstra?.hama?.length > 0 && (
                          <span className="text-red-600 bg-red-500/5 px-1 rounded text-[10px]">🚨 Hama</span>
                        )}
                        {item.module === "inspeksi" && item.metaEkstra?.penyakit?.length > 0 && (
                          <span className="text-orange-600 bg-orange-500/5 px-1 rounded text-[10px]">🦠 Penyakit</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SISI KANAN: STATUS CONTROLLER & ARROW */}
                  <div className="flex items-center gap-2.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                    {/* STATUS SELECTOR BADGE */}
                    <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border border-current/10", statusStyle)}>
                      <select
                        value={item.status}
                        onChange={(e) => onStatusChange?.(item.id, e.target.value)}
                        className="bg-transparent font-black outline-none cursor-pointer appearance-none pr-0"
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
                    </span>

                    {/* MINIMAL ARROW */}
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
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
