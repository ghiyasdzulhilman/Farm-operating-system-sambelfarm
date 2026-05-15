import { useEffect, useState } from "react";
import { UserButton } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database,
  FlaskConical,
  Leaf,
  Loader2,
  RefreshCcw,
  ServerCog,
  Users2,
  Workflow,
  ChevronRight,
  ChevronDown,
  X,
  Plus
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  getGetFieldMappingsQueryKey,
  getGetNotionConnectionStatusQueryKey,
  getInspectDatabaseQueryKey,
  getListDatabasesQueryKey,
  useGetFieldMappings,
  useGetNotionConnectionStatus,
  useInspectDatabase,
  useListDatabases,
  useSaveFieldMappings,
} from "@workspace/api-client-react";
import type { FieldMappingEntry, SaveFieldMappingsBody } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// 📂 1. ARCHITECTURE & DICTIONARY
// ---------------------------------------------------------------------------
type DomainType = "finance" | "agronomy" | "lab" | "resource";

const ALIASES: Record<string, string[]> = {
  qty: ["qty", "jumlah", "berat", "quantity", "kg"],
  harga: ["harga", "price", "rp", "jual", "satuan"],
  tanggal: ["tanggal", "date", "waktu", "hari", "created"],
  kategori: ["kategori", "category", "jenis"],
  area: ["area", "blok", "lahan", "pindah tanam"],
  kegiatan: ["kegiatan", "judul", "nama", "task", "operasional", "treatment", "inspeksi"],
  hama: ["hama", "serangga", "kutu", "ulat"],
  penyakit: ["penyakit", "jamur", "virus", "bakteri", "bercak"],
};

const DOMAINS: any[] = [
  {
    id: "finance",
    label: "Finance & Ops",
    icon: ServerCog,
    description: "Laba rugi, harvest revenue, & expense tracking",
    schemas: [
      { id: "laba_rugi", label: "Laba Rugi & Unit Economics", hint: "Rekap keuangan per area", fields: [
        { key: "area", label: "Nama Area/Blok", expectedType: "title", aliases: ALIASES.area },
        { key: "modalAwal", label: "Modal Awal", expectedType: "number" },
        { key: "pendapatan", label: "Total Pendapatan", expectedType: "rollup|formula|number" },
        { key: "pengeluaran", label: "Total Pengeluaran", expectedType: "rollup|formula|number" },
      ]},
      { id: "panen", label: "Data Pemanenan", hint: "Pencatatan sesi panen kebun", fields: [
        { key: "kegiatan", label: "Kegiatan / Judul", expectedType: "title", aliases: ALIASES.kegiatan },
        { key: "tanggal", label: "Tanggal", expectedType: "date|created_time", aliases: ALIASES.tanggal },
        { key: "jumlahPanen", label: "Jumlah Panen (kg)", expectedType: "number", aliases: ALIASES.qty },
        { key: "hargaJualPerKg", label: "Harga Jual per Kg", expectedType: "number", aliases: ALIASES.harga },
        { key: "labaRugi", label: "Area Laba Rugi", expectedType: "relation", aliases: ALIASES.area },
      ]},
      { id: "expenses", label: "Pengeluaran Operasional", hint: "Biaya input, pupuk, gaji", fields: [
        { key: "pengeluaran", label: "Nama Pengeluaran", expectedType: "title" },
        { key: "date", label: "Tanggal", expectedType: "date|created_time", aliases: ALIASES.tanggal },
        { key: "qty", label: "Qty / Jumlah", expectedType: "number", aliases: ALIASES.qty },
        { key: "hargaPerPcs", label: "Harga per pcs", expectedType: "number", aliases: ALIASES.harga },
        { key: "kategori", label: "Kategori", expectedType: "relation", aliases: ALIASES.kategori },
        { key: "labaRugi", label: "Area Laba Rugi", expectedType: "relation", aliases: ALIASES.area },
      ]},
    ]
  },
  {
    id: "agronomy",
    label: "Agronomy & Ops",
    icon: Leaf,
    description: "Perawatan, inspeksi, dan kegiatan umum",
    schemas: [
      { id: "pindah_tanam", label: "Pindah Tanam (Anchor)", hint: "Master data waktu tanam untuk rumus HST", fields: [
        { key: "area", label: "Area/Blok", expectedType: "title", aliases: ALIASES.area },
        { key: "waktu_tanam", label: "Waktu Tanam", expectedType: "date", aliases: ALIASES.tanggal },
      ]},
      { id: "treatment", label: "Riwayat Perawatan (Multi-Blok)", hint: "Mapping 1x, terapkan ke banyak blok", isMultiInstance: true, fields: [
        { key: "kegiatan", label: "Kegiatan", expectedType: "title", aliases: ALIASES.kegiatan },
        { key: "tanggal", label: "Tanggal", expectedType: "date", aliases: ALIASES.tanggal },
        { key: "hst", label: "HST", expectedType: "formula|rollup|number" },
        { key: "status", label: "Status", expectedType: "status|select" },
        { key: "petugas", label: "Petugas Lapangan", expectedType: "relation" },
        { key: "area", label: "Area Pindah Tanam", expectedType: "relation", aliases: ALIASES.area },
      ]},
      { id: "inspeksi", label: "Inspeksi Rutin Mingguan", hint: "Pencatatan hama dan penyakit", fields: [
        { key: "kegiatan", label: "Kegiatan", expectedType: "title", aliases: ALIASES.kegiatan },
        { key: "tanggal", label: "Tanggal", expectedType: "date|created_time", aliases: ALIASES.tanggal },
        { key: "hama", label: "Hama", expectedType: "multi_select", aliases: ALIASES.hama },
        { key: "penyakit", label: "Penyakit", expectedType: "multi_select", aliases: ALIASES.penyakit },
        { key: "area", label: "Area", expectedType: "relation", aliases: ALIASES.area },
      ]},
      { id: "operasional", label: "Kegiatan Operasional Umum", hint: "Task perbaikan, babat rumput, dll", fields: [
        { key: "kegiatan", label: "Task", expectedType: "title", aliases: ALIASES.kegiatan },
        { key: "tanggal", label: "Tanggal", expectedType: "date", aliases: ALIASES.tanggal },
        { key: "keterangan", label: "Catatan", expectedType: "rich_text" },
        { key: "pic", label: "Penanggung Jawab", expectedType: "relation|people" },
      ]},
    ]
  },
  { id: "lab", label: "Lab & Tools", icon: FlaskConical, description: "Kalkulator nutrisi & pupuk", schemas: [] },
  { id: "resource", label: "Resources", icon: Users2, description: "Manajemen data pekerja", schemas: [] },
];

