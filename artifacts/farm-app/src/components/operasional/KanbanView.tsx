import { useMemo } from "react";
import { 
  Sprout, Banknote, MapPin, 
  HardHat, Bug, Trash2, Clock, ChevronDown, CalendarClock
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

type RichAgronomyItem = AgronomyItem & {
  metaEkstra?: Record<string, any>;
};

interface KanbanViewProps {
  items: RichAgronomyItem[];
  onItemClick: (item: RichAgronomyItem) => void;
  onStatusChange?: (id: string, status: string) => void; 
  onDelete?: (id: string, module: string) => void; 
}

export function KanbanView({ 
  items, 
  onItemClick, 
  onStatusChange,
  onDelete
}: KanbanViewProps) {
  
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
    <div className="flex overflow-x-auto pb-8 pt-2 -mx-4 px-4 gap-4 snap-x snap-mandatory custom-scrollbar">
      {columns.map((col) => {
        const columnItems = items.filter(item => col.validStatuses.includes(item.status));

        return (
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

            {/* AREA KARTU */}
            <div className="flex flex-col gap-3 min-h-[100px]">
              {columnItems.map((item) => {
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

                // 🚀 LOGIKA WAKTU (FIX NAIVE TIMEZONE, BEBAS BUG GESER JAM)
                const getTanggal = (str?: string) => {
                  if (!str) return "";
                  const datePart = str.split(/[T ]/)[0]; // YYYY-MM-DD
                  const [y, m, d] = datePart.split('-');
                  return `${d}/${m}/${y}`; // Format DD/MM/YYYY
                };

                const getJam = (str?: string) => {
                  if (!str) return "";
                  const timePart = str.split(/[T ]/)[1];
                  return timePart ? timePart.substring(0, 5).replace(':', '.') : ""; // Format 18.36
                };

                const startDStr = getTanggal(item.metaEkstra?.waktuMulai || item.rawDate);
                const startTStr = getJam(item.metaEkstra?.waktuMulai || item.rawDate);
                
                let scheduleDisplay = `${startDStr} | ${startTStr}`;
                
                if (item.metaEkstra?.waktuSelesai) {
                  const endDStr = getTanggal(item.metaEkstra.waktuSelesai);
                  const endTStr = getJam(item.metaEkstra.waktuSelesai);
                  
                  scheduleDisplay = startDStr === endDStr 
                    ? `${startDStr} | ${startTStr} - ${endTStr}` 
                    : `${startDStr} - ${endDStr} | ${startTStr} - ${endTStr}`;
                }

                return (
                  <div
                    key={item.id}
                    className="group relative flex flex-col bg-background p-4 rounded-2xl shadow-sm border border-border/50 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
                    onClick={() => onItemClick(item)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={cn("flex h-6 w-6 rounded-lg items-center justify-center", iconBg)}>
                          {RenderIcon}
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded">
                          {item.category}
                        </span>
                      </div>
                      
                      {/* WAKTU INPUT */}
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-muted-foreground/60">{item.time}</span>
                        {item.isPendingStaging && (
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </div>
                    </div>

                    <h3 className="text-[13px] font-bold text-foreground leading-tight mb-1.5">
                      {item.title}
                    </h3>
                    
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/80 mb-3">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {item.namaSiklus && item.namaSiklus !== "-" ? `${item.area} - ${item.namaSiklus}` : item.area}
                      </span>
                    </div>

                    <div className="mt-auto pt-3 flex items-center justify-between border-t border-border/40">
                      
                      {/* JADWAL MULAI-SELESAI */}
                      <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground/80 truncate pr-2">
                        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate" title={scheduleDisplay}>{scheduleDisplay}</span>
                      </div>

                      {/* STATUS & HAPUS */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
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

                        <button 
                          onClick={(e) => { e.stopPropagation(); onDelete?.(item.id, item.module); }}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-destructive/10"
                          title="Hapus"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );

              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
