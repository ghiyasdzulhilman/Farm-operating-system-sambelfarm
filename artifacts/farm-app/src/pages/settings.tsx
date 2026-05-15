import { useEffect, useMemo, useState, useCallback } from "react";
import { UserButton, useUser } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Database,
  FlaskConical,
  Leaf,
  Loader2,
  RefreshCcw,
  Save,
  ServerCog,
  Settings,
  Sparkles,
  Users2,
  Workflow,
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
import type { DatabaseProperty, FieldMappingEntry, SaveFieldMappingsBody } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// 📂 DOMAIN & SCHEMA DEFINITIONS (The Scaleable Architecture)
// ---------------------------------------------------------------------------
type DomainType = "finance" | "agronomy" | "lab" | "resource";

interface RequiredField {
  key: string;
  label: string;
  expectedType: string;
  description: string;
  aliases?: string[]; // Buat Fuzzy Matching
}

interface SchemaConfig {
  id: string; // Identifier unik schema
  label: string;
  hint: string;
  dbTypes: string[]; // Bisa 1 (Laba Rugi) atau banyak (Blok A, B, C, GH)
  fields: RequiredField[];
}

interface DomainConfig {
  id: DomainType;
  label: string;
  icon: any;
  description: string;
  schemas: SchemaConfig[];
}

// Data Kamus untuk Smart Map
const ALIASES = {
  qty: ["qty", "jumlah", "berat", "quantity"],
  harga: ["harga", "price", "rp", "jual"],
  tanggal: ["tanggal", "date", "waktu", "hari"],
  kategori: ["kategori", "category", "jenis"],
  area: ["area", "blok", "lahan"],
};

const DOMAINS: DomainConfig[] = [
  {
    id: "finance",
    label: "Finance & Ops",
    icon: ServerCog,
    description: "Laba rugi, harvest revenue, & expense tracking",
    schemas: [
      {
        id: "schema_finance",
        label: "Laba Rugi & Unit Economics",
        hint: "Rekap keuangan per area",
        dbTypes: ["laba_rugi"],
        fields: [
          { key: "area", label: "Nama Area/Blok", expectedType: "title", description: "Blok A, B, dll", aliases: ALIASES.area },
          { key: "modalAwal", label: "Modal Awal", expectedType: "number", description: "Investasi awal" },
          { key: "pendapatan", label: "Total Pendapatan", expectedType: "rollup|formula|number", description: "Rollup dari Panen" },
          { key: "pengeluaran", label: "Total Pengeluaran", expectedType: "rollup|formula|number", description: "Rollup dari Expenses" },
        ],
      },
      {
        id: "schema_harvest",
        label: "Data Pemanenan",
        hint: "Pencatatan sesi panen kebun",
        dbTypes: ["panen"],
        fields: [
          { key: "kegiatan", label: "Kegiatan / Judul", expectedType: "title", description: "Nama sesi" },
          { key: "tanggal", label: "Tanggal", expectedType: "date|created_time", description: "Waktu panen", aliases: ALIASES.tanggal },
          { key: "jumlahPanen", label: "Jumlah Panen (kg)", expectedType: "number", description: "Berat", aliases: ALIASES.qty },
          { key: "hargaJualPerKg", label: "Harga Jual per Kg", expectedType: "number", description: "Harga IDR", aliases: ALIASES.harga },
          { key: "labaRugi", label: "Area Laba Rugi", expectedType: "relation", description: "Relasi Finance" },
        ],
      },
      {
        id: "schema_expense",
        label: "Pengeluaran Operasional",
        hint: "Biaya input, pupuk, gaji",
        dbTypes: ["expenses"],
        fields: [
          { key: "pengeluaran", label: "Nama Pengeluaran", expectedType: "title", description: "Item dibeli" },
          { key: "date", label: "Tanggal", expectedType: "date|created_time", description: "Waktu transaksi", aliases: ALIASES.tanggal },
          { key: "qty", label: "Qty / Jumlah", expectedType: "number", description: "Jumlah unit", aliases: ALIASES.qty },
          { key: "hargaPerPcs", label: "Harga per pcs", expectedType: "number", description: "Harga satuan", aliases: ALIASES.harga },
          { key: "kategori", label: "Kategori", expectedType: "relation", description: "Relasi master kategori", aliases: ALIASES.kategori },
          { key: "labaRugi", label: "Area Laba Rugi", expectedType: "relation", description: "Relasi Finance" },
        ],
      },
    ],
  },
  {
    id: "agronomy",
    label: "Agronomy",
    icon: Leaf,
    description: "Pindah tanam, treatment blok, & inspeksi",
    schemas: [
      {
        id: "schema_treatment",
        label: "Riwayat Perawatan (Master Schema)",
        hint: "Mapping ini akan diterapkan ke Blok A, B, C, & GH",
        dbTypes: ["blok_a", "blok_b", "blok_c", "greenhouse"], // THE 4-BLOCK INHERITANCE!
        fields: [
          { key: "kegiatan", label: "Kegiatan", expectedType: "title", description: "Contoh: Penyemprotan" },
          { key: "tanggal", label: "Date", expectedType: "date", description: "Waktu pelaksanaan", aliases: ALIASES.tanggal },
          { key: "status", label: "Status", expectedType: "status|select", description: "Progres tugas" },
          { key: "petugas", label: "Petugas Lapangan", expectedType: "relation", description: "Relasi pekerja" },
          { key: "area", label: "Area Pindah Tanam", expectedType: "relation", description: "Anchor HST" },
        ],
      },
    ],
  },
  {
    id: "lab",
    label: "Lab & Tools",
    icon: FlaskConical,
    description: "Kalkulator nutrisi & master data pupuk",
    schemas: [], // Kosongin dulu buat next feature
  },
  {
    id: "resource",
    label: "Resources",
    icon: Users2,
    description: "Manajemen data pekerja & petugas",
    schemas: [], // Kosongin dulu buat next feature
  },
];

