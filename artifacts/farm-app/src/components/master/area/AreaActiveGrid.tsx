import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Trash2, Settings2, Plus, Loader2, ShieldAlert } from "lucide-react"; // 🚀 FIX: Tambah ShieldAlert
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// 🚀 FIX UX: Ganti Dialog jadi Sheet biar gak bikin layar freeze, mirip ProdukList
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

// Import komponen modal manajemen siklus yang akan kita buat nanti
import { SiklusFormModal } from "./SiklusFormModal";

interface AreaActiveGridProps {
  areas: any[];
  allSiklus: any[];
  searchQuery: string;
}

export function AreaActiveGrid({ areas, allSiklus, searchQuery }: AreaActiveGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State penampung area mana yang sedang dipilih untuk dikelola siklusnya
  const [selectedArea, setSelectedArea] = useState<{ id: string; name: string } | null>(null);
  const [activeCycleForModal, setActiveCycleForModal] = useState<any>(null);

  // 🚀 SUNTIKAN BARU: State khusus untuk Modal Hapus & Verifikasi Ketik Nama
  const [areaToDelete, setAreaToDelete] = useState<{ id: string; name: string } | null>(null);
  const [confirmText, setConfirmText] = useState("");

    // Mutasi Hapus Area Master
  const delAreaMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notion/areas/${id}`, { method: "DELETE" });
      const json = await res.json();
      
      // 🚀 WAJIB ADA INI BIAR NOTIF MERAHNYA JALAN
      if (!res.ok) throw new Error(json.error || "Gagal menghapus area.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] });
      toast({ title: "Dihapus", description: "Area berhasil dihapus." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Akses Ditolak", description: err.message });
    }
  });

  // Filter area aktif berdasarkan input pencarian
  const filteredAreas = areas.filter((area) =>
    area.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

    // Kalkulator Umur Tanaman (HST) Murni - Kebal Jam & Timezone
  const calculateHST = (dateString: string) => {
    if (!dateString) return 0;
    
    try {
      // 1. Ambil YYYY-MM-DD dari tanggal tanam (buang jam dari database)
      const tglTanamPart = String(dateString).split(/[T ]/)[0];
      
      // 2. Ambil YYYY-MM-DD dari hari ini (lokal browser)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const tglHariIniPart = `${year}-${month}-${day}`;

      // 3. Bandingkan secara adil (Sama-sama jam 00:00:00 UTC)
      const plantDate = new Date(`${tglTanamPart}T00:00:00Z`);
      const todayDate = new Date(`${tglHariIniPart}T00:00:00Z`);

      if (isNaN(plantDate.getTime())) return 0;

      // 4. Hitung selisih hari pakai Math.round (biar pas)
      const diffTime = todayDate.getTime() - plantDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays < 0 ? 0 : diffDays;
    } catch {
      return 0;
    }
  };

  // Bersihkan embel-embel string dari backend
  const getCleanAreaName = (name: string) => {
    if (!name) return "";
    return name.includes(" - ") ? name.split(" - ")[0].trim() : name;
  };

  const handleOpenSiklus = (area: any, currentCycle: any) => {
    setSelectedArea({ id: area.id, name: getCleanAreaName(area.name) });
    setActiveCycleForModal(currentCycle);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAreas.map((area) => {
          // Cari apakah area ini punya siklus yang statusnya masih berjalan (Aktif)
          const currentCycle = allSiklus.find(
            (c: any) => c.areaId === area.id && c.status === "Aktif"
          );
          const cleanName = getCleanAreaName(area.name);

          return (
            <div 
              key={area.id} 
              className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm transition-all duration-300 hover:border-border flex flex-col justify-between"
            >
           {/* 1. HEADER CARD (Identitas Area) */}
              <div className="flex items-center justify-between bg-muted/10 p-4 border-b border-border/40">
                <span className="text-sm font-black flex items-center gap-2 min-w-0">
                  <div className="rounded-full bg-primary/10 p-1.5 text-primary shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <span className="truncate block">{cleanName}</span>
                </span>
                
                {/* 🚀 FIX UX: Grup Tombol Aksi Kanan (Siklus & Hapus) */}
                <div className="flex items-center gap-1 shrink-0">
                  {currentCycle ? (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleOpenSiklus(area, currentCycle)}
                      className="h-8 w-8 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleOpenSiklus(area, null)}
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                      setAreaToDelete({ id: area.id, name: cleanName });
                    }} 
                    disabled={delAreaMutation.isPending} 
                    className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 transition-colors"
                  >
                    {delAreaMutation.isPending && areaToDelete?.id === area.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* 2. BODY CARD (Informasi Siklus Berjalan) */}
              <div className="p-4 flex-1 flex flex-col justify-center min-h-[100px]">
{currentCycle ? (
                  <div className="space-y-2 w-full">
                    {/* Baris 1: Nama Tanaman & Umur (HST) sejajar */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base font-black text-primary leading-tight">
                        {currentCycle.namaSiklus}
                      </p>
                      <span className="text-[11px] font-bold text-muted-foreground shrink-0 mt-0.5">
                        {calculateHST(currentCycle.tanggalPindahTanam)} HST
                      </span>
                    </div>
                    
                    {/* Baris 2 & 3: Tanggal Tanam lalu disusul Badge Aktif di bawahnya */}
                    <div className="flex flex-col items-start gap-2 pt-0.5">
                      <p className="text-xs text-muted-foreground">
                        Tanam: {new Date(currentCycle.tanggalPindahTanam).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded w-fit">
                        Siklus Aktif
                      </span>
                    </div>
                  </div>
                ) : (

                  <p className="text-xs text-center font-medium text-muted-foreground/70 py-2">
                    Belum ada siklus berjalan di area ini.
                  </p>
                )}
              </div>

          </div>
          );
        })}
      </div>

   {/* RENDER MODAL SECARA REUSABLE (Ditaruh sekali saja di luar perulangan map) */}
      {selectedArea && (
        <SiklusFormModal 
          isOpen={selectedArea !== null} 
          onClose={() => setSelectedArea(null)} 
          areaId={selectedArea.id}
          areaName={selectedArea.name}
          currentCycle={activeCycleForModal}
        />
      )}

   {/* 🚀 FIX UX: MODAL SHEET DARI BAWAH KHUSUS HAPUS PERMANEN (Gaya ProdukList) */}
      <Sheet 
        open={!!areaToDelete} 
        onOpenChange={(val) => { 
          if (!val) {
            setAreaToDelete(null);
            setConfirmText("");
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
                Tindakan ini tidak dapat dibatalkan. Menghapus area akan menghapus seluruh riwayat aktivitas dan arsip terkait.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground leading-relaxed block">
                Ketik <span className="text-foreground select-all bg-muted px-1.5 py-0.5 rounded-md border border-border/50">{areaToDelete?.name}</span> di bawah ini untuk melanjutkan:
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Ketik nama area disini..."
                className="h-12 rounded-xl bg-background border-rose-500/30 focus-visible:ring-2 focus-visible:ring-rose-500/20 text-sm font-medium px-4"
              />
            </div>
            
          </div>

          {/* Sticky Bottom Bar buat Tombol */}
          <div className="sticky bottom-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-border/50 flex items-center justify-end gap-3 px-6 pt-4 pb-6 shrink-0 mt-auto">
            <Button
              variant="ghost"
              onClick={() => {
                setAreaToDelete(null);
                setConfirmText("");
              }}
              className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted"
            >
              Batal
            </Button>
            <Button
              disabled={confirmText.trim().toLowerCase() !== areaToDelete?.name?.trim().toLowerCase() || delAreaMutation.isPending}
              onClick={() => {
                if (areaToDelete) {
                  delAreaMutation.mutate(areaToDelete.id, {
                    onSuccess: () => {
                      setAreaToDelete(null);
                      setConfirmText("");
                    }
                  });
                }
              }}
              className="h-11 rounded-xl px-6 font-bold bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground shadow-sm transition-colors"
            >
              {delAreaMutation.isPending ? "Membakar..." : "Hapus Permanen"}
            </Button>

          </div>

        </SheetContent>
      </Sheet>
    </>
  );
}

