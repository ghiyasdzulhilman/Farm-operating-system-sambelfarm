import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus, Loader2, Database, Tag, Briefcase, Clock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PekerjaAtributPanelProps {
  atribut: {
    roles: any[];
    jenisTenaga: any[];
    statuses: any[];
  };
  searchQuery: string;
}

type TagType = "role" | "jenis_tenaga" | "status";

export function PekerjaAtributPanel({ atribut, searchQuery }: PekerjaAtributPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [tagType, setTagType] = useState<TagType>("role");
  const [newTagName, setNewTagName] = useState("");

  // 1. MUTASI TAMBAH ATRIBUT
  const addTagMutation = useMutation({
    mutationFn: async () => fetch("/api/notion/pekerja-atribut", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ namaOption: newTagName, jenisAtribut: tagType }) 
    }).then(r => r.json()),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); 
      setNewTagName(""); 
      toast({ title: "Sukses", description: "Opsi baru berhasil ditambahkan." }); 
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Gagal", description: err.message })
  });

  // 2. MUTASI HAPUS ATRIBUT
  const delTagMutation = useMutation({
    mutationFn: async (id: string) => fetch(`/api/notion/pekerja-atribut/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); 
      toast({ title: "Dihapus", description: "Opsi berhasil dihapus." }); 
    },
    onError: (err: any) => toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message })
  });

  // 3. LOGIKA FILTER LIST AKTIF
  const activeTagList = useMemo(() => {
    const list = tagType === "role" ? atribut.roles 
               : tagType === "jenis_tenaga" ? atribut.jenisTenaga 
               : atribut.statuses;
    
    return list.filter((item: any) => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [atribut, tagType, searchQuery]);

  // Fungsi helper untuk UI
  const getTagMeta = () => {
    switch(tagType) {
      case "role": return { icon: Briefcase, color: "text-primary", bg: "bg-primary/10", title: "Jabatan / Role" };
      case "jenis_tenaga": return { icon: Clock, color: "text-emerald-600", bg: "bg-emerald-500/10", title: "Sistem Kerja" };
      case "status": return { icon: Activity, color: "text-amber-600", bg: "bg-amber-500/10", title: "Status" };
    }
  };

  const meta = getTagMeta();
  const MetaIcon = meta.icon;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 🧭 PILIHAN KATEGORI (Udah nggak pakai select dropdown lagi, tapi pakai pills) */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-muted/30 rounded-2xl border border-border/50 w-fit">
        <button
          onClick={() => setTagType("role")}
          className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all", tagType === "role" ? "bg-background text-primary shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground")}
        >
          <Briefcase className="h-3.5 w-3.5" /> Jabatan
        </button>
        <button
          onClick={() => setTagType("jenis_tenaga")}
          className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all", tagType === "jenis_tenaga" ? "bg-background text-emerald-600 shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground")}
        >
          <Clock className="h-3.5 w-3.5" /> Sistem Kerja
        </button>
        <button
          onClick={() => setTagType("status")}
          className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all", tagType === "status" ? "bg-background text-amber-600 shadow-sm border border-border/40" : "text-muted-foreground hover:text-foreground")}
        >
          <Activity className="h-3.5 w-3.5" /> Status
        </button>
      </div>

      {/* 📝 PANEL KELOLA (Mewah & Dinamis menyesuaikan warna kategori) */}
      <div className="w-full max-w-2xl rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
        
        {/* Header Panel Dinamis */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/10">
          <div className="flex items-center gap-3">
            <div className={cn("rounded-xl p-2 shadow-sm", meta.bg, meta.color)}>
              <MetaIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground">Kelola {meta.title}</h3>
              <p className="text-[10px] text-muted-foreground font-medium mt-0.5">Tambah atau hapus opsi atribut master</p>
            </div>
          </div>
        </div>

        {/* Form Tambah Opsi Baru */}
        <div className="p-5 border-b border-border/40 bg-muted/5">
          <div className="flex items-center gap-3">
            <input 
              type="text" 
              placeholder={`Tambah ${meta.title.toLowerCase()} baru...`} 
              value={newTagName} 
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newTagName.trim() && addTagMutation.mutate()} 
              className="flex-1 rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/50 font-semibold shadow-sm" 
            />
            <Button 
              onClick={() => newTagName.trim() && addTagMutation.mutate()} 
              disabled={addTagMutation.isPending || !newTagName.trim()} 
              className={cn("rounded-xl font-bold shrink-0 h-10 px-5 gap-2", meta.bg, meta.color, "hover:opacity-80 shadow-none border border-transparent")}
            >
              {addTagMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4"/> Tambah</>}
            </Button>
          </div>
        </div>

        {/* Daftar Opsi Aktif */}
        <div className="p-5 space-y-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
            Opsi Tersedia ({activeTagList.length})
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeTagList.map((tag: any) => (
              <div key={tag.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-3 hover:border-primary/30 transition-colors group shadow-sm">
                <div className="flex items-center gap-2.5">
                  <Tag className={cn("h-3.5 w-3.5 opacity-50", meta.color)} />
                  <span className="text-sm font-bold">{tag.name}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    if (confirm(`Yakin ingin menghapus opsi "${tag.name}"?`)) {
                      delTagMutation.mutate(tag.id);
                    }
                  }} 
                  disabled={delTagMutation.isPending} 
                  className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors rounded-lg"
                  >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {activeTagList.length === 0 && (
            <div className="text-center py-8">
              <Database className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-medium">Belum ada opsi master yang ditambahkan.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
