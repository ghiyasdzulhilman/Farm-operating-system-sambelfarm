import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Package, Pencil, ToggleLeft, ToggleRight, PackageSearch, AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ProdukListProps {
  produk: any[];
  activeTab: string;
  searchQuery: string;
}

export function ProdukList({ produk, activeTab, searchQuery }: ProdukListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State Edit Harga
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHarga, setEditHarga] = useState<string>("");

  // 🚀 State Edit Stok (Stock Adjustment)
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [stokFisik, setStokFisik] = useState<string>("");
  const [catatanStok, setCatatanStok] = useState<string>("");

  // 1. MUTASI UPDATE (Toggle Aktif & Edit Harga)
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/produk/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memperbarui produk.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produk-master-list"] });
      setEditingId(null);
      toast({ title: "Tersimpan", description: "Data produk berhasil diperbarui." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
    },
  });

  // 2. MUTASI HAPUS
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/produk/${id}`, { method: "DELETE" });
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch (error) { data = { error: text }; }
      if (!res.ok) throw new Error(data.error || "Gagal menghapus produk.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produk-master-list"] });
      toast({ title: "Dihapus", description: "Produk berhasil dihapus dari database." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
    }
  });

  // 🚀 3. MUTASI PENYESUAIAN STOK (AJUSTMENT)
  const adjustMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/produk/${id}/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyesuaikan stok.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produk-master-list"] });
      setEditingStockId(null);
      toast({ title: "Stok Disesuaikan", description: "Jurnal penyesuaian stok berhasil dicatat." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal", description: err.message });
    },
  });

  // 4. LOGIKA FILTERING DATA
  const filteredProduk = useMemo(() => {
    return produk
      .filter((item) => activeTab === "Semua" || item.jenis?.toLowerCase() === activeTab.toLowerCase())
      .filter((item) => item.nama?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [produk, activeTab, searchQuery]);

  // --- HANDLER HARGA ---
  const startEditHarga = (item: any) => {
    setEditingStockId(null); // Tutup form stok jika sedang terbuka
    setEditingId(item.id);
    setEditHarga(String(item.hargaPerSatuanDasar ?? 0));
  };

  const submitEditHarga = (item: any) => {
    const nilaiBaru = Number(editHarga);
    if (nilaiBaru === 0 && item.isActive && item.hargaPerSatuanDasar !== 0) {
      const yakin = confirm(`⚠️ Set harga "${item.nama}" ke Rp0 akan memblokir produk ini dari form perawatan. Lanjutkan?`);
      if (!yakin) return;
    }
    updateMutation.mutate({ id: item.id, payload: { hargaPerSatuanDasar: nilaiBaru } });
  };

  // 🚀 --- HANDLER STOK ---
  const startEditStock = (item: any) => {
    setEditingId(null); // Tutup form harga jika sedang terbuka
    setEditingStockId(item.id);
    setStokFisik(String(item.stokSaatIni));
    setCatatanStok("");
  };

  const submitEditStock = (item: any) => {
    const fisikNum = Number(stokFisik);
    if (fisikNum === Number(item.stokSaatIni)) {
      toast({ title: "Tidak ada perubahan", description: "Angka stok fisik sama dengan stok di sistem." });
      setEditingStockId(null);
      return;
    }
    adjustMutation.mutate({ 
      id: item.id, 
      payload: { stokFisik: fisikNum, catatan: catatanStok } 
    });
  };

  const toggleActive = (item: any) => {
    updateMutation.mutate({ id: item.id, payload: { isActive: !item.isActive } });
  };

  return (
    <div className="w-full space-y-3 animate-in fade-in duration-300">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">
        Daftar Produk Terdaftar ({filteredProduk.length})
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredProduk.map((item) => {
          const isEditingHarga = editingId === item.id;
          const isEditingStock = editingStockId === item.id;
          const hargaKosong = !item.hargaPerSatuanDasar || item.hargaPerSatuanDasar === 0;

          return (
            <div
              key={item.id}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border bg-card p-3.5 shadow-sm transition-all duration-200",
                item.isActive 
                  ? "border-border/50 hover:border-primary/30" 
                  : "border-border/20 bg-muted/10 opacity-75 grayscale-[0.3]"
              )}
            >
              {/* SEKTOR ATAS: Identitas & Tombol Aksi */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="rounded-xl bg-muted/60 p-2 text-muted-foreground/80 shrink-0 mt-0.5">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-foreground truncate block">
                      {item.nama}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                        {item.jenis}
                      </span>
                      {!item.isActive && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                          Nonaktif
                        </span>
                      )}
                      {hargaKosong && item.isActive && (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                          <AlertCircle className="h-2.5 w-2.5" /> Harga Rp0
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => toggleActive(item)}
                    disabled={updateMutation.isPending || adjustMutation.isPending}
                    className="h-9 w-9 rounded-xl hover:bg-muted"
                  >
                    {item.isActive ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => {
                      if (confirm(`Yakin ingin menghapus produk "${item.nama}"?`)) {
                        deleteMutation.mutate(item.id);
                      }
                    }}
                    disabled={deleteMutation.isPending || adjustMutation.isPending}
                    className="h-9 w-9 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* SEKTOR BAWAH: Dinamis (View / Form Edit Harga / Form Edit Stok) */}
              {isEditingStock ? (
                // 🚀 TAMPILAN FORM OPNAME STOK
                <div className="w-full flex flex-col gap-2.5 pt-3 border-t border-border/40 mt-1 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                      <RefreshCcw className="h-3 w-3" /> Opname Stok
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">Sistem: {item.stokSaatIni} {item.satuanDasar}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Stok Fisik Gudang"
                      value={stokFisik}
                      onChange={(e) => setStokFisik(e.target.value)}
                      className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary/50 font-bold shadow-sm"
                      autoFocus
                    />
                    <span className="text-xs font-bold text-muted-foreground min-w-[30px] text-center">{item.satuanDasar}</span>
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Catatan (opsional, misal: hilang, tumpah)"
                    value={catatanStok}
                    onChange={(e) => setCatatanStok(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary/50 font-medium shadow-sm"
                  />
                  
                  <div className="flex justify-end gap-2 mt-0.5">
                    <Button size="sm" variant="ghost" onClick={() => setEditingStockId(null)} className="h-8 px-3 text-[11px] font-bold rounded-xl hover:bg-muted">
                      Batal
                    </Button>
                    <Button size="sm" onClick={() => submitEditStock(item)} disabled={adjustMutation.isPending} className="h-8 px-4 text-[11px] font-bold bg-primary text-primary-foreground rounded-xl shadow-sm">
                      {adjustMutation.isPending ? "Proses..." : "Simpan Penyesuaian"}
                    </Button>
                  </div>
                </div>
              ) : (
                // TAMPILAN NORMAL / EDIT HARGA
                <div className="flex items-center justify-between pt-2.5 border-t border-border/40 mt-1">
                  
                  {/* Bagian Stok Kiri */}
                  <div className="text-xs flex items-center gap-1.5">
                    <span className="text-muted-foreground">Stok:</span>
                    <button 
                      onClick={() => startEditStock(item)} 
                      className="flex items-center gap-1.5 font-bold text-foreground hover:text-primary transition-colors group"
                    >
                      {item.stokSaatIni} <span className="font-semibold text-muted-foreground group-hover:text-primary/70">{item.satuanDasar}</span>
                      <Pencil className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary/70 transition-colors" />
                    </button>
                  </div>
                  
                  {/* Bagian Harga Kanan */}
                  <div className="text-xs">
                    {isEditingHarga ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                        <input
                          type="number" 
                          value={editHarga} 
                          onChange={(e) => setEditHarga(e.target.value)}
                          className="w-24 rounded-lg border border-input bg-background px-2 py-1 text-xs outline-none focus:border-primary/50 font-bold shadow-sm"
                          autoFocus
                        />
                        <Button size="sm" variant="ghost" onClick={() => submitEditHarga(item)} className="h-7 px-2.5 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg">
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7 px-2.5 text-[10px] font-bold rounded-lg hover:bg-muted">
                          Batal
                        </Button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => startEditHarga(item)} 
                        className="flex items-center gap-1.5 font-bold text-foreground hover:text-primary transition-colors group"
                      >
                        <span className={cn(hargaKosong && "text-amber-600")}>
                          Rp{item.hargaPerSatuanDasar?.toLocaleString("id-ID") ?? 0}
                        </span>
                        <span className="text-muted-foreground/60 text-[10px] font-semibold">
                          /{item.satuanDasar}
                        </span>
                        <Pencil className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary/70 transition-colors" />
                      </button>
                    )}
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredProduk.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-3xl bg-muted/10 text-center text-muted-foreground">
          <PackageSearch className="h-8 w-8 opacity-20 mb-2" />
          <p className="text-xs font-semibold">Tidak ada produk ditemukan.</p>
          <p className="text-[10px] opacity-70">Coba ubah kata kunci atau ganti filter kategori.</p>
        </div>
      )}
    </div>
  );
}
