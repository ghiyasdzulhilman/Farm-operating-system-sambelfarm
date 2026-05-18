import { useGetDropdownOptions, getGetDropdownOptionsQueryKey } from "@workspace/api-client-react";
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
  Users,
  Workflow,
  ChevronRight,
  ChevronDown,
  X,
  Plus,
  Sun,
  Moon,
  Palette,
  Check,
  Pipette
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

// ✨ KAMUS YANG DIPERLUAS
const ALIASES: Record<string, string[]> = {
  qty: ["qty", "jumlah", "berat", "quantity", "kg"],
  harga: ["harga", "price", "rp", "jual", "satuan"],
  kualitas: ["kualitas", "grade", "mutu"],
  channel: ["channel", "saluran", "tujuan", "pembeli", "penjualan"],
  tanggal: ["tanggal", "date", "waktu", "hari", "created", "pelaksanaan"],
  kategori: ["kategori", "category", "jenis"],
  area: ["area", "blok", "lahan", "pindah tanam", "target", "lokasi"],
  kegiatan: ["kegiatan", "judul", "nama", "task", "operasional", "treatment", "inspeksi", "perawatan", "tindakan"],
  hama: ["hama", "serangga", "kutu", "ulat"],
  penyakit: ["penyakit", "jamur", "virus", "bakteri", "bercak", "patogen"],
  tingkatSerangan: ["serangan", "persentase", "tingkat", "keparahan", "%"],
  radius: ["radius", "meter", "luasan", "jarak"],
  phTanah: ["ph", "asam", "basa", "keasaman"],
  tags: ["tags", "jenis", "tipe", "metode", "kategori", "label"],
  petugas: ["petugas", "pic", "penanggung", "pekerja", "person in charge", "eksekutor"],
  status: ["status", "progres", "state", "kondisi"],
  hst: ["hst", "hari setelah", "umur", "usia", "hari"],
};

