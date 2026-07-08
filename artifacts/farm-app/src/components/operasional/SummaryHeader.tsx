import { CalendarDays, CheckCircle2, Clock3, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

export function SummaryHeader({ feedData, meta }: { feedData: AgronomyItem[], meta: any }) {
  // Hitung otomatis dari data feed berdasarkan status aslinya
  const todayCount = feedData.filter((i) => i.dateLabel === "Hari ini").length;
    // 🚀 Tambahin status Inspeksi di setiap hitungan
  const doneCount = feedData.filter((i) => i.status === "Selesai" || i.status === "Sudah ditangani").length;
  const progressCount = feedData.filter((i) => i.status === "Dalam proses" || i.status === "Sedang ditangani").length;
  const todoCount = feedData.filter((i) => i.status === "Belum dikerjakan" || i.status === "Baru ditemukan").length;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <SummaryCard title="Aktivitas" value={todayCount} detail="hari ini" icon={CalendarDays} tint="bg-emerald-500/10 text-emerald-600" />
      <SummaryCard title="Selesai" value={doneCount} detail="sudah ditutup" icon={CheckCircle2} tint="bg-sky-500/10 text-sky-600" />
      <SummaryCard title="Proses" value={progressCount} detail="sedang jalan" icon={Clock3} tint="bg-amber-500/10 text-amber-600" />
      <SummaryCard title="Tertunda" value={todoCount} detail="belum selesai" icon={ListTodo} tint="bg-slate-500/10 text-slate-600" />
    </div>
  );
}

// Sub-komponen tetap di dalam file ini aja biar rapi
function SummaryCard({ title, value, detail, icon: Icon, tint }: any) {
  return (
    <div className="group relative rounded-2xl border border-border/50 bg-card p-4 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md">
      
      {/* Kasih 'pr-12' (padding kanan) biar teks ga nabrak icon */}
      <div className="pr-12">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
        <p className="mt-1.5 text-2xl font-black tracking-tight transition-colors group-hover:text-primary">{value}</p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">{detail}</p>
      </div>

      {/* Icon di-lock posisinya secara absolut di kanan tengah */}
      <div className={cn("absolute right-4 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105", tint)}>
        <Icon className="h-5 w-5" />
      </div>
      
    </div>
  );
}
