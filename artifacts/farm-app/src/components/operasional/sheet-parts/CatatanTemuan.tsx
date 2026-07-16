import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

interface CatatanTemuanProps {
  item: AgronomyItem;
  getDetailKendala: () => string;
}

export function CatatanTemuan({ item, getDetailKendala }: CatatanTemuanProps) {
  if (item.module !== "inspeksi" || !item.metaEkstra) return null;

  const hasFindings = !!(item.metaEkstra.hama?.length || item.metaEkstra.penyakit?.length);

  return (
    <section className="mt-6 space-y-3">
      <div className="flex items-center gap-2">
        <div className={cn("h-2 w-2 rounded-full", hasFindings ? "bg-destructive" : "bg-primary")} />
        <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">
          Catatan Temuan
        </h3>
      </div>

      <div className={cn(
        "border-l-2 pl-4 flex flex-col gap-3",
        hasFindings ? "border-destructive/30" : "border-primary/30"
      )}>
        <div className="flex flex-wrap gap-1.5">
          {(Array.isArray(item.metaEkstra.hama) ? item.metaEkstra.hama : []).map((h: string) => (
            <span key={h} className="text-[10px] font-bold rounded-full px-2.5 py-1 bg-red-500/10 text-red-600/90 border border-red-500/15">{h}</span>
          ))}
          {(Array.isArray(item.metaEkstra.penyakit) ? item.metaEkstra.penyakit : []).map((p: string) => (
            <span key={p} className="text-[10px] font-bold rounded-full px-2.5 py-1 bg-orange-500/10 text-orange-600/90 border border-orange-500/15">{p}</span>
          ))}
          {!hasFindings && (
            <span className="text-[10px] font-bold rounded-full px-2.5 py-1 bg-primary/10 text-primary border border-primary/20">Tanaman Aman Terkendali</span>
          )}
        </div>

        {getDetailKendala() && (
          <div className={cn(
            "text-sm whitespace-pre-wrap leading-relaxed font-normal",
            hasFindings ? "text-destructive/90" : "text-foreground/80"
          )}>
            {getDetailKendala()}
          </div>
        )}
      </div>
    </section>
  );
}
