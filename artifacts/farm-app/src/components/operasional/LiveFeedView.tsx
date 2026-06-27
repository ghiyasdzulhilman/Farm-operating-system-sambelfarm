import { useMemo } from "react";
import { 
  Sprout, Banknote, ChevronRight, ChevronDown, MapPin, 
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
        icon: <Clock className="h-4 w-4 mr-1.5 inline-block opacity-70" />,
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
        icon: <MapPin className="h-4 w-4 mr-1.5 inline-block opacity-70" />,
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
    <div className="space-y-6 text-left pb-10">
      {groupedFeed.map((group) => (
        <div key={group.label} className="space-y-3">
          
          {/* HEADER GROUP */}
          <div className="flex items-center px-4">
            <h2 className="text-sm font-medium text-foreground/80 flex items-center">
              {group.icon}
              {group.label}
            </h2>
          </div>

          {/* 🌟 GLASSMORPHISM CARD UTAMA (Sesuai Gambar) */}
          <div className="mx-2 overflow-hidden rounded-[2rem] bg-card/40 dark:bg-card/20 backdrop-blur-2xl border border-white/20 dark:border-white/5 shadow-lg shadow-black/5">
            {group.items.map((item, index) => {
              
              // IKON SESUAI MODUL
              let RenderIcon = <Sprout className="h-6 w-6" />;
              let iconBg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
              
              if (item.module === "operasional") {
                RenderIcon = <HardHat className="h-6 w-6" />;
                iconBg = "bg-blue-500/10 text-blue-600 dark:text-blue-400";
              } else if (item.module === "perawatan") {
                RenderIcon = <Sprout className="h-6 w-6" />;
                iconBg = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
              } else if (item.module === "inspeksi") {
                RenderIcon = <Bug className="h-6 w-6" />;
                iconBg = "bg-red-500/10 text-red-600 dark:text-red-400";
              } else if (item.module === "finance") {
                const isOut = item.category === "Pengeluaran";
                RenderIcon = <Banknote className="h-6 w-6" />;
                iconBg = isOut ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600";
              }

              // STATUS TEXT WARNA
              const isDone = item.status === "Selesai" || item.status === "Sudah ditangani";
              const isProgress = item.status === "Dalam proses" || item.status === "Sedang ditangani";
              const statusColor = isDone ? "text-emerald-600 dark:text-emerald-400" : isProgress ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400";

              return (
                <div 
                  key={item.id} 
                  className={cn(
                    "group relative flex items-center gap-4 p-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer",
                    // Garis pemisah tipis kecuali di item terakhir
                    index !== group.items.length - 1 && "border-b border-border/30 dark:border-white/5"
                  )}
                  onClick={() => onItemClick(item)}
                >
                  
                  {/* SISI KIRI: IKON LINGKARAN BESAR */}
                  <div className={cn("flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full", iconBg)}>
                    {RenderIcon}
                    {item.isPendingStaging && <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-amber-500 animate-pulse" />}
                  </div>

                  {/* TENGAH: JUDUL & SUBTITLE */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="text-[15px] font-semibold tracking-tight text-foreground truncate">
                      {item.title}
                    </h3>
                    
                    <div className="flex items-center gap-1.5 mt-0.5 text-[13px] font-medium text-muted-foreground">
                      <span className="truncate max-w-[100px]">{item.area}</span>
                      <span className="opacity-50">•</span>
                      
                      {/* STATUS DROPDOWN (Bisa diklik & nyaru dengan teks) */}
                      <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={item.status}
                          onChange={(e) => onStatusChange?.(item.id, e.target.value)}
                          className={cn("appearance-none bg-transparent outline-none cursor-pointer pr-4 font-semibold z-10", statusColor)}
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
                        <ChevronDown className={cn("absolute right-0 h-3 w-3 pointer-events-none opacity-60", statusColor)} />
                      </div>

                      {/* BADGE HAMA/PENYAKIT KECIL */}
                      {item.module === "inspeksi" && item.metaEkstra?.hama?.length > 0 && (
                        <span className="ml-1 text-[10px] bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded-md">Hama</span>
                      )}
                      {item.module === "inspeksi" && item.metaEkstra?.penyakit?.length > 0 && (
                        <span className="ml-1 text-[10px] bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded-md">Penyakit</span>
                      )}
                    </div>
                  </div>

                  {/* KANAN: LINGKARAN PANAH */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-foreground/50 group-hover:text-foreground group-hover:bg-black/10 dark:group-hover:bg-white/20 transition-all">
                    <ChevronRight className="h-5 w-5" />
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
