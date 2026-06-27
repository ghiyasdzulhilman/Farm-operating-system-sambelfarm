import { useMemo } from "react";
import { 
  Sprout, Leaf, Wrench, Banknote, ChevronRight, ChevronDown, MapPin, 
  HardHat, Bug, Trash2 // 💡 FIX 1: Import Icon baru untuk form & tombol hapus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";
import { motion } from "framer-motion"; // 💡 FIX 2: Import Framer Motion untuk efek geser

// Perpanjang tipe bawaan agar mengenali metaEkstra dari backend tanpa error TS
type RichAgronomyItem = AgronomyItem & {
  metaEkstra?: Record<string, any>;
};

interface LiveFeedViewProps {
  items: RichAgronomyItem[];
  onItemClick: (item: RichAgronomyItem) => void;
  feedMode?: "time" | "area"; 
  onStatusChange?: (id: string, status: string) => void; 
  onDelete?: (id: string, module: string) => void; // 💡 FIX 3: Tambah props untuk fungsi hapus
}

export function LiveFeedView({ 
  items, 
  onItemClick, 
  feedMode = "time", 
  onStatusChange,
  onDelete
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
      .sort((a, b) => a[0].localeCompare(b[0])) 
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

          <div className="space-y-3 overflow-hidden"> {/* 💡 Tambah overflow-hidden agar tombol geser tidak ngeleber */}
                        {group.items.map((item) => {
              
              // 💡 FIX 1: LOGIKA WARNA & IKON (Wrench diganti Sprout)
              let iconColorClass = "bg-primary/10 text-primary";
              let RenderIcon = <Sprout className="h-5 w-5" />;

              if (item.module === "operasional") {
                iconColorClass = "bg-primary/10 text-primary";
                RenderIcon = <HardHat className="h-5 w-5" />;
              } else if (item.module === "perawatan") {
                iconColorClass = "bg-blue-500/10 text-blue-600";
                RenderIcon = <Sprout className="h-5 w-5" />; // 👈 Icon Perawatan sudah jadi Sprout
              } else if (item.module === "inspeksi") {
                iconColorClass = "bg-destructive/10 text-destructive";
                RenderIcon = <Bug className="h-5 w-5" />;
              } else if (item.module === "finance") {
                iconColorClass = item.category === "Pengeluaran" ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600";
                RenderIcon = <Banknote className="h-5 w-5" />;
              }

              return (
                // 💡 FIX 2: WRAPPER UTAMA (Warna ngejreng merah diganti bg-secondary)
                <div key={item.id} className="relative w-full rounded-3xl border border-border/60 bg-secondary overflow-hidden mb-3">
                  
                  {/* 🔴 TOMBOL HAPUS (Disesuaikan menyatu dengan warna secondary) */}
                  <div className="absolute inset-y-0 right-0 w-[80px] flex items-center justify-center">
                    <button 
                      onClick={() => onDelete?.(item.id, item.module)}
                      className="flex flex-col items-center justify-center h-full w-full text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <Trash2 className="h-5 w-5 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Hapus</span>
                    </button>
                  </div>

                  {/* 🟢 KONTEN CARD UTAMA */}
                  <motion.div 
                    drag="x"
                    dragDirectionLock={true} // 💡 FIX 3: Mengunci gestur agar scroll atas-bawah tidak memicu geser
                    dragConstraints={{ left: -80, right: 0 }} 
                    dragElastic={{ left: 0.1, right: 0 }} 
                    className="relative flex items-start gap-3 bg-card p-4 text-left shadow-sm z-10 cursor-grab active:cursor-grabbing w-full rounded-3xl"
                  >
                    
                    {/* BAGIAN KIRI: IKON & INDIKATOR STAGING */}
                    <div className={cn("relative mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", iconColorClass)}>
                      {RenderIcon}
                      {item.isPendingStaging && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-amber-500 animate-pulse" title="Menunggu Sync" />}
                    </div>

                    {/* BAGIAN TENGAH: KONTEN UTAMA (KLIKABEL) */}
                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onItemClick(item)}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">{item.time}</span>
                        <Badge variant="secondary" className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          {item.category}
                        </Badge>

                        {/* INJEKSI RICH DATA */}
                        {item.module === "inspeksi" && item.metaEkstra?.hama?.length > 0 && (
                           <Badge variant="outline" className="rounded-full bg-red-500/10 text-red-700 border-red-500/20 px-2 py-0 text-[10px]">
                              Hama
                           </Badge>
                        )}
                        {item.module === "inspeksi" && item.metaEkstra?.penyakit?.length > 0 && (
                           <Badge variant="outline" className="rounded-full bg-orange-500/10 text-orange-700 border-orange-500/20 px-2 py-0 text-[10px]">
                              Penyakit
                           </Badge>
                        )}
                      </div>

                      <h3 className="mt-2 text-base font-black tracking-tight truncate pr-4">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground truncate">{item.area}</p>
                    </div>

                    {/* BAGIAN KANAN: KONTROL & AKSI */}
                    <div className="flex shrink-0 flex-col items-end justify-between gap-3 h-full cursor-auto">
                      
                      <div className="relative inline-block">
                        <select
                          value={item.status}
                          onChange={(e) => onStatusChange?.(item.id, e.target.value)}
                          disabled={item.isPendingStaging}
                          className={cn(
                            "appearance-none rounded-full px-2.5 py-1 pr-6 text-[10px] font-bold uppercase tracking-wider outline-none cursor-pointer border transition-all shadow-sm z-20 relative",
                            (item.status === "Selesai" || item.status === "Sudah ditangani") ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20" :
                            (item.status === "Dalam proses" || item.status === "Sedang ditangani") ? "border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20" :
                            "border-blue-500/20 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20",
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
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none opacity-60 z-20" />
                      </div>

                      <button 
                        onClick={() => onItemClick(item)} 
                        className="rounded-full bg-muted/40 p-1.5 hover:bg-primary/10 hover:text-primary transition-colors z-20 relative"
                        title="Lihat Detail"
                      >
                         <ChevronRight className="h-4 w-4" />
                      </button>

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
