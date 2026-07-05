import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, MapPin, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Import komponen anak yang akan kita buat setelah ini
import { AreaActiveGrid } from "./AreaActiveGrid";
import { AreaArchiveTable } from "./AreaArchiveTable";
import { AreaFormModal } from "./AreaFormModal";

export function AreaManager() {
  // 1. STATE KONTROL UI
  const [activeTab, setActiveTab] = useState<"aktif" | "arsip">("aktif");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAreaModalOpen, setIsAreaModalOpen] = useState(false);

  // 2. FETCH DATA (React Query langsung ditarik di sini)
  const { data: masterData, isLoading: loadingMaster } = useQuery({
    queryKey: ["master-dropdown-options"],
    queryFn: async () => fetch("/api/notion/operasional-dropdown-options").then(res => res.json()),
  });

  const { data: listSiklus, isLoading: loadingSiklus } = useQuery({
    queryKey: ["siklus-tanam-list"],
    queryFn: async () => fetch("/api/notion/siklus-tanam").then(r => r.json()),
  });

  const areas = masterData?.areas || [];
  const allSiklus = listSiklus?.data || [];

  const isLoading = loadingMaster || loadingSiklus;

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
              placeholder={activeTab === "aktif" ? "Cari nama area..." : "Cari tanaman di arsip..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/60 bg-muted/20 text-sm outline-none focus:border-primary/50 font-semibold transition-all"
            />
          </div>

          {/* Tombol Tambah Area (Hanya aktif di Tab Area Aktif) */}
          {activeTab === "aktif" && (
            <Button 
              onClick={() => setIsAreaModalOpen(true)}
              className="rounded-xl font-bold bg-primary text-primary-foreground gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" /> Area
            </Button>
          )}
        </div>

        {/* 🧭 TOGGLE NAVIGATION NAVIGATION (TAB GERBANG UTAMA) */}
        <div className="flex gap-2 p-1 bg-muted/40 rounded-xl w-fit border border-border/40">
          <button
            onClick={() => { setActiveTab("aktif"); setSearchQuery(""); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
              activeTab === "aktif" ? "bg-background text-primary shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <MapPin className="h-3.5 w-3.5" /> Area Aktif
          </button>
          <button
            onClick={() => { setActiveTab("arsip"); setSearchQuery(""); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
              activeTab === "arsip" ? "bg-background text-primary shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Arsip Siklus
          </button>
        </div>
      </div>

      {/* 📦 BAGIAN B & C: AREA DATA PRESENTATION */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground animate-pulse">Memuat data kebun...</span>
        </div>
      ) : activeTab === "aktif" ? (
        <AreaActiveGrid 
          areas={areas} 
          allSiklus={allSiklus} 
          searchQuery={searchQuery} 
        />
      ) : (
        <AreaArchiveTable 
          areas={areas}
          allSiklus={allSiklus} 
          searchQuery={searchQuery} 
        />
      )}

      {/* 🎴 MODAL POP-UP: TAMBAH AREA BARU */}
      <AreaFormModal 
        isOpen={isAreaModalOpen} 
        onClose={() => setIsAreaModalOpen(false)} 
      />
    </div>
  );
}