// ---------------------------------------------------------------------------
// 🎨 UI COMPONENTS
// ---------------------------------------------------------------------------
const glassCard = "rounded-[1.75rem] border border-white/60 bg-white/70 shadow-[0_8px_32px_rgba(15,23,42,0.05)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.05]";

function TypeBadge({ type }: { type: string }) {
  const primaryType = type.split("|")[0];
  const colors: Record<string, string> = {
    title: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    number: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    relation: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    date: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    rollup: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    status: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
  return <Badge variant="outline" className={cn("rounded-full border-none px-2 py-0.5 text-[10px] font-black uppercase tracking-wider", colors[primaryType] || "bg-slate-100")}>{primaryType}</Badge>;
}

// ---------------------------------------------------------------------------
// 🚀 MAIN SETTINGS PAGE
// ---------------------------------------------------------------------------
export function SettingsPage() {
  const { user } = useUser();
  const [activeDomain, setActiveDomain] = useState<DomainType>("finance");
  const [expandedMapping, setExpandedMapping] = useState<string | null>(null);

  const { data: databaseList, isFetching: isRefreshingDatabases, refetch: refreshDatabases } = useListDatabases({ query: { queryKey: getListDatabasesQueryKey() } });
  const allDatabases = databaseList?.databases ?? [];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">System Center</h1>
          <p className="text-muted-foreground">Manage your SambelFarm relational infrastructure.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/50 p-2 backdrop-blur dark:bg-slate-950/50">
          <Button variant="ghost" size="icon" onClick={() => void refreshDatabases()} disabled={isRefreshingDatabases} className="rounded-xl">
            <RefreshCcw className={cn("h-4 w-4 text-emerald-600", isRefreshingDatabases && "animate-spin")} />
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
              <button
                key={domain.id}
                onClick={() => {
                  setActiveDomain(domain.id);
                  setExpandedMapping(null); // Tutup mapping pas pindah tab
                }}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-2xl p-4 transition-all duration-300",
                  isActive ? "bg-slate-950 text-white shadow-xl shadow-slate-200 dark:bg-white dark:text-slate-950 dark:shadow-none" : "hover:bg-white/60 dark:hover:bg-white/5"
                )}
              >
                <div className={cn("rounded-xl p-2 transition-colors", isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800")}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black">{domain.label}</p>
                  <p className={cn("text-[10px] opacity-60", isActive ? "text-white" : "text-muted-foreground")}>{domain.schemas.length} Schemas</p>
                </div>
                {isActive && <motion.div layoutId="active-pill" className="ml-auto"><ChevronRight className="h-4 w-4" /></motion.div>}
              </button>
            );
          })}
        </aside>

        {/* MAIN CONTENT */}
        <main className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeDomain}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="rounded-[2rem] bg-emerald-500/10 p-6 dark:bg-emerald-500/5">
                <h2 className="text-xl font-black text-emerald-800 dark:text-emerald-400">
                  {DOMAINS.find(d => d.id === activeDomain)?.label}
                </h2>
                <p className="text-sm text-emerald-700/70 dark:text-emerald-400/60">
                  {DOMAINS.find(d => d.id === activeDomain)?.description}
                </p>
              </div>

              {/* RENDER SCHEMAS */}
              <div className="grid gap-4">
                {DOMAINS.find(d => d.id === activeDomain)?.schemas.map((schema) => (
                  <SchemaControlCard 
                    key={schema.id} 
                    schema={schema} 
                    allDatabases={allDatabases}
                    isExpanded={expandedMapping === schema.id}
                    onToggleExpand={() => setExpandedMapping(expandedMapping === schema.id ? null : schema.id)}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 📦 THE BRAIN: Schema Control Card (Atomic Save + Auto Map)
// ---------------------------------------------------------------------------
function SchemaControlCard({ schema, allDatabases, isExpanded, onToggleExpand }: { schema: SchemaConfig, allDatabases: any[], isExpanded: boolean, onToggleExpand: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync: saveFieldMappings, isPending: isSaving } = useSaveFieldMappings();

  // State Lokal buat 1 Schema ini
  const [dbLinks, setDbLinks] = useState<Record<string, string>>({});
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  // Fetch Saved Data untuk tipe DB pertama (karena mappingnya identik buat multi-instance)
  const primaryDbType = schema.dbTypes[0];
  const { data: savedData } = useGetFieldMappings(
    { type: primaryDbType }, 
    { query: { queryKey: getGetFieldMappingsQueryKey({ type: primaryDbType }) } }
  );

  // Sync state dari API (Anti-hacky initDone)
  useEffect(() => {
    if (savedData) {
      setDbLinks((prev) => ({ ...prev, [primaryDbType]: savedData.notionDatabaseId ?? "" }));
      
      const mapped: Record<string, string> = {};
      for (const [key, entry] of Object.entries(savedData.mappings ?? {})) {
        if (entry?.propertyId) mapped[key] = entry.propertyId;
      }
      setFieldMappings(mapped);
    }
  }, [savedData, primaryDbType]);

  // Inspect Database Notion (Narik Properties)
  const databaseIdToInspect = dbLinks[primaryDbType];
  const { data: inspectedDb, isFetching: isInspecting, refetch: inspectDatabase } = useInspectDatabase(
    { type: primaryDbType, databaseId: databaseIdToInspect || undefined },
    { query: { enabled: false, queryKey: getInspectDatabaseQueryKey({ type: primaryDbType, databaseId: databaseIdToInspect }) } }
  );

  const properties = inspectedDb?.properties ?? [];

  // Logic: Fuzzy Smart Map
  const handleAutoMap = () => {
    if (!properties.length) {
      toast({ variant: "destructive", title: "Kolom Kosong", description: "Klik Refresh di samping dulu buat narik kolom dari Notion." });
      return;
    }

    const nextMap: Record<string, string> = { ...fieldMappings };
    let mappedCount = 0;

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

    schema.fields.forEach((field) => {
      const targetWords = [normalize(field.label), ...(field.aliases || [])];
      
      const match = properties.find(prop => {
        const propName = normalize(prop.name);
        // Validasi tipe dulu (Rollup / Formula bisa masuk ke Number)
        const isTypeMatch = field.expectedType.split("|").includes(prop.type) || 
                            (field.expectedType.includes("number") && ["formula", "rollup"].includes(prop.type));
        
        if (!isTypeMatch) return false;
        // Cek nama / alias
        return targetWords.some(word => propName.includes(word) || word.includes(propName));
      });

      if (match) {
        nextMap[field.key] = match.id;
        mappedCount++;
      }
    });

    setFieldMappings(nextMap);
    toast({ title: "Smart Map Berhasil", description: `${mappedCount} kolom tercocokkan otomatis.` });
  };

  // Logic: Atomic Save (Simpan Link + Mapping sekaligus)
  const handleAtomicSave = async () => {
    // Validasi
    if (!dbLinks[primaryDbType]) {
      toast({ variant: "destructive", title: "Missing Database", description: "Pilih database Notion-nya dulu bro!" });
      return;
    }

    const mappingsToSave: Record<string, FieldMappingEntry> = {};
    for (const field of schema.fields) {
      const propId = fieldMappings[field.key];
      const prop = properties.find(p => p.id === propId);
      if (prop) {
        mappingsToSave[field.key] = { propertyId: prop.id, propertyName: prop.name, relatedDatabaseId: prop.relatedDatabaseId ?? null };
      }
    }

    try {
      // THE 4-BLOCK FIX: Loop melalui semua tipe DB di schema ini (Bisa 1, bisa 4)
      await Promise.all(
        schema.dbTypes.map(dbType => 
          saveFieldMappings({
            data: {
              databaseType: dbType,
              notionDatabaseId: dbLinks[dbType] || dbLinks[primaryDbType], // Fallback ke primary kalau multi
              mappings: mappingsToSave as SaveFieldMappingsBody["mappings"],
            }
          })
        )
      );

      toast({ title: "Schema Saved", description: `${schema.label} tersimpan & ter-link dengan aman.` });
      // Invalidate semua query cache yang berkaitan
      schema.dbTypes.forEach(dbType => queryClient.invalidateQueries({ queryKey: getGetFieldMappingsQueryKey({ type: dbType }) }));
      onToggleExpand(); // Auto close setelah save
    } catch (error) {
      toast({ variant: "destructive", title: "Save Failed", description: "Gagal menyimpan ke server." });
    }
  };

  return (
    <Card className={cn(glassCard, "transition-all duration-300", isExpanded && "ring-2 ring-emerald-500/50 dark:ring-emerald-400/50")}>
      <CardContent className="p-4 sm:p-5">
        
        {/* ROW 1: Control & Link */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={cn("rounded-2xl p-3 text-emerald-600 transition-colors dark:text-emerald-400", isExpanded ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-slate-100 dark:bg-slate-800")}>
              {schema.dbTypes.length > 1 ? <Workflow className="h-5 w-5" /> : <Database className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black tracking-tight sm:text-lg truncate">{schema.label}</h3>
              <p className="text-xs text-muted-foreground truncate">{schema.hint}</p>
            </div>
          </div>

          {/* Database Selector */}
          <div className="flex w-full items-center gap-2 sm:w-auto sm:max-w-xs">
            <Select value={dbLinks[primaryDbType] || ""} onValueChange={(val) => setDbLinks(prev => ({...prev, [primaryDbType]: val}))}>
              <SelectTrigger className="h-11 w-full flex-1 rounded-full border-white/60 bg-white/50 px-4 font-bold shadow-sm backdrop-blur dark:bg-slate-900/50">
                <SelectValue placeholder="Pilih Notion DB..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {allDatabases.map(db => (
                  <SelectItem key={db.id} value={db.id}>{db.iconEmoji} {db.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onToggleExpand}
              className={cn("h-11 w-11 shrink-0 rounded-full transition-all", isExpanded && "rotate-180 bg-slate-950 text-white dark:bg-white dark:text-slate-950")}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ROW 2: Collapsible Mapping Property */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden" // FIX OFFSIDE: Tetap hidden saat animasi, tapi konten di dalamnya aman
            >
              <div className="mt-5 border-t border-dashed border-slate-200 pt-5 dark:border-slate-800">
                
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h4 className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Schema Mapping</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => inspectDatabase()} disabled={isInspecting || !dbLinks[primaryDbType]} className="h-8 rounded-full text-[11px] font-bold">
                      <RefreshCcw className={cn("mr-1.5 h-3 w-3", isInspecting && "animate-spin")} /> Load Notion Cols
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleAutoMap} disabled={!properties.length} className="h-8 rounded-full text-[11px] font-bold">
                      <Sparkles className="mr-1.5 h-3 w-3 text-amber-500" /> Smart Map
                    </Button>
                    <Button size="sm" onClick={handleAtomicSave} disabled={isSaving} className="h-8 rounded-full bg-emerald-600 px-4 text-[11px] font-bold text-white hover:bg-emerald-700">
                      {isSaving ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Save className="mr-1.5 h-3 w-3" />}
                      Atomic Save
                    </Button>
                  </div>
                </div>

                {/* THE MAPPING ROWS - FIXED RESPONSIVE */}
                <div className="grid gap-2.5">
                  {schema.fields.map(field => {
                    const isMapped = !!fieldMappings[field.key];
                    return (
                      <div key={field.key} className={cn("flex flex-col gap-3 rounded-[1.15rem] p-3 sm:flex-row sm:items-center sm:justify-between border", isMapped ? "bg-emerald-50/30 border-emerald-100 dark:bg-emerald-950/10 dark:border-emerald-900/30" : "bg-slate-50/50 border-transparent dark:bg-slate-900/40")}>
                        
                        {/* Info Kiri - Min-w-0 penting biar teks bisa truncate */}
                        <div className="flex items-center gap-3 min-w-0">
                           <TypeBadge type={field.expectedType} />
                           <div className="min-w-0">
                             <p className="text-sm font-bold truncate tracking-tight">{field.label}</p>
                             <p className="text-[10px] text-muted-foreground truncate">{field.description}</p>
                           </div>
                        </div>

                        {/* Select Kanan - w-full di HP, fix width di desktop */}
                        <Select 
                          value={fieldMappings[field.key] || ""} 
                          onValueChange={(val) => setFieldMappings(prev => ({...prev, [field.key]: val}))}
                          disabled={!properties.length}
                        >
                          <SelectTrigger className="h-9 w-full shrink-0 rounded-xl bg-white text-xs font-semibold shadow-sm dark:bg-slate-950 sm:w-[200px]">
                            <SelectValue placeholder="Pilih kolom..." className="truncate" />
                          </SelectTrigger>
                          <SelectContent>
                            {properties.length === 0 && <div className="p-2 text-xs text-center">Load cols dulu</div>}
                            {properties.map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-xs">
                                {p.name} <span className="text-muted-foreground ml-1">({p.type})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                      </div>
                    );
                  })}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </CardContent>
    </Card>
  );
}
