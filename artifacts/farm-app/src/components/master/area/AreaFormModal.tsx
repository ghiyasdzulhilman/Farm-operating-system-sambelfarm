import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface AreaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AreaFormModal({ isOpen, onClose }: AreaFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  // Reset form otomatis setiap kali modal dibuka
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
      onClose(); // Tutup modal otomatis setelah berhasil
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

  if (!isOpen) return null;

  return (
    // Backdrop Hitam Transparan
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Kotak Utama Modal */}
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-background border border-border/50 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-border/40 bg-muted/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-primary/20 p-1.5 text-primary">
              <Leaf className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black">Tambah Area Baru</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted/50 text-muted-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Body Modal */}
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Nama Area / Blok
            </label>
            <input 
              type="text" 
              placeholder="Misal: Blok A, Greenhouse 2..." 
              value={newName} 
              onChange={e => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} 
              className="w-full rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5 text-sm outline-none focus:border-primary/50 font-bold transition-colors" 
              autoFocus
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border/40 bg-muted/10 px-5 py-4">
          <Button variant="ghost" onClick={onClose} disabled={addAreaMutation.isPending} className="text-xs font-bold rounded-xl h-10 px-5">
            Batal
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={addAreaMutation.isPending || !newName.trim()} 
            className="text-xs font-bold rounded-xl h-10 px-6 gap-2"
          >
            {addAreaMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Area"}
          </Button>
        </div>
      </div>
    </div>
  );
}
