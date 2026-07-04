import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Users, Database, Trash2, Plus, Loader2, ChevronRight, X, CalendarDays, Bug, Package, Pencil, Sprout, Wallet, Wrench, ChevronDown, ToggleLeft, ToggleRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AreaManager } from "@/components/master/area/AreaManager";
// import { PekerjaManager } from "./..."; (siapkan buat nanti)

// ---------------------------------------------------------------------------
// 📂 1. DICTIONARY DOMAIN MASTER
// ---------------------------------------------------------------------------

// Struktur Kamus Baru (Berhirarki)
const ERP_MODULES = [
  {
    id: "agronomy",
    label: "Modul Agronomy",
    icon: Sprout,
    children: [
      { id: "area", label: "Area & Blok", icon: Leaf },
      { id: "pekerja", label: "Tim Pekerja", icon: Users },
      { id: "kategori", label: "Kategori Aktivitas", icon: Database },
      { id: "kendala", label: "Hama & Penyakit", icon: Bug },
    ],
  },
  {
    id: "finance",
    label: "Modul Finance",
    icon: Wallet,
    children: [
      { id: "panen", label: "Data Pemanenan", icon: Package },
      { id: "pengeluaran", label: "Lacak Pengeluaran", icon: Database },
    ],
  },
  {
    id: "tools",
    label: "Tools & Gudang",
    icon: Wrench,
    children: [
      { id: "produk", label: "Produk & Stok", icon: Package },
    ],
  },
];

const glassCard = "rounded-[1.75rem] border-border/50 bg-card text-card-foreground shadow-sm transition-all duration-300 p-5";

