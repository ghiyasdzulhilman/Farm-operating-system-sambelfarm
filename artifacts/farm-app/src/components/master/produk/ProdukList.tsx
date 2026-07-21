import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Package, Pencil, ToggleLeft, ToggleRight, PackageSearch, AlertCircle, RefreshCcw, RotateCcw, ShieldAlert, MoreVertical } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"; // 🚀 FIX UX: Import Sheet
import { HppHistoryPopover } from "./HppHistoryPopover"; 

interface ProdukListProps {
  produk: any[];
  activeTab: string;
  searchQuery: string;
  statusFilter: "aktif" | "nonaktif" | "delete"; // 🚀 FIX: Terima statusFilter dari induk
}

export function ProdukList({ produk, activeTab, searchQuery, statusFilter }: ProdukListProps) {
  const { toast } = useToast();
    const queryClient = useQueryClient();

  // 🚀 TAMBAHAN: State Edit Detail Produk (Titik 3)
  const [editingDetail, setEditingDetail] = useState<any | null>(null);
  const [detailForm, setDetailForm] = useState<any>({});

    // 🚀 TAMBAHAN: State Keamanan Hapus Permanen
  const [forceDeleteTarget, setForceDeleteTarget] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState<string>("");

  // State Edit Harga
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHarga, setEditHarga] = useState<string>("");

  // State Edit Stok (Stock Adjustment)
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
      setEditingDetail(null); // 🚀 FIX: Tutup sheet edit detail saat sukses
      toast({ title: "Tersimpan", description: "Data produk berhasil diperbarui." });
    },

    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
    },
  });

    // 2. MUTASI SMART DELETE (Pindahkan ke Tong Sampah / Hapus Permanen)
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/produk/${id}`, { method: "DELETE" });
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch (error) { data = { error: text }; }
      if (!res.ok) throw new Error(data.error || "Gagal menghapus produk.");
      return data;
    },
    onSuccess: (data) => { // 🚀 FIX: Tangkap 'data' balikan dari backend
      queryClient.invalidateQueries({ queryKey: ["produk-master-list"] });
      
      // 🚀 FIX: Deteksi apakah pesan dari backend mengandung kata "permanen"
      const isPermanen = data.message?.toLowerCase().includes("permanen");
      
      toast({ 
        title: isPermanen ? "Dihapus Permanen" : "Trash", 
        description: data.message || "Produk berhasil dihapus." // Tampilkan pesan asli dari backend
      });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
    }
  });

  // 🚀 FIX: 3. MUTASI PULIHKAN (Restore dari Tong Sampah)
  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/produk/${id}/restore`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memulihkan produk.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produk-master-list"] });
      toast({ title: "Dipulihkan", description: "Produk berhasil diaktifkan kembali." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal", description: err.message });
    }
  });

  // 🚀 FIX: 4. MUTASI HAPUS PERMANEN (Membakar semua riwayat transaksi)
  const forceDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/produk/${id}/force`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghapus permanen.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produk-master-list"] });
      toast({ title: "Dihapus Permanen", description: "Produk beserta seluruh catatan transaksi berhasil dihapus" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal", description: err.message });
    }
  });

  // 5. MUTASI PENYESUAIAN STOK (AJUSTMENT)
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

  // 6. LOGIKA FILTERING DATA BERDASARKAN KATEGORI & SEARCH
  const filteredProduk = useMemo(() => {
    return produk
      .filter((item) => activeTab === "Semua" || item.jenis?.toLowerCase() === activeTab.toLowerCase())
      .filter((item) => item.nama?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [produk, activeTab, searchQuery]);

    // --- HANDLER HARGA ---
  const startEditHarga = (item: any) => {
    setEditingStockId(null);
    setEditingId(item.id);
    setEditHarga(String(item.hargaPerSatuanDasar ?? 0));
  };

  const submitEditHarga = (item: any) => {
    // 🚀 FIX: Parsing aman untuk desimal, jika NaN otomatis ke 0
    let nilaiBaru = Number(editHarga);
    if (isNaN(nilaiBaru) || nilaiBaru < 0) nilaiBaru = 0; 
    
    if (nilaiBaru === 0 && item.isActive && item.hargaPerSatuanDasar !== 0) {
      const yakin = confirm(`⚠️ Set harga "${item.nama}" ke Rp0 akan memblokir produk ini dari form perawatan. Lanjutkan?`);
      if (!yakin) return;
    }
    updateMutation.mutate({ id: item.id, payload: { hargaPerSatuanDasar: nilaiBaru } });
  };

    // --- HANDLER STOK ---
  const startEditStock = (item: any) => {
    setEditingId(null);
    setEditingStockId(item.id);
    setStokFisik(String(item.stokSaatIni));
    setCatatanStok("");
  };

  const submitEditStock = (item: any) => {
    // 🚀 FIX: Parsing aman untuk desimal, jika NaN cegah mutasi
    const fisikNum = Number(stokFisik);
    if (isNaN(fisikNum) || fisikNum < 0) {
       toast({ variant: "destructive", title: "Format Salah", description: "Pastikan angka stok fisik valid."});
       return;
    }

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

  const isTrashMode = statusFilter === "delete";

  return (
    <div className="w-full space-y-3 animate-in fade-in duration-300">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">
        {isTrashMode ? "Trash" : "Daftar Produk Terdaftar"} ({filteredProduk.length})
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        
       {filteredProduk.map((item) => {
          const isEditingHarga = editingId === item.id;
          const isEditingStock = editingStockId === item.id;
          const hargaKosong = !item.hargaPerSatuanDasar || item.hargaPerSatuanDasar === 0;
          
          // 🚀 FIX: Variabel ini buat ngunci form & nyembunyiin icon pensil (Trash atau Nonaktif)
          const isReadOnly = isTrashMode || !item.isActive;

          return (
             <div
              key={item.id}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border bg-card p-3.5 shadow-sm transition-all duration-200",
                isTrashMode
                  ? "border-border/40 bg-muted/5 opacity-90 grayscale-[0.1]" 
                  : item.isActive 
                    ? "border-border/50 hover:border-primary/30" 
                    : "border-border/20 bg-muted/10 opacity-75 grayscale-[0.3]"
              )}
            >
              {/* SEKTOR ATAS: Identitas & Tombol Aksi */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={cn(
                    "rounded-xl p-2 shrink-0 mt-0.5 shadow-sm bg-muted/60 text-muted-foreground/80",
                    isTrashMode && "bg-muted text-muted-foreground opacity-70"
                  )}>
                    <Package className="h-4 w-4" />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-foreground truncate block">
                      {item.nama}
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary px-1.5 py-0.5 rounded-md",
                        isTrashMode && "bg-rose-500/10 text-rose-600"
                      )}>
                        {item.jenis}
                      </span>
                      {!item.isActive && !isTrashMode && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                          Nonaktif
                        </span>
                      )}
                      {isTrashMode && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-600 bg-rose-500/20 px-1.5 py-0.5 rounded-md font-bold">
                          Terhapus
                        </span>
                      )}
                      {hargaKosong && item.isActive && !isTrashMode && (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-500/20">
                          <AlertCircle className="h-2.5 w-2.5" /> Harga Rp0
                        </span>
                      )}
                    </div>
                  </div>
                </div>

             {/* Sektor Kanan Atas Dirapikan */}
                <div className="flex items-center gap-1 shrink-0">
                  
                  {/* Tombol Popover Detail HPP selalu tampil */}
                  <HppHistoryPopover history={item._hppHistory} satuanDasar={item.satuanDasar} />

                  {/* 🚀 TAMBAHAN: Tombol Edit Titik 3 (Disembunyikan saat di Tong Sampah) */}
                  {!isTrashMode && (
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => {
                        setEditingDetail(item);
                        setDetailForm({
                          nama: item.nama || "",
                          jenis: item.jenis || "Pupuk",
                          bentuk: item.bentuk || "Solid",
                          satuanDasar: item.satuanDasar || "gram",
                          satuanTampilan: item.satuanTampilan || "kg",
                          n: item.n || "", p: item.p || "", k: item.k || "", ca: item.ca || "", mg: item.mg || ""
                        });
                      }}
                      className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  )}

                  {isTrashMode ? (

                    // 🗑️ TAMPILAN OPSI TONG SAMPAH (ICON ONLY)
                    <>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => {
                          if (confirm(`Pulihkan produk "${item.nama}" agar bisa digunakan kembali?`)) {
                            restoreMutation.mutate(item.id);
                          }
                        }}
                        disabled={restoreMutation.isPending || forceDeleteMutation.isPending}
                        className="h-9 w-9 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-xl transition-colors"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => {
                          setForceDeleteTarget(item);
                          setDeleteConfirmText("");
                        }}
                        disabled={restoreMutation.isPending || forceDeleteMutation.isPending}
                        className="h-9 w-9 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 rounded-xl transition-colors"
                      >
                        <ShieldAlert className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    // 🔘 TAMPILAN MODE NORMAL
                    <>
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
                          if (confirm(`Hapus produk "${item.nama}"?\n\nCatatan: Sistem akan menghapus produk ini permanen jika belum ada riwayat transaksi, ATAU memindahkannya ke Tong Sampah jika sudah pernah digunakan.`)) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        disabled={deleteMutation.isPending || adjustMutation.isPending}
                        className="h-9 w-9 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* SEKTOR BAWAH: Dinamis (View / Form Edit Harga / Form Edit Stok) */}
              {/* 🚀 FIX: Pakai isReadOnly buat ngeblok form edit stok */}
              {isEditingStock && !isReadOnly ? (
                // TAMPILAN FORM OPNAME STOK
                <div className="w-full flex flex-col gap-2.5 pt-3 border-t border-border/40 mt-1 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                      <RefreshCcw className="h-3 w-3" /> Opname Stok
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">Sistem: {item.stokSaatIni} {item.satuanDasar}</span>
                  </div>
                  
                  {/* 🚀 FIX UX: Input Stok dan Catatan disejajarkan ukurannya */}
                  <div className="relative flex items-center w-full">
                    <input
                      type="number"
                      step="any"
                      placeholder="Stok Fisik Gudang"
                      value={stokFisik}
                      onChange={(e) => setStokFisik(e.target.value)}
                      // Padding kanan (pr-12) dilebarin biar angka yang diketik ga nabrak teks satuan di kanan
                      className="w-full rounded-xl border border-input bg-background pl-3 pr-12 py-2 text-xs outline-none focus:border-primary/50 font-bold shadow-sm"
                      autoFocus
                    />
                    <span className="absolute right-3 text-xs font-bold text-muted-foreground pointer-events-none">
                      {item.satuanDasar}
                    </span>
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Catatan (opsional) misal: hilang, tumpah"
                    value={catatanStok}
                    onChange={(e) => setCatatanStok(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary/50 font-medium shadow-sm mt-0.5"
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
                // TAMPILAN NORMAL STOK & HARGA (Read-Only saat di Tong Sampah / Nonaktif)
                <div className="flex items-center justify-between pt-2.5 border-t border-border/40 mt-1">
                  
                  {/* Bagian Stok Kiri */}
                  <div className="text-xs flex items-center gap-1.5">
                    <span className="text-muted-foreground">Stok:</span>
                    {/* 🚀 FIX: Sembunyikan icon pensil kalau lagi mode read-only */}
                    {isReadOnly ? (
                      <span className="font-bold text-muted-foreground/80">{item.stokSaatIni} {item.satuanDasar}</span>
                    ) : (
                      <button 
                        onClick={() => startEditStock(item)} 
                        className="flex items-center gap-1.5 font-bold text-foreground hover:text-primary transition-colors group"
                      >
                        {item.stokSaatIni} <span className="font-semibold text-muted-foreground group-hover:text-primary/70">{item.satuanDasar}</span>
                        <Pencil className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary/70 transition-colors" />
                      </button>
                    )}
                  </div>
                  
               {/* Bagian Harga Kanan */}
                  <div className="text-xs">
                    {/* 🚀 FIX: Pakai isReadOnly buat ngeblok form edit harga */}
                    {isEditingHarga && !isReadOnly ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                        <input
                          type="number" 
                          step="any"
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
                      // 🚀 FIX: Sembunyikan icon pensil kalau lagi mode read-only
                      isReadOnly ? (
                        <span className="font-bold text-muted-foreground/80">
                          Rp{Number(item.hargaPerSatuanDasar || 0).toLocaleString("id-ID", { maximumFractionDigits: 3 })}/{item.satuanDasar}
                        </span>
                      ) : (
                        <button 
                          onClick={() => startEditHarga(item)} 
                          className="flex items-center gap-1.5 font-bold text-foreground hover:text-primary transition-colors group"
                        >
                          <span className={cn(hargaKosong && "text-amber-600")}>
                            Rp{Number(item.hargaPerSatuanDasar || 0).toLocaleString("id-ID", { maximumFractionDigits: 3 })}
                          </span>
                          <span className="text-muted-foreground/60 text-[10px] font-semibold">
                            /{item.satuanDasar}
                          </span>
                          <Pencil className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary/70 transition-colors" />
                        </button>
                      )
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
          <p className="text-[10px] opacity-70">
            {isTrashMode ? "Sampah anda bersih" : "Coba ubah kata kunci atau ganti filter kategori."}
          </p>
        </div>
      )}

    {/* 🚀 FIX UX: MODAL SHEET DARI BAWAH KHUSUS HAPUS PERMANEN */}
      <Sheet 
        open={!!forceDeleteTarget} 
        onOpenChange={(val) => { 
          if (!val) {
            setForceDeleteTarget(null);
            setDeleteConfirmText("");
          }
        }}
      >
        <SheetContent 
          side="bottom" 
          className="mx-auto max-w-md rounded-t-[2rem] border-x-0 border-b-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_-16px_40px_rgba(0,0,0,0.12)] z-[100] max-h-[90vh] flex flex-col"
        >
          
          {/* Drag Handle iOS */}
          <div className="mx-auto mt-3 mb-1 h-1.5 w-12 rounded-full bg-border/60 shrink-0" />

          {/* Header Sheet */}
          <SheetHeader className="px-6 pb-4 pt-2 flex flex-row items-center justify-between border-b border-border pr-12 shrink-0">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-rose-500/10 p-2 text-rose-600 shadow-sm">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="text-left">
                <SheetTitle className="text-base font-black tracking-tight text-foreground">Hapus Permanen</SheetTitle>
                <p className="text-[10px] font-bold text-rose-600 tracking-wider uppercase">Tindakan Berbahaya</p>
              </div>
            </div>
          </SheetHeader>

          {/* Area Scrollable yang aman dari keyboard */}
          <div className="px-6 py-5 space-y-5 text-left flex-1 overflow-y-auto custom-scrollbar">
            
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl">
              <p className="text-[11px] font-semibold text-rose-700 leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Seluruh riwayat transaksi, nota pembelian, dan pemakaian stok untuk produk ini akan dihapus selamanya dari database.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground leading-relaxed block">
                Ketik <span className="text-foreground select-all bg-muted px-1.5 py-0.5 rounded-md border border-border/50">{forceDeleteTarget?.nama}</span> di bawah ini untuk melanjutkan:
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Ketik nama produk disini..."
                className="h-12 rounded-xl bg-background border-rose-500/30 focus-visible:ring-2 focus-visible:ring-rose-500/20 text-sm font-medium px-4"
                // 💡 Nggak pakai autoFocus biar UI nggak loncat sendiri pas kebuka di HP
              />
            </div>
            
          </div>

          {/* Sticky Bottom Bar buat Tombol */}
          <div className="sticky bottom-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-border/50 flex items-center justify-end gap-3 px-6 pt-4 pb-6 shrink-0 mt-auto">
            <Button
              variant="ghost"
              onClick={() => {
                setForceDeleteTarget(null);
                setDeleteConfirmText("");
              }}
              className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted"
            >
              Batal
            </Button>
            <Button
              // 🚀 KUNCI KEAMANAN: Pakai optional chaining (?.) untuk jaga-jaga kalau target null
              disabled={deleteConfirmText !== forceDeleteTarget?.nama || forceDeleteMutation.isPending}
              onClick={() => {
                forceDeleteMutation.mutate(forceDeleteTarget.id, {
                  onSuccess: () => {
                    setForceDeleteTarget(null);
                    setDeleteConfirmText("");
                  }
                });
              }}
              // 🚀 FIX BUG SAFARI: Ganti transition-all jadi transition-colors
              className="h-11 rounded-xl px-6 font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground shadow-sm transition-colors"
            >
              {forceDeleteMutation.isPending ? "Membakar" : "Hapus Permanen"}
            </Button>

          </div>

        </SheetContent>
      </Sheet>

      {/* 🚀 TAMBAHAN: MODAL SHEET EDIT DETAIL PRODUK */}
      <Sheet open={!!editingDetail} onOpenChange={(val) => { if (!val) setEditingDetail(null); }}>
        <SheetContent 
          side="bottom" 
          className="mx-auto max-w-md rounded-t-[2rem] border-x-0 border-b-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_-16px_40px_rgba(0,0,0,0.12)] z-[100] max-h-[90vh] flex flex-col"
        >
          <div className="mx-auto mt-3 mb-1 h-1.5 w-12 rounded-full bg-border/60 shrink-0" />

          <SheetHeader className="px-6 pb-4 pt-2 flex flex-row items-center border-b border-border shrink-0">
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight text-foreground">Edit Produk</SheetTitle>
              <p className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">Ubah Detail & Kandungan</p>
            </div>
          </SheetHeader>

          <div className="px-6 py-5 space-y-4 text-left flex-1 overflow-y-auto custom-scrollbar">
            {/* Input Nama */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nama Produk</label>
              <Input 
                value={detailForm.nama || ""} 
                onChange={e => setDetailForm({ ...detailForm, nama: e.target.value })}
                className="h-11 rounded-xl bg-background shadow-sm text-sm font-bold"
              />
            </div>

            {/* Grid Jenis & Bentuk */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Jenis</label>
                <select 
                  value={detailForm.jenis || ""} 
                  onChange={e => setDetailForm({ ...detailForm, jenis: e.target.value })}
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm font-semibold shadow-sm outline-none"
                >
                  {["Pupuk", "Insektisida", "Herbisida", "Fungisida", "Lainnya"].map((j) => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bentuk & Satuan</label>
                <select 
                  value={detailForm.bentuk || ""} 
                  onChange={e => {
                    const isSolid = e.target.value === "Solid";
                    setDetailForm({ 
                      ...detailForm, 
                      bentuk: e.target.value,
                      satuanDasar: isSolid ? "gram" : "ml",
                      satuanTampilan: isSolid ? "kg" : "liter"
                    });
                  }}
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm font-semibold shadow-sm outline-none"
                >
                  <option value="Solid">Solid (Kg/Gr)</option>
                  <option value="Cair">Cair (Lt/Ml)</option>
                </select>
              </div>
            </div>

            {/* Grid Kandungan Hara */}
            <div className="pt-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Kandungan Hara (Opsional)</label>
              <div className="grid grid-cols-5 gap-2 p-3 rounded-xl bg-muted/30 border border-border/50">
                {(["n", "p", "k", "ca", "mg"] as const).map((key) => (
                  <div key={key} className="space-y-1 text-center">
                    <label className="text-[9px] font-black uppercase text-muted-foreground">{key}</label>
                    <Input 
                      type="number" step="any" placeholder="0"
                      value={detailForm[key] || ""} 
                      onChange={e => setDetailForm({ ...detailForm, [key]: e.target.value })}
                      className="h-9 rounded-lg text-center px-1 text-xs font-bold bg-background shadow-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-border/50 flex items-center justify-end gap-3 px-6 pt-4 pb-6 shrink-0 mt-auto">
            <Button variant="ghost" onClick={() => setEditingDetail(null)} className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted">
              Batal
            </Button>
            <Button 
              disabled={updateMutation.isPending || !detailForm.nama}
              onClick={() => {
                updateMutation.mutate({
                  id: editingDetail.id,
                  payload: {
                    nama: detailForm.nama,
                    jenis: detailForm.jenis,
                    bentuk: detailForm.bentuk,
                    satuanDasar: detailForm.satuanDasar,
                    satuanTampilan: detailForm.satuanTampilan,
                    n: detailForm.n ? Number(detailForm.n) : null,
                    p: detailForm.p ? Number(detailForm.p) : null,
                    k: detailForm.k ? Number(detailForm.k) : null,
                    ca: detailForm.ca ? Number(detailForm.ca) : null,
                    mg: detailForm.mg ? Number(detailForm.mg) : null,
                  }
                });
              }} 
              // 🚀 FIX BUG SAFARI: Ganti transition-all jadi transition-colors
              className="h-11 rounded-xl px-6 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-colors shadow-sm"
            >
              {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>

        </SheetContent>
      </Sheet>

    </div>
  );
}
