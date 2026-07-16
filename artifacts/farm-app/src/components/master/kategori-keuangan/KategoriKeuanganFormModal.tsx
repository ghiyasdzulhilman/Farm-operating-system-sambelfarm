import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface KategoriKeuanganFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  onSave: (data: any) => void;
  isLoading?: boolean;
}

export function KategoriKeuanganFormModal({ isOpen, onClose, initialData, onSave, isLoading }: KategoriKeuanganFormModalProps) {
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<"pengeluaran" | "pendapatan">("pengeluaran");
  const [keterangan, setKeterangan] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setNama(initialData?.nama || "");
      setTipe(initialData?.tipe || "pengeluaran");
      setKeterangan(initialData?.keterangan || "");
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    if (!nama.trim()) {
      toast({ title: "Validasi Gagal", description: "Nama kategori wajib diisi.", variant: "destructive" });
      return;
    }
    onSave({ nama, tipe, keterangan });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl p-6 border-border/40 bg-card/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-black tracking-tight">
            {initialData ? "Edit Kategori" : "Kategori Baru"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Tipe Selector (Pill Style) */}
          <div className="flex bg-muted/50 p-1 rounded-2xl">
            <button
              onClick={() => setTipe("pengeluaran")}
              className={`flex-1 text-sm font-bold py-2 rounded-xl transition-all ${tipe === "pengeluaran" ? "bg-card text-rose-500 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Pengeluaran
            </button>
            <button
              onClick={() => setTipe("pendapatan")}
              className={`flex-1 text-sm font-bold py-2 rounded-xl transition-all ${tipe === "pendapatan" ? "bg-card text-emerald-500 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              Pendapatan
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Nama Kategori</label>
            <Input 
              placeholder="Contoh: Beli Pupuk, Gaji, Hasil Panen..." 
              value={nama} 
              onChange={(e) => setNama(e.target.value)} 
              className="rounded-xl bg-muted/30 border-border/50 h-11 focus-visible:ring-primary/30 font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Keterangan (Opsional)</label>
            <Textarea 
              placeholder="Penjelasan singkat kategori ini..." 
              value={keterangan} 
              onChange={(e) => setKeterangan(e.target.value)} 
              rows={3}
              className="rounded-xl bg-muted/30 border-border/50 resize-none focus-visible:ring-primary/30"
            />
          </div>
        </div>

        <DialogFooter className="mt-6 pt-4 border-t border-border/40 sm:justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isLoading} className="rounded-xl hover:bg-muted/50">Batal</Button>
          <Button onClick={handleSubmit} disabled={isLoading} className="rounded-xl font-bold px-6 shadow-md shadow-primary/20">
            {isLoading ? "Menyimpan..." : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
