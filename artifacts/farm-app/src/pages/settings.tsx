import { useEffect, useState } from "react";
import { UserButton, useUser } from "@clerk/react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Bell,
  BrainCircuit,
  CheckCircle2,
  CloudCog,
  CloudDownload,
  Download,
  Eye,
  Leaf,
  Loader2,
  Moon,
  RefreshCcw,
  Save,
  ServerCog,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Tags,
  UploadCloud,
  Workflow,
  Zap,
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
import type {
  DatabaseProperty,
  FieldMappingEntry,
  SaveFieldMappingsBody,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Types & Configs
// ---------------------------------------------------------------------------

type DatabaseType = "laba_rugi" | "panen" | "expenses" | "kategori";

type RequiredField = {
  key: string;
  label: string;
  expectedType: string;
  description: string;
};

type DatabaseConfig = {
  type: DatabaseType;
  label: string;
  shortLabel: string;
  hint: string;
  icon: any;
  fields: RequiredField[];
};

const DATABASE_CONFIGS: DatabaseConfig[] = [
  {
    type: "laba_rugi",
    label: "Database Laba Rugi",
    shortLabel: "Finance",
    hint: "Sumber unit economics, modal, pendapatan, pengeluaran, profit.",
    icon: ServerCog,
    fields: [
      { key: "area", label: "Nama Area/Blok", expectedType: "title", description: "Nama blok (Blok A, B, dll)" },
      { key: "modalAwal", label: "Modal Awal", expectedType: "number", description: "Kolom input modal awal" },
      { key: "pendapatan", label: "Total Pendapatan", expectedType: "rollup", description: "Kolom rollup/formula pendapatan" },
      { key: "pengeluaran", label: "Total Pengeluaran", expectedType: "rollup", description: "Kolom rollup/formula pengeluaran" },
    ],
  },
  {
    type: "panen",
    label: "Database Panen",
    shortLabel: "Harvest",
    hint: "Catatan panen, kualitas, harga jual, dan relasi area.",
    icon: Leaf,
    fields: [
      { key: "kegiatan", label: "Kegiatan / Judul", expectedType: "title", description: "Nama sesi panen" },
      { key: "tanggal", label: "Tanggal", expectedType: "date|created_time", description: "Tanggal panen" },
      { key: "jumlahPanen", label: "Jumlah Panen (kg)", expectedType: "number", description: "Berat hasil panen" },
      { key: "hargaJualPerKg", label: "Harga Jual per Kg", expectedType: "number", description: "Harga jual per kg" },
      { key: "kualitas", label: "Kualitas", expectedType: "select|multi_select", description: "Grade A, B, C, dst." },
      { key: "channelPenjualan", label: "Channel Penjualan", expectedType: "select|multi_select", description: "Jalur penjualan" },
      { key: "areaPindahTanam", label: "Area Pindah Tanam", expectedType: "relation", description: "Relasi ke Pindah Tanam" },
      { key: "labaRugi", label: "Area Laba Rugi", expectedType: "relation", description: "Relasi ke Area Laba Rugi" },
    ],
  },
  {
    type: "expenses",
    label: "Database Pengeluaran",
    shortLabel: "Expenses",
    hint: "Biaya input, kategori, kuantitas, harga satuan, dan relasi area.",
    icon: CloudCog,
    fields: [
      { key: "pengeluaran", label: "Nama Pengeluaran", expectedType: "title", description: "Nama item pengeluaran" },
      { key: "date", label: "Tanggal", expectedType: "date|created_time", description: "Tanggal transaksi" },
      { key: "qty", label: "Qty / Jumlah", expectedType: "number", description: "Jumlah unit" },
      { key: "hargaPerPcs", label: "Harga per pcs", expectedType: "number", description: "Harga per satuan" },
      { key: "kategori", label: "Kategori", expectedType: "relation", description: "Relasi Kategori" },
      { key: "labaRugi", label: "Area Laba Rugi", expectedType: "relation", description: "Relasi ke Area Laba Rugi" },
    ],
  },
  {
    type: "kategori",
    label: "Database Kategori",
    shortLabel: "Kategori",
    hint: "Master data kategori pengeluaran.",
    icon: Tags,
    fields: [
      { key: "namaKategori", label: "Nama Kategori", expectedType: "title", description: "Kolom utama nama kategori (Bibit, Pupuk, dll)" },
    ],
  },
];

const TYPE_TONE: Record<string, string> = {
  title: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  number: "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  select: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  relation: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  date: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  rollup: "border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  formula: "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
};

const glassCard =
  "rounded-[1.75rem] border-white/60 bg-white/70 shadow-[0_16px_48px_rgba(15,23,42,0.07)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.06]";

// ---------------------------------------------------------------------------
// Helpers & Micro-components
// ---------------------------------------------------------------------------

function formatDate(value?: string | null) {
  if (!value) return "Belum sinkron";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
        TYPE_TONE[type] ??
        "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-300"
      }`}
    >
      {type}
    </span>
  );
}

function HealthPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${
        active
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      }`}
    >
      <span className="relative flex h-2 w-2">
        {active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${active ? "bg-emerald-500" : "bg-amber-500"}`} />
      </span>
      {label}
    </span>
  );
}

function ToggleRow({ icon: Icon, title, description, checked, onCheckedChange }: { icon: any; title: string; description: string; checked: boolean; onCheckedChange: (c: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[1.35rem] border border-border/55 bg-background/60 p-3 backdrop-blur">
      <div className="flex min-w-0 items-start gap-3">
        <div className="rounded-2xl border border-white/60 bg-white/60 p-2 text-emerald-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-emerald-300">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black tracking-[-0.01em]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export function SettingsPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const queryClient = useQueryClient();

  const [selectedMappingType, setSelectedMappingType] = useState<DatabaseType>("laba_rugi");
  const [dbSelections, setDbSelections] = useState<Record<DatabaseType, string>>({
    laba_rugi: "",
    panen: "",
    expenses: "",
    kategori: "",
  });
  const [fieldSelections, setFieldSelections] = useState<Record<string, string>>({});
  const [isSavingDatabases, setIsSavingDatabases] = useState(false);

  // Dummy state for UI Toggles
  const [automation, setAutomation] = useState({ smartInsights: true, autoRefresh: true, costAnomaly: true, productionForecast: false });
  const [notifications, setNotifications] = useState({ syncAlerts: true, operationalAlerts: true, inspectionReminders: false });

  // Data Fetching
  const { data: connectionStatus } = useGetNotionConnectionStatus({
    query: { queryKey: getGetNotionConnectionStatusQueryKey() },
  });

  const {
    data: databaseList,
    refetch: refreshDatabases,
    isFetching: isRefreshingDatabases,
  } = useListDatabases({
    query: { queryKey: getListDatabasesQueryKey() },
  });

  const { data: savedFinance } = useGetFieldMappings({ type: "laba_rugi" }, { query: { queryKey: getGetFieldMappingsQueryKey({ type: "laba_rugi" }) } });
  const { data: savedHarvest } = useGetFieldMappings({ type: "panen" }, { query: { queryKey: getGetFieldMappingsQueryKey({ type: "panen" }) } });
  const { data: savedExpenses } = useGetFieldMappings({ type: "expenses" }, { query: { queryKey: getGetFieldMappingsQueryKey({ type: "expenses" }) } });
  const { data: savedKategori } = useGetFieldMappings({ type: "kategori" }, { query: { queryKey: getGetFieldMappingsQueryKey({ type: "kategori" }) } });

  const selectedDatabaseId = dbSelections[selectedMappingType];
  const inspectParams = { type: selectedMappingType, databaseId: selectedDatabaseId || undefined };

  const {
    data: inspectedDatabase,
    isFetching: isInspectingDatabase,
    refetch: inspectDatabase,
  } = useInspectDatabase(inspectParams, {
    query: {
      enabled: Boolean(selectedDatabaseId),
      queryKey: getInspectDatabaseQueryKey(inspectParams),
    },
  });

  const { mutateAsync: saveFieldMappings } = useSaveFieldMappings();

  // Derived Data
  const allDatabases = databaseList?.databases ?? [];
  const selectedConfig = DATABASE_CONFIGS.find((config) => config.type === selectedMappingType)!;
  
  const activeSavedMapping =
    selectedMappingType === "laba_rugi" ? savedFinance
      : selectedMappingType === "panen" ? savedHarvest
      : selectedMappingType === "expenses" ? savedExpenses
      : savedKategori;

  const properties = inspectedDatabase?.properties ?? [];

  const databaseHealth = Object.values(dbSelections).filter(Boolean).length;
  const mappingHealth =
    Object.keys(savedFinance?.mappings ?? {}).length +
    Object.keys(savedHarvest?.mappings ?? {}).length +
    Object.keys(savedExpenses?.mappings ?? {}).length +
    Object.keys(savedKategori?.mappings ?? {}).length;

  // Sync saved DB selection IDs to local state
  useEffect(() => {
    setDbSelections({
      laba_rugi: savedFinance?.notionDatabaseId ?? "",
      panen: savedHarvest?.notionDatabaseId ?? "",
      expenses: savedExpenses?.notionDatabaseId ?? "",
      kategori: savedKategori?.notionDatabaseId ?? "",
    });
  }, [savedFinance, savedHarvest, savedExpenses, savedKategori]);

  // Sync saved mapped fields to local state
  useEffect(() => {
    const mapped = activeSavedMapping?.mappings ?? {};
    const nextSelections: Record<string, string> = {};

    for (const [fieldKey, entry] of Object.entries(mapped)) {
      if (entry && entry.propertyId) {
        nextSelections[fieldKey] = entry.propertyId;
      }
    }
    setFieldSelections(nextSelections);
  }, [activeSavedMapping, selectedMappingType]);

  // Actions
  function databaseName(databaseId: string) {
    return allDatabases.find((db) => db.id === databaseId)?.name ?? databaseId;
  }

  function typeMatches(expectedType: string, property?: DatabaseProperty) {
    if (!property) return false;
    if (expectedType === "rollup" && ["formula", "number", "rollup"].includes(property.type)) return true;
    return expectedType.split("|").includes(property.type);
  }

  function handleAutoMap() {
    if (!properties.length) return;

    const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const next: Record<string, string> = {};

    for (const field of selectedConfig.fields) {
      const fieldName = normalized(field.label);
      const match = properties.find((property) => {
        const propertyName = normalized(property.name);
        return typeMatches(field.expectedType, property) && (fieldName.includes(propertyName) || propertyName.includes(fieldName));
      });

      if (match) next[field.key] = match.id;
    }

    setFieldSelections((current) => ({ ...current, ...next }));
    toast({ title: "Smart mapping selesai", description: `${Object.keys(next).length} properti cocok dengan schema ${selectedConfig.shortLabel}.` });
  }

  async function handleSaveDatabaseSelections() {
    setIsSavingDatabases(true);
    try {
      await Promise.all(
        DATABASE_CONFIGS.map((config) => {
          const saved = config.type === "laba_rugi" ? savedFinance : config.type === "panen" ? savedHarvest : config.type === "expenses" ? savedExpenses : savedKategori;
          return saveFieldMappings({
            data: {
              databaseType: config.type,
              notionDatabaseId: dbSelections[config.type] || null,
              mappings: (saved?.mappings as SaveFieldMappingsBody["mappings"]) ?? ({} as SaveFieldMappingsBody["mappings"]),
            },
          });
        }),
      );

      toast({ title: "Database control plane disimpan" });
      DATABASE_CONFIGS.forEach((config) => queryClient.invalidateQueries({ queryKey: getGetFieldMappingsQueryKey({ type: config.type }) }));
    } catch (error) {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: error instanceof Error ? error.message : "Terjadi kesalahan." });
    } finally {
      setIsSavingDatabases(false);
    }
  }

  async function handleSaveMapping() {
    const mappings: Record<string, FieldMappingEntry> = {};

    for (const field of selectedConfig.fields) {
      const propertyId = fieldSelections[field.key];
      const property = properties.find((item) => item.id === propertyId);
      if (!property) continue;

      mappings[field.key] = {
        propertyId: property.id,
        propertyName: property.name,
        relatedDatabaseId: property.relatedDatabaseId ?? null,
      };
    }

    if (!Object.keys(mappings).length) {
      toast({ variant: "destructive", title: "Belum ada mapping", description: "Pilih minimal satu properti." });
      return;
    }

    try {
      await saveFieldMappings({
        data: {
          databaseType: selectedMappingType,
          notionDatabaseId: selectedDatabaseId || null,
          mappings: mappings as SaveFieldMappingsBody["mappings"],
        },
      });

      toast({ title: `Schema ${selectedConfig.shortLabel} tersimpan` });
      queryClient.invalidateQueries({ queryKey: getGetFieldMappingsQueryKey({ type: selectedMappingType }) });
    } catch (error) {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: error instanceof Error ? error.message : "Terjadi kesalahan." });
    }
  }

  return (
    // DI SINI FIX OFFSIDE: Hapus negative margin, pastikan max-w-6xl mx-auto
    <div className="w-full min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.12),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(15,23,42,0.06),transparent_28%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted))/0.45)] pb-12 pt-6 overflow-x-hidden">
      
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 space-y-4 md:space-y-6">
        
        {/* --- HEADER --- */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/70 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.06] md:p-6"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <HealthPill active={Boolean(connectionStatus?.connected)} label={connectionStatus?.connected ? "System online" : "Notion offline"} />
              <div>
                <h1 className="text-balance text-3xl font-black tracking-[-0.04em] text-slate-950 dark:text-white md:text-5xl">
                  System Control Center
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                  Pusat kendali data infrastructure Sambel Farm untuk akun,
                  sinkronisasi Notion, schema mapping, automation, dan backup.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] border border-border/50 bg-background/55 p-2 backdrop-blur-xl lg:min-w-[390px]">
              <div className="rounded-2xl bg-emerald-500/10 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
                <p className="mt-1 truncate text-sm font-black text-emerald-700 dark:text-emerald-300">
                  {connectionStatus?.workspaceName ?? "Not connected"}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-950/5 p-3 dark:bg-white/10">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Databases</p>
                <p className="mt-1 text-sm font-black">{databaseHealth}/{DATABASE_CONFIGS.length} linked</p>
              </div>
              <div className="rounded-2xl bg-amber-500/10 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Mapping</p>
                <p className="mt-1 text-sm font-black text-amber-700 dark:text-amber-300">{mappingHealth} fields</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* --- MAIN GRID (2 COLUMNS) --- */}
        <div className="grid gap-4 lg:grid-cols-2">
          
          {/* --- LEFT COLUMN --- */}
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="space-y-4">
            
            {/* Account Card */}
            <Card className={glassCard}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={user?.imageUrl}
                      alt={user?.fullName ?? "Google account"}
                      className="h-14 w-14 rounded-3xl border border-white/70 bg-muted object-cover shadow-sm dark:border-white/10"
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Google Profile</p>
                      <h2 className="truncate text-lg font-black tracking-[-0.03em]">
                        {user?.fullName ?? "Sambel Operator"}
                      </h2>
                      <p className="truncate text-xs text-muted-foreground">
                        {user?.primaryEmailAddress?.emailAddress ?? "Google account connected"}
                      </p>
                    </div>
                  </div>
                  <UserButton />
                </div>
              </CardContent>
            </Card>

            {/* Notion Status Card */}
            <Card className={glassCard}>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700/80 dark:text-emerald-300/80">Notion Synchronization</p>
                    <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Workspace health</h2>
                  </div>
                  <HealthPill active={Boolean(connectionStatus?.connected)} label={connectionStatus?.connected ? "Live" : "Needs auth"} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[1.35rem] bg-emerald-500/10 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">API Sync</p>
                    <p className="mt-2 text-sm font-black">{connectionStatus?.connected ? "Healthy" : "Disconnected"}</p>
                  </div>
                  <div className="rounded-[1.35rem] bg-slate-950/5 p-3 dark:bg-white/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Last sync</p>
                    <p className="mt-2 text-sm font-black">{formatDate(connectionStatus?.connectedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Smart Database Control Plane (Replaced Discovery) */}
            <Card className={glassCard}>
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700/80 dark:text-violet-300/80">Database Control Plane</p>
                    <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Connected system databases</h2>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => void refreshDatabases()} disabled={isRefreshingDatabases} className="rounded-full border-white/60 bg-background/70 h-10 w-10">
                      <RefreshCcw className={`h-4 w-4 ${isRefreshingDatabases ? "animate-spin" : ""}`} />
                    </Button>
                    <Button onClick={handleSaveDatabaseSelections} disabled={isSavingDatabases} className="rounded-full bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 h-10 px-4">
                      {isSavingDatabases ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save links
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3">
                  {DATABASE_CONFIGS.map((config) => {
                    const Icon = config.icon;
                    const value = dbSelections[config.type];

                    return (
                      <div key={config.type} className="rounded-[1.35rem] border border-border/55 bg-background/60 p-3 backdrop-blur">
                        <div className="flex items-start gap-3">
                          <div className="rounded-2xl border border-white/60 bg-white/60 p-2 text-emerald-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-emerald-300">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-black">{config.label}</p>
                              {value ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{config.hint}</p>
                            
                            {/* Smart Select / Combobox-like UX inside Select */}
                            <Select value={value} onValueChange={(nextValue) => setDbSelections((current) => ({ ...current, [config.type]: nextValue }))}>
                              <SelectTrigger className="mt-3 h-10 rounded-full border-white/60 bg-background/70 text-xs font-semibold">
                                <SelectValue placeholder="Pilih database Notion dari workspace..." />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {allDatabases.length === 0 && (
                                  <div className="p-2 text-xs text-muted-foreground text-center">Belum ada database. Klik refresh.</div>
                                )}
                                {allDatabases.map((db) => (
                                  <SelectItem key={db.id} value={db.id} className="text-sm font-medium">
                                    {db.iconEmoji ? `${db.iconEmoji} ` : "📄 "}
                                    {db.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            {value && (
                              <p className="mt-2 truncate text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                Connected to: {databaseName(value)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* --- RIGHT COLUMN --- */}
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="space-y-4">
            
            {/* Property Mapping Card */}
            <Card className={glassCard}>
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700/80 dark:text-emerald-300/80">Property Mapping</p>
                    <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Smart schema grouping</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-1 rounded-[1.35rem] border border-white/60 bg-background/70 p-1 backdrop-blur sm:grid-cols-4">
                    {DATABASE_CONFIGS.map((config) => (
                      <button
                        key={config.type}
                        onClick={() => setSelectedMappingType(config.type)}
                        className={`rounded-[1rem] px-2 py-2 text-[11px] font-black transition-all duration-300 ${
                          selectedMappingType === config.type
                            ? "bg-gradient-to-br from-emerald-600 to-lime-500 text-white shadow-[0_10px_30px_rgba(21,128,61,0.24)]"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        }`}
                      >
                        {config.shortLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                  {DATABASE_CONFIGS.map((config) => {
                    const savedMappingState = config.type === "laba_rugi" ? savedFinance : config.type === "panen" ? savedHarvest : config.type === "expenses" ? savedExpenses : savedKategori;
                    return (
                      <div key={config.type} className="rounded-[1.25rem] bg-slate-950/[0.04] p-3 dark:bg-white/[0.07]">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{config.shortLabel}</p>
                        <p className="mt-2 text-sm font-black">{Object.keys(savedMappingState?.mappings ?? {}).length} mapped</p>
                      </div>
                    )
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={() => void inspectDatabase()} disabled={!selectedDatabaseId || isInspectingDatabase} className="rounded-full border-white/60 bg-background/70">
                    {isInspectingDatabase ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />} Inspect properties
                  </Button>
                  <Button variant="outline" onClick={handleAutoMap} disabled={!properties.length} className="rounded-full border-white/60 bg-background/70">
                    <Sparkles className="mr-2 h-4 w-4" /> Smart map
                  </Button>
                  <Button onClick={handleSaveMapping} disabled={!properties.length} className="rounded-full bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90">
                    <Save className="mr-2 h-4 w-4" /> Save mapping
                  </Button>
                </div>

                {!selectedDatabaseId && (
                  <div className="rounded-[1.35rem] border border-amber-500/20 bg-amber-500/10 p-3 text-sm font-medium text-amber-800 dark:text-amber-200">
                    Hubungkan database {selectedConfig.shortLabel} terlebih dahulu sebelum inspect property.
                  </div>
                )}

                <div className="space-y-2">
                  {selectedConfig.fields.map((field) => {
                    const selectedProperty = properties.find((p) => p.id === fieldSelections[field.key]);
                    const isMapped = Boolean(selectedProperty);

                    return (
                      <div key={field.key} className="rounded-[1.35rem] border border-border/55 bg-background/60 p-3 backdrop-blur">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black tracking-[-0.01em]">{field.label}</p>
                              {field.expectedType.split("|").map((type) => <TypeBadge key={type} type={type} />)}
                              {isMapped && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                                  <Workflow className="h-3 w-3" /> mapped
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{field.description}</p>
                          </div>

                          <Select value={fieldSelections[field.key] ?? ""} onValueChange={(val) => setFieldSelections((current) => ({ ...current, [field.key]: val }))} disabled={!properties.length}>
                            <SelectTrigger className="h-10 rounded-full border-white/60 bg-background/70 text-xs font-semibold sm:w-[260px]">
                              <SelectValue placeholder="Pilih property" />
                            </SelectTrigger>
                            <SelectContent>
                              {properties.map((property) => (
                                <SelectItem key={property.id} value={property.id}>
                                  {property.name} · {property.type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedProperty?.relatedDatabaseId && (
                          <p className="mt-2 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                            Relation target: {selectedProperty.relatedDatabaseId}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </div>

        {/* --- DUMMY CONFIGURATIONS (Grid 3 Cols) --- */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className={glassCard}>
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700/80 dark:text-emerald-300/80">Smart Farming Preferences</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Intelligence options</h2>
              </div>
              <ToggleRow icon={BrainCircuit} title="Smart insights" description="Generate margin, HPP, production, and anomaly recommendations." checked={automation.smartInsights} onCheckedChange={(val) => setAutomation((c) => ({ ...c, smartInsights: val }))} />
              <ToggleRow icon={RefreshCcw} title="Auto refresh" description="Keep dashboard data synchronized with Notion in the background." checked={automation.autoRefresh} onCheckedChange={(val) => setAutomation((c) => ({ ...c, autoRefresh: val }))} />
              <ToggleRow icon={Zap} title="Cost anomaly scan" description="Flag area paling boros and unusual input spikes." checked={automation.costAnomaly} onCheckedChange={(val) => setAutomation((c) => ({ ...c, costAnomaly: val }))} />
              <ToggleRow icon={Leaf} title="Production forecast" description="Enable early yield trend prediction for active blocks." checked={automation.productionForecast} onCheckedChange={(val) => setAutomation((c) => ({ ...c, productionForecast: val }))} />
            </CardContent>
          </Card>

          <Card className={glassCard}>
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700/80 dark:text-amber-300/80">Notifications</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Alert routing</h2>
              </div>
              <ToggleRow icon={Bell} title="Sync alerts" description="Notify when Notion API sync fails or reconnects." checked={notifications.syncAlerts} onCheckedChange={(val) => setNotifications((c) => ({ ...c, syncAlerts: val }))} />
              <ToggleRow icon={AlertCircle} title="Operational alerts" description="Surface unusual harvest, expense, and area activity." checked={notifications.operationalAlerts} onCheckedChange={(val) => setNotifications((c) => ({ ...c, operationalAlerts: val }))} />
              <ToggleRow icon={ShieldCheck} title="Inspection reminders" description="Schedule reminders for block inspections and data hygiene." checked={notifications.inspectionReminders} onCheckedChange={(val) => setNotifications((c) => ({ ...c, inspectionReminders: val }))} />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className={glassCard}>
              <CardContent className="space-y-3 p-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-700/80 dark:text-sky-300/80">Backup & Data</p>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Recovery controls</h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="rounded-2xl border-white/60 bg-background/70"><Download className="mr-2 h-4 w-4" /> Export</Button>
                  <Button variant="outline" className="rounded-2xl border-white/60 bg-background/70"><UploadCloud className="mr-2 h-4 w-4" /> Restore</Button>
                </div>
                <div className="rounded-[1.35rem] bg-slate-950/[0.04] p-3 dark:bg-white/[0.07]">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Backup status</p>
                  <p className="mt-2 flex items-center gap-2 text-sm font-black"><CloudDownload className="h-4 w-4 text-emerald-600" /> Snapshot ready</p>
                </div>
              </CardContent>
            </Card>

            <Card className={glassCard}>
              <CardContent className="space-y-3 p-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700/80 dark:text-violet-300/80">Appearance</p>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Theme system</h2>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[{ label: "Light", icon: Sun }, { label: "Dark", icon: Moon }, { label: "Auto", icon: Sparkles }].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.label} className="rounded-2xl border border-border/55 bg-background/60 p-3 text-xs font-black transition-all hover:bg-muted/70">
                        <Icon className="mx-auto mb-2 h-4 w-4 text-emerald-600" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* --- SYSTEM STATUS CARD --- */}
        <Card className="overflow-hidden rounded-[2rem] border-white/60 bg-slate-950 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] dark:border-white/10">
          <CardContent className="relative p-4 md:p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(16,185,129,0.24),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(168,85,247,0.22),transparent_28%)]" />
            <div className="relative grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                  <Settings className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <p className="text-lg font-black tracking-[-0.03em]">Sambel Farm OS</p>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-white/68">
                    Version 1.0.0 · Build smart-farm-control · System status
                    {connectionStatus?.connected ? " nominal" : " waiting for Notion"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-white/10 p-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">API</p><p className="mt-1 text-sm font-black">OK</p></div>
                <div className="rounded-2xl bg-white/10 p-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">Data</p><p className="mt-1 text-sm font-black">Notion</p></div>
                <div className="rounded-2xl bg-white/10 p-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">Mode</p><p className="mt-1 text-sm font-black">SaaS</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
