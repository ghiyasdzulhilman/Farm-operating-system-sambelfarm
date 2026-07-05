import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Leaf, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Import komponen anak yang akan kita bikin setelah ini
import { KategoriList } from "./KategoriList";
import { KategoriFormModal } from "./KategoriFormModal";

export function KategoriManager() {
  // 1. STATE KONTROL UI
  const [activeTab, setActiveTab] = useState<"perawatan" | "operasional">("perawatan");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 2. FETCH DATA MANDIRI (Otomatis berbagi cache dengan modul lainnya)
  const { data: masterData, isLoading } = useQuery({
    queryKey: ["master-dropdown-options"],
    queryFn: async () => fetch("/api/notion/operasional-dropdown-options").then(res => res.json()),
  });

  const allKategori = masterData?.kategori || [];

  return (
    <div className="space-y-6">
      {/* 📊 BAGIAN A: TOP ACTION BAR (STICKY HEADER CONTROL) */}
      <div className="sticky top-0 z-10 bg-background/90 pt-2 pb-4 backdrop-blur-md space-y-4 border-b border-border/40">
        <div className="flex items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={activeTab === "perawatan" ? "Cari kategori perawatan..." : "Cari kategori operasional..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/60 bg-muted/20 text-sm outline-none focus:border-primary/50 font-semibold transition-all"
            />
          </div>

          {/* Tombol Tambah Kategori */}
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl font-bold bg-primary text-primary-foreground gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" /> Kategori
          </Button>
        </div>

        {/* 🧭 TOGGLE NAVIGATION (TAB GERBANG UTAMA) */}
        <div className="flex gap-2 p-1 bg-muted/40 rounded-xl w-fit border border-border/40">
          <button
            onClick={() => { setActiveTab("perawatan"); setSearchQuery(""); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
              activeTab === "perawatan" ? "bg-background text-primary shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Leaf className="h-3.5 w-3.5" /> Perawatan
          </button>
          <button
            onClick={() => { setActiveTab("operasional"); setSearchQuery(""); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
              activeTab === "operasional" ? "bg-background text-primary shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Wrench className="h-3.5 w-3.5" /> Operasional
          </button>
        </div>
      </div>

      {/* 📦 BAGIAN B: DAFTAR KATEGORI */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground animate-pulse">Memuat data kategori...</span>
        </div>
      ) : (
        <KategoriList 
          kategori={allKategori} 
          activeTab={activeTab} 
          searchQuery={searchQuery} 
        />
      )}

      {/* 🎴 MODAL POP-UP: TAMBAH KATEGORI BARU (SHEET STYLE PREMIUM) */}
      <KategoriFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        defaultModule={activeTab}
      />
    </div>
  );
}
