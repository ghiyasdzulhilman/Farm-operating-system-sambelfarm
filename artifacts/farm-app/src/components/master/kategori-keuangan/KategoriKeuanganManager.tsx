import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, ArrowUpRight, ArrowDownRight, Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { KategoriKeuanganFormModal } from "./KategoriKeuanganFormModal";

export function KategoriKeuanganManager() {
  // 1. STATE KONTROL UI
  const [activeTab, setActiveTab] = useState<"pengeluaran" | "pendapatan">("pengeluaran");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 2. FETCH DATA MANDIRI (Dari backend postgres kita)
  const { data, isLoading } = useQuery({
    queryKey: ["kategori-keuangan"],
    queryFn: async () => {
      const res = await fetch("/api/finance/kategori");
      if (!res.ok) throw new Error("Gagal mengambil data");
      return res.json();
    },
  });

  // 3. LOGIC TAMBAH/EDIT DATA
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingItem ? `/api/finance/kategori/${editingItem.id}` : "/api/finance/kategori";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Gagal menyimpan data");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kategori-keuangan"] });
      toast({ title: "Sukses", description: "Kategori berhasil disimpan!" });
      setIsModalOpen(false);
      setEditingItem(null);
    },
    onError: () => toast({ title: "Error", description: "Nama kategori sudah ada atau terjadi kesalahan.", variant: "destructive" }),
  });

  // 4. LOGIC HAPUS DATA
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/finance/kategori/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus data");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kategori-keuangan"] });
      toast({ title: "Terhapus", description: "Kategori berhasil dihapus." });
    },
    onError: () => toast({ title: "Error", description: "Gagal menghapus. Kategori mungkin sedang dipakai.", variant: "destructive" }),
  });

  // 5. DATA FILTERING (Berdasarkan Tab Aktif & Pencarian)
  const allKategori = data?.data || [];
  const filteredKategori = allKategori.filter((kat: any) => 
    kat.tipe === activeTab && 
    kat.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              placeholder={activeTab === "pengeluaran" ? "Cari pengeluaran..." : "Cari pendapatan..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/60 bg-muted/20 text-sm outline-none focus:border-primary/50 font-semibold transition-all"
            />
          </div>

          {/* Tombol Tambah Kategori */}
          <Button 
            onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
            className="rounded-xl font-bold bg-primary text-primary-foreground gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" /> Kategori
          </Button>
        </div>

        {/* 🧭 TOGGLE NAVIGATION (TAB GERBANG UTAMA) */}
        <div className="flex gap-2 p-1 bg-muted/40 rounded-xl w-fit border border-border/40">
          <button
            onClick={() => { setActiveTab("pengeluaran"); setSearchQuery(""); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
              activeTab === "pengeluaran" 
                ? "bg-background text-rose-500 shadow-sm border border-border/40" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowUpRight className="h-3.5 w-3.5" /> Pengeluaran
          </button>
          <button
            onClick={() => { setActiveTab("pendapatan"); setSearchQuery(""); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
              activeTab === "pendapatan" 
                ? "bg-background text-emerald-500 shadow-sm border border-border/40" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowDownRight className="h-3.5 w-3.5" /> Pendapatan
          </button>
        </div>
      </div>

      {/* 📦 BAGIAN B: DAFTAR KATEGORI */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground animate-pulse">Memuat data kategori...</span>
        </div>
      ) : filteredKategori.length === 0 ? (
        <div className="text-center p-10 border border-dashed border-border/50 rounded-[2rem] text-muted-foreground">
          {searchQuery ? "Kategori tidak ditemukan." : `Belum ada kategori ${activeTab} yang terdaftar.`}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredKategori.map((kat: any) => (
            <div key={kat.id} className="group relative flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/20 transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-xl",
                  kat.tipe === "pendapatan" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                )}>
                  {kat.tipe === "pendapatan" ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-foreground leading-tight">{kat.nama}</h3>
                  {kat.keterangan && (
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5 truncate max-w-[200px]">
                      {kat.keterangan}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setEditingItem(kat); setIsModalOpen(true); }} className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { if(confirm("Hapus kategori ini?")) deleteMutation.mutate(kat.id); }} className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🎴 MODAL POP-UP */}
      <KategoriKeuanganFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={editingItem} 
        onSave={(payload) => saveMutation.mutate(payload)}
        isLoading={saveMutation.isPending}
      />
    </div>
  );
}
