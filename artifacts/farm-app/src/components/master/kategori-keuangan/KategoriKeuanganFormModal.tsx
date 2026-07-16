import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Wallet, Tag, Layers, AlignLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface KategoriKeuanganFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  onSave: (data: any) => void;
  isLoading?: boolean;
}

export function KategoriKeuanganFormModal({ isOpen, onClose, initialData, onSave, isLoading }: KategoriKeuanganFormModalProps) {
  const { toast } = useToast();
  
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<"pengeluaran" | "pendapatan">("pengeluaran");
  const [keterangan, setKeterangan] = useState("");

  // Reset form otomatis atau isi dengan data edit saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setNama(initialData?.nama || "");
      setTipe(initialData?.tipe || "pengeluaran");
      setKeterangan(initialData?.keterangan || "");
    }
  }, [isOpen, initialData]);

  const handleSubmit = () => {
    if (!nama.trim()) {
      toast({ variant: "destructive", title: "Validasi Gagal", description: "Nama kategori wajib diisi." });
      return;
    }
    onSave({ nama, tipe, keterangan });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(val) => { if (!val) onClose(); }}>
      <SheetContent 
        side="top" 
        // 🚀 KUNCI FIX: z-[100] biar ngga ketutup elemen lain
        className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] pb-5 z-[100]"
      >
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border pr-12">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shadow-sm">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">
                {initialData ? "Edit Kategori" : "Tambah Kategori"}
              </SheetTitle>
              <p className="text-[10px] font-bold text-primary tracking-wider uppercase">Master Keuangan</p>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-5 space-y-5 text-left">
          
          {/* INPUT NAMA KATEGORI */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
              <Tag className="h-3.5 w-3.5" /> Nama Kategori
            </label>
            <Input 
              placeholder="Contoh: Beli Pupuk, Gaji, Hasil Panen..." 
              value={nama} 
              onChange={e => setNama(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} 
              className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium px-4"
              autoFocus={!initialData}
            />
          </div>

          {/* PILIHAN TIPE (Pengeluaran / Pendapatan) */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
              <Layers className="h-3.5 w-3.5" /> Tipe Kategori
            </label>
            <select 
              value={tipe} 
              onChange={e => setTipe(e.target.value as "pengeluaran" | "pendapatan")}
              className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm font-semibold outline-none focus:border-primary/50 shadow-sm cursor-pointer"
            >
              <option value="pengeluaran">Pengeluaran</option>
              <option value="pendapatan">Pendapatan</option>
            </select>
          </div>

          {/* INPUT KETERANGAN */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
              <AlignLeft className="h-3.5 w-3.5" /> Keterangan (Opsional)
            </label>
            <Textarea 
              placeholder="Penjelasan singkat..." 
              value={keterangan} 
              onChange={e => setKeterangan(e.target.value)}
              rows={2}
              className="rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium px-4 py-3 resize-none"
            />
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-end gap-3 px-6 pt-2 pb-2">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={isLoading} 
            className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted"
          >
            Batal
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !nama.trim()} 
            className="h-11 rounded-xl px-6 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <><CheckCircle2 className="h-4 w-4" /> Simpan Data</>
            )}
          </Button>
        </div>

        {/* Garis pemanis di bawah sheet */}
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-border/60" />
      </SheetContent>
    </Sheet>
  );
}
