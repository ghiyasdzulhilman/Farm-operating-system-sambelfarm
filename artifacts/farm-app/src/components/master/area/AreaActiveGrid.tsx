import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Trash2, Settings2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

  // Mutasi Hapus Area Master
  const delAreaMutation = useMutation({
    mutationFn: async (id: string) => 
      fetch(`/api/notion/areas/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] });
      toast({ title: "Dihapus", description: "Area & seluruh siklus terkait berhasil dihapus." });
    },
  });

  // Filter area aktif berdasarkan input pencarian
  const filteredAreas = areas.filter((area) =>
    area.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Kalkulator Umur Tanaman (Hari Setelah Tanam / HST) secara realtime
  const calculateHST = (dateString: string) => {
    const today = new Date();
    const plantDate = new Date(dateString);
    const diffTime = today.getTime() - plantDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 0 ? 0 : diffDays;
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
                    if (confirm("⚠️ PERINGATAN KERAS: Menghapus Area ini akan melenyapkan SELURUH riwayat aktivitas dan siklus tanam di dalamnya secara permanen. Lanjutkan?")) {
                      delAreaMutation.mutate(area.id);
                    }
                  }} 
                  disabled={delAreaMutation.isPending} 
                  className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
                >
                  {delAreaMutation.isPending ? (
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
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                        Siklus Aktif
                      </span>
                      <span className="text-[11px] font-bold text-muted-foreground">
                        {calculateHST(currentCycle.tanggalPindahTanam)} HST
                      </span>
                    </div>
                    <div>
                      <p className="text-base font-black text-primary">{currentCycle.namaSiklus}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Tanam: {new Date(currentCycle.tanggalPindahTanam).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
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
    </>
  );
}
