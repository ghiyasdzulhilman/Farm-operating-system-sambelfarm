import { Clipboard, Inbox, Timer, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

export function SummaryHeader({ feedData, meta }: { feedData: AgronomyItem[], meta: any }) {
  const todayCount = feedData.filter((i) => i.dateLabel === "Hari ini").length;
  const doneCount = feedData.filter((i) => i.status === "Selesai" || i.status === "Sudah ditangani").length;
  const progressCount = feedData.filter((i) => i.status === "Dalam proses" || i.status === "Sedang ditangani").length;
  const todoCount = feedData.filter((i) => i.status === "Belum dikerjakan" || i.status === "Baru ditemukan").length;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {/* 1. Aktivitas - Teal & Clipboard */}
      <SummaryCard 
        title="Aktivitas" 
        value={todayCount} 
        detail="hari ini" 
        icon={Clipboard} 
        tint="bg-teal-500/10 text-teal-600" 
        hoverGlow="hover:shadow-[0_16px_40px_-4px_rgba(20,184,166,0.15)] hover:border-teal-500/30"
      />
      {/* 2. Selesai - Emerald & Inbox */}
      <SummaryCard 
        title="Selesai" 
        value={doneCount} 
        detail="sudah ditutup" 
        icon={Inbox} 
        tint="bg-emerald-500/10 text-emerald-600" 
        hoverGlow="hover:shadow-[0_16px_40px_-4px_rgba(16,185,129,0.15)] hover:border-emerald-500/30"
      />
      {/* 3. Proses - Amber & Timer */}
      <SummaryCard 
        title="Proses" 
        value={progressCount} 
        detail="sedang jalan" 
        icon={Timer} 
        tint="bg-amber-500/10 text-amber-600" 
        hoverGlow="hover:shadow-[0_16px_40px_-4px_rgba(245,158,11,0.15)] hover:border-amber-500/30"
      />
      {/* 4. Tertunda - Slate & Calendar */}
      <SummaryCard 
        title="Tertunda" 
        value={todoCount} 
        detail="belum selesai" 
        icon={Calendar} 
        tint="bg-slate-500/10 text-slate-600" 
        hoverGlow="hover:shadow-[0_16px_40px_-4px_rgba(100,116,139,0.15)] hover:border-slate-500/30"
      />
    </div>
  );
}

function SummaryCard({ title, value, detail, icon: Icon, tint, hoverGlow }: any) {
  return (
    <div className={cn(
      "group relative rounded-[1.5rem] border border-border/40 bg-card/60 backdrop-blur-md p-5 text-left",
      "shadow-[0_12px_30px_-4px_rgba(0,0,0,0.06)] transition-all duration-500 ease-out hover:-translate-y-0.5",
      hoverGlow
    )}>
      
      <div className="pr-12">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80">{title}</p>
        <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-1 text-[11px] font-medium tracking-wide text-muted-foreground/80">{detail}</p>
      </div>

      <div className={cn(
        "absolute right-5 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-2xl",
        "transition-all duration-500 group-hover:scale-110",
        "shadow-[0_4px_10px_rgba(0,0,0,0.05)] shadow-[inset_0_1px_4px_rgba(255,255,255,0.4)] border border-white/20", 
        tint
      )}>
        <Icon className="h-[22px] w-[22px]" strokeWidth={2.5} />
      </div>
      
    </div>
  );
}
