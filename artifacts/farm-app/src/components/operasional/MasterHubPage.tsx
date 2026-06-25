import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Users, Database, Trash2, Plus, Loader2, ChevronRight, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// 📂 1. DICTIONARY DOMAIN MASTER
// ---------------------------------------------------------------------------
type MasterDomain = "area" | "pekerja" | "kategori";

const MASTER_DOMAINS = [
  { id: "area" as MasterDomain, label: "Area & Blok", icon: Leaf, desc: "Kelola daftar area kebun" },
  { id: "pekerja" as MasterDomain, label: "Tim Pekerja", icon: Users, desc: "Daftar karyawan & tenaga kerja" },
  { id: "kategori" as MasterDomain, label: "Kategori Aktivitas", icon: Database, desc: "Label aktivitas per modul" },
];

const glassCard = "rounded-[1.75rem] border-border/50 bg-card text-card-foreground shadow-sm transition-all duration-300 p-5";

// ---------------------------------------------------------------------------
// 🚀 2. MAIN PAGE COMPONENT
// ---------------------------------------------------------------------------
export function MasterHubPage({ onClose }: { onClose?: () => void }) {
  const [activeDomain, setActiveDomain] = useState<MasterDomain>("area");
  
  // Ambil semua data dari endpoint yang udah lu bikin sebelumnya
  const { data: masterData, isLoading } = useQuery({
    queryKey: ["master-dropdown-options"],
    queryFn: async () => fetch("/api/notion/operasional-dropdown-options").then(res => res.json()),
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      
      {/* HEADER */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Master Data</h1>
          <p className="text-muted-foreground text-sm">Pusat pengaturan database kebun</p>
        </div>
        {/* Tombol Tutup (Berguna kalau ini dibuka via Modal/Dialog dari dashboard utama) */}
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-muted/50">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        
        {/* SIDEBAR CONTAINER */}
        <aside className="space-y-3">
          {MASTER_DOMAINS.map((domain) => {
            const Icon = domain.icon;
            const isActive = activeDomain === domain.id;
            return (
              <button key={domain.id} onClick={() => setActiveDomain(domain.id)}
                className={cn("group flex w-full items-center gap-3 rounded-2xl p-4 transition-all duration-300", 
                  isActive ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-primary/5 text-muted-foreground bg-card border border-border/50")}>
                <div className={cn("rounded-xl p-2 transition-colors", isActive ? "bg-primary-foreground/20 text-white" : "bg-muted text-muted-foreground")}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-left flex-1">
                  <p className={cn("text-sm font-black", isActive && "text-white")}>{domain.label}</p>
                  <p className={cn("text-[10px]", isActive ? "text-white/80" : "text-muted-foreground/60")}>{domain.desc}</p>
                </div>
                {isActive && <ChevronRight className="h-4 w-4" />}
              </button>
            );
          })}
        </aside>

        {/* MAIN CONTENT */}
        <main className="space-y-4">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center rounded-3xl border border-border/50 bg-card/50">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={activeDomain} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                
                {activeDomain === "area" && <AreaManager data={masterData?.areas || []} />}
                {activeDomain === "pekerja" && <PekerjaManager data={masterData?.petugas || []} />}
                {activeDomain === "kategori" && <KategoriManager data={masterData?.kategori || []} />}

              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 📦 3. KOMPONEN PENGELOLA (AREA, PEKERJA, KATEGORI)
// ---------------------------------------------------------------------------

function AreaManager({ data }: { data: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  const addMutation = useMutation({
    mutationFn: async (name: string) => fetch("/api/notion/areas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); setNewName(""); toast({ title: "Sukses", description: "Area baru ditambahkan." }); },
  });

  const delMutation = useMutation({
    mutationFn: async (id: string) => fetch(`/api/notion/areas/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); toast({ title: "Dihapus", description: "Area berhasil dihapus." }); },
  });

  return (
    <Card className={glassCard}>
      <h3 className="text-lg font-black mb-4">Daftar Area</h3>
      <div className="flex gap-2 mb-6">
        <input type="text" placeholder="Nama area baru (cth: Blok A)" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 rounded-xl border border-border/60 bg-muted/30 px-4 py-2 text-sm outline-none focus:border-primary/50" />
        <Button onClick={() => newName.trim() && addMutation.mutate(newName)} disabled={addMutation.isPending} className="rounded-xl font-bold">
          {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1"/> Tambah</>}
        </Button>
      </div>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 p-3">
            <span className="text-sm font-bold">{item.name}</span>
            <Button variant="ghost" size="icon" onClick={() => delMutation.mutate(item.id)} disabled={delMutation.isPending} className="h-8 w-8 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {data.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">Belum ada data area.</p>}
      </div>
    </Card>
  );
}

function PekerjaManager({ data }: { data: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");

  const addMutation = useMutation({
    mutationFn: async (nama: string) => fetch("/api/notion/pekerja", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nama, role: "Karyawan Kebun", jenisTenagaKerja: "Internal" }) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); setNewName(""); toast({ title: "Sukses", description: "Pekerja baru ditambahkan." }); },
  });

  const delMutation = useMutation({
    mutationFn: async (id: string) => fetch(`/api/notion/pekerja/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); toast({ title: "Dihapus", description: "Pekerja berhasil dihapus." }); },
  });

  return (
    <Card className={glassCard}>
      <h3 className="text-lg font-black mb-4">Daftar Pekerja</h3>
      <div className="flex gap-2 mb-6">
        <input type="text" placeholder="Nama pekerja (cth: Supardi)" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 rounded-xl border border-border/60 bg-muted/30 px-4 py-2 text-sm outline-none focus:border-primary/50" />
        <Button onClick={() => newName.trim() && addMutation.mutate(newName)} disabled={addMutation.isPending} className="rounded-xl font-bold">
          {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1"/> Tambah</>}
        </Button>
      </div>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 p-3">
            <span className="text-sm font-bold">{item.name}</span>
            <Button variant="ghost" size="icon" onClick={() => delMutation.mutate(item.id)} disabled={delMutation.isPending} className="h-8 w-8 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function KategoriManager({ data }: { data: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [moduleType, setModuleType] = useState("perawatan");

  const addMutation = useMutation({
    mutationFn: async () => fetch("/api/notion/kategori", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName, module: moduleType }) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); setNewName(""); toast({ title: "Sukses", description: "Kategori ditambahkan." }); },
  });

  const delMutation = useMutation({
    mutationFn: async (id: string) => fetch(`/api/notion/kategori/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); toast({ title: "Dihapus", description: "Kategori dihapus." }); },
  });

  return (
    <Card className={glassCard}>
      <h3 className="text-lg font-black mb-4">Daftar Kategori</h3>
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input type="text" placeholder="Nama Kategori (cth: Penyemprotan)" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 rounded-xl border border-border/60 bg-muted/30 px-4 py-2 text-sm outline-none focus:border-primary/50" />
        <div className="flex gap-2">
          <select value={moduleType} onChange={e => setModuleType(e.target.value)} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm outline-none font-bold uppercase tracking-wider">
            <option value="perawatan">Perawatan</option>
            <option value="operasional">Operasional</option>
          </select>
          <Button onClick={() => newName.trim() && addMutation.mutate()} disabled={addMutation.isPending} className="rounded-xl font-bold shrink-0">
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4"/>}
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 p-3">
            <div>
              <span className="text-sm font-bold block">{item.name}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">{item.module}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => delMutation.mutate(item.id)} disabled={delMutation.isPending} className="h-8 w-8 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
