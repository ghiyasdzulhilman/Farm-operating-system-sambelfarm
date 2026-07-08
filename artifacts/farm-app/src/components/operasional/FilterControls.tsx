import { LayoutGrid, List, TableProperties, Layers, Sprout, HardHat, Wallet, Bug } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgronomyItem, ModuleKey, ViewKey } from "@/types/operasional";

interface FilterProps {
  feedData: AgronomyItem[];
  activeView: ViewKey; setActiveView: (v: ViewKey) => void;
  activeModule: ModuleKey; setActiveModule: (m: ModuleKey) => void;
  activeFilter: string; setActiveFilter: (f: string) => void;
  filterSiklus: "aktif" | "selesai"; 
  setFilterSiklus: (val: "aktif" | "selesai") => void;
}

const FILTERS = ["Hari ini", "Kemarin", "Selesai", "Dalam proses", "Belum dikerjakan"];

const MODULE_ICONS: Record<string, any> = {
  all: Layers,
  perawatan: Sprout,
  inspeksi: Bug,
  operasional: HardHat,
  finance: Wallet,
};

export function FilterControls({ 
  feedData, activeView, setActiveView, activeModule, setActiveModule, activeFilter, setActiveFilter,
  filterSiklus, setFilterSiklus 
}: FilterProps) {
  
  const MODULES: Array<{ key: ModuleKey; label: string; count: number; hint: string }> = [
    { key: "all", label: "Semua", count: feedData.length, hint: "Total aktivitas" },
    { key: "perawatan", label: "Perawatan", count: feedData.filter(i => i.module === "perawatan").length, hint: "Nutrisi & obat" },
    { key: "inspeksi", label: "Inspeksi", count: feedData.filter(i => i.module === "inspeksi").length, hint: "Observasi hama" },
    { key: "operasional", label: "Operasional", count: feedData.filter(i => i.module === "operasional").length, hint: "Tugas harian" },
    { key: "finance", label: "Finance", count: feedData.filter(i => i.module === "finance").length, hint: "Catatan biaya" },
  ];

  return (
    <div className="mt-6 space-y-4">
      
      {/* 🌟 1. BENTO DECK: SLIDER MODUL UTAMA */}
      {/* Perbaikan: Tambah py-4 dan px-2 agar ring/shadow tidak terpotong (clipped) */}
      <div className="flex gap-3 overflow-x-auto py-4 px-2 -mx-2 custom-scrollbar snap-x">
        {MODULES.map((module) => {
          const Icon = MODULE_ICONS[module.key] || Layers;
          const isActive = activeModule === module.key;
          
          return (
            <button 
              key={module.key} 
              onClick={() => setActiveModule(module.key)}
              className={cn(
                "snap-start relative flex min-w-[130px] shrink-0 flex-col justify-between rounded-[1.25rem] border p-4 text-left transition-all duration-300",
                isActive 
                  ? "border-transparent bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20 ring-offset-2 ring-offset-background -translate-y-1" 
                  : "border-border/40 bg-card text-foreground shadow-sm hover:border-primary/40 hover:bg-muted/30"
              )}
            >
              <div className="flex items-start justify-between w-full">
                <div className={cn("rounded-xl p-2.5 transition-colors", isActive ? "bg-primary-foreground/20" : "bg-muted/50")}>
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm", isActive ? "bg-background text-primary" : "bg-muted text-muted-foreground border border-border/50")}>
                  {module.count}
                </span>
              </div>
              <div className="mt-6">
                <p className="text-[14px] font-semibold tracking-tight">{module.label}</p>
                <p className={cn("mt-1 text-[11px] font-medium tracking-wide", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {module.hint}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 🌟 2. COMMAND BAR: SIKLUS, VIEWS & FILTER TANGGAL */}
      <div className="flex flex-col gap-4 rounded-[1.25rem] border border-border/50 bg-card/60 backdrop-blur-md p-3 shadow-sm">
        
        {/* BARIS 1: Siklus (Kiri) & Views Toggle (Kanan) */}
        <div className="flex items-center justify-between">
          {/* KIRI: Toggle Siklus */}
          <div className="flex items-center rounded-xl bg-muted/40 p-1 border border-border/40">
            <button onClick={() => setFilterSiklus("aktif")}
              className={cn("px-4 py-2 text-[11px] font-semibold rounded-lg transition-all duration-300",
                filterSiklus === "aktif" ? "bg-background shadow-sm text-primary border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}>Aktif</button>
            <button onClick={() => setFilterSiklus("selesai")}
              className={cn("px-4 py-2 text-[11px] font-semibold rounded-lg transition-all duration-300",
                filterSiklus === "selesai" ? "bg-background shadow-sm text-primary border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}>Selesai</button>
          </div>

          {/* KANAN: Views Toggle dipindah ke ujung */}
          <div className="flex items-center gap-1 rounded-xl bg-muted/40 p-1 border border-border/40">
            <button onClick={() => setActiveView("kanban")} title="Kanban View"
              className={cn("rounded-lg p-2 transition-all duration-300", activeView === "kanban" ? "bg-background text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground")}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setActiveView("feed")} title="Feed View"
              className={cn("rounded-lg p-2 transition-all duration-300", activeView === "feed" ? "bg-background text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground")}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setActiveView("table")} title="Table View"
              className={cn("rounded-lg p-2 transition-all duration-300", activeView === "table" ? "bg-background text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground")}>
              <TableProperties className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* BARIS 2: Quick Filters (Hari ini, dll) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {FILTERS.map((item) => (
            <button key={item} onClick={() => setActiveFilter(item)}
              className={cn("shrink-0 rounded-xl px-4 py-2 text-[12px] font-medium transition-all duration-300",
                activeFilter === item 
                  ? "bg-primary/10 text-primary border border-primary/20 shadow-sm" 
                  : "bg-transparent text-muted-foreground hover:bg-muted/50 border border-transparent"
              )}>
              {item}
            </button>
          ))}
        </div>

      </div>

    </div>
  );
}
