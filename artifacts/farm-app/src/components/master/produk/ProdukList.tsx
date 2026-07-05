import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Package, Pencil, ToggleLeft, ToggleRight, PackageSearch, AlertCircle } from "lucide-react";
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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHarga, setEditHarga] = useState<string>("");

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

      // 2. MUTASI HAPUS (Versi Anti-Crash)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/produk/${id}`, { method: "DELETE" });
      
      // 🚀 Trik Paling Aman: Baca response sebagai teks mentah dulu
      const text = await res.text();
      
      let data;
      try {
        // Coba jadikan JSON. Kalau responsnya kosong (text == ""), jadikan object kosong {}
        data = text ? JSON.parse(text) : {}; 
      } catch (error) {
        // Kalau gagal di-parse (berarti server ngirim teks biasa / HTML error), tampung teksnya
        data = { error: text };
      }

      // Cek status HTTP-nya (kalau 400 atau 500, lempar error ke toast)
      if (!res.ok) {
        throw new Error(data.error || "Produk tidak bisa dihapus, kemungkinan masih dipakai di data perawatan.");
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produk-master-list"] });
      toast({ title: "Dihapus", description: "Produk berhasil dihapus dari database." });
    },
    onError: (err: any) => {
      // ⚠️ Pesan FK restrict (karena masih kepakai di perawatan) bakal muncul di sini
      toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
    }
  });

  // 3. LOGIKA FILTERING DATA
  const filteredProduk = useMemo(() => {
    return produk
      .filter((item) => activeTab === "Semua" || item.jenis?.toLowerCase() === activeTab.toLowerCase())
      .filter((item) => item.nama?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [produk, activeTab, searchQuery]);

  // 4. HANDLER EDIT HARGA INLINE
  const startEditHarga = (item: any) => {
    setEditingId(item.id);
    setEditHarga(String(item.hargaPerSatuanDasar ?? 0));
  };

  const submitEditHarga = (item: any) => {
    const nilaiBaru = Number(editHarga);
    if (nilaiBaru === 0 && item.isActive && item.hargaPerSatuanDasar !== 0) {
      const yakin = confirm(
        `⚠️ Set harga "${item.nama}" ke Rp0 akan memblokir produk ini dari form perawatan. Lanjutkan?`
      );
      if (!yakin) return;
    }
    updateMutation.mutate({ id: item.id, payload: { hargaPerSatuanDasar: nilaiBaru } });
  };

  const toggleActive = (item: any) => {
    updateMutation.mutate({ id: item.id, payload: { isActive: !item.isActive } });
  };

  return (
    <div className="w-full space-y-3 animate-in fade-in duration-300">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">
        Daftar Produk Terdaftar ({filteredProduk.length})
      </h4>

      {/* Grid Layout: 1 Kolom di HP, 2 Kolom di Tablet/Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredProduk.map((item) => {
          const isEditing = editingId === item.id;
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
                
                {/* Kiri: Ikon, Nama & Badges */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="rounded-xl bg-muted/60 p-2 text-muted-foreground/80 shrink-0 mt-0.5">
                    <Package className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-foreground truncate block">
                      {item.nama}
                    </span>
                    
                    {/* Deretan Label / Badges */}
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

                {/* Kanan: Tombol Toggle & Hapus */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => toggleActive(item)}
                    disabled={updateMutation.isPending}
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
                    disabled={deleteMutation.isPending}
                    className="h-9 w-9 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* SEKTOR BAWAH: Stok & Mode Edit Harga */}
              <div className="flex items-center justify-between pt-2.5 border-t border-border/40 mt-1">
                <div className="text-xs text-muted-foreground">
                  Stok: <span className="font-bold text-foreground">{item.stokSaatIni} {item.satuanDasar}</span>
                </div>
                
                <div className="text-xs">
                  {isEditing ? (
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
            </div>
          );
        })}
      </div>

      {/* Empty State kalau pencarian / kategori kosong */}
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