const glassCard = "rounded-[1.75rem] border border-white/60 bg-white/70 shadow-[0_8px_32px_rgba(15,23,42,0.05)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05]";

// ---------------------------------------------------------------------------
// 🚀 2. MAIN PAGE COMPONENT
// ---------------------------------------------------------------------------
export function SettingsPage() {
  const [activeDomain, setActiveDomain] = useState<DomainType>("agronomy");
  const [expandedSchema, setExpandedSchema] = useState<string | null>(null);

  const { data: dbList, isFetching: isRefreshing, refetch: refresh } = useListDatabases({ query: { queryKey: getListDatabasesQueryKey() } });
  useGetNotionConnectionStatus({ query: { queryKey: getGetNotionConnectionStatusQueryKey() } });

  const allDbs = dbList?.databases ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">System Center</h1>
          <p className="text-muted-foreground">Premium Smart Farming ERP Configuration</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/50 p-2 backdrop-blur dark:bg-slate-950/50">
          <Button variant="ghost" size="icon" onClick={() => void refresh()} disabled={isRefreshing} className="rounded-xl">
            <RefreshCcw className={cn("h-4 w-4 text-emerald-600", isRefreshing && "animate-spin")} />
          </Button>
          <div className="h-8 w-px bg-border" />
          <UserButton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        
        {/* SIDEBAR */}
        <aside className="space-y-2">
          {DOMAINS.map((domain) => {
            const Icon = domain.icon;
            const isActive = activeDomain === domain.id;
            return (
              <button key={domain.id} onClick={() => { setActiveDomain(domain.id); setExpandedSchema(null); }}
                className={cn("group flex w-full items-center gap-3 rounded-2xl p-4 transition-all duration-300", 
                  isActive ? "bg-slate-950 text-white shadow-xl dark:bg-white dark:text-slate-950" : "hover:bg-white/60 dark:hover:bg-white/5")}>
                <div className={cn("rounded-xl p-2 transition-colors", isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800")}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black">{domain.label}</p>
                  <p className={cn("text-[10px] opacity-60", isActive ? "text-white" : "text-muted-foreground")}>{domain.schemas.length} Schemas</p>
                </div>
                {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
              </button>
            );
          })}
        </aside>

        {/* MAIN CONTENT */}
        <main className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div key={activeDomain} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-4">
              {DOMAINS.find(d => d.id === activeDomain)?.schemas.map((schema: any) => (
                <SchemaControlCard 
                  key={schema.id} 
                  schema={schema} 
                  allDatabases={allDbs}
                  isExpanded={expandedSchema === schema.id}
                  onToggle={() => setExpandedSchema(expandedSchema === schema.id ? null : schema.id)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 📦 3. SCHEMA CONTROL CARD
// ---------------------------------------------------------------------------
function SchemaControlCard({ schema, allDatabases, isExpanded, onToggle }: any) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync: saveFieldMappings, isPending: isSaving } = useSaveFieldMappings();

  const [linkedIds, setLinkedIds] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  const masterId = linkedIds[0] || "";

  // 1. Fetching Initial Data
  const { data: savedData } = useGetFieldMappings({ type: schema.id }, { query: { queryKey: getGetFieldMappingsQueryKey({ type: schema.id }) } });

  useEffect(() => {
    if (savedData) {
      if (savedData.notionDatabaseId && !linkedIds.includes(savedData.notionDatabaseId)) {
        setLinkedIds([savedData.notionDatabaseId]);
      }
      const mapped: Record<string, string> = {};
      Object.entries(savedData.mappings ?? {}).forEach(([k, v]: any) => { if (v?.propertyId) mapped[k] = v.propertyId; });
      setFieldMappings(mapped);
    }
  }, [savedData]);

  // 2. Inspection (Fetch Columns)
  const { data: inspected, isFetching: isInspecting, refetch: inspect } = useInspectDatabase(
    { type: schema.id, databaseId: masterId || undefined },
    { query: { enabled: false, queryKey: getInspectDatabaseQueryKey({ type: schema.id, databaseId: masterId }) } }
  );
  const props = inspected?.properties ?? [];

  // 3. Logic: Remove DB Instance
  const handleRemoveDb = (id: string) => {
    setLinkedIds(prev => prev.filter(x => x !== id));
    if (linkedIds.length <= 1) setFieldMappings({}); 
  };

  // 4. Logic: Auto Map (Fuzzy Matching)
  const handleAutoMap = () => {
    if (!props.length) return toast({ variant: "destructive", title: "Kolom Kosong", description: "Klik Load dulu bro." });
    const nextMap: Record<string, string> = { ...fieldMappings };
    let count = 0;
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

    schema.fields.forEach((field: any) => {
      const targetWords = [normalize(field.label), ...(field.aliases || [])];
      const match = props.find((p: any) => {
        const propName = normalize(p.name);
        const isTypeMatch = field.expectedType.split("|").includes(p.type) || (field.expectedType.includes("number") && ["formula", "rollup"].includes(p.type));
        if (!isTypeMatch) return false;
        return targetWords.some(word => propName.includes(word) || word.includes(propName));
      });
      if (match) { nextMap[field.key] = match.id; count++; }
    });

    setFieldMappings(nextMap);
    toast({ title: "Auto Map Selesai", description: `${count} kolom berhasil dicocokkan.` });
  };

  // 5. Logic: Save
  const handleSave = async () => {
    if (!linkedIds.length) return toast({ variant: "destructive", title: "DB Belum Dipilih", description: "Pilih minimal 1 database." });

    const mappingsToSave: Record<string, FieldMappingEntry> = {};
    schema.fields.forEach((f: any) => {
      const p = props.find((p: any) => p.id === fieldMappings[f.key]);
      if (p) mappingsToSave[f.key] = { propertyId: p.id, propertyName: p.name, relatedDatabaseId: p.relatedDatabaseId ?? null };
    });

    try {
      await Promise.all(linkedIds.map((id, idx) => saveFieldMappings({
        data: {
          databaseType: schema.isMultiInstance ? `${schema.id}_${idx}` : schema.id,
          notionDatabaseId: id,
          mappings: mappingsToSave as SaveFieldMappingsBody["mappings"],
        }
      })));
      toast({ title: "Schema Saved", description: `Berhasil disimpan ke ${linkedIds.length} database.` });
      queryClient.invalidateQueries({ queryKey: getGetFieldMappingsQueryKey({ type: schema.id }) });
      onToggle(); 
    } catch (e) { toast({ variant: "destructive", title: "Gagal Simpan", description: "Terjadi kesalahan sistem." }); }
  };

  return (
    <Card className={cn(glassCard, "relative overflow-hidden transition-all duration-300", isExpanded && "ring-2 ring-emerald-500/40")}>
      
      {/* BAGIAN ATAS (DB SELECTOR & PILLS) */}
      <div className="p-4 sm:p-5 sm:pb-3">
        <div className="flex flex-col gap-4">
          
          {/* Baris 1: Ikon + Judul + Tombol Link DB */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-4 min-w-0">
              <div className={cn("shrink-0 rounded-2xl p-3 text-emerald-600 transition-colors", isExpanded ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-slate-100 dark:bg-slate-800")}>
                {schema.isMultiInstance ? <Workflow className="h-5 w-5" /> : <Database className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black truncate sm:text-lg">{schema.label}</h3>
                <p className="text-xs text-muted-foreground truncate">{schema.hint}</p>
              </div>
            </div>

            <div className="flex shrink-0 w-full sm:w-auto">
              {(!schema.isMultiInstance && linkedIds.length > 0) ? null : (
                <Select onValueChange={(val) => {
                  if (!linkedIds.includes(val)) setLinkedIds(prev => schema.isMultiInstance ? [...prev, val] : [val]);
                }}>
                  <SelectTrigger className="h-11 w-full flex-1 rounded-full border-white/60 bg-white/50 font-bold shadow-sm backdrop-blur dark:bg-slate-900/50 sm:w-[160px]">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400"><Plus className="h-4 w-4"/> Link DB</div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {allDatabases.map(db => <SelectItem key={db.id} value={db.id}>{db.iconEmoji} {db.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Baris 2: Pills (Full width, Centered 100%) */}
          <div className="flex w-full flex-wrap items-center justify-center gap-2 min-h-[30px]">
            <AnimatePresence mode="popLayout">
              {linkedIds.map(id => (
                <motion.div key={id} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <span className="truncate max-w-[140px] text-[11px] font-semibold">
                      {allDatabases.find(d => d.id === id)?.iconEmoji} {allDatabases.find(d => d.id === id)?.name || id}
                    </span>
                    <X className="h-3.5 w-3.5 cursor-pointer opacity-50 transition-colors hover:opacity-100 hover:text-red-500" onClick={() => handleRemoveDb(id)} />
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
            {linkedIds.length === 0 && <span className="text-[11px] text-muted-foreground opacity-60">Belum ada database terpilih</span>}
          </div>

        </div>
      </div>

      {/* PULL-TAB BUTTON */}
      <div className="relative z-10 -mt-2 mb-2 flex w-full justify-center">
        <button
          onClick={onToggle}
          className="flex h-5 w-14 items-center justify-center rounded-b-xl border border-t-0 border-white/60 bg-white/50 shadow-[0_4px_10px_rgba(0,0,0,0.03)] backdrop-blur-md transition-colors hover:bg-white dark:border-white/10 dark:bg-slate-900/50 dark:hover:bg-slate-800"
          aria-label="Toggle mapping config"
        >
          <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform duration-300", isExpanded && "rotate-180")} />
        </button>
      </div>

      {/* BAGIAN BAWAH (COLLAPSIBLE MAPPING) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <div className="border-t border-dashed border-slate-200 pt-5 dark:border-slate-800">
                
                {/* RATA TENGAH: 3 Tombol Aksi - Warna hijau selaras dengan Pills */}
                <div className="mb-6 flex flex-col items-center justify-center gap-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mapping Controls</h4>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button size="sm" onClick={() => inspect()} disabled={isInspecting || !masterId} 
                      className="h-8 rounded-full px-5 text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-800/80">
                      {isInspecting ? "Loading..." : "Load"}
                    </Button>
                    <Button size="sm" onClick={handleAutoMap} disabled={!props.length} 
                      className="h-8 rounded-full px-5 text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-800/80">
                      Auto map
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving} 
                      className="h-8 rounded-full px-6 text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 shadow-sm transition-colors dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-800/80">
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3">
                  {schema.fields.map((field: any) => {
                    const isMapped = !!fieldMappings[field.key];
                    const pType = field.expectedType.split('|')[0];
                    return (
                      <div key={field.key} className={cn("flex flex-col gap-3 rounded-[1.15rem] border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between", isMapped ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30" : "bg-slate-50/50 border-transparent dark:bg-slate-900/40")}>
                        
                        <div className="flex flex-1 items-center gap-3 min-w-0">
                           <Badge variant="outline" className="rounded-full bg-white text-[10px] font-black uppercase dark:bg-slate-950">{pType}</Badge>
                           <div className="min-w-0 flex-1">
                             <p className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-white">{field.label}</p>
                           </div>
                        </div>

                        <Select value={fieldMappings[field.key] || ""} onValueChange={(val) => setFieldMappings(prev => ({...prev, [field.key]: val}))} disabled={!props.length}>
                          <SelectTrigger className="h-10 w-full shrink-0 rounded-xl bg-white/80 text-xs font-semibold shadow-sm dark:bg-slate-950/80 sm:w-[240px]">
                            <SelectValue placeholder="Pilih kolom..." className="truncate" />
                          </SelectTrigger>
                          <SelectContent>
                            {props.length === 0 && <div className="p-2 text-center text-xs text-muted-foreground">Load cols dulu</div>}
                            {props.map((p: any) => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                <span className="font-medium">{p.name}</span> <span className="ml-1 opacity-50">({p.type})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </Card>
  );
}
