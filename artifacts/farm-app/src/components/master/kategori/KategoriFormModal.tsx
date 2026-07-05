import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, CheckCircle2, FolderPlus, Tag, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface KategoriFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultModule: "perawatan" | "operasional";
}

export function KategoriFormModal({ isOpen, onClose, defaultModule }: KategoriFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newName, setNewName] = useState("");
  const [moduleType, setModuleType] = useState<"perawatan" | "operasional">(defaultModule);

  // Reset form otomatis saat modal dibuka & ikuti tab yang sedang aktif
  useEffect(() => {
    if (isOpen) {
      setNewName("");
      setModuleType(defaultModule);
    }
  }, [isOpen, defaultModule]);

  const addMutation = useMutation({
    mutationFn: async () => fetch("/api/notion/kategori", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ name: newName, module: moduleType }) 
    }).then(r => r.json()),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); 
      toast({ title: "Sukses", description: "Kategori aktivitas baru berhasil ditambahkan." });
      onClose();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
    }
  });

  const handleSubmit = () => {
    if (!newName.trim()) {
      toast({ variant: "destructive", title: "Data Belum Lengkap", description: "Nama kategori wajib diisi." });
      return;
    }
    addMutation.mutate();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(val) => { if (!val) onClose(); }}>
      <SheetContent 
        side="top" 
        className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] pb-5 z-[100]"
      >
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border pr-12">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shadow-sm">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Tambah Kategori</SheetTitle>
              <p className="text-[10px] font-bold text-primary tracking-wider uppercase">Master Data</p>
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
              placeholder="" 
              value={newName} 
              onChange={e => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} 
              className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium px-4"
              autoFocus
            />
          </div>

          {/* PILIHAN MODUL (Perawatan / Operasional) */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
              <Layers className="h-3.5 w-3.5" /> Pilih Modul
            </label>
            <select 
              value={moduleType} 
              onChange={e => setModuleType(e.target.value as "perawatan" | "operasional")}
              className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm font-semibold outline-none focus:border-primary/50 shadow-sm cursor-pointer"
            >
              <option value="perawatan">Perawatan</option>
              <option value="operasional">Operasional</option>
            </select>
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-end gap-3 px-6 pt-2 pb-2">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={addMutation.isPending} 
            className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted"
          >
            Batal
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={addMutation.isPending || !newName.trim()} 
            className="h-11 rounded-xl px-6 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm gap-2"
          >
            {addMutation.isPending ? (
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
