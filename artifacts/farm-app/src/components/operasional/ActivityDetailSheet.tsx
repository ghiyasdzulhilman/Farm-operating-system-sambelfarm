import { CalendarDays, Paperclip, ArrowRight, Edit3, Trash2, Eye } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

export function ActivityDetailSheet({ item, onClose }: { item: AgronomyItem | null, onClose: () => void }) {
  if (!item) return null;

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full border-l border-border/60 bg-background p-0 sm:max-w-[520px]">
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-border/60 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <SheetTitle className="text-left text-lg font-black tracking-tight">Detail Aktivitas</SheetTitle>
                <p className="text-left text-xs text-muted-foreground">Sistem tersinkronisasi dengan Notion</p>
              </div>
              <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  item.status === "Selesai" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                : item.status === "Dalam proses" ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
                : "border-muted-foreground/20 bg-muted/40 text-muted-foreground"
              )}>
                {item.status}
              </Badge>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-transparent p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    <span>{item.time}</span><span>•</span><span>{item.dateLabel}</span>
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{item.area} • {item.category}</p>
                </div>
                <div className="rounded-3xl bg-background p-3 shadow-sm">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="rounded-full bg-primary text-primary-foreground">{item.priority} Priority</Badge>
                <Badge variant="secondary" className="rounded-full">{item.duration}</Badge>
                <Badge variant="secondary" className="rounded-full uppercase">{item.module}</Badge>
              </div>
            </div>

            <section className="mt-6 space-y-3">
              <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary" /><h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">Catatan / Detail</h3></div>
              <div className="rounded-3xl border border-border/60 bg-muted/20 p-4 text-sm leading-6 text-foreground">
                {item.notes || "Tidak ada catatan spesifik dari lapangan."}
              </div>
            </section>

            <section className="mt-6 space-y-3">
              <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary" /><h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">Pekerja / Tim</h3></div>
              <div className="flex flex-wrap gap-2">
                {item.workers.map((worker) => (
                  <Badge key={worker} variant="outline" className="rounded-full px-3 py-1">{worker}</Badge>
                ))}
              </div>
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
