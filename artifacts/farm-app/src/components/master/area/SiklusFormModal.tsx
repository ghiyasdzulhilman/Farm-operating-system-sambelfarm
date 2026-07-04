import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Sprout, AlertTriangle, CalendarDays, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface SiklusFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  areaId: string;
  areaName: string;
  currentCycle: any | null; 
}

export function SiklusFormModal({ isOpen, onClose, areaId, areaName, currentCycle }: SiklusFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [namaSiklus, setNamaSiklus] = useState("");
  const [tglTanam, setTglTanam] = useState("");

  useEffect(() => {
    if (isOpen) {
      setNamaSiklus("");
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
      onClose(); 
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

  return (
    <Sheet open={isOpen} onOpenChange={(val) => { if (!val) onClose(); }}>
      <SheetContent 
        side="top" 
        className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] pb-5 z-[100]"
      >
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shadow-sm">
              <Sprout className="h-5 w-5" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Kelola Siklus Tanam</SheetTitle>
              <p className="text-[10px] font-bold text-primary tracking-wider uppercase">{areaName}</p>
            </div>
          </div>
          
        </SheetHeader>

        <div className="px-6 py-5 space-y-5 text-left max-h-[70vh] overflow-y-auto">
          
          {currentCycle && (
             <div className="bg-amber-500/10 text-amber-700 p-3.5 rounded-2xl border border-amber-500/20 text-[11px] font-medium leading-relaxed shadow-sm flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <p>
                Saat ini terdapat tanaman <strong>{currentCycle.namaSiklus}</strong> yang sedang aktif. 
                Menyimpan data ini otomatis mengakhiri dan mengarsipkan tanaman tersebut.
              </p>
            </div>
          )}

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                Nama Komoditas / Tanaman
              </label>
              <Input 
                placeholder="Misal: Tomat Ceri - Batch 2" 
                value={namaSiklus} 
                onChange={e => setNamaSiklus(e.target.value)} 
                className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium"
              />
            </div>

  <div className="space-y-1.5">
  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
    Tanggal Pindah Tanam
  </label>
  
  {/* 👇 Balikin parent ke relative biasa 👇 */}
  <div className="relative w-full">
    <CalendarDays className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input 
      type="date" 
      value={tglTanam} 
      onChange={e => setTglTanam(e.target.value)} 
      // 👇 Hapus flex/appearance-none, tambahkan py-3 (padding vertikal) 👇
      className="w-full h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium pl-10 pr-4 py-3 cursor-pointer"
    />
  </div>
</div>

          </div>

        </div>

        <div className="flex items-center justify-end gap-3 px-6 pt-4 border-t border-border mt-2">
          <Button variant="ghost" onClick={onClose} disabled={addSiklusMutation.isPending} className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted">
            Batal
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={addSiklusMutation.isPending} 
            className="h-11 rounded-xl px-6 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm gap-2"
          >
            {addSiklusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Mulai Tanam</>}
          </Button>
        </div>

        {/* Garis pemanis di bawah sheet */}
        <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-border/60" />
      </SheetContent>
    </Sheet>
  );
}
