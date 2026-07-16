import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

interface TimKebunProps {
  item: AgronomyItem;
  dropdownOptions: any;
}

export function TimKebun({ item, dropdownOptions }: TimKebunProps) {
  return (
    <section className="mt-6 space-y-3 pb-8">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
        <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">
          Tim Kebun
        </h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {(() => {
          const workerIds = Array.isArray(item.metaEkstra?.pekerjaIds) ? item.metaEkstra.pekerjaIds : [];
          
          if (workerIds.length === 0 && (!item.workers || item.workers.length === 0)) {
            return <span className="text-sm text-muted-foreground italic">Belum ada tim ditugaskan</span>;
          }

          if (workerIds.length > 0 && dropdownOptions?.petugas) {
            return workerIds.map((id: string) => {
              const matchedWorker = dropdownOptions.petugas.find((p: any) => p.id === id);
              
              let label = "(Pekerja Terhapus)";
              if (matchedWorker) {
                label = matchedWorker.deleted ? `${matchedWorker.name} (Terhapus)` : matchedWorker.name;
              }
                
              return (
                <div key={id} className={cn(
                  "flex items-center gap-2 rounded-full border border-border/40 bg-card px-3 py-1.5 text-[12px] font-medium shadow-[0_2px_10px_-2px_rgba(0,0,0,0.02)] transition-all hover:bg-muted/60 hover:-translate-y-0.5", 
                  matchedWorker?.deleted && "border-dashed text-muted-foreground/60 bg-muted/20 shadow-none hover:-translate-y-0"
                )}>
                  <div className={cn("flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary", matchedWorker?.deleted && "bg-muted text-muted-foreground")}>
                    <Users className="h-[10px] w-[10px]" />
                  </div>
                  <span className="truncate max-w-[120px]">{label}</span>
                </div>
              );
            });
          }

          return item.workers?.map((worker, index) => (
            <div key={index} className="flex items-center gap-2 rounded-full border border-border/40 bg-card/60 px-3 py-1.5 text-[12px] font-medium shadow-[0_2px_10px_-2px_rgba(0,0,0,0.02)]">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-[10px] w-[10px]" />
              </div>
              <span className="truncate max-w-[120px]">{worker}</span>
            </div>
          ));
        })()}
      </div>
    </section>
  );
}
