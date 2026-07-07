import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Trash2, Settings2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// 🚀 SUNTIKAN BARU: Import komponen Dialog & Input dari Shadcn UI
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
                <span className="text-sm font-black flex items-center gap-2">
                  <div className="rounded-full bg-primary/10 p-1.5 text-primary">
                    <MapPin className="h-4 w-4" />
                  </div>
                  {cleanName}
                </span>
                
             <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    // 🚀 SUNTIKAN BARU: Buka modal hapus dan simpan nama areanya
                    setAreaToDelete({ id: area.id, name: cleanName });
                  }} 
                  disabled={delAreaMutation.isPending} 
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                >
                  {delAreaMutation.isPending && areaToDelete?.id === area.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>

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

              {/* 3. BOTTOM BUTTONS (Pemicu Akses Kontrol) */}
              <div className="p-4 pt-0">
                {currentCycle ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleOpenSiklus(area, currentCycle)}
                    className="w-full h-9 text-xs rounded-xl border-border hover:bg-muted/50 font-bold gap-1.5"
                  >
                    <Settings2 className="h-3.5 w-3.5" /> Kelola Siklus
                  </Button>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleOpenSiklus(area, null)}
                    className="w-full h-9 text-xs font-bold text-muted-foreground hover:text-primary rounded-xl border border-dashed border-border/85 hover:bg-primary/5 bg-muted/10 gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" /> Mulai Siklus Tanam
                  </Button>
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

      {/* 🚀 SUNTIKAN BARU: MODAL VERIFIKASI HAPUS AREA */}
      <Dialog 
        open={areaToDelete !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setAreaToDelete(null);
            setConfirmText(""); // Reset ketikan saat ditutup
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 font-bold">Hapus Permanen Area?</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Menghapus area akan me-reset seluruh histori terkait jika tidak terikat pengaman.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 space-y-3 rounded-xl bg-red-50 p-3 text-sm border border-red-200">
            <p className="text-red-800 leading-relaxed">
              Ketik <span className="font-black select-all underline">{areaToDelete?.name}</span> di bawah ini untuk mengonfirmasi penghapusan:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Ketik nama area persis di sini..."
              className="bg-white border-red-300 focus-visible:ring-red-500 font-medium"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setAreaToDelete(null);
                setConfirmText("");
              }}
            >
              Batal
            </Button>
            
            <Button 
              variant="destructive"
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
            >
              {delAreaMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Menghapus...
                </span>
              ) : (
                "Hapus Permanen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