// ✨ SKEMA YANG DISESUAIKAN DENGAN NOTION LU
const DOMAINS: any[] = [
  {
    id: "finance",
    label: "Finance & Ops",
    icon: ServerCog,
    description: "Laba rugi, harvest revenue, & expense tracking",
    schemas: [
      { id: "laba_rugi", label: "Laba Rugi & Unit Economics", hint: "Rekap keuangan kebun", fields: [
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
        { key: "kualitas", label: "Kualitas / Grade", expectedType: "select", aliases: ALIASES.kualitas },
        { key: "channelPenjualan", label: "Channel Penjualan", expectedType: "select", aliases: ALIASES.channel },
        { key: "areaPindahTanam", label: "Area Pindah Tanam", expectedType: "relation", aliases: ALIASES.area },
        { key: "labaRugi", label: "Area Laba Rugi", expectedType: "relation", aliases: ALIASES.area },
      ]},
      { id: "expenses", label: "Pengeluaran Operasional", hint: "Biaya Pupuk, pestisida, upah dll", fields: [
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
      { id: "pindah_tanam", label: "Pindah Tanam", hint: "Patokan hari pindah tanam", fields: [
        { key: "area", label: "Area/Blok", expectedType: "title", aliases: ALIASES.area },
        { key: "waktu_tanam", label: "Waktu Tanam", expectedType: "date", aliases: ALIASES.tanggal },
      ]},
            // ✨ KEMBALI KE MULTI-INSTANCE DEMI USER LAMA
      { 
        id: "perawatan", 
        label: "Riwayat Perawatan (Multi-Database)", 
        hint: "Hubungkan ke berbagai database blok milik user", 
        isMultiInstance: true, // 👈 Kita nyalain lagi fiturnya bro!
        fields: [
          { key: "kegiatan", label: "Nama Kegiatan", expectedType: "title", aliases: ALIASES.kegiatan },
          { key: "tanggal", label: "Tanggal Pelaksanaan", expectedType: "date|created_time", aliases: ALIASES.tanggal },
          { key: "areaId", label: "Target Area / Blok", expectedType: "relation", aliases: ALIASES.area },
          { key: "tags", label: "Jenis / Tags", expectedType: "select|multi_select", aliases: ALIASES.tags },
          { key: "petugasId", label: "Petugas Lapangan", expectedType: "relation", aliases: ALIASES.petugas },
          { key: "status", label: "Status Progress", expectedType: "status|select", aliases: ALIASES.status },
        ]
      },

      { id: "inspeksi", label: "Inspeksi & Kesehatan Tanaman", hint: "Pencatatan Hama Penyakit", fields: [
        { key: "kegiatan", label: "Judul Laporan", expectedType: "title", aliases: ALIASES.kegiatan },
        { key: "tanggal", label: "Tanggal", expectedType: "date|created_time", aliases: ALIASES.tanggal },
        { key: "areaId", label: "Area Terdampak", expectedType: "relation", aliases: ALIASES.area },
        { key: "hama", label: "Hama", expectedType: "multi_select", aliases: ALIASES.hama },
        { key: "penyakit", label: "Penyakit", expectedType: "multi_select", aliases: ALIASES.penyakit },
        { key: "tingkatSerangan", label: "% Serangan", expectedType: "number", aliases: ALIASES.tingkatSerangan },
        { key: "radius", label: "Radius (m)", expectedType: "number", aliases: ALIASES.radius },
        { key: "phTanah", label: "pH Tanah", expectedType: "number", aliases: ALIASES.phTanah },
        { key: "petugasId", label: "Petugas", expectedType: "relation", aliases: ALIASES.petugas },
      ]},
    ]
  },
  { id: "lab", label: "Lab & Tools", icon: FlaskConical, description: "Kalkulator nutrisi & pupuk", schemas: [] },
  { id: "resource", label: "Resources", icon: Users, description: "Manajemen data pekerja", schemas: [] },
];

const glassCard = "rounded-[1.75rem] border-border/50 bg-card text-card-foreground shadow-sm transition-all duration-300";

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
            <RefreshCcw className={cn("h-4 w-4 text-primary", isRefreshing && "animate-spin")} />
          </Button>
          <div className="h-8 w-px bg-border" />
          <UserButton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        
        {/* SIDEBAR CONTAINER */}
        <aside className="space-y-4">
          <div className="space-y-2">
            {DOMAINS.map((domain) => {
              const Icon = domain.icon;
              const isActive = activeDomain === domain.id;
              return (
                <button key={domain.id} onClick={() => { setActiveDomain(domain.id); setExpandedSchema(null); }}
                  className={cn("group flex w-full items-center gap-3 rounded-2xl p-4 transition-all duration-300", 
                    isActive ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-primary/5 text-muted-foreground")}>
                  <div className={cn("rounded-xl p-2 transition-colors", isActive ? "bg-primary-foreground/20 text-white" : "bg-muted text-muted-foreground")}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className={cn("text-sm font-black", isActive && "text-white")}>{domain.label}</p>
                    <p className={cn("text-[10px]", isActive ? "text-white/80" : "text-muted-foreground/60")}>{domain.schemas.length} Schemas</p>
                  </div>
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </button>
              );
            })}
          </div>

          <ColorControl />
        </aside>

        {/* MAIN CONTENT */}
        <main className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div key={activeDomain} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-3">
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
// 📦 3. SCHEMA CONTROL CARD (AREA-BASED ROUTING EDITION)
// ---------------------------------------------------------------------------
function SchemaControlCard({ schema, allDatabases, isExpanded, onToggle }: any) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync: saveFieldMappings, isPending: isSaving } = useSaveFieldMappings();

  // Load opsi area kebun langsung dari database induk
  const { data: dropdownOptions } = useGetDropdownOptions({
    query: { enabled: isExpanded && schema.id === "perawatan", queryKey: getGetDropdownOptionsQueryKey() },
  });
  const areas = dropdownOptions?.areas ?? [];

  const [areaDatabaseMap, setAreaDatabaseMap] = useState<Record<string, string>>({});
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  // Kita gunakan DB pertama yang dipilih sebagai master untuk membaca struktur kolom via Load
  const masterId = schema.id === "perawatan" 
    ? (Object.values(areaDatabaseMap)[0] || "") 
    : (areaDatabaseMap["single"] || "");

  // Ambil data mapping default untuk memunculkan kolom yang sudah tersimpan
  const fetchType = schema.id === "perawatan" && areas.length > 0 ? `perawatan_${areas[0].id}` : schema.id;
  const { data: savedData } = useGetFieldMappings(
    { type: fetchType as any }, 
    { query: { enabled: !!fetchType, queryKey: getGetFieldMappingsQueryKey({ type: fetchType as any }) } }
  );

  useEffect(() => {
    if (savedData) {
      if (!schema.id === "perawatan" && savedData.notionDatabaseId) {
        setAreaDatabaseMap({ single: savedData.notionDatabaseId });
      }
      const mapped: Record<string, string> = {};
      Object.entries(savedData.mappings ?? {}).forEach(([k, v]: any) => { if (v?.propertyId) mapped[k] = v.propertyId; });
      setFieldMappings(mapped);
    }
  }, [savedData, areas.length]);

  // Bypass aman: Pinjam rute 'panen' murni hanya untuk mengintip susunan kolom di Notion
  const inspectType = (schema.id === "perawatan" || schema.id === "inspeksi") ? "panen" : schema.id;
  const { data: inspected, isFetching: isInspecting, refetch: inspect } = useInspectDatabase(
    { type: inspectType, databaseId: masterId || "" },
    { query: { enabled: !!masterId, queryKey: getInspectDatabaseQueryKey({ type: inspectType, databaseId: masterId || "" }) } }
  );
  const props = inspected?.properties ?? [];

  const handleAutoMap = () => {
    if (!props.length) return toast({ variant: "destructive", title: "Kolom Kosong", description: "Klik tombol 'Load' dulu bro." });
    const nextMap: Record<string, string> = { ...fieldMappings };
    let count = 0;
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");

    schema.fields.forEach((field: any) => {
      const targetWords = [normalize(field.label), ...(field.aliases || [])];
      const match = props.find((p: any) => {
        const propName = normalize(p.name);
        return (field.expectedType.split("|").includes(p.type) || p.type === "date") &&
               targetWords.some(word => propName.includes(word) || word.includes(propName));
      });
      if (match) { nextMap[field.key] = match.id; count++; }
    });
    setFieldMappings(nextMap);
    toast({ title: "Auto Map Selesai", description: `${count} kolom cocok.` });
  };

  const handleSave = async () => {
    const mappingsToSave: Record<string, FieldMappingEntry> = {};
    schema.fields.forEach((f: any) => {
      const p = props.find((p: any) => p.id === fieldMappings[f.key]);
      if (p) mappingsToSave[f.key] = { propertyId: p.id, propertyName: p.name, relatedDatabaseId: p.relatedDatabaseId ?? null };
    });

    try {
      if (schema.id === "perawatan") {
        const activeLinks = Object.entries(areaDatabaseMap).filter(([_, dbId]) => !!dbId);
        if (!activeLinks.length) return toast({ variant: "destructive", title: "Gagal", description: "Pilih minimal 1 database blok." });

        // 🔥 MAGIC: Simpan duplikasi kolom ke semua DB area secara otomatis
        await Promise.all(activeLinks.map(([areaId, dbId]) => saveFieldMappings({
          data: { databaseType: `perawatan_${areaId}`, notionDatabaseId: dbId, mappings: mappingsToSave as any }
        })));
      } else {
        if (!masterId) return toast({ variant: "destructive", title: "Gagal", description: "Database belum dipilih." });
        await saveFieldMappings({
          data: { databaseType: schema.id, notionDatabaseId: masterId, mappings: mappingsToSave as any }
        });
      }

      toast({ title: "Schema Saved", description: "Konfigurasi jembatan Notion berhasil diamankan." });
      onToggle();
    } catch (e) { toast({ variant: "destructive", title: "Error", description: "Gagal sinkronisasi API." }); }
  };

  return (
    <Card className={cn(glassCard, isExpanded && "ring-2 ring-primary/40")}>
      <div className="p-4 pb-2 text-left">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-2 text-primary">
            {schema.id === "perawatan" ? <Workflow className="h-5 w-5" /> : <Database className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-sm font-black sm:text-base">{schema.label}</h3>
            <p className="text-[11px] text-muted-foreground">{schema.hint}</p>
          </div>
        </div>

        {/* 🌿 INTERFAS KHUSUS MULTI-DATABASE PERAWATAN */}
        {isExpanded && schema.id === "perawatan" && (
          <div className="mt-4 space-y-2.5 rounded-2xl bg-muted/40 p-3 border border-border/50">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/80">Link Database per Blok Tanam</p>
            {areas.length === 0 ? <Skeleton className="h-10 w-full rounded-xl" /> : areas.map((area) => (
              <div key={area.id} className="flex items-center justify-between gap-4 py-1">
                <span className="text-xs font-bold text-foreground shrink-0">📍 {area.name}</span>
                <Select value={areaDatabaseMap[area.id] || ""} onValueChange={(val) => setAreaDatabaseMap(p => ({ ...p, [area.id]: val }))}>
                  <SelectTrigger className="h-9 w-[190px] rounded-xl bg-background text-xs font-semibold shadow-sm">
                    <SelectValue placeholder="Pilih DB Perawatan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allDatabases.map(db => <SelectItem key={db.id} value={db.id} className="text-xs">{db.iconEmoji} {db.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        {/* INTERFAS STANDARD UNTUK DATA NON-PERAWATAN */}
        {isExpanded && schema.id !== "perawatan" && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Target Database</span>
            <Select value={masterId} onValueChange={(val) => setAreaDatabaseMap({ single: val })}>
              <SelectTrigger className="h-9 w-[200px] rounded-xl bg-muted/50 text-xs font-bold">
                <SelectValue placeholder="Hubungkan DB..." />
              </SelectTrigger>
              <SelectContent>
                {allDatabases.map(db => <SelectItem key={db.id} value={db.id} className="text-xs">{db.iconEmoji} {db.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* PULL TAB CONTROL */}
      <div className="relative z-10 -mt-1 mb-1 flex w-full justify-center">
        <button onClick={onToggle} className="flex h-4 w-12 items-center justify-center rounded-b-xl border border-t-0 border-border/60 bg-muted/30 hover:bg-muted" aria-label="Toggle mapping">
          <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform duration-300", isExpanded && "rotate-180")} />
        </button>
      </div>

      {/* PANEL MAPPING KOLOM */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden text-left">
            <div className="px-4 pb-4">
              <div className="border-t border-dashed border-border/50 pt-3">
                <div className="mb-4 flex items-center justify-center gap-1.5">
                  <Button size="sm" onClick={() => inspect()} disabled={isInspecting || !masterId} className="h-8 rounded-full text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary/20 px-4">
                    {isInspecting ? "Loading..." : "1. Load Cols"}
                  </Button>
                  <Button size="sm" onClick={handleAutoMap} disabled={!props.length} className="h-8 rounded-full text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary/20 px-4">
                    2. Auto Map
                  </Button>
                  <Button size="sm" onClick={handleSave} className="h-8 rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-5">
                    3. Save Config
                  </Button>
                </div>

                <div className="grid gap-2">
                  {schema.fields.map((field: any) => {
                    const isMapped = !!fieldMappings[field.key];
                    return (
                      <div key={field.key} className={cn("flex flex-col gap-2 rounded-xl border p-2.5 sm:flex-row sm:items-center sm:justify-between transition-colors", isMapped ? "bg-primary/[0.03] border-primary/20" : "bg-muted/10 border-transparent")}>
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="rounded-full bg-background text-[9px] font-black uppercase">{field.expectedType.split('|')[0]}</Badge>
                          <p className="text-xs font-bold truncate text-foreground">{field.label}</p>
                        </div>
                        <Select value={fieldMappings[field.key] || ""} onValueChange={(val) => setFieldMappings(p => ({ ...p, [field.key]: val }))}>
                          <SelectTrigger className="h-9 w-full sm:w-[200px] rounded-lg bg-background text-[11px] font-semibold">
                            <SelectValue placeholder={props.length ? "Pilih kolom..." : "Belum di-load"} />
                          </SelectTrigger>
                          <SelectContent>
                            {props.map((p: any) => (
                              <SelectItem key={p.id} value={p.id} className="text-[11px]">{p.name} <span className="opacity-40">({p.type})</span></SelectItem>
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


// ---------------------------------------------------------------------------
// 📦 4. BRAND COLOR & THEME CONTROLLER WIDGET
// ---------------------------------------------------------------------------
function hexToHsl(hex: string) {
  hex = hex.replace(/^#/, "");
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const roundedH = Math.round(h * 360);
  const roundedS = Math.round(s * 100);
  const roundedL = Math.round(l * 100);

  return {
    h: roundedH,
    s: roundedS,
    l: roundedL,
    toString: () => `${roundedH} ${roundedS}% ${roundedL}%`
  };
}

function ColorControl() {
  const [isDark, setIsDark] = useState(false);
  const [primaryHex, setPrimaryHex] = useState("#16a34a");
  const [secondaryHex, setSecondaryHex] = useState("#a3e635");
  const [accentHex, setAccentHex] = useState("#f97316");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const activeDark = document.documentElement.classList.contains("dark");
      setIsDark(activeDark);
      const savedPrimary = localStorage.getItem("sf-primary-hex") || "#16a34a";
      const savedSecondary = localStorage.getItem("sf-secondary-hex") || "#a3e635";
      const savedAccent = localStorage.getItem("sf-accent-hex") || "#f97316";

      setPrimaryHex(savedPrimary);
      setSecondaryHex(savedSecondary);
      setAccentHex(savedAccent);
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    localStorage.setItem("theme", newIsDark ? "dark" : "light");
    
    const root = document.documentElement;
    const p = hexToHsl(primaryHex);
    if (newIsDark) {
      root.classList.add("dark");
      root.style.setProperty("--muted", `${p.h} 8% 12%`);
      root.style.setProperty("--muted-foreground", `${p.h} 8% 65%`);
    } else {
      root.classList.remove("dark");
      root.style.setProperty("--muted", `${p.h} 15% 94%`);
      root.style.setProperty("--muted-foreground", `${p.h} 20% 45%`);
    }
  };

  const handlePrimaryChange = (hex: string) => {
    setPrimaryHex(hex);
    localStorage.setItem("sf-primary-hex", hex);
    
    const p = hexToHsl(hex);
    document.documentElement.style.setProperty("--primary", p.toString());
    
    if (isDark) {
      document.documentElement.style.setProperty("--muted", `${p.h} 8% 12%`);
      document.documentElement.style.setProperty("--muted-foreground", `${p.h} 8% 65%`);
    } else {
      document.documentElement.style.setProperty("--muted", `${p.h} 15% 94%`);
      document.documentElement.style.setProperty("--muted-foreground", `${p.h} 20% 45%`);
    }
  };

  const handleSecondaryChange = (hex: string) => {
    setSecondaryHex(hex);
    localStorage.setItem("sf-secondary-hex", hex);
    document.documentElement.style.setProperty("--secondary", hexToHsl(hex).toString());
  };

  const handleAccentChange = (hex: string) => {
    setAccentHex(hex);
    localStorage.setItem("sf-accent-hex", hex);
    document.documentElement.style.setProperty("--accent", hexToHsl(hex).toString());
  };

  return (
    <div className="p-4 rounded-3xl border border-border bg-card shadow-sm w-full space-y-4 text-left">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Palette className="h-4 w-4 text-primary" />
        <span>Sistem Kontrol Visual</span>
      </div>

      <div className="flex items-center justify-between border-b pb-3 border-border/50">
        <span className="text-xs font-semibold">Mode Layar</span>
        <button
          onClick={toggleTheme}
          className="relative inline-flex h-7 w-12 items-center rounded-full bg-muted transition-colors focus:outline-none"
        >
          <motion.div
            layout
            className="flex h-5 w-5 items-center justify-center rounded-full bg-background shadow-sm"
            animate={{ x: isDark ? 22 : 4 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {isDark ? <Moon className="h-3 w-3 text-primary" /> : <Sun className="h-3 w-3 text-amber-500" />}
          </motion.div>
        </button>
      </div>

      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold block">Warna Utama</span>
            <span className="text-[10px] text-muted-foreground block">UI Utama & Basis Muted</span>
          </div>
          <div className="relative h-7 w-14 rounded-xl border border-border/60 shadow-sm overflow-hidden" style={{ backgroundColor: primaryHex }}>
            <input type="color" value={primaryHex} onChange={(e) => handlePrimaryChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer h-full w-full" />
            <div className="w-full h-full flex items-center justify-center pointer-events-none mix-blend-difference text-white text-[10px] font-mono font-bold">{primaryHex.toUpperCase()}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold block">Warna Kedua</span>
            <span className="text-[10px] text-muted-foreground block">Badge & Secondary UI</span>
          </div>
          <div className="relative h-7 w-14 rounded-xl border border-border/60 shadow-sm overflow-hidden" style={{ backgroundColor: secondaryHex }}>
            <input type="color" value={secondaryHex} onChange={(e) => handleSecondaryChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer h-full w-full" />
            <div className="w-full h-full flex items-center justify-center pointer-events-none mix-blend-difference text-white text-[10px] font-mono font-bold">{secondaryHex.toUpperCase()}</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold block">Warna Aksen</span>
            <span className="text-[10px] text-muted-foreground block">Notifikasi & Alert</span>
          </div>
          <div className="relative h-7 w-14 rounded-xl border border-border/60 shadow-sm overflow-hidden" style={{ backgroundColor: accentHex }}>
            <input type="color" value={accentHex} onChange={(e) => handleAccentChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer h-full w-full" />
            <div className="w-full h-full flex items-center justify-center pointer-events-none mix-blend-difference text-white text-[10px] font-mono font-bold">{accentHex.toUpperCase()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
