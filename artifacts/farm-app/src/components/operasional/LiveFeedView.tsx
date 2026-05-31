import { useMemo } from "react";
import { Sprout, Leaf, Wrench, Banknote, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

export function LiveFeedView({ items, onItemClick }: { items: AgronomyItem[], onItemClick: (item: AgronomyItem) => void }) {
  
  // Kelompokkan data berdasarkan Hari
  const groupedFeed = useMemo(() => {
    const labels = ["Hari ini", "Kemarin", "Riwayat Lama"];
    return labels.map(label => ({
      label,
      items: items.filter(item => item.dateLabel === label)
    })).filter(group => group.items.length > 0);
  }, [items]);

  if (items.length === 0) {
    return <div className="py-12 text-center text-muted-foreground font-bold text-sm">Tidak ada aktivitas ditemukan.</div>;
  }

  return (
    <div className="space-y-6">
      {groupedFeed.map((group) => (
        <div key={group.label} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">{group.label}</h2>
            <span className="text-xs text-muted-foreground">{group.items.length} aktivitas</span>
          </div>

          <div className="space-y-3">
            {group.items.map((item) => {
              // LOGIKA WARNA KUSTOM
              let iconColorClass = "bg-primary/10 text-primary";
              if (item.module === "finance") {
                iconColorClass = item.category === "Pengeluaran" ? "bg-red-500/10 text-red-600" : "bg-emerald-500/10 text-emerald-600";
              }

              return (
                <button key={item.id} onClick={() => onItemClick(item)}
                  className="group w-full rounded-3xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start gap-3">
                    <div className={cn("relative mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", iconColorClass)}>
                      {item.icon === "sprout" && <Sprout className="h-5 w-5" />}
                      {item.icon === "leaf" && <Leaf className="h-5 w-5" />}
                      {item.icon === "wrench" && <Wrench className="h-5 w-5" />}
                      {item.icon === "banknote" && <Banknote className="h-5 w-5" />}
                      {item.isPendingStaging && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-amber-500 animate-pulse" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">{item.time}</span>
                        
{item.category && (
  <Badge
    variant="secondary"
    className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
  >
    {item.category}
  </Badge>
)}

                        <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            item.status === "Selesai" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                          : item.status === "Dalam proses" ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
                          : "border-muted-foreground/20 bg-muted/40 text-muted-foreground"
                        )}>
                          {item.status}
                        </Badge>
                      </div>

                      <h3 className="mt-2 text-base font-black tracking-tight truncate">{item.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">

  <span>
    {item.area}
  </span>

  {(item.areaCount ?? 0) > 1 && (
    <span>
      +{(item.areaCount ?? 1) - 1} area
    </span>
  )}

  {(item.workerCount ?? 0) > 0 && (
    <span>
      👷 {item.workerCount}
    </span>
  )}

  {(item.durationHours ?? 0) > 0 && (
    <span>
      ⏱ {item.durationHours} jam
    </span>
  )}

</div>
</div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
