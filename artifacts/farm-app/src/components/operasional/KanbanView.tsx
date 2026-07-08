import { useMemo } from "react";
import { 
  Sprout, Banknote, MapPin, 
  HardHat, Bug, Trash2, ChevronDown
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
    <div className="flex overflow-x-auto py-6 -mx-4 px-4 gap-5 snap-x snap-mandatory custom-scrollbar">
      {columns.map((col) => {
        const columnItems = items.filter(item => col.validStatuses.includes(item.status));

        return (
          <div 
            key={col.id} 
            // Efek Frosted Glass untuk panel utama Kanban
            className="flex flex-col w-[85vw] max-w-[320px] shrink-0 snap-center rounded-[1.5rem] border border-border/40 bg-card/40 backdrop-blur-md p-3.5 h-max shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]"
          >
            {/* HEADER KOLOM */}
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2.5">
                <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", col.dotColor)} />
                <h2 className="text-sm font-bold text-foreground/90 tracking-tight">{col.title}</h2>
              </div>
              <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm", col.bgHeader)}>
                {columnItems.length}
              </span>
            </div>

            {/* AREA KARTU */}
            <div className="flex flex-col gap-3.5 min-h-[100px]">
              {columnItems.map((item) => {
                let RenderIcon = <Sprout className="h-4 w-4" />;
                let iconBg = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                let selectBg = "bg-slate-100 text-slate-700";
                
                if (item.module === "operasional") {
                  RenderIcon = <HardHat className="h-4 w-4" />;
                  iconBg = "bg-blue-500/10 text-blue-600 border-blue-500/20";
                  selectBg = "bg-blue-50 text-blue-700 border-blue-200/50";
                } else if (item.module === "perawatan") {
                  RenderIcon = <Sprout className="h-4 w-4" />;
                  iconBg = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                  selectBg = "bg-emerald-50 text-emerald-700 border-emerald-200/50";
                } else if (item.module === "inspeksi") {
                  RenderIcon = <Bug className="h-4 w-4" />;
                  iconBg = "bg-red-500/10 text-red-600 border-red-500/20";
                  selectBg = "bg-red-50 text-red-700 border-red-200/50";
                } else if (item.module === "finance") {
                  RenderIcon = <Banknote className="h-4 w-4" />;
                  iconBg = item.category === "Pengeluaran" ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
                }

                return (
                  <div
                    key={item.id}
                    // Desain Spatial: Border putih tipis, soft shadow melayang
                    className="group relative flex flex-col bg-background/90 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_30px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                    onClick={() => onItemClick(item)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        {/* Ikon Taktil 3D */}
                        <div className={cn("flex h-8 w-8 rounded-xl items-center justify-center shadow-[inset_0_1px_4px_rgba(255,255,255,0.5)] border", iconBg)}>
                          {RenderIcon}
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-widest bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                          {item.category}
                        </span>
                      </div>
                      
                      {item.isPendingStaging && (
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                      )}
                    </div>

                    <h3 className="text-[14px] font-bold text-foreground leading-snug mb-1.5">
                      {item.title}
                    </h3>
                    
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground/80 mb-4">
                      <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="truncate">
                        {item.namaSiklus && item.namaSiklus !== "-" ? `${item.area} - ${item.namaSiklus}` : item.area}
                      </span>
                    </div>

                    <div className="mt-auto pt-3 flex items-center justify-between border-t border-border/40">
                      
                      {/* STATUS PILL DROPDOWN */}
                      <div className="relative flex items-center transition-colors cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={item.status}
                          onChange={(e) => onStatusChange?.(item.id, e.target.value)}
                          className={cn(
                            "appearance-none text-[11px] font-bold outline-none cursor-pointer pr-7 pl-3 py-1.5 rounded-full border shadow-sm transition-all focus:ring-2 focus:ring-primary/20", 
                            selectBg
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
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 opacity-60 pointer-events-none" />
                      </div>

                      {/* HAPUS - Muncul lembut saat hover */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete?.(item.id, item.module); }}
                        className="p-1.5 text-muted-foreground/40 hover:text-destructive transition-all rounded-lg hover:bg-destructive/10 group-hover:text-muted-foreground/70"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
