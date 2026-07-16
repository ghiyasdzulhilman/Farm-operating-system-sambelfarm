import { CalendarDays, Clock3, ArrowRight } from "lucide-react";
import type { AgronomyItem } from "@/types/operasional";

interface JadwalPelaksanaanProps {
  item: AgronomyItem;
  formatDateValue: (raw?: string) => string;
  formatTimeValue: (raw?: string) => string;
  handleDateTimeSave: (field: 'waktuMulai' | 'waktuSelesai', type: 'date' | 'time', value: string) => void;
}

export function JadwalPelaksanaan({
  item,
  formatDateValue,
  formatTimeValue,
  handleDateTimeSave
}: JadwalPelaksanaanProps) {
  if (!item.metaEkstra || Object.keys(item.metaEkstra).length === 0) return null;

  return (
    <section className="mt-6 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
        <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">
          Jadwal Pelaksanaan
        </h3>
      </div>

      <div className="rounded-3xl border border-border/40 bg-card p-3 sm:p-4 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.03)] flex flex-col gap-3">
        
        {/* Baris Tanggal Range */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 group/date">
          <div className="flex items-center gap-1.5 w-[70px] sm:w-20 shrink-0 text-muted-foreground/70 group-hover/date:text-foreground/80 transition-colors">
            <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase">Tanggal</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2.5 flex-1 min-w-0 bg-muted/40 p-1 sm:p-1.5 rounded-[1rem] border border-border/50 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="flex-1 min-w-0 bg-background/80 hover:bg-background rounded-xl px-1 sm:px-2 py-1.5 transition-colors border border-transparent hover:border-border/60 shadow-sm hover:shadow-md cursor-pointer relative">
              <input type="date" value={formatDateValue(item.metaEkstra?.waktuMulai)} onChange={(e) => handleDateTimeSave('waktuMulai', 'date', e.target.value)} className="w-full bg-transparent text-[11px] sm:text-[13px] font-semibold text-foreground/90 outline-none cursor-pointer text-center relative z-10 min-w-0" />
            </div>
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground/40 shrink-0" strokeWidth={2.5} />
            <div className="flex-1 min-w-0 bg-background/80 hover:bg-background rounded-xl px-1 sm:px-2 py-1.5 transition-colors border border-transparent hover:border-border/60 shadow-sm hover:shadow-md cursor-pointer relative">
              <input type="date" value={formatDateValue(item.metaEkstra?.waktuSelesai)} onChange={(e) => handleDateTimeSave('waktuSelesai', 'date', e.target.value)} className="w-full bg-transparent text-[11px] sm:text-[13px] font-semibold text-foreground/90 outline-none cursor-pointer text-center relative z-10 min-w-0" />
            </div>
          </div>
        </div>
        
        <div className="h-px w-full bg-border/40" />
        
        {/* Baris Waktu/Jam Range */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 group/time">
          <div className="flex items-center gap-1.5 w-[70px] sm:w-20 shrink-0 text-muted-foreground/70 group-hover/time:text-foreground/80 transition-colors">
            <Clock3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase">Waktu</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2.5 flex-1 min-w-0 bg-muted/40 p-1 sm:p-1.5 rounded-[1rem] border border-border/50 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]">
            <div className="flex-1 min-w-0 bg-background/80 hover:bg-background rounded-xl px-1 sm:px-2 py-1.5 transition-colors border border-transparent hover:border-border/60 shadow-sm hover:shadow-md cursor-pointer relative">
              <input type="time" value={formatTimeValue(item.metaEkstra?.waktuMulai)} onChange={(e) => handleDateTimeSave('waktuMulai', 'time', e.target.value)} className="w-full bg-transparent text-[11px] sm:text-[13px] font-semibold text-foreground/90 outline-none cursor-pointer text-center relative z-10 min-w-0" />
            </div>
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground/40 shrink-0" strokeWidth={2.5} />
            <div className="flex-1 min-w-0 bg-background/80 hover:bg-background rounded-xl px-1 sm:px-2 py-1.5 transition-colors border border-transparent hover:border-border/60 shadow-sm hover:shadow-md cursor-pointer relative">
              <input type="time" value={formatTimeValue(item.metaEkstra?.waktuSelesai)} onChange={(e) => handleDateTimeSave('waktuSelesai', 'time', e.target.value)} className="w-full bg-transparent text-[11px] sm:text-[13px] font-semibold text-foreground/90 outline-none cursor-pointer text-center relative z-10 min-w-0" />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
