import { Zap, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

interface OperasionalFieldsProps {
  item: AgronomyItem;
  onStatusChange?: (id: string, payload: any) => void | Promise<any>;
}

export function OperasionalFields({ item, onStatusChange }: OperasionalFieldsProps) {
  if (item.module !== "operasional" || !item.metaEkstra) return null;

  const prioValue = ["Low", "Medium", "High"].find(
    (p) => p.toLowerCase() === (item.metaEkstra.prioritas || "Medium").toLowerCase()
  ) || "Medium";

  return (
    <>
      {/* WIDGET 1: Prioritas */}
      <div className="rounded-3xl border border-border/40 bg-card p-4 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.04)] flex flex-col justify-between min-h-[105px]">
        <div className="flex items-center gap-2 text-muted-foreground/80">
          <Zap className="h-4 w-4 opacity-70" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Prioritas</span>
        </div>
        
        <div className="mt-3 flex items-center bg-muted/40 p-1 rounded-xl border border-border/50 w-full relative">
          {["Low", "Medium", "High"].map((level) => {
            const isActive = prioValue === level;
            let activeClass = "text-muted-foreground hover:text-foreground hover:bg-muted/50";
            
            if (isActive) {
              if (level === "High") activeClass = "bg-destructive text-destructive-foreground shadow-sm shadow-destructive/20";
              else if (level === "Medium") activeClass = "bg-amber-500 text-white shadow-sm shadow-amber-500/20";
              else if (level === "Low") activeClass = "bg-blue-500 text-white shadow-sm shadow-blue-500/20";
            }

            return (
              <button
                key={level}
                onClick={() => onStatusChange?.(item.id, { prioritas: level })}
                className={cn(
                  "flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300",
                  activeClass
                )}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>

      {/* WIDGET 2: Durasi Kerja */}
      <div className="rounded-3xl border border-border/30 bg-muted/30 p-4 shadow-[inset_0_1px_4px_rgba(255,255,255,0.2)] flex flex-col justify-between min-h-[105px] select-none">
        <div className="flex items-center gap-2 text-muted-foreground/70">
          <Clock3 className="h-4 w-4 opacity-70" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Durasi Kerja</span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-3xl font-bold tracking-tight text-foreground/90">
            {item.metaEkstra.durasiKerja || "0"}
          </span>
          <span className="text-[13px] font-semibold text-muted-foreground/70 mb-1">Jam</span>
        </div>
      </div>
    </>
  );
}
