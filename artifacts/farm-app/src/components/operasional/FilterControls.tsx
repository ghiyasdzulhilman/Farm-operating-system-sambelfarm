// 🚀 FIX: Import icon Banknote (Pengeluaran) dan ShoppingBasket (Panen)
import { LayoutGrid, List, TableProperties, Layers, Sprout, HardHat, Wallet, Bug, Banknote, ShoppingBasket } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgronomyItem, ModuleKey, ViewKey } from "@/types/operasional";

interface FilterProps {
  feedData: AgronomyItem[];
  activeView: ViewKey; setActiveView: (v: ViewKey) => void;
  activeModule: ModuleKey; setActiveModule: (m: ModuleKey) => void;
  activeFilter: string; setActiveFilter: (f: string) => void;
  filterSiklus: "aktif" | "selesai"; 
  setFilterSiklus: (val: "aktif" | "selesai") => void;
  // 🚀 SUNTIKAN BARU: Props untuk Master Tab (Domain Segregation)
  activeDomain: "agronomi" | "finance";
  setActiveDomain: (d: "agronomi" | "finance") => void;
}

const MODULE_ICONS: Record<string, any> = {
  all: Layers,
  perawatan: Sprout,
  inspeksi: Bug,
  operasional: HardHat,
  pengeluaran: Banknote,
  panen: ShoppingBasket,
};

