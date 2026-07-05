import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, CheckCircle2, MapPinned, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface AreaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AreaFormModal({ isOpen, onClose }: AreaFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (isOpen) setNewName("");
  }, [isOpen]);

  const addAreaMutation = useMutation({
    mutationFn: async (name: string) => fetch("/api/notion/areas", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ name }) 
    }).then(r => r.json()),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); 
      toast({ title: "Sukses", description: "Area baru berhasil ditambahkan." });
      onClose(); 
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal", description: err.message });
    }
  });

  const handleSubmit = () => {
    if (newName.trim()) {
      addAreaMutation.mutate(newName);
    }
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
              <MapPinned className="h-5 w-5" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Tambah Area Baru</SheetTitle>
              <p className="text-[10px] font-bold text-primary tracking-wider uppercase">Master Data</p>
            </div>
          </div>
          
        </SheetHeader>

        <div className="px-6 py-5">
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
              <MapPin className="inline-block h-3.5 w-3.5 mr-1" /> Nama Area / Blok
            </label>
            <Input 
              placeholder="Misal: Blok A, Greenhouse 2..." 
              value={newName} 
              onChange={e => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} 
              className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium"
              autoFocus
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pt-4 border-t border-border mt-2">
          <Button variant="ghost" onClick={onClose} disabled={addAreaMutation.isPending} className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted">
            Batal
          </Button>
<Button 
  onClick={handleSubmit} 
  disabled={addAreaMutation.isPending || !newName.trim()} 
  className="h-11 rounded-xl px-6 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm gap-2"
>
  {addAreaMutation.isPending ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <><CheckCircle2 className="h-4 w-4" /> Simpan Area</>
  )}
</Button>

        </div>
        
        {/* Garis pemanis di bawah sheet */}
        <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-border/60" />
      </SheetContent>
    </Sheet>
  );
}
