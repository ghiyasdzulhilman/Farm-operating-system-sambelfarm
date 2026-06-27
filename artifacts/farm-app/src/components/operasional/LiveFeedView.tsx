import { useMemo } from "react";
import { 
  Sprout, Banknote, MapPin, 
  HardHat, Bug, Trash2, Clock, ChevronDown, MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";
import { motion, AnimatePresence } from "framer-motion";

type RichAgronomyItem = AgronomyItem & {
  metaEkstra?: Record<string, any>;
};

interface LiveFeedViewProps {
  items: RichAgronomyItem[];
  onItemClick: (item: RichAgronomyItem) => void;
  feedMode?: "time" | "area"; // Akan diabaikan karena Kanban fokus ke Status
  onStatusChange?: (id: string, status: string) => void; 
  onDelete?: (id: string, module: string) => void; 
}

export function LiveFeedView({ 
  items, 
  onItemClick, 
  onStatusChange,
  onDelete
}: LiveFeedViewProps) {
  
  // 🧠 DEFINISI KOLOM KANBAN
  const columns = [
    {
      id: "todo",
      title: "Belum Dikerjakan",
      dotColor: "bg-blue-500",
      bgHeader: "bg-blue-500/10 text-blue-700",
      validStatuses: ["Belum dikerjakan", "Baru ditemukan"]
    },
    {
      id: "progress",
      title: "Sedang Berjalan",
      dotColor: "bg-amber-500",
      bgHeader: "bg-amber-500/10 text-amber-700",
      validStatuses: ["Dalam proses", "Sedang ditangani"]
    },
    {
      id: "done",
      title: "Selesai",
      dotColor: "bg-emerald-500",
      bgHeader: "bg-emerald-500/10 text-emerald-700",
      validStatuses: ["Selesai", "Sudah ditangani"]
    }
  ];

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground font-medium text-sm">
        Tidak ada aktivitas ditemukan.
      </div>
    );
  }

  return (
    // WRAPPER HORIZONTAL SCROLL (Biar di HP bisa digeser ke samping)
    <div className="flex overflow-x-auto pb-8 pt-2 -mx-4 px-4 gap-4 snap-x snap-mandatory custom-scrollbar">
      {columns.map((col) => {
        // Filter item sesuai kolom
        const columnItems = items.filter(item => col.validStatuses.includes(item.status));

        return (
          // 🌟 CONTAINER KOLOM
          <div 
            key={col.id} 
            className="flex flex-col w-[85vw] max-w-[320px] shrink-0 snap-center bg-muted/30 rounded-[1.5rem] border border-border/40 p-3 h-max"
          >
            {/* HEADER KOLOM */}
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", col.dotColor)} />
                <h2 className="text-sm font-bold text-foreground">{col.title}</h2>
              </div>
              <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", col.bgHeader)}>
                {columnItems.length}
              </span>
            </div>

            {/* AREA KARTU (Dengan Animasi Layout Framer Motion) */}
            <div className="flex flex-col gap-3 min-h-[100px]">
              <AnimatePresence>
                {columnItems.map((item) => {
                  
                  // LOGIKA IKON
                  let RenderIcon = <Sprout className="h-3.5 w-3.5" />;
                  let iconBg = "bg-emerald-500/10 text-emerald-600";
                  
                  if (item.module === "operasional") {
                    RenderIcon = <HardHat className="h-3.5 w-3.5" />;
                    iconBg = "bg-blue-500/10 text-blue-600";
                  } else if (item.module === "perawatan") {
                    RenderIcon = <Sprout className="h-3.5 w-3.5" />;
                    iconBg = "bg-emerald-500/10 text-emerald-600";
                  } else if (item.module === "inspeksi") {
                    RenderIcon = <Bug className="h-3.5 w-3.5" />;
                    iconBg = "bg-red-500/10 text-red-600";
                  } else if (item.module === "finance") {
                    RenderIcon = <Banknote className="h-3.5 w-3.5" />;
                    iconBg = item.category === "Pengeluaran" ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600";
                  }

                  return (
                    // 🌟 KARTU KANBAN (Bisa Terbang otomatis)
                    <motion.div
                      layout // 💡 INI MAGIC-NYA! Biar kartu terbang pas ganti kolom
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      key={item.id}
                      className="group relative flex flex-col bg-background p-4 rounded-2xl shadow-sm border border-border/50 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                      onClick={() => onItemClick(item)}
                    >
                      {/* HEADER KARTU */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn("flex h-6 w-6 rounded-lg items-center justify-center", iconBg)}>
                            {RenderIcon}
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">
                            {item.category}
                          </span>
                        </div>
                        {item.isPendingStaging && (
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </div>

                      {/* ISI KARTU */}
                      <h3 className="text-[13px] font-bold text-foreground leading-tight mb-1.5">
                        {item.title}
                      </h3>
                      
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/80 mb-3">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{item.area}</span>
                      </div>

                      {/* INJEKSI BADGE HAMA (Inspeksi) */}
                      {item.module === "inspeksi" && (item.metaEkstra?.hama?.length > 0 || item.metaEkstra?.penyakit?.length > 0) && (
                        <div className="flex gap-1 mb-3">
                          {item.metaEkstra?.hama?.length > 0 && <span className="text-[9px] font-bold bg-red-500/10 text-red-600 px-1.5 py-0.5 rounded">Hama</span>}
                          {item.metaEkstra?.penyakit?.length > 0 && <span className="text-[9px] font-bold bg-orange-500/10 text-orange-600 px-1.5 py-0.5 rounded">Penyakit</span>}
                        </div>
                      )}

                      {/* FOOTER KARTU (Status & Aksi) */}
                      <div className="mt-auto pt-3 flex items-center justify-between border-t border-border/40">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {item.time}
                        </div>

                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {/* SELECT STATUS MELAYANG */}
                          <div className="relative flex items-center hover:bg-muted p-1 rounded-md transition-colors cursor-pointer">
                            <select
                              value={item.status}
                              onChange={(e) => onStatusChange?.(item.id, e.target.value)}
                              className="appearance-none bg-transparent text-[10px] font-bold outline-none cursor-pointer pr-4 text-foreground z-10"
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
                            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 opacity-50 pointer-events-none" />
                          </div>

                          {/* TOMBOL HAPUS MINIMALIS */}
                          <button 
                            onClick={(e) => { e.stopPropagation(); onDelete?.(item.id, item.module); }}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        );
      })}
    </div>
  );
}
