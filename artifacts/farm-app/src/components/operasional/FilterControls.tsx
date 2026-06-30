import { useState } from "react";
import { Filter, LayoutGrid, List, TableProperties, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgronomyItem, ModuleKey, ViewKey } from "@/types/operasional";

interface FilterProps {
  feedData: AgronomyItem[];
  activeView: ViewKey; setActiveView: (v: ViewKey) => void;
  activeModule: ModuleKey; setActiveModule: (m: ModuleKey) => void;
  activeFilter: string; setActiveFilter: (f: string) => void;
  // 🚀 PROPS BARU UNTUK FILTER SIKLUS
  filterSiklus: "aktif" | "selesai"; 
  setFilterSiklus: (val: "aktif" | "selesai") => void;
}

const FILTERS = ["Hari ini", "Kemarin", "Selesai", "Dalam proses", "Belum dikerjakan"];

export function FilterControls({ 
  feedData, activeView, setActiveView, activeModule, setActiveModule, activeFilter, setActiveFilter,
  filterSiklus, setFilterSiklus // 🚀 JANGAN LUPA DESTRUCTURE DI SINI
}: FilterProps) {

  // 🧠 STATE UNTUK BUKA/TUTUP FILTER
  const [showFilters, setShowFilters] = useState(false);
  
  const MODULES: Array<{ key: ModuleKey; label: string; count: number; hint: string }> = [
    { key: "all", label: "Semua", count: feedData.length, hint: "Gabungan aktivitas" },
    { key: "perawatan", label: "Perawatan", count: feedData.filter(i => i.module === "perawatan").length, hint: "Treatment" },
    { key: "inspeksi", label: "Inspeksi", count: feedData.filter(i => i.module === "inspeksi").length, hint: "Observasi" },
    { key: "operasional", label: "Operasional", count: feedData.filter(i => i.module === "operasional").length, hint: "Task & log" },
    { key: "finance", label: "Finance", count: feedData.filter(i => i.module === "finance").length, hint: "Cashflow" },
  ];

  return (
    <div className="mt-5 rounded-3xl border border-border/60 bg-card p-3 shadow-sm transition-all duration-300">
      
      {/* 🌟 BARIS ATAS: TOMBOL FILTER & TOGGLE VIEW (MINIMALIS) */}
      <div className="flex items-center justify-between gap-3">
        
        {/* 🚀 KELOMPOK KIRI: TOMBOL FILTER & TOGGLE SIKLUS */}
        <div className="flex items-center gap-2">
          {/* Tombol Buka/Tutup Filter */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all border shrink-0",
              showFilters 
                ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{showFilters ? "Tutup" : "Filter"}</span>
          </button>

          {/* 🚀 UI TOMBOL SIKLUS PINDAHAN DARI TABEL */}
          <div className="flex bg-muted/50 p-0.5 rounded-lg border border-border/50 shrink-0">
            <button
              onClick={() => setFilterSiklus("aktif")}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all ${
                filterSiklus === "aktif" 
                  ? "bg-background shadow-sm text-primary border border-border/50" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => setFilterSiklus("selesai")}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all ${
                filterSiklus === "selesai" 
                  ? "bg-background shadow-sm text-primary border border-border/50" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Selesai
            </button>
          </div>
        </div>

        {/* View Options (Diubah jadi Icon Saja biar gak sempit) */}
        <div className="rounded-full bg-muted/50 p-1 flex items-center gap-1">
          <button 
            onClick={() => setActiveView("kanban")}
            title="Kanban View"
            className={cn("rounded-full p-2 transition-all", activeView === "kanban" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setActiveView("feed")}
            title="Feed View"
            className={cn("rounded-full p-2 transition-all", activeView === "feed" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <List className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setActiveView("table")}
            title="Table View"
            className={cn("rounded-full p-2 transition-all", activeView === "table" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <TableProperties className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 🌟 BARIS BAWAH: KONTEN FILTER YANG BISA DI-HIDE */}
      {showFilters && (
        <div className="mt-4 pt-3 border-t border-border/40 space-y-3">
          
          {/* Slider Modul */}
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {MODULES.map((module) => (
              <button key={module.key} onClick={() => setActiveModule(module.key)}
                className={cn("min-w-[110px] shrink-0 rounded-2xl border px-3 py-2 text-left transition-all",
                  activeModule === module.key ? "border-primary/30 bg-primary/10 shadow-sm" : "border-border/60 bg-muted/20 hover:bg-muted/40"
                )}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-black tracking-tight">{module.label}</p>
                  <span className="rounded-full bg-background px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                    {module.count}
                  </span>
                </div>
                <p className="mt-0.5 text-[9px] font-medium text-muted-foreground">{module.hint}</p>
              </button>
            ))}
          </div>

          {/* Slider Status/Tanggal */}
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {FILTERS.map((item) => (
              <button key={item} onClick={() => setActiveFilter(item)}
                className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all",
                  activeFilter === item ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/40 text-muted-foreground hover:bg-muted"
                )}>
                {item}
              </button>
            ))}
          </div>
          
        </div>
      )}

    </div>
  );
}
