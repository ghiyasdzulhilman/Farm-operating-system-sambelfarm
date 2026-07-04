import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, CheckCircle2, Briefcase, Clock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface PekerjaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  atribut: {
    roles: any[];
    jenisTenaga: any[];
    statuses: any[];
  };
}

export function PekerjaFormModal({ isOpen, onClose, atribut }: PekerjaFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newName, setNewName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [jenisId, setJenisId] = useState("");
  const [statusId, setStatusId] = useState("");

  // Reset form otomatis setiap kali modal dibuka
  useEffect(() => {
    if (isOpen) {
      setNewName("");
      setRoleId("");
      setJenisId("");
      setStatusId("");
    }
  }, [isOpen]);

  const addPekerjaMutation = useMutation({
    mutationFn: async () => fetch("/api/notion/pekerja", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ nama: newName, roleId, jenisTenagaKerjaId: jenisId, statusId }) 
    }).then(r => r.json()),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); 
      toast({ title: "Sukses", description: "Anggota tim baru berhasil ditambahkan." });
      onClose(); // Tutup modal otomatis
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
    }
  });

  const handleSubmit = () => {
    if (!newName.trim() || !roleId || !jenisId || !statusId) {
      toast({ variant: "destructive", title: "Data Belum Lengkap", description: "Pastikan nama dan semua atribut telah dipilih." });
      return;
    }
    addPekerjaMutation.mutate();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(val) => { if (!val) onClose(); }}>
      <SheetContent 
        side="top" 
        className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] pb-5 z-[100]"
      >
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border pr-12">
          {/* pr-12 di atas untuk ngasih ruang buat tombol X bawaan Shadcn biar ngga ketabrak teks */}
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shadow-sm">
              <Users className="h-5 w-5" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Tambah Anggota Tim</SheetTitle>
              <p className="text-[10px] font-bold text-primary tracking-wider uppercase">Master Data</p>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-5 space-y-5 text-left max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* INPUT NAMA */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
              Nama Lengkap
            </label>
            <Input 
              placeholder="Misal: Budi Santoso" 
              value={newName} 
              onChange={e => setNewName(e.target.value)}
              className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium px-4"
              autoFocus
            />
          </div>

          {/* DROPDOWN ATRIBUT */}
          <div className="space-y-4 p-4 rounded-2xl bg-muted/30 border border-border/50">
            
            {/* Role / Jabatan */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                <Briefcase className="h-3 w-3" /> Jabatan / Role
              </label>
              <select 
                value={roleId} 
                onChange={e => setRoleId(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus:border-primary/50 shadow-sm cursor-pointer"
              >
                <option value="" disabled>-- Pilih Jabatan --</option>
                {atribut.roles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Sistem Kerja */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  <Clock className="h-3 w-3" /> Sistem Kerja
                </label>
                <select 
                  value={jenisId} 
                  onChange={e => setJenisId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus:border-primary/50 shadow-sm cursor-pointer"
                >
                  <option value="" disabled>-- Pilih --</option>
                  {atribut.jenisTenaga.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  <Activity className="h-3 w-3" /> Status
                </label>
                <select 
                  value={statusId} 
                  onChange={e => setStatusId(e.target.value)}
                  className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus:border-primary/50 shadow-sm cursor-pointer"
                >
                  <option value="" disabled>-- Pilih --</option>
                  {atribut.statuses.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-end gap-3 px-6 pt-2 pb-2">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={addPekerjaMutation.isPending} 
            className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted"
          >
            Batal
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={addPekerjaMutation.isPending} 
            className="h-11 rounded-xl px-6 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm gap-2"
          >
            {addPekerjaMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Simpan Tim</>}
          </Button>
        </div>

        {/* Garis pemanis di bawah sheet */}
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-border/60" />
      </SheetContent>
    </Sheet>
  );
}
