import { useMemo } from "react";
import { 
  Sprout, Banknote, ChevronRight, ChevronDown, MapPin, 
  HardHat, Bug, Trash2, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";
import { motion } from "framer-motion";

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
    <div className="space-y-8 pb-10">
      {groupedFeed.map((group) => (
        <div key={group.label} className="space-y-1">
          <div className="flex items-center px-2 mb-2">
            <h2 className="text-[11px] font-semibold text-muted-foreground/80 flex items-center">
              {group.icon}
              {group.label}
              <span className="ml-2 px-1.5 bg-muted/50 rounded-md text-[10px]">{group.items.length}</span>
            </h2>
          </div>

          <div className="flex flex-col border-t border-border/40">
            {group.items.map((item) => {
              let RenderIcon = <Sprout className="h-4 w-4 text-muted-foreground" />;
              let iconColor = "text-muted-foreground";
              
              if (item.module === "operasional") {
                RenderIcon = <HardHat className="h-4 w-4" />;
                iconColor = "text-blue-500";
              } else if (item.module === "perawatan") {
                RenderIcon = <Sprout className="h-4 w-4" />;
                iconColor = "text-emerald-500";
              } else if (item.module === "inspeksi") {
                RenderIcon = <Bug className="h-4 w-4" />;
                iconColor = "text-red-500";
              } else if (item.module === "finance") {
                RenderIcon = <Banknote className="h-4 w-4" />;
                iconColor = item.category === "Pengeluaran" ? "text-red-500" : "text-emerald-500";
              }

              const isDone = item.status === "Selesai" || item.status === "Sudah ditangani";
              const isProgress = item.status === "Dalam proses" || item.status === "Sedang ditangani";
              const statusDotColor = isDone ? "bg-emerald-500" : isProgress ? "bg-amber-500" : "bg-blue-500";

              return (
                <div key={item.id} className="relative w-full overflow-hidden bg-background">
                  {/* TOMBOL HAPUS */}
                  <div className="absolute inset-y-0 right-0 w-[80px] flex items-center justify-center bg-secondary">
                    <button 
                      onClick={() => onDelete?.(item.id, item.module)}
                      className="flex flex-col items-center justify-center h-full w-full text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* BARIS UTAMA */}
                  <motion.div 
                    drag="x"
                    dragDirectionLock={true}
                    dragConstraints={{ left: -80, right: 0 }} 
                    dragElastic={{ left: 0.1, right: 0 }} 
                    className="relative flex items-center gap-3 bg-background border-b border-border/40 p-3 hover:bg-muted/20 z-10 cursor-grab active:cursor-grabbing transition-colors"
                  >
                    <div className={cn("flex shrink-0 items-center justify-center w-8", iconColor)}>
                      {RenderIcon}
                    </div>

                    <div className="min-w-0 flex-1 cursor-pointer py-1" onClick={() => onItemClick(item)}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-semibold text-foreground truncate">{item.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground/80 truncate">
                        <span>{item.area}</span>
                        <span>•</span>
                        <span>{item.time}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 cursor-auto">
                      <div className="relative flex items-center bg-muted/30 rounded-md px-2 py-1">
                        <div className={cn("w-2 h-2 rounded-full mr-2", statusDotColor)} />
                        <select
                          value={item.status}
                          onChange={(e) => onStatusChange?.(item.id, e.target.value)}
                          className="appearance-none bg-transparent text-[11px] font-medium outline-none cursor-pointer pr-4 text-muted-foreground"
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
                        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 opacity-40" />
                      </div>
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
