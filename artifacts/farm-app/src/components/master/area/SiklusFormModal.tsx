import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Sprout, AlertTriangle, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SiklusFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  areaId: string;
  areaName: string;
  currentCycle: any | null; // Bisa null kalau area kosong
}

export function SiklusFormModal({ isOpen, onClose, areaId, areaName, currentCycle }: SiklusFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [namaSiklus, setNamaSiklus] = useState("");
  const [tglTanam, setTglTanam] = useState("");

  // Otomatis reset form & set tanggal default ke hari ini setiap kali Modal dibuka
  useEffect(() => {
    if (isOpen) {
      setNamaSiklus("");
      // Format YYYY-MM-DD untuk input type="date"
      setTglTanam(new Date().toISOString().split('T')[0]); 
    }
  }, [isOpen]);

  const addSiklusMutation = useMutation({
    mutationFn: async () => fetch("/api/notion/siklus-tanam", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ areaId, namaSiklus, tanggalPindahTanam: tglTanam }) 
    }).then(r => r.json()),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["siklus-tanam-list"] }); 
      queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] });
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); 
      toast({ title: "Siklus Diperbarui", description: `Siklus tanaman di ${areaName} berhasil dikelola.` }); 
      onClose(); // Tutup modal setelah sukses
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message || "Terjadi kesalahan sistem." });
    }
  });

  const handleSubmit = () => {
    if (!namaSiklus.trim() || !tglTanam) {
      toast({ variant: "destructive", title: "Data Tidak Lengkap", description: "Nama tanaman dan tanggal tanam wajib diisi." });
      return;
    }
    addSiklusMutation.mutate();
  };

  // Jangan render apapun kalau statusnya tertutup
  if (!isOpen) return null;

  return (
    // Backdrop Hitam Transparan
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Kotak Utama Modal */}
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-background border border-border/50 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-border/40 bg-muted/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/20 p-1.5 text-primary">
              <Sprout className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black">Kelola Siklus</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{areaName}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted/50 text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body Modal */}
        <div className="p-5 space-y-4">
          
          {/* Peringatan Jika Ada Siklus Aktif */}
          {currentCycle && (
            <div className="flex gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">
                Saat ini terdapat tanaman <strong>{currentCycle.namaSiklus}</strong> yang sedang aktif. 
                Memulai siklus baru akan otomatis mengakhiri dan mengarsipkan tanaman sebelumnya.
              </p>
            </div>
          )}

          {/* Form Input */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Nama Tanaman Baru
              </label>
              <input 
                type="text" 
                placeholder="Misal: Tomat Ceri - Batch 2" 
                value={namaSiklus} 
                onChange={e => setNamaSiklus(e.target.value)} 
                className="w-full rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5 text-sm outline-none focus:border-primary/50 font-bold transition-colors" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Tanggal Pindah Tanam
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input 
                  type="date" 
                  value={tglTanam} 
                  onChange={e => setTglTanam(e.target.value)} 
                  className="w-full rounded-xl border border-border/60 bg-muted/20 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-primary/50 font-bold transition-colors cursor-pointer" 
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border/40 bg-muted/10 px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={addSiklusMutation.isPending} className="text-xs font-bold rounded-xl h-10 px-5">
            Batal
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={addSiklusMutation.isPending} 
            className="text-xs font-bold rounded-xl h-10 px-6 gap-2"
          >
            {addSiklusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan & Mulai Tanam"}
          </Button>
        </div>

      </div>
    </div>
  );
}