export function FilterControls({ 
  feedData, activeView, setActiveView, activeModule, setActiveModule, activeFilter, setActiveFilter,
  filterSiklus, setFilterSiklus, activeDomain, setActiveDomain 
}: FilterProps) {
  
  // 🚀 LOGIKA PEMISAH (DOMAIN SEGREGATION)
  const isFinance = activeDomain === "finance";
  
  // 🚀 FIX: Tambahin "Semua Waktu" biar data yang usianya lebih dari 2 hari tetep bisa dilihat
  const DYNAMIC_FILTERS = isFinance 
    ? ["Semua Waktu", "Hari ini", "Kemarin"] 
    : ["Hari ini", "Kemarin", "Selesai", "Dalam proses", "Belum dikerjakan"];

  const AGRONOMI_MODULES: Array<{ key: ModuleKey; label: string; count: number; hint: string }> = [
    { key: "all", label: "Semua", count: feedData.filter(i => ["perawatan", "inspeksi", "operasional"].includes(i.module)).length, hint: "Total aktivitas" },
    { key: "perawatan", label: "Perawatan", count: feedData.filter(i => i.module === "perawatan").length, hint: "Nutrisi & obat" },
    { key: "inspeksi", label: "Inspeksi", count: feedData.filter(i => i.module === "inspeksi").length, hint: "Observasi hama" },
    { key: "operasional", label: "Operasional", count: feedData.filter(i => i.module === "operasional").length, hint: "Tugas harian" },
  ];

  const FINANCE_MODULES: Array<{ key: ModuleKey; label: string; count: number; hint: string }> = [
    { key: "all", label: "Semua", count: feedData.filter(i => ["pengeluaran", "panen"].includes(i.module)).length, hint: "Total keuangan" },
    { key: "pengeluaran", label: "Pengeluaran", count: feedData.filter(i => i.module === "pengeluaran").length, hint: "Uang keluar" },
    { key: "panen", label: "Panen", count: feedData.filter(i => i.module === "panen").length, hint: "Hasil panen" },
  ];

  const MODULES = isFinance ? FINANCE_MODULES : AGRONOMI_MODULES;

  return (
    <div className="mt-6 space-y-4">
      
      {/* 🌟 0. MASTER TAB: PILL SWITCH ELEGAN */}
      <div className="flex justify-center mb-2">
        <div className="inline-flex items-center p-1 rounded-full bg-muted/30 border border-border/40 shadow-inner">
          <button 
            onClick={() => setActiveDomain("agronomi")} 
            className={cn("px-8 py-2.5 rounded-full text-[13px] font-bold transition-all duration-300", 
              !isFinance ? "bg-background text-primary shadow-md border border-border/20" : "text-muted-foreground hover:text-foreground"
            )}>
            Agronomy
          </button>
          <button 
            onClick={() => setActiveDomain("finance")} 
            className={cn("px-8 py-2.5 rounded-full text-[13px] font-bold transition-all duration-300", 
              isFinance ? "bg-background text-primary shadow-md border border-border/20" : "text-muted-foreground hover:text-foreground"
            )}>
            Finance
          </button>
        </div>
      </div>
      
      {/* 🌟 1. BENTO DECK: SOFT UI MODULES */}
      {/* px-2 dan -mx-2 dihapus agar sejajar sempurna (presisi) dengan Command Bar di bawahnya */}
      <div className="flex gap-3 overflow-x-auto py-3 custom-scrollbar snap-x">
        {MODULES.map((module) => {

          const Icon = MODULE_ICONS[module.key] || Layers;
          const isActive = activeModule === module.key;
          
          return (
            <button 
              key={module.key} 
              onClick={() => setActiveModule(module.key)}
              // Menerapkan Soft Shadow: blur besar (30px), spread merata, tapi warna sangat transparan (0.08)
              className={cn(
                "snap-start relative flex w-[120px] shrink-0 flex-col justify-between rounded-[1.25rem] border p-3.5 text-left transition-all duration-500 ease-out",
                isActive 
                  ? "border-transparent bg-primary text-primary-foreground shadow-[0_12px_30px_-4px_rgba(0,0,0,0.12)] -translate-y-0.5" 
                  : "border-border/20 bg-card/50 text-foreground shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.06)] hover:bg-card hover:-translate-y-0.5"
              )}
            >
              <div className="flex items-start justify-between w-full">
                <div className={cn("rounded-2xl p-2 transition-colors", isActive ? "bg-primary-foreground/20" : "bg-muted/60")}>
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", isActive ? "bg-background text-primary" : "bg-muted text-muted-foreground border border-border/40")}>
                  {module.count}
                </span>
              </div>
              <div className="mt-5">
                <p className="text-[13px] font-semibold tracking-tight">{module.label}</p>
                <p className={cn("mt-1 text-[10px] font-medium tracking-wide leading-relaxed", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {module.hint}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* 🌟 2. COMMAND BAR: SIKLUS, VIEWS & FILTER TANGGAL */}
      <div className="flex flex-col gap-4 rounded-[1.25rem] border border-border/50 bg-card/60 backdrop-blur-md p-3 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
        
        {/* BARIS 1: Siklus (Kiri) & Views Toggle (Kanan) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center rounded-xl bg-muted/30 p-1 border border-border/30">
            <button onClick={() => setFilterSiklus("aktif")}
              className={cn("px-4 py-2 text-[11px] font-semibold rounded-lg transition-all duration-300",
                filterSiklus === "aktif" ? "bg-background shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-primary border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}>Aktif</button>
            <button onClick={() => setFilterSiklus("selesai")}
              className={cn("px-4 py-2 text-[11px] font-semibold rounded-lg transition-all duration-300",
                filterSiklus === "selesai" ? "bg-background shadow-[0_2px_10px_rgba(0,0,0,0.06)] text-primary border border-border/50" : "text-muted-foreground hover:text-foreground"
              )}>Selesai</button>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-muted/30 p-1 border border-border/30">
            {/* 🚀 FIX: Kanban disembunyikan kalau lagi buka Finance */}
            {!isFinance && (
              <button onClick={() => setActiveView("kanban")} title="Kanban View"
                className={cn("rounded-lg p-2 transition-all duration-300", activeView === "kanban" ? "bg-background text-primary shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-border/50" : "text-muted-foreground hover:text-foreground")}>
                <LayoutGrid className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => setActiveView("feed")} title="Feed View"

              className={cn("rounded-lg p-2 transition-all duration-300", activeView === "feed" ? "bg-background text-primary shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-border/50" : "text-muted-foreground hover:text-foreground")}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setActiveView("table")} title="Table View"
              className={cn("rounded-lg p-2 transition-all duration-300", activeView === "table" ? "bg-background text-primary shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-border/50" : "text-muted-foreground hover:text-foreground")}>
              <TableProperties className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* BARIS 2: Quick Filters (Hari ini, dll) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {/* 🚀 FIX: Ubah mapping jadi pakai DYNAMIC_FILTERS */}
          {DYNAMIC_FILTERS.map((item) => (
            <button key={item} onClick={() => setActiveFilter(item)}
              className={cn("shrink-0 rounded-xl px-4 py-2 text-[12px] font-medium transition-all duration-300",
                activeFilter === item 
                  ? "bg-primary/5 text-primary border border-primary/20 shadow-[0_2px_10px_rgba(0,0,0,0.04)]" 
                  : "bg-transparent text-muted-foreground hover:bg-muted/40 border border-transparent"
              )}>
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
