import { CalendarDays, CheckCircle2, Clock3, TimerReset } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

export function SummaryHeader({ feedData, meta }: { feedData: AgronomyItem[], meta: any }) {
  // Hitung otomatis dari data backend
  const todayCount = feedData.filter((i) => i.dateLabel === "Hari ini").length;
  const doneCount = feedData.filter((i) => i.status === "Selesai").length;
  const progressCount = feedData.filter((i) => i.status === "Dalam proses" && !i.isPendingStaging).length;
  const pendingCount = meta?.stagingCount || 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <SummaryCard title="Aktivitas" value={todayCount} detail="hari ini" icon={CalendarDays} tint="bg-emerald-500/10 text-emerald-600" />
      <SummaryCard title="Selesai" value={doneCount} detail="sudah ditutup" icon={CheckCircle2} tint="bg-sky-500/10 text-sky-600" />
      <SummaryCard title="Proses" value={progressCount} detail="sedang jalan" icon={Clock3} tint="bg-amber-500/10 text-amber-600" />
      <SummaryCard title="Pending" value={pendingCount} detail="antrean awan" icon={TimerReset} tint="bg-fuchsia-500/10 text-fuchsia-600" />
    </div>
  );
}

// Sub-komponen tetap di dalam file ini aja biar rapi
function SummaryCard({ title, value, detail, icon: Icon, tint }: any) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className={cn("rounded-2xl p-3", tint)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
