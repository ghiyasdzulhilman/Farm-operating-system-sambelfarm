import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Users, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Import komponen anak yang akan kita buat setelah ini
import { PekerjaTable } from "./PekerjaTable";
import { PekerjaAtributPanel } from "./PekerjaAtributPanel";
import { PekerjaFormModal } from "./PekerjaFormModal";

export function PekerjaManager() {
  // 1. STATE KONTROL UI
  const [activeTab, setActiveTab] = useState<"tim" | "properti">("tim");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPekerjaModalOpen, setIsPekerjaModalOpen] = useState(false);

  // 2. FETCH DATA MANDIRI (React Query ditarik di sini)
  const { data: masterData, isLoading } = useQuery({
    queryKey: ["master-dropdown-options"],
    queryFn: async () => fetch("/api/notion/operasional-dropdown-options").then(res => res.json()),
  });

  // Ekstrak data dari hasil fetch dengan aman (fallback array kosong)
  const listPekerja = masterData?.petugas || [];
  const atributPekerja = masterData?.atributPekerja || { roles: [], jenisTenaga: [], statuses: [] };

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
              placeholder={activeTab === "tim" ? "Cari nama karyawan..." : "Cari di opsi properti..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/60 bg-muted/20 text-sm outline-none focus:border-primary/50 font-semibold transition-all"
            />
          </div>

          {/* Tombol Tambah Pekerja (Hanya aktif di Tab Tim Pekerja) */}
          {activeTab === "tim" && (
            <Button 
              onClick={() => setIsPekerjaModalOpen(true)}
              className="rounded-xl font-bold bg-primary text-primary-foreground gap-1.5 shrink-0"
            >
              <Plus className="h-4 w-4" /> Karyawan
            </Button>
          )}
        </div>

        {/* 🧭 TOGGLE NAVIGATION NAVIGATION (TAB GERBANG UTAMA) */}
        <div className="flex gap-2 p-1 bg-muted/40 rounded-xl w-fit border border-border/40">
          <button
            onClick={() => { setActiveTab("tim"); setSearchQuery(""); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
              activeTab === "tim" ? "bg-background text-primary shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" /> Karyawan
          </button>
          <button
            onClick={() => { setActiveTab("properti"); setSearchQuery(""); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
              activeTab === "properti" ? "bg-background text-primary shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Database className="h-3.5 w-3.5" /> Kelola Properti
          </button>
        </div>
      </div>

      {/* 📦 BAGIAN B: DATA PRESENTATION BARIS TABEL */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground animate-pulse">Memuat data tim...</span>
        </div>
      ) : activeTab === "tim" ? (
        <PekerjaTable 
          pekerja={listPekerja} 
          atribut={atributPekerja} 
          searchQuery={searchQuery} 
        />
      ) : (
        <PekerjaAtributPanel 
          atribut={atributPekerja} 
          searchQuery={searchQuery} 
        />
      )}

      {/* 🎴 MODAL POP-UP: TAMBAH PEKERJA BARU (SHEET STYLE DARI ATAS) */}
      <PekerjaFormModal 
        isOpen={isPekerjaModalOpen} 
        onClose={() => setIsPekerjaModalOpen(false)} 
        atribut={atributPekerja}
      />
    </div>
  );
}
