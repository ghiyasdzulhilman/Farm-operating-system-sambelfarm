import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Import komponen anak yang akan kita buat setelah ini
import { ProdukList } from "./ProdukList";
import { ProdukFormModal } from "./ProdukFormModal";

// Kamus kategori produk sesuai standar sebelumnya
const TAB_OPTIONS = ["Semua", "Pupuk", "Pestisida", "Herbisida", "Fungisida", "Lainnya"];

export function ProdukManager() {
  // 1. STATE KONTROL UI
  const [activeTab, setActiveTab] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 2. FETCH DATA MANDIRI (Terpisah dari dropdown master)
  const { data, isLoading } = useQuery({
    queryKey: ["produk-master-list"],
    queryFn: async () => fetch("/api/produk").then((r) => r.json()),
  });

  const semuaProduk = data?.data || [];

  return (
    <div className="space-y-6">
      {/* 📊 BAGIAN A: TOP ACTION BAR (STICKY HEADER CONTROL) */}
      <div className="sticky top-0 z-10 bg-background/90 pt-2 pb-4 backdrop-blur-md space-y-4 border-b border-border/40">
        <div className="flex items-center justify-between gap-4">
          
          {/* Search Input - Clean & Consistent */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={activeTab === "Semua" ? "Cari semua produk..." : `Cari produk ${activeTab.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/60 bg-muted/20 text-sm outline-none focus:border-primary/50 font-semibold transition-all"
            />
          </div>

          {/* Tombol Tambah Produk */}
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl font-bold bg-primary text-primary-foreground gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" /> Produk
          </Button>
        </div>

        {/* 🧭 TOGGLE NAVIGATION (SCROLLABLE TABS) */}
        <div className="flex gap-2 p-1 bg-muted/40 rounded-xl w-full overflow-x-auto border border-border/40 
          /* Sembunyikan scrollbar tapi tetap bisa digeser */
          scrollbar-width-none [&::-webkit-scrollbar]:hidden"
        >
          {TAB_OPTIONS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSearchQuery(""); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0",
                activeTab === tab 
                  ? "bg-background text-primary shadow-sm border border-border/40" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "Semua" && <Package className="h-3.5 w-3.5" />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* 📦 BAGIAN B: DAFTAR PRODUK */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground animate-pulse">Memuat master produk...</span>
        </div>
      ) : (
        <ProdukList 
          produk={semuaProduk} 
          activeTab={activeTab} 
          searchQuery={searchQuery} 
        />
      )}

      {/* 🎴 MODAL POP-UP: TAMBAH PRODUK BARU */}
      <ProdukFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        defaultType={activeTab !== "Semua" ? activeTab : "Pupuk"} 
      />
    </div>
  );
}
