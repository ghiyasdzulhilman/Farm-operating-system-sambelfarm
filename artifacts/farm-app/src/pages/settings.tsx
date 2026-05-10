import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  RefreshCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  Database,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useListDatabases,
  getListDatabasesQueryKey,
  useInspectDatabase,
  getInspectDatabaseQueryKey,
  useGetFieldMappings,
  getGetFieldMappingsQueryKey,
  useSaveFieldMappings,
} from "@workspace/api-client-react";
import type {
  DatabaseProperty,
  FieldMappingEntry,
  SaveFieldMappingsBody,
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

// ---------------------------------------------------------------------------
// Field definitions — Arsitektur Sambel Farm
// ---------------------------------------------------------------------------

interface RequiredField {
  key: string;
  label: string;
  expectedType: string;
  description: string;
}

const PANEN_FIELDS: RequiredField[] = [
  { key: "kegiatan", label: "Kegiatan / Judul", expectedType: "title", description: "Nama sesi panen" },
  { key: "tanggal", label: "Tanggal", expectedType: "date", description: "Tanggal panen" },
  { key: "jumlahPanen", label: "Jumlah Panen (kg)", expectedType: "number", description: "Berat hasil panen" },
  { key: "hargaJualPerKg", label: "Harga Jual per Kg", expectedType: "number", description: "Harga jual per kg" },
  { key: "kualitas", label: "Kualitas", expectedType: "select", description: "Grade A, B, C, dst." },
  { key: "channelPenjualan", label: "Channel Penjualan", expectedType: "select", description: "Jalur penjualan" },
  { key: "areaPindahTanam", label: "Area Pindah Tanam", expectedType: "relation", description: "Relasi ke Pindah Tanam" },
  { key: "labaRugi", label: "Area Laba Rugi", expectedType: "relation", description: "Relasi ke Area Laba Rugi" },
];

const EXPENSES_FIELDS: RequiredField[] = [
  { key: "pengeluaran", label: "Nama Pengeluaran", expectedType: "title", description: "Nama item pengeluaran" },
  { key: "date", label: "Tanggal", expectedType: "date", description: "Tanggal transaksi" },
  { key: "qty", label: "Qty / Jumlah", expectedType: "number", description: "Jumlah unit" },
  { key: "hargaPerPcs", label: "Harga per pcs", expectedType: "number", description: "Harga per satuan" },
  { key: "kategori", label: "Kategori", expectedType: "relation", description: "Relasi Kategori" },
  { key: "labaRugi", label: "Area Laba Rugi", expectedType: "relation", description: "Relasi ke Area Laba Rugi" },
];

const LABA_RUGI_FIELDS: RequiredField[] = [
  { key: "area", label: "Nama Area/Blok", expectedType: "title", description: "Nama blok (Blok A, B, dll)" },
  { key: "modalAwal", label: "Modal Awal", expectedType: "number", description: "Kolom input modal awal" },
  { key: "pendapatan", label: "Total Pendapatan", expectedType: "rollup", description: "Kolom rollup/formula pendapatan" },
  { key: "pengeluaran", label: "Total Pengeluaran", expectedType: "rollup", description: "Kolom rollup/formula pengeluaran" },
];

// ---------------------------------------------------------------------------
// Type badge helper (Support Rollup & Formula ditambahkan)
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, string> = {
  title: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  number: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  select: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  relation: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  date: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  rollup: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  formula: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${TYPE_COLORS[type] ?? "bg-gray-100 text-gray-600"}`}
    >
      {type}
    </span>
  );
}

// ---------------------------------------------------------------------------
// MappingSection
// ---------------------------------------------------------------------------

interface MappingSectionProps {
  dbType: "panen" | "expenses" | "laba_rugi";
  fields: RequiredField[];
  dbLabel: string;
  selectedDbId: string;
}

function MappingSection({ dbType, fields, dbLabel, selectedDbId }: MappingSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selections, setSelections] = useState<Record<string, string>>({});
  const [hasLoadedFromSaved, setHasLoadedFromSaved] = useState(false);
  const [loadedForDbId, setLoadedForDbId] = useState<string>("");

  const { data: saved, isLoading: isLoadingSaved } = useGetFieldMappings(
    { type: dbType },
    { query: { queryKey: getGetFieldMappingsQueryKey({ type: dbType }) } },
  );

  useEffect(() => {
    if (saved && !hasLoadedFromSaved) {
      const ids: Record<string, string> = {};
      for (const [key, entry] of Object.entries(saved.mappings ?? {})) {
        if (entry && entry.propertyId) ids[key] = entry.propertyId;
      }
      setSelections(ids);
      setHasLoadedFromSaved(true);
    }
  }, [saved, hasLoadedFromSaved]);

  const inspectParams = { type: dbType, databaseId: selectedDbId || undefined };

  const {
    data: inspected,
    isFetching: isInspecting,
    refetch: loadProperties,
    error: inspectError,
  } = useInspectDatabase(inspectParams, {
    query: {
      enabled: false,
      queryKey: getInspectDatabaseQueryKey(inspectParams),
    },
  });

  const properties: DatabaseProperty[] = inspected?.properties ?? [];
  const dbChanged = loadedForDbId && selectedDbId && loadedForDbId !== selectedDbId;

  async function handleLoadProperties() {
    if (!selectedDbId) {
      toast({
        variant: "destructive",
        title: "Database belum dipilih",
        description: `Pilih database ${dbLabel} di bagian 'Pilih Database Notion' dulu.`,
      });
      return;
    }
    await loadProperties();
    setLoadedForDbId(selectedDbId);
  }

  const { mutateAsync: saveAsync, isPending: isSaving } = useSaveFieldMappings();

  async function handleSave() {
    if (properties.length === 0) {
      toast({
        variant: "destructive",
        title: "Kolom belum dimuat",
        description: "Klik 'Muat Kolom dari Notion' terlebih dahulu.",
      });
      return;
    }

    const mappings: Record<string, FieldMappingEntry> = {};
    for (const field of fields) {
      const propId = selections[field.key];
      if (!propId) continue;
      const prop = properties.find((p) => p.id === propId);
      if (!prop) continue;
      mappings[field.key] = {
        propertyId: prop.id,
        propertyName: prop.name,
        relatedDatabaseId: prop.relatedDatabaseId ?? null,
      };
    }

    if (Object.keys(mappings).length === 0) {
      toast({
        variant: "destructive",
        title: "Tidak ada field yang dipetakan",
        description: "Pilih minimal satu kolom Notion untuk disimpan.",
      });
      return;
    }

    try {
      await saveAsync({
        data: {
          databaseType: dbType,
          notionDatabaseId: selectedDbId || null,
          mappings: mappings as SaveFieldMappingsBody["mappings"],
        },
      });
      toast({
        title: "Pemetaan berhasil disimpan",
        description: `Konfigurasi kolom database ${dbLabel} telah disimpan.`,
      });
      queryClient.invalidateQueries({
        queryKey: getGetFieldMappingsQueryKey({ type: dbType }),
      });
      setHasLoadedFromSaved(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan pemetaan",
        description: err instanceof Error ? err.message : "Terjadi kesalahan.",
      });
    }
  }

  const savedCount = Object.keys(saved?.mappings ?? {}).length;
  const isMapped = savedCount > 0;

  return (
    <div className="space-y-5">
      {!isLoadingSaved && (
        <Alert
          className={
            isMapped
              ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20"
              : "border-amber-200 bg-amber-50 dark:bg-amber-900/20"
          }
        >
          {isMapped ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          )}
          <AlertDescription
            className={
              isMapped
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-amber-700 dark:text-amber-300"
            }
          >
            {isMapped
              ? `${savedCount} dari ${fields.length} field sudah dipetakan.`
              : `Belum ada pemetaan untuk database ${dbLabel}.`}
          </AlertDescription>
        </Alert>
      )}

      {!selectedDbId && (
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-700 dark:text-blue-300">
            Pilih database {dbLabel} di Langkah 1 terlebih dahulu, lalu klik "Muat Kolom".
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          variant="outline"
          onClick={handleLoadProperties}
          disabled={isInspecting || !selectedDbId}
          className="gap-2"
        >
          {isInspecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          {isInspecting ? "Memuat kolom..." : "Muat Kolom dari Notion"}
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[35%]">Field Aplikasi</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[12%]">Tipe</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Kolom Notion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fields.map((field) => {
              const currentPropId = selections[field.key] ?? "";
              const matchedProp = properties.find((p) => p.id === currentPropId);
              
              // Modifikasi validasi agar formula & rollup bisa diterima sebagai number
              let typeMatch = matchedProp ? matchedProp.type === field.expectedType : null;
              if (matchedProp && field.expectedType === "rollup" && (matchedProp.type === "formula" || matchedProp.type === "number")) {
                  typeMatch = true; 
              }

              return (
                <tr key={field.key} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{field.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Info className="h-3 w-3 flex-shrink-0" />
                      {field.description}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={field.expectedType} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Select
                        value={currentPropId}
                        onValueChange={(val) => setSelections((prev) => ({ ...prev, [field.key]: val }))}
                        disabled={properties.length === 0}
                      >
                        <SelectTrigger className="h-8 text-sm min-w-[160px] w-full">
                          <SelectValue placeholder={properties.length === 0 ? "Muat kolom dulu..." : "Pilih kolom Notion..."} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {properties.map((prop) => (
                            <SelectItem key={prop.id} value={prop.id}>
                              <span className="flex items-center gap-2">
                                <TypeBadge type={prop.type} />
                                {prop.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {matchedProp && typeMatch === false && (
                        <span title={`Tipe tidak sesuai`}>
                          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        </span>
                      )}
                      {matchedProp && typeMatch === true && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" />Menyimpan...</> : <><Save className="h-4 w-4" />Simpan Pemetaan</>}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SettingsPage
// ---------------------------------------------------------------------------

interface DbSelections {
  labaRugi: string;
  panen: string;
  expenses: string;
}

export function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dbSelections, setDbSelections] = useState<DbSelections>({
    labaRugi: "",
    panen: "",
    expenses: "",
  });
  const [initDone, setInitDone] = useState(false);
  const [isSavingDbs, setIsSavingDbs] = useState(false);

  const { data: dbListData, isFetching: isLoadingDbs, refetch: refreshDbs } = useListDatabases({
    query: { queryKey: getListDatabasesQueryKey() },
  });
  const allDatabases = dbListData?.databases ?? [];

  const { data: savedPanen } = useGetFieldMappings({ type: "panen" }, { query: { queryKey: getGetFieldMappingsQueryKey({ type: "panen" }) } });
  const { data: savedExpenses } = useGetFieldMappings({ type: "expenses" }, { query: { queryKey: getGetFieldMappingsQueryKey({ type: "expenses" }) } });
  const { data: savedLabaRugi } = useGetFieldMappings({ type: "laba_rugi" }, { query: { queryKey: getGetFieldMappingsQueryKey({ type: "laba_rugi" }) } });

  useEffect(() => {
    if (!initDone && savedPanen !== undefined && savedExpenses !== undefined && savedLabaRugi !== undefined) {
      setDbSelections({
        labaRugi: savedLabaRugi?.notionDatabaseId ?? "",
        panen: savedPanen?.notionDatabaseId ?? "",
        expenses: savedExpenses?.notionDatabaseId ?? "",
      });
      setInitDone(true);
    }
  }, [savedPanen, savedExpenses, savedLabaRugi, initDone]);

  const { mutateAsync: saveAsync } = useSaveFieldMappings();

  async function handleSaveDatabaseSelections() {
    setIsSavingDbs(true);
    try {
      await Promise.all([
        saveAsync({
          data: {
            databaseType: "laba_rugi",
            notionDatabaseId: dbSelections.labaRugi || null,
            mappings: (savedLabaRugi?.mappings as SaveFieldMappingsBody["mappings"]) ?? ({} as SaveFieldMappingsBody["mappings"]),
          },
        }),
        saveAsync({
          data: {
            databaseType: "panen",
            notionDatabaseId: dbSelections.panen || null,
            mappings: (savedPanen?.mappings as SaveFieldMappingsBody["mappings"]) ?? ({} as SaveFieldMappingsBody["mappings"]),
          },
        }),
        saveAsync({
          data: {
            databaseType: "expenses",
            notionDatabaseId: dbSelections.expenses || null,
            mappings: (savedExpenses?.mappings as SaveFieldMappingsBody["mappings"]) ?? ({} as SaveFieldMappingsBody["mappings"]),
          },
        }),
      ]);

      toast({ title: "Pilihan database disimpan" });
      queryClient.invalidateQueries({ queryKey: getGetFieldMappingsQueryKey({ type: "laba_rugi" }) });
      queryClient.invalidateQueries({ queryKey: getGetFieldMappingsQueryKey({ type: "panen" }) });
      queryClient.invalidateQueries({ queryKey: getGetFieldMappingsQueryKey({ type: "expenses" }) });
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: err instanceof Error ? err.message : "Terjadi kesalahan." });
    } finally {
      setIsSavingDbs(false);
    }
  }

  function dbName(id: string) {
    return allDatabases.find((d) => d.id === id)?.name ?? id;
  }

  function DbSelectRow({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string; }) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] items-center gap-3 py-3 border-b border-border last:border-0">
        <div>
          <div className="font-medium text-sm">{label}</div>
          {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
        </div>
        <div className="flex items-center gap-2">
          <Select value={value} onValueChange={onChange} disabled={isLoadingDbs}>
            <SelectTrigger className="h-9 text-sm flex-1">
              <SelectValue placeholder="Pilih database..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {allDatabases.map((db) => (
                <SelectItem key={db.id} value={db.id}>
                  <span className="flex items-center gap-2">
                    {db.iconEmoji ? <span>{db.iconEmoji}</span> : <Database className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />}
                    {db.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {value && <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
            <p className="text-muted-foreground mt-0.5">Pilih database Notion Anda dan petakan kolom ke field aplikasi.</p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                  Pilih Database Notion
                </CardTitle>
                <CardDescription className="mt-1">Pilih database operasional utama.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => void refreshDbs()} disabled={isLoadingDbs} className="gap-2 flex-shrink-0">
                {isLoadingDbs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
                Perbarui Daftar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DbSelectRow label="Database Laba Rugi" hint="Untuk dashboard keuangan" value={dbSelections.labaRugi} onChange={(v) => setDbSelections((prev) => ({ ...prev, labaRugi: v }))} />
            <DbSelectRow label="Database Panen" hint="Untuk input data hasil panen" value={dbSelections.panen} onChange={(v) => setDbSelections((prev) => ({ ...prev, panen: v }))} />
            <DbSelectRow label="Database Pengeluaran" hint="Untuk input data pengeluaran" value={dbSelections.expenses} onChange={(v) => setDbSelections((prev) => ({ ...prev, expenses: v }))} />

            <div className="flex justify-end pt-5">
              <Button onClick={handleSaveDatabaseSelections} disabled={isSavingDbs} className="gap-2">
                {isSavingDbs ? <><Loader2 className="h-4 w-4 animate-spin" />Menyimpan...</> : <><Save className="h-4 w-4" />Simpan Pilihan Database</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
              Pemetaan Kolom
            </CardTitle>
            <CardDescription>Petakan kolom Notion ke field aplikasi agar sistem membaca data yang tepat.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="laba_rugi">
              <TabsList className="mb-6 flex-wrap h-auto p-1">
                <TabsTrigger value="laba_rugi" className="flex-1 min-w-[120px]">
                  Laba Rugi {dbSelections.labaRugi && <span className="ml-2 text-xs opacity-60 hidden sm:inline">({dbName(dbSelections.labaRugi)})</span>}
                </TabsTrigger>
                <TabsTrigger value="panen" className="flex-1 min-w-[120px]">
                  Panen {dbSelections.panen && <span className="ml-2 text-xs opacity-60 hidden sm:inline">({dbName(dbSelections.panen)})</span>}
                </TabsTrigger>
                <TabsTrigger value="expenses" className="flex-1 min-w-[120px]">
                  Pengeluaran {dbSelections.expenses && <span className="ml-2 text-xs opacity-60 hidden sm:inline">({dbName(dbSelections.expenses)})</span>}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="laba_rugi">
                <MappingSection dbType="laba_rugi" fields={LABA_RUGI_FIELDS} dbLabel="Laba Rugi" selectedDbId={dbSelections.labaRugi} />
              </TabsContent>
              <TabsContent value="panen">
                <MappingSection dbType="panen" fields={PANEN_FIELDS} dbLabel="Panen" selectedDbId={dbSelections.panen} />
              </TabsContent>
              <TabsContent value="expenses">
                <MappingSection dbType="expenses" fields={EXPENSES_FIELDS} dbLabel="Pengeluaran" selectedDbId={dbSelections.expenses} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
