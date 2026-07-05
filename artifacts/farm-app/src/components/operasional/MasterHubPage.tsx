import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Users, Database, Trash2, Plus, Loader2, ChevronRight, X, CalendarDays, Bug, Package, Pencil, Sprout, Wallet, Wrench, ChevronDown, ToggleLeft, ToggleRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AreaManager } from "@/components/master/area/AreaManager";
import { PekerjaManager } from "@/components/master/pekerja/PekerjaManager"; 
import { KategoriManager } from "@/components/master/kategori/KategoriManager";
import { KendalaManager } from "@/components/master/kendala/KendalaManager";
import { ProdukManager } from "@/components/master/produk/ProdukManager";
// ---------------------------------------------------------------------------
// 📂 1. DICTIONARY DOMAIN MASTER
// ---------------------------------------------------------------------------

// Struktur Kamus Baru (Berhirarki)
const ERP_MODULES = [
  {
    id: "agronomy",
    label: "Agronomy",
    icon: Sprout,
    children: [
      { id: "area", label: "Area & Blok", icon: Leaf },
      { id: "pekerja", label: "Karyawan", icon: Users },
      { id: "kategori", label: "Kategori Aktivitas", icon: Database },
      { id: "produk", label: "Produk & Stok", icon: Package },
      { id: "kendala", label: "Hama & Penyakit", icon: Bug },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: Wallet,
    children: [
      { id: "panen", label: "Data Pemanenan", icon: Package },
      { id: "pengeluaran", label: "Lacak Pengeluaran", icon: Database },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    icon: Wrench,
    children: [
      { id: "weather", label: "Cuaca", icon: Package },
    ],
  },
];

const glassCard = "rounded-[1.75rem] border-border/50 bg-card text-card-foreground shadow-sm transition-all duration-300 p-5";

// ---------------------------------------------------------------------------
// 🚀 2. MAIN PAGE COMPONENT
// ---------------------------------------------------------------------------
export function MasterHubPage({ onClose }: { onClose?: () => void }) {
  
  const [activeModule, setActiveModule] = useState<string>("");
  const [activeChild, setActiveChild] = useState<string>("");
  
    return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-48 md:px-6">
      
      {/* HEADER */}

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Master Data</h1>
          <p className="text-muted-foreground text-sm">Pusat pengaturan database kebun</p>
        </div>
        {/* Tombol Tutup (Berguna kalau ini dibuka via Modal/Dialog dari dashboard utama) */}
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-muted/50">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        
{/* SIDEBAR CONTAINER */}
  <aside className="space-y-4">
  {ERP_MODULES.map((modul) => {
    const IconInduk = modul.icon;
    const isModuleExpanded = activeModule === modul.id;

    return (
      <div key={modul.id} className="space-y-1.5">
        {/* TOMBOL INDUK MODUL */}
        <button 
          onClick={() => setActiveModule(isModuleExpanded ? "" : modul.id)}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-2xl p-4 transition-all duration-300 border",
            isModuleExpanded 
              ? "bg-primary/5 border-primary/20 text-primary shadow-sm" 
              : "bg-card border-border/50 text-muted-foreground hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn("rounded-xl p-2 transition-colors", isModuleExpanded ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
              <IconInduk className="h-5 w-5" />
            </div>
            <span className={cn("text-sm font-black", isModuleExpanded && "text-foreground")}>
              {modul.label}
            </span>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isModuleExpanded && "rotate-180")} />
        </button>

  {/* DAFTAR ANAK (MUNCUL KALAU INDUK DIKLIK) */}
        <AnimatePresence>
          {isModuleExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden pl-4 pr-1 space-y-1.5"
            >
              <div className="pt-1.5 pb-2 border-l-2 border-border/50 pl-3 space-y-1.5">
                {modul.children.map((child) => {
                  const IconAnak = child.icon;
                  const isChildActive = activeChild === child.id;

                  return (
                    <button
                      key={child.id}
                      onClick={() => setActiveChild(child.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl p-3 transition-all duration-200 text-left",
                        isChildActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <IconAnak className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-bold">{child.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  })}
</aside>

{/* MAIN CONTENT */}
  <main className="space-y-4 w-full overflow-hidden">
  <AnimatePresence mode="wait">
    <motion.div 
      key={activeChild} 
      initial={{ opacity: 0, x: 10 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -10 }} 
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      
      {/* 🚀 AREA MANAGER */}
      {activeChild === "area" && <AreaManager />}
      
      {/* 🚀 PEKERJA MANAGER */}
      {activeChild === "pekerja" && <PekerjaManager />}

      {/* 🚀 KATEGORI AKTIVITAS MANAGER */}
      {activeChild === "kategori" && <KategoriManager />}

      {/* 🚀 KENDALA MASTER */}
      {activeChild === "kendala" && <KendalaManager />}

      {/* 🚀 PRODUK & STOK MASTER */}
      {activeChild === "produk" && <ProdukManager />}

      {activeChild === "panen" && (
        <div className="p-8 text-center text-muted-foreground border border-dashed rounded-3xl">Modul Panen (Coming Soon)</div>
      )}

    </motion.div>
  </AnimatePresence>
</main>

      </div>
    </div>
  );
}
