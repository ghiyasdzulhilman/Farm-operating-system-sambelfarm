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
  filterSiklus, setFilterSiklus 
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
    <div className="mt-6 rounded-[1.5rem] border border-slate-100/60 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300">
      
      {/* 🌟 BARIS ATAS: TOMBOL FILTER & TOGGLE VIEW (MINIMALIS) */}
      <div className="flex items-center justify-between gap-3">
        
        {/* 🚀 KELOMPOK KIRI: TOMBOL FILTER & TOGGLE SIKLUS */}
        <div className="flex items-center gap-2">
          {/* Tombol Buka/Tutup Filter */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-bold transition-all duration-300 border shrink-0",
              showFilters 
                ? "bg-blue-50 text-blue-600 border-blue-100/50 shadow-[0_2px_10px_rgb(59,130,246,0.1)]" 
                : "bg-slate-50 text-slate-500 border-transparent hover:bg-slate-100"
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{showFilters ? "Tutup" : "Filter"}</span>
          </button>

          {/* 🚀 UI TOMBOL SIKLUS (Gaya iOS Segmented Control) */}
          <div className="flex bg-slate-50/80 p-1 rounded-xl border border-slate-100 shrink-0">
            <button
              onClick={() => setFilterSiklus("aktif")}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
                filterSiklus === "aktif" 
                  ? "bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] text-blue-600 border border-slate-100/50" 
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => setFilterSiklus("selesai")}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${
                filterSiklus === "selesai" 
                  ? "bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] text-blue-600 border border-slate-100/50" 
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Selesai
            </button>
          </div>
        </div>

        {/* View Options (Gaya iOS Segmented Control) */}
        <div className="rounded-xl bg-slate-50/80 p-1 flex items-center gap-1 border border-slate-100">
          <button 
            onClick={() => setActiveView("kanban")}
            title="Kanban View"
            className={cn("rounded-lg p-2 transition-all duration-300", activeView === "kanban" ? "bg-white text-blue-600 shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-slate-100/50" : "text-slate-400 hover:text-slate-600")}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setActiveView("feed")}
            title="Feed View"
            className={cn("rounded-lg p-2 transition-all duration-300", activeView === "feed" ? "bg-white text-blue-600 shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-slate-100/50" : "text-slate-400 hover:text-slate-600")}
          >
            <List className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setActiveView("table")}
            title="Table View"
            className={cn("rounded-lg p-2 transition-all duration-300", activeView === "table" ? "bg-white text-blue-600 shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-slate-100/50" : "text-slate-400 hover:text-slate-600")}
          >
            <TableProperties className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 🌟 BARIS BAWAH: KONTEN FILTER YANG BISA DI-HIDE */}
      {showFilters && (
        <div className="mt-5 pt-4 border-t border-slate-100/80 space-y-4">
          
          {/* Slider Modul */}
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {MODULES.map((module) => (
              <button key={module.key} onClick={() => setActiveModule(module.key)}
                className={cn("min-w-[110px] shrink-0 rounded-2xl border px-3 py-2.5 text-left transition-all duration-300",
                  activeModule === module.key 
                    ? "border-blue-100/60 bg-blue-50 shadow-[0_4px_15px_rgb(59,130,246,0.06)] scale-[0.98]" 
                    : "border-slate-100/60 bg-slate-50/50 hover:bg-slate-50 hover:-translate-y-0.5"
                )}>
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("text-[13px] font-black tracking-tight", activeModule === module.key ? "text-blue-700" : "text-slate-700")}>
                    {module.label}
                  </p>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", activeModule === module.key ? "bg-white text-blue-600 shadow-sm" : "bg-white text-slate-400 border border-slate-100")}>
                    {module.count}
                  </span>
                </div>
                <p className={cn("mt-0.5 text-[10px] font-medium", activeModule === module.key ? "text-blue-400" : "text-slate-400")}>
                  {module.hint}
                </p>
              </button>
            ))}
          </div>

          {/* Slider Status/Tanggal */}
          <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {FILTERS.map((item) => (
              <button key={item} onClick={() => setActiveFilter(item)}
                className={cn("whitespace-nowrap rounded-xl px-4 py-2 text-[11px] font-bold transition-all duration-300",
                  activeFilter === item 
                    ? "bg-blue-500 text-white shadow-[0_4px_15px_rgb(59,130,246,0.25)] hover:bg-blue-600" 
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100"
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