// ---------------------------------------------------------------------------
// 🚀 2. MAIN PAGE COMPONENT
// ---------------------------------------------------------------------------
export function MasterHubPage({ onClose }: { onClose?: () => void }) {
  // Buka Agronomy dan Area secara default
  const [activeModule, setActiveModule] = useState<string>("agronomy");
  const [activeChild, setActiveChild] = useState<string>("area");
  
    return (
    // 💡 Tambahin pb-32 (padding-bottom super tebal) biar gampang digeser sampai mentok bawah
    <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-32 md:px-6">
      
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
  <aside className="space-y-4">
  {ERP_MODULES.map((modul) => {
    const IconInduk = modul.icon;
    const isModuleExpanded = activeModule === modul.id;

    return (
      <div key={modul.id} className="space-y-1.5">
        {/* TOMBOL INDUK MODUL */}
        <button 
          onClick={() => setActiveModule(isModuleExpanded ? "" : modul.id)}
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-2xl p-4 transition-all duration-300 border",
            isModuleExpanded 
              ? "bg-primary/5 border-primary/20 text-primary shadow-sm" 
              : "bg-card border-border/50 text-muted-foreground hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn("rounded-xl p-2 transition-colors", isModuleExpanded ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
              <IconInduk className="h-5 w-5" />
            </div>
            <span className={cn("text-sm font-black", isModuleExpanded && "text-foreground")}>
              {modul.label}
            </span>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform duration-300", isModuleExpanded && "rotate-180")} />
        </button>

        {/* DAFTAR ANAK (MUNCUL KALAU INDUK DIKLIK) */}
        <AnimatePresence>
          {isModuleExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden pl-4 pr-1 space-y-1.5"
            >
              <div className="pt-1.5 pb-2 border-l-2 border-border/50 pl-3 space-y-1.5">
                {modul.children.map((child) => {
                  const IconAnak = child.icon;
                  const isChildActive = activeChild === child.id;

                  return (
                    <button
                      key={child.id}
                      onClick={() => setActiveChild(child.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl p-3 transition-all duration-200 text-left",
                        isChildActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <IconAnak className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-bold">{child.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  })}
</aside>

        {/* MAIN CONTENT */}
  <main className="space-y-4 w-full overflow-hidden">
  <AnimatePresence mode="wait">
    <motion.div 
      key={activeChild} 
      initial={{ opacity: 0, x: 10 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -10 }} 
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      
      {/* 🚀 COLOKAN MODUL AGRONOMY */}
      {activeChild === "area" && <AreaManager />}
      
      {/* Placeholder buat anak-anak lainnya (tunggu di-refactor nanti) */}
      {activeChild === "pekerja" && (
        <div className="p-8 text-center text-muted-foreground border border-dashed rounded-3xl">Pekerja Manager (Coming Soon)</div>
      )}
      {activeChild === "panen" && (
        <div className="p-8 text-center text-muted-foreground border border-dashed rounded-3xl">Modul Panen (Coming Soon)</div>
      )}

    </motion.div>
  </AnimatePresence>
</main>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 📦 3. KOMPONEN PENGELOLA (PEKERJA, KATEGORI)
// ---------------------------------------------------------------------------

function PekerjaManager({ data, atribut }: { data: any[], atribut?: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State untuk form Tambah Pekerja
  const [newName, setNewName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [jenisId, setJenisId] = useState("");
  const [statusId, setStatusId] = useState("");

  // State untuk form Kelola Atribut (Notion-style Tags)
  const [newTagName, setNewTagName] = useState("");
  const [tagType, setTagType] = useState("role"); // role | jenis_tenaga | status

  // Ekstrak opsi dari props atribut (Aman dari undefined)
  const opsiRoles = atribut?.roles || [];
  const opsiTenaga = atribut?.jenisTenaga || [];
  const opsiStatuses = atribut?.statuses || [];

  // 1. Mutasi Pekerja
  const addPekerjaMutation = useMutation({
    mutationFn: async () => fetch("/api/notion/pekerja", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ nama: newName, roleId, jenisTenagaKerjaId: jenisId, statusId }) 
    }).then(r => r.json()),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); 
      setNewName(""); setRoleId(""); setJenisId(""); setStatusId("");
      toast({ title: "Sukses", description: "Pekerja baru ditambahkan." }); 
    },
  });

  const delPekerjaMutation = useMutation({
    mutationFn: async (id: string) => fetch(`/api/notion/pekerja/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); toast({ title: "Dihapus", description: "Pekerja berhasil dihapus." }); },
  });

  // 💡 MUTASI BARU: Untuk Inline Edit Badge
  const editPekerjaMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: any }) => fetch(`/api/notion/pekerja/${id}`, { 
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) 
    }).then(r => r.json()),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); 
      toast({ title: "Tersimpan", description: "Atribut pekerja berhasil diperbarui." }); 
    },
  });

  // 2. Mutasi Atribut (Tag Master)
  const addTagMutation = useMutation({
    mutationFn: async () => fetch("/api/notion/pekerja-atribut", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ namaOption: newTagName, jenisAtribut: tagType }) 
    }).then(r => r.json()),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); 
      setNewTagName(""); 
      toast({ title: "Tag Sukses", description: "Opsi baru berhasil ditambahkan." }); 
    },
  });

  const delTagMutation = useMutation({
    mutationFn: async (id: string) => fetch(`/api/notion/pekerja-atribut/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); toast({ title: "Tag Dihapus", description: "Opsi berhasil dihapus." }); },
  });

  // Helper untuk mencari nama asli atribut berdasarkan ID-nya
  const getNamaAtribut = (id: string, list: any[]) => list.find(item => item.id === id)?.name || "-";

  // Filter list atribut yang ditampilkan di sekat kanan berdasarkan dropdown tipe
  const activeTagList = tagType === "role" ? opsiRoles : (tagType === "jenis_tenaga" ? opsiTenaga : opsiStatuses);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
      
      {/* SEKAT KIRI: KELOLA PEKERJA */}
      <Card className={glassCard}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-black">Tim Pekerja</h3>
        </div>
        
        {/* Form Tambah Pekerja */}
        <div className="flex flex-col gap-2 mb-6 p-4 rounded-2xl bg-muted/20 border border-border/50">
          <input type="text" placeholder="Nama Pekerja" value={newName} onChange={e => setNewName(e.target.value)} className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm outline-none focus:border-primary/50 font-bold" />
          
          <div className="grid grid-cols-3 gap-2">
            <select value={roleId} onChange={e => setRoleId(e.target.value)} className="w-full rounded-xl border border-border/60 bg-background px-2 py-2 text-[10px] outline-none font-bold uppercase tracking-wider cursor-pointer">
              <option value="">-- JABATAN --</option>
              {opsiRoles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            
            <select value={jenisId} onChange={e => setJenisId(e.target.value)} className="w-full rounded-xl border border-border/60 bg-background px-2 py-2 text-[10px] outline-none font-bold uppercase tracking-wider cursor-pointer">
              <option value="">-- SISTEM --</option>
              {opsiTenaga.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            
            <select value={statusId} onChange={e => setStatusId(e.target.value)} className="w-full rounded-xl border border-border/60 bg-background px-2 py-2 text-[10px] outline-none font-bold uppercase tracking-wider cursor-pointer">
              <option value="">-- STATUS --</option>
              {opsiStatuses.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          
          <Button onClick={() => newName.trim() && addPekerjaMutation.mutate()} disabled={addPekerjaMutation.isPending || !newName} className="w-full rounded-xl font-bold mt-1">
            {addPekerjaMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tambah Pekerja"}
          </Button>
        </div>

        {/* List Pekerja */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
          {data.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 p-3 hover:bg-muted/30 transition-colors">
              <div>
                <span className="text-sm font-bold block mb-1">{item.name}</span>

            {/* 💡 BADGE INTERAKTIF: Tampilannya kayak label biasa, tapi kalau diklik jadi dropdown! */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  
            {/* Badge Role */}
                  <select 
                    value={item.roleId || ""} 
                    onChange={(e) => editPekerjaMutation.mutate({ id: item.id, payload: { roleId: e.target.value } })}
                    className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded outline-none cursor-pointer appearance-none text-center hover:bg-primary/20 transition-colors"
                  >
                    <option value="" disabled>-</option>
                    {opsiRoles.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>

            {/* Badge Sistem Kerja */}
                  <select 
                    value={item.jenisTenagaKerjaId || ""} 
                    onChange={(e) => editPekerjaMutation.mutate({ id: item.id, payload: { jenisTenagaKerjaId: e.target.value } })}
                    className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded outline-none cursor-pointer appearance-none text-center hover:bg-emerald-500/20 transition-colors"
                  >
                    <option value="" disabled>-</option>
                    {opsiTenaga.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>

            {/* Badge Status */}
                  <select 
                    value={item.statusId || ""} 
                    onChange={(e) => editPekerjaMutation.mutate({ id: item.id, payload: { statusId: e.target.value } })}
                    className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded outline-none cursor-pointer appearance-none text-center hover:bg-amber-500/20 transition-colors"
                  >
                    <option value="" disabled>-</option>
                    {opsiStatuses.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                </div>

              </div>
              <Button variant="ghost" size="icon" onClick={() => delPekerjaMutation.mutate(item.id)} disabled={delPekerjaMutation.isPending} className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {data.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">Belum ada pekerja.</p>}
        </div>
      </Card>

      {/* SEKAT KANAN: KELOLA TAG / ATRIBUT (NOTION STYLE) */}
      <Card className={glassCard}>
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-black">Kelola Properti</h3>
        </div>

        {/* Form Tambah Tag */}
        <div className="flex flex-col gap-2 mb-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <select value={tagType} onChange={e => setTagType(e.target.value)} className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-xs outline-none font-bold uppercase tracking-wider cursor-pointer text-amber-700">
            <option value="role">Jabatan / Role</option>
            <option value="jenis_tenaga">Sistem Kerja</option>
            <option value="status">Status Pekerja</option>
          </select>
          
          <div className="flex gap-2 mt-1">
            <input type="text" placeholder="Tambah opsi baru..." value={newTagName} onChange={e => setNewTagName(e.target.value)} className="flex-1 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-amber-500/50" />
            <Button onClick={() => newTagName.trim() && addTagMutation.mutate()} disabled={addTagMutation.isPending || !newTagName} variant="secondary" className="rounded-xl font-bold shrink-0 bg-amber-500/20 text-amber-700 hover:bg-amber-500/30">
              {addTagMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4"/>}
            </Button>
          </div>
        </div>

        {/* List Tag Aktif */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 border-b border-border/50 pb-2">Opsi Tersedia</h4>
          {activeTagList.map((tag: any) => (
            <div key={tag.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-background p-2 pl-3">
              <span className="text-sm font-semibold">{tag.name}</span>
              <Button variant="ghost" size="icon" onClick={() => delTagMutation.mutate(tag.id)} disabled={delTagMutation.isPending} className="h-7 w-7 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {activeTagList.length === 0 && <p className="text-center text-xs text-muted-foreground py-4">Belum ada opsi untuk kategori ini.</p>}
        </div>
      </Card>
      
    </div>
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
        <input type="text" placeholder="Nama Kategori" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 rounded-xl border border-border/60 bg-muted/30 px-4 py-2 text-sm outline-none focus:border-primary/50" />
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

// ---------------------------------------------------------------------------
// 📦 4. KOMPONEN PENGELOLA HAMA & PENYAKIT (KENDALA)
// ---------------------------------------------------------------------------
function KendalaManager({ data }: { data: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [jenisKendala, setJenisKendala] = useState("Hama");

    const addMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notion/kendala", { 
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nama: newName, jenis: jenisKendala }) 
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menambah data."); // 💡 Lempar error kalau backend nolak
      return data;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); 
      setNewName(""); 
      toast({ title: "Sukses", description: "Data baru ditambahkan." }); 
    },
    onError: (err: any) => {
      // 💡 Tangkap error dan tampilkan notif merah!
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
    }
  });

  const delMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notion/kendala/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus data.");
      return data;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); 
      toast({ title: "Dihapus", description: "Data berhasil dihapus." }); 
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
    }
  });

  return (
    <Card className={glassCard}>
      <h3 className="text-lg font-black mb-1">Daftar Hama & Penyakit</h3>
      <p className="text-xs text-muted-foreground mb-6">Kelola daftar kendala lapangan yang sering terjadi untuk mempermudah laporan tim.</p>
      
      <div className="flex flex-col md:flex-row gap-2 mb-6">
        <div className="flex-1 flex gap-2">
          <select value={jenisKendala} onChange={e => setJenisKendala(e.target.value)} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs outline-none font-bold uppercase tracking-wider text-primary cursor-pointer w-[120px]">
            <option value="Hama">Hama</option>
            <option value="Penyakit">Penyakit</option>
          </select>
          <input type="text" placeholder="Nama Hama/Penyakit" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 rounded-xl border border-border/60 bg-muted/30 px-4 py-2 text-sm outline-none focus:border-primary/50 font-bold" />
        </div>
        <Button onClick={() => newName.trim() && addMutation.mutate()} disabled={addMutation.isPending} className="rounded-xl font-bold md:w-auto w-full shrink-0">
          {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1"/> Tambah</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-muted/10 p-3 hover:bg-muted/30 transition-colors">
            <div>
              <span className="text-sm font-bold block">{item.name}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-border/50 bg-background px-1.5 py-0.5 rounded inline-block mt-1">
                {item.jenis}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => delMutation.mutate(item.id)} disabled={delMutation.isPending} className="h-8 w-8 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {data.length === 0 && <p className="text-center text-xs text-muted-foreground py-4 md:col-span-2">Belum ada data hama atau penyakit.</p>}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// 📦 5. KOMPONEN PENGELOLA PRODUK MASTER (PUPUK, PESTISIDA, DLL)
// ---------------------------------------------------------------------------

const JENIS_PRODUK_OPTIONS = ["Pupuk", "Pestisida", "Herbisida", "Fungisida", "Lainnya"];

const SATUAN_PRESET: Record<string, { dasar: string; tampilan: string }> = {
  Solid: { dasar: "gram", tampilan: "kg" },
  Cair: { dasar: "ml", tampilan: "liter" },
};

type ProdukForm = {
  nama: string;
  jenis: string;
  bentuk: "Solid" | "Cair";
  satuanDasar: string;
  satuanTampilan: string;
  hargaPerSatuanDasar: string; // string di form, di-parse ke integer saat submit
  stokAwal: string; // hanya dipakai saat create
  n: string; p: string; k: string; ca: string; mg: string;
};

const EMPTY_PRODUK_FORM: ProdukForm = {
  nama: "", jenis: "Pupuk", bentuk: "Solid",
  satuanDasar: "gram", satuanTampilan: "kg",
  hargaPerSatuanDasar: "", stokAwal: "0",
  n: "", p: "", k: "", ca: "", mg: "",
};

function ProdukManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<ProdukForm>(EMPTY_PRODUK_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHarga, setEditHarga] = useState<string>("");

  // 🆕 Query TERPISAH dari master-dropdown-options — lihat alasan di catatan implementasi
  const { data, isLoading } = useQuery({
    queryKey: ["produk-master-list"],
    queryFn: async () => fetch("/api/produk").then((r) => r.json()),
  });
  const produkList: any[] = data?.data || [];

  const resetForm = () => { setForm(EMPTY_PRODUK_FORM); setShowAddForm(false); };

  const addMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nama: form.nama,
        jenis: form.jenis,
        bentuk: form.bentuk,
        satuanDasar: form.satuanDasar,
        satuanTampilan: form.satuanTampilan,
        hargaPerSatuanDasar: Number(form.hargaPerSatuanDasar) || 0,
        stokAwal: Number(form.stokAwal) || 0,
        n: form.n ? Number(form.n) : undefined,
        p: form.p ? Number(form.p) : undefined,
        k: form.k ? Number(form.k) : undefined,
        ca: form.ca ? Number(form.ca) : undefined,
        mg: form.mg ? Number(form.mg) : undefined,
      };
      const res = await fetch("/api/produk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menambah produk.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produk-master-list"] });
      resetForm();
      toast({ title: "Sukses", description: "Produk baru ditambahkan." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
    },
  });

  // Dipakai untuk: toggle is_active, dan edit harga inline.
  // TIDAK dipakai untuk stok_saat_ini — itu wajib lewat endpoint adjustStock terpisah (belum ada, Step 2).
  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const res = await fetch(`/api/produk/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memperbarui produk.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produk-master-list"] });
      setEditingId(null);
      toast({ title: "Tersimpan", description: "Produk berhasil diperbarui." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/produk/${id}`, { method: "DELETE" });
      const json = await res.json();
      // Kemungkinan besar gagal dengan pesan FK restrict kalau produk sudah pernah dipakai —
      // itu perilaku yang benar, bukan bug, ditangani lewat onError di bawah.
      if (!res.ok) throw new Error(json.error || "Produk tidak bisa dihapus, kemungkinan masih dipakai di data perawatan.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produk-master-list"] });
      toast({ title: "Dihapus", description: "Produk berhasil dihapus." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
    },
  });

  const handleBentukChange = (bentuk: "Solid" | "Cair") => {
    const preset = SATUAN_PRESET[bentuk];
    setForm((f) => ({ ...f, bentuk, satuanDasar: preset.dasar, satuanTampilan: preset.tampilan }));
  };

  const startEditHarga = (item: any) => {
    setEditingId(item.id);
    setEditHarga(String(item.hargaPerSatuanDasar ?? 0));
  };

  const submitEditHarga = (item: any) => {
    const nilaiBaru = Number(editHarga);
    // ⚠️ Konfirmasi eksplisit kalau produk aktif di-set harga ke 0 — sesuai keputusan sebelumnya:
    // harga 0 akan mem-block produk ini dari form perawatan.
    if (nilaiBaru === 0 && item.isActive && item.hargaPerSatuanDasar !== 0) {
      const yakin = confirm(
        `⚠️ Set harga "${item.nama}" ke 0 akan memblokir produk ini dari form perawatan sampai harga diisi ulang. Lanjutkan?`
      );
      if (!yakin) return;
    }
    updateMutation.mutate({ id: item.id, payload: { hargaPerSatuanDasar: nilaiBaru } });
  };

  const toggleActive = (item: any) => {
    updateMutation.mutate({ id: item.id, payload: { isActive: !item.isActive } });
  };

  return (
    <Card className={glassCard}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-black">Produk & Stok</h3>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowAddForm((s) => !s)}
          className="rounded-xl font-bold bg-primary/10 text-primary hover:bg-primary/20"
        >
          <Plus className="h-4 w-4 mr-1" /> {showAddForm ? "Tutup" : "Tambah Produk"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-6">
        Kelola master pupuk, pestisida, dan bahan lain. Harga di sini dipakai untuk hitung biaya per aktivitas perawatan.
      </p>

      {/* FORM TAMBAH PRODUK */}
      {showAddForm && (
        <div className="flex flex-col gap-3 mb-6 p-4 rounded-2xl bg-muted/20 border border-border/50">
          <input
            type="text" placeholder="Nama Produk (Msl: NPK Mutiara)"
            value={form.nama} onChange={(e) => setForm((f) => ({ ...f, nama: e.target.value }))}
            className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm outline-none focus:border-primary/50 font-bold"
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.jenis} onChange={(e) => setForm((f) => ({ ...f, jenis: e.target.value }))}
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-xs outline-none font-bold uppercase tracking-wider"
            >
              {JENIS_PRODUK_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>

            <select
              value={form.bentuk} onChange={(e) => handleBentukChange(e.target.value as "Solid" | "Cair")}
              className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-xs outline-none font-bold uppercase tracking-wider"
            >
              <option value="Solid">Solid (gram/kg)</option>
              <option value="Cair">Cair (ml/liter)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">Harga per {form.satuanDasar}</label>
              <input
                type="number" placeholder="0"
                value={form.hargaPerSatuanDasar} onChange={(e) => setForm((f) => ({ ...f, hargaPerSatuanDasar: e.target.value }))}
                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">Stok Awal ({form.satuanDasar})</label>
              <input
                type="number" placeholder="0"
                value={form.stokAwal} onChange={(e) => setForm((f) => ({ ...f, stokAwal: e.target.value }))}
                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 font-bold"
              />
            </div>
          </div>

          {form.hargaPerSatuanDasar === "" || Number(form.hargaPerSatuanDasar) === 0 ? (
            <p className="text-[10px] font-bold text-amber-700 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
              ⚠️ Tanpa harga, produk ini tidak bisa dipakai di form perawatan sampai harga diisi.
            </p>
          ) : null}

          {/* Kandungan hara — opsional, jarang dipakai, ditaruh paling bawah supaya tidak menghalangi alur utama */}
          <details className="text-xs">
            <summary className="font-bold text-muted-foreground cursor-pointer">Kandungan Hara (Opsional)</summary>
            <div className="grid grid-cols-5 gap-1.5 mt-2">
              {(["n", "p", "k", "ca", "mg"] as const).map((key) => (
                <input
                  key={key} type="number" placeholder={key.toUpperCase()}
                  value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs outline-none text-center"
                />
              ))}
            </div>
          </details>

          <div className="flex gap-2 justify-end mt-1">
            <Button variant="ghost" size="sm" onClick={resetForm} className="h-9 text-xs rounded-lg font-bold">Batal</Button>
            <Button
              size="sm"
              onClick={() => form.nama.trim() ? addMutation.mutate() : toast({ variant: "destructive", title: "Gagal", description: "Nama produk wajib diisi." })}
              disabled={addMutation.isPending}
              className="h-9 text-xs rounded-lg font-bold px-6"
            >
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Produk"}
            </Button>
          </div>
        </div>
      )}

      {/* LIST PRODUK */}
      {isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-2">
          {produkList.map((item) => {
            const isEditing = editingId === item.id;
            const hargaKosong = !item.hargaPerSatuanDasar || item.hargaPerSatuanDasar === 0;

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  item.isActive ? "border-border/40 bg-muted/10" : "border-border/20 bg-muted/5 opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black">{item.nama}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {item.jenis}
                      </span>
                      {!item.isActive && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Nonaktif
                        </span>
                      )}
                      {hargaKosong && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          Harga Kosong
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>
                        Stok: <span className="font-bold text-foreground">{item.stokSaatIni} {item.satuanDasar}</span>
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number" value={editHarga} onChange={(e) => setEditHarga(e.target.value)}
                            className="w-20 rounded-md border border-border/60 bg-background px-2 py-0.5 text-xs outline-none focus:border-primary/50"
                            autoFocus
                          />
                          <Button size="sm" variant="ghost" onClick={() => submitEditHarga(item)} className="h-6 px-2 text-[10px] font-bold text-primary">
                            Simpan
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-6 px-2 text-[10px] font-bold">
                            Batal
                          </Button>
                        </div>
                      ) : (
                        <button onClick={() => startEditHarga(item)} className="flex items-center gap-1 font-bold text-foreground hover:text-primary">
                          Rp{item.hargaPerSatuanDasar?.toLocaleString("id-ID") ?? 0}/{item.satuanDasar}
                          <Pencil className="h-3 w-3 opacity-50" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" onClick={() => toggleActive(item)}
                      disabled={updateMutation.isPending}
                      title={item.isActive ? "Nonaktifkan" : "Aktifkan"}
                      className="h-8 w-8"
                    >
                      {item.isActive ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => {
                        if (confirm(`Hapus produk "${item.nama}"? Kalau produk ini pernah dipakai di data perawatan, penghapusan akan ditolak sistem.`)) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {produkList.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">Belum ada produk terdaftar.</p>
          )}
        </div>
      )}
    </Card>
  );
}
