import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Users, Database, Trash2, Plus, Loader2, ChevronRight, X, CalendarDays } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// 📂 1. DICTIONARY DOMAIN MASTER
// ---------------------------------------------------------------------------
type MasterDomain = "area" | "pekerja" | "kategori" | "siklus";

const MASTER_DOMAINS = [
  { id: "area" as MasterDomain, label: "Area & Blok", icon: Leaf, desc: "Kelola daftar area kebun" },
  { id: "siklus" as MasterDomain, label: "Siklus Tanam", icon: CalendarDays, desc: "Atur tanggal pindah tanam" }, // 👈 TAB BARU
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
                {activeDomain === "siklus" && <SiklusTanamManager dataArea={masterData?.areas || []} />}
                {activeDomain === "pekerja" && <PekerjaManager data={masterData?.petugas || []} atribut={masterData?.atributPekerja} />}
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
          <input type="text" placeholder="Nama Pekerja (cth: Supardi)" value={newName} onChange={e => setNewName(e.target.value)} className="w-full rounded-xl border border-border/60 bg-background px-4 py-2 text-sm outline-none focus:border-primary/50 font-bold" />
          
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
            <option value="role">🛠️ Jabatan / Role</option>
            <option value="jenis_tenaga">💼 Sistem Kerja</option>
            <option value="status">🟢 Status Pekerja</option>
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

// ---------------------------------------------------------------------------
// 📦 4. KOMPONEN PENGELOLA SIKLUS TANAM (HST)
// ---------------------------------------------------------------------------
function SiklusTanamManager({ dataArea }: { dataArea: any[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [areaId, setAreaId] = useState("");
  const [namaSiklus, setNamaSiklus] = useState("");
  const [tglTanam, setTglTanam] = useState("");

  // Tarik data siklus yang sedang aktif dari backend
  const { data: listSiklus, isLoading } = useQuery({
    queryKey: ["siklus-tanam-list"],
    queryFn: async () => fetch("/api/notion/siklus-tanam").then(r => r.json()),
  });

  const activeSiklus = listSiklus?.data || [];

  const addMutation = useMutation({
    mutationFn: async () => fetch("/api/notion/siklus-tanam", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ areaId, namaSiklus, tanggalPindahTanam: tglTanam }) 
    }).then(r => r.json()),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["siklus-tanam-list"] }); 
      queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] }); // Refresh feed biar HST langsung berubah
      setAreaId(""); setNamaSiklus(""); setTglTanam("");
      toast({ title: "Siklus Dimulai", description: "Siklus tanam baru berhasil didaftarkan." }); 
    },
  });

  return (
    <Card className={glassCard}>
      <h3 className="text-lg font-black mb-1">Manajemen Siklus Tanam</h3>
      <p className="text-xs text-muted-foreground mb-4">Mendaftarkan siklus baru akan otomatis menyelesaikan (mengarsipkan) siklus lama di area yang sama.</p>
      
      {/* Form Tambah Siklus */}
      <div className="flex flex-col gap-3 mb-6 rounded-2xl bg-muted/10 p-4 border border-border/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select value={areaId} onChange={e => setAreaId(e.target.value)} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm outline-none font-bold">
            <option value="" disabled>Pilih Area / Blok</option>
            {dataArea.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <input type="text" placeholder="Nama Tanaman (cth: Tomat Kloter A)" value={namaSiklus} onChange={e => setNamaSiklus(e.target.value)} className="rounded-xl border border-border/60 bg-muted/30 px-4 py-2 text-sm outline-none focus:border-primary/50" />
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="w-full sm:w-auto flex items-center gap-2 flex-1 rounded-xl border border-border/60 bg-muted/30 px-4 py-1.5 focus-within:border-primary/50">
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">TGL TANAM:</span>
            <input type="date" value={tglTanam} onChange={e => setTglTanam(e.target.value)} className="bg-transparent text-sm font-bold outline-none cursor-pointer w-full" />
          </div>
          <Button 
            onClick={() => { if(areaId && namaSiklus && tglTanam) addMutation.mutate(); else toast({variant: "destructive", title:"Gagal", description:"Isi semua kolom dulu."}) }} 
            disabled={addMutation.isPending} 
            className="rounded-xl font-bold w-full sm:w-auto shrink-0"
          >
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mulai Siklus"}
          </Button>
        </div>
      </div>

      {/* Daftar Siklus Aktif */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Siklus Sedang Berjalan</h4>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" /> : 
          activeSiklus.map((item: any) => (
            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3 gap-2">
              <div>
                <span className="text-sm font-black block text-primary">{item.namaSiklus}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Leaf className="h-3 w-3" /> Area: {item.areaName}
                </span>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs font-bold block">Ditanam: {new Date(item.tanggalPindahTanam).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block mt-1">Status: {item.status}</span>
              </div>
            </div>
          ))
        }
        {activeSiklus.length === 0 && !isLoading && <p className="text-center text-xs text-muted-foreground py-4">Belum ada siklus aktif.</p>}
      </div>
    </Card>
  );
}
