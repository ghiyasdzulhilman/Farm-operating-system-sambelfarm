import { LayoutGrid, List, TableProperties, Layers, Sprout, HardHat, Wallet, Bug, Banknote, ShoppingBasket, CalendarDays, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgronomyItem, ModuleKey, ViewKey } from "@/types/operasional";
import { DropdownMenu, DropdownMenuItem, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
// 🚀 THE FIX: Import useState dan Komponen Kalender
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";

interface FilterProps {
  feedData: AgronomyItem[];
  activeView: ViewKey; setActiveView: (v: ViewKey) => void;
  activeModule: ModuleKey; setActiveModule: (m: ModuleKey) => void;
  
  // 🚀 FIX: State filter dipecah jadi dua!
  activeTimeFilter: string; setActiveTimeFilter: (f: string) => void;
  activeStatusFilter: string; setActiveStatusFilter: (f: string) => void;
  
  // 🚀 SUNTIKAN BARU: Props buat nangkep Kalender Custom
  customDateRange: { start: string; end: string } | null;
  setCustomDateRange: (range: { start: string; end: string } | null) => void;
  
  filterSiklus: "aktif" | "selesai"; 
  setFilterSiklus: (val: "aktif" | "selesai") => void;
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
  feedData, activeView, setActiveView, activeModule, setActiveModule, 
  activeTimeFilter, setActiveTimeFilter, activeStatusFilter, setActiveStatusFilter,
  // 🚀 THE FIX: Destructure prop kalendernya di sini bro!
  customDateRange, setCustomDateRange,
  filterSiklus, setFilterSiklus, activeDomain, setActiveDomain 
}: FilterProps) {
  
  // 🚀 LOGIKA PEMISAH (DOMAIN SEGREGATION)
  const isFinance = activeDomain === "finance";
  
  // 🚀 SUNTIKAN BARU: State buat ngatur Layar Kustom ala IG
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({ from: undefined, to: undefined });
  
  // 🚀 FIX: Array Filter dipecah jadi 2 fungsi yang berbeda
  const TIME_FILTERS = ["Hari ini", "Kemarin", "Semua Waktu"];
  const STATUS_FILTERS = ["Semua Status", "Belum dikerjakan", "Dalam proses", "Selesai"];

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
        
                {/* BARIS 1: Siklus (Kiri) & Views Toggle + Kalender (Kanan) */}
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

          <div className="flex items-center gap-2">
            {/* 🌟 IKON MENU FILTER LANJUTAN PINDAH KE SINI */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn("flex items-center justify-center rounded-xl p-2.5 transition-all duration-300",
                    ["7 Hari", "30 Hari", "90 Hari", "Kustom"].includes(activeTimeFilter)
                      ? "bg-primary text-primary-foreground shadow-[0_4px_15px_-4px_rgba(var(--primary),0.4)]"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50 border border-border/30"
                  )}>
                  <CalendarDays className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent align="end" className="w-48 rounded-[1.25rem] p-2 shadow-[0_12px_40px_-4px_rgba(0,0,0,0.12)] border-border/50 bg-card/90 backdrop-blur-xl">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Periode Waktu</div>
                {["7 Hari", "30 Hari", "90 Hari"].map(item => (
                  <DropdownMenuItem 
                    key={item} 
                    onSelect={() => { setActiveTimeFilter(item); setCustomDateRange(null); }}
                    className={cn("rounded-xl px-3 py-2.5 text-xs font-bold cursor-pointer transition-colors", 
                      activeTimeFilter === item ? "bg-primary/10 text-primary" : "text-foreground focus:bg-muted"
                    )}
                  >
                    {item}
                  </DropdownMenuItem>
                ))}
               <DropdownMenuSeparator className="my-1.5 border-border/40" />
                <DropdownMenuItem 
                  onSelect={() => {
                    // 🚀 THE FIX 1: Hapus e.preventDefault() biar menu Dropdown otomatis NUTUP!
                    setIsCustomModalOpen(true); 
                    
                    if (customDateRange?.start) {
                      setTempRange({
                        from: new Date(customDateRange.start),
                        to: customDateRange.end ? new Date(customDateRange.end) : undefined
                      });
                    }
                  }}
                  className="rounded-xl px-3 py-2.5 text-xs font-bold cursor-pointer text-foreground focus:bg-muted flex justify-between items-center"
                >
                  <span>Kustom</span>
                  <ChevronDown className="h-3 w-3 opacity-50 -rotate-90" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-1 rounded-xl bg-muted/30 p-1 border border-border/30">
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
        </div>

        {/* 🚀 WRAPPER BARU: Mengelompokkan Baris 2 dan Baris 3 biar rapat */}
        <div className="flex flex-col">
          
       {/* BARIS 2: Filter Waktu (Selalu Tampil) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {TIME_FILTERS.map((item) => (
              <button key={item} onClick={() => { setActiveTimeFilter(item); setCustomDateRange(null); }}
                className={cn("shrink-0 rounded-xl px-4 py-2 text-[12px] font-medium transition-all duration-300",
                  activeTimeFilter === item 
                    ? "bg-primary/10 text-primary border border-primary/30 shadow-[0_2px_10px_rgba(0,0,0,0.04)]" 
                    : "bg-transparent text-muted-foreground hover:bg-muted/40 border border-transparent"
                )}>
                <span className="flex items-center gap-1.5">{item}</span>
              </button>
            ))}
            
            {/* 🚀 Label indikator kalau lagi pakai filter Kustom / Advanced */}
            {["7 Hari", "30 Hari", "90 Hari", "Kustom"].includes(activeTimeFilter) && (
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <CalendarDays className="h-3 w-3 text-primary" />
                <span className="text-[11px] font-bold text-primary">
                  {activeTimeFilter === "Kustom" && customDateRange?.start 
                    ? `${String(customDateRange.start).substring(5)} s/d ${String(customDateRange.end).substring(5)}` 
                    : activeTimeFilter}
                </span>
              </div>
            )}
          </div>

          {/* 🚀 BARIS 3: Filter Status (Sembunyi kalau lagi buka Finance) */}
          {!isFinance && (
            <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-border/30 custom-scrollbar">
              {STATUS_FILTERS.map((item) => (
                <button key={item} onClick={() => setActiveStatusFilter(item)}

                  className={cn("shrink-0 rounded-xl px-4 py-2 text-[12px] font-medium transition-all duration-300",
                    activeStatusFilter === item 
                      ? "bg-primary/5 text-primary border border-primary/20 shadow-[0_2px_10px_rgba(0,0,0,0.04)]" 
                      : "bg-transparent text-muted-foreground hover:bg-muted/40 border border-transparent"
                  )}>
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

    {/* 🌟 TOP SHEET KALENDER KUSTOM (Muncul dari Atas ke Bawah) */}
      {isCustomModalOpen && (
        // 🚀 THE FIX 2: Ubah justify-end jadi justify-start
        <div className="fixed inset-0 z-50 flex flex-col justify-start bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
          
          {/* Kertas Meluncur dari Atas (Top Sheet) */}
          {/* 🚀 THE FIX 3: Ubah rounded jadi di bawah (rounded-b), dan animasi dari top (slide-in-from-top-full) */}
          <div className="bg-card/95 backdrop-blur-md rounded-b-[2rem] border-b border-border/50 shadow-[0_10px_40px_rgba(0,0,0,0.15)] flex flex-col max-h-[85vh] animate-in slide-in-from-top-full duration-300 ease-out">
            
            {/* Header ala IG */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <button 
                onClick={() => setIsCustomModalOpen(false)} 
                className="text-primary/80 hover:text-primary font-semibold text-sm px-2"
              >
                Cancel
              </button>
              <div className="font-bold text-[15px] tracking-tight">
                {tempRange.from ? (
                  tempRange.to 
                    ? `${tempRange.from.toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})} - ${tempRange.to.toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}`
                    : tempRange.from.toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})
                ) : "Pilih Tanggal"}
              </div>
              <button 
                onClick={() => {
                  // Format tanggal jadi string YYYY-MM-DD
                  if (tempRange.from) {
                    const toDate = tempRange.to || tempRange.from;
                    // Cheat biar gak pusing masalah Timezone UTC
                    const formatYMD = (d: Date) => {
                      const offset = d.getTimezoneOffset() * 60000;
                      return new Date(d.getTime() - offset).toISOString().split('T')[0];
                    };
                    
                    setCustomDateRange({
                      start: formatYMD(tempRange.from),
                      end: formatYMD(toDate)
                    });
                    setActiveTimeFilter("Kustom");
                  }
                  setIsCustomModalOpen(false);
                }} 
                className="text-primary font-bold text-sm px-2"
              >
                Update
              </button>
            </div>

          {/* Area Kalender Range */}
            <div className="overflow-y-auto p-6 flex justify-center custom-scrollbar pb-12">
              <Calendar
                mode="range"
                selected={{ from: tempRange.from, to: tempRange.to }}
                onSelect={(range) => setTempRange({ from: range?.from, to: range?.to })}
                className="w-full max-w-sm rounded-[1.5rem] border border-border/30 bg-background/50 shadow-inner p-4"
              />
            </div>

          </div>
          
          {/* 🚀 THE FIX 4: Area klik luar dipindah ke sini (di bawah kalender) */}
          <div className="flex-1" onClick={() => setIsCustomModalOpen(false)}></div>
          
        </div>
      )}
    </div> 
  );
}
