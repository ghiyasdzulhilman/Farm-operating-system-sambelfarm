import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgronomyItem, ModuleKey, ViewKey } from "@/types/operasional";

interface FilterProps {
  feedData: AgronomyItem[];
  activeView: ViewKey; setActiveView: (v: ViewKey) => void;
  activeModule: ModuleKey; setActiveModule: (m: ModuleKey) => void;
  activeFilter: string; setActiveFilter: (f: string) => void;
}

const VIEW_OPTIONS: Array<{ key: ViewKey; label: string }> = [
  { key: "kanban", label: "Kanban" },
  { key: "feed", label: "Feed" },
  { key: "table", label: "Tabel" },
];

const FILTERS = ["Hari ini", "Kemarin", "Selesai", "Dalam proses", "Belum dikerjakan"];

export function FilterControls({ feedData, activeView, setActiveView, activeModule, setActiveModule, activeFilter, setActiveFilter }: FilterProps) {
  
  // Ngitung dinamis jumlah log per modul
  const MODULES: Array<{ key: ModuleKey; label: string; count: number; hint: string }> = [
    { key: "all", label: "Semua", count: feedData.length, hint: "Gabungan aktivitas" },
    { key: "perawatan", label: "Perawatan", count: feedData.filter(i => i.module === "perawatan").length, hint: "Treatment & aplikasi" },
    { key: "inspeksi", label: "Inspeksi", count: feedData.filter(i => i.module === "inspeksi").length, hint: "Observasi & diagnosis" },
    { key: "operasional", label: "Operasional", count: feedData.filter(i => i.module === "operasional").length, hint: "Task & log kerja" },
    { key: "finance", label: "Finance", count: feedData.filter(i => i.module === "finance").length, hint: "Cashflow & Panen" },
  ];

  return (
    <div className="mt-5 rounded-3xl border border-border/60 bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <Filter className="h-4 w-4 text-primary" /> Tampilan
        </div>
        <div className="rounded-full bg-muted/50 p-1 flex">
          {VIEW_OPTIONS.map((opt) => (
            <button key={opt.key} onClick={() => setActiveView(opt.key)}
              className={cn("rounded-full px-4 py-2 text-xs font-bold transition-all",
                activeView === opt.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {MODULES.map((module) => (
          <button key={module.key} onClick={() => setActiveModule(module.key)}
            className={cn("min-w-[122px] shrink-0 rounded-2xl border px-4 py-3 text-left transition-all",
              activeModule === module.key ? "border-primary/30 bg-primary/10 shadow-sm" : "border-border/60 bg-muted/20 hover:bg-muted/40"
            )}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black tracking-tight">{module.label}</p>
              <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                {module.count}
              </span>
            </div>
            <p className="mt-1 text-[10px] font-medium text-muted-foreground">{module.hint}</p>
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {FILTERS.map((item) => (
          <button key={item} onClick={() => setActiveFilter(item)}
            className={cn("whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-all",
              activeFilter === item ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/40 text-muted-foreground hover:bg-muted"
            )}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
