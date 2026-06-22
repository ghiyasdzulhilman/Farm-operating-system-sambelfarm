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
    {/* 1. Tambahin 'relative' di kotak paling luar */}
    <div className="relative rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
      
      {/* 2. Kasih 'pr-12' (padding kanan) biar teks ga nabrak icon */}
      <div className="pr-12">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
        <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>

      {/* 3. Icon di-lock posisinya secara absolut di kanan tengah */}
      <div className={cn("absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full", tint)}>
        <Icon className="h-5 w-5" />
      </div>
      
    </div>
  );
}


