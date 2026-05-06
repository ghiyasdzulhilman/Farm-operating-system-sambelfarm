import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, RefreshCcw, Save, CheckCircle2, AlertCircle, Loader2, Info } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useInspectDatabase,
  getInspectDatabaseQueryKey,
  useGetFieldMappings,
  getGetFieldMappingsQueryKey,
  useSaveFieldMappings,
} from "@workspace/api-client-react";
import type { DatabaseProperty, FieldMappingEntry } from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
// Field definitions — what each database type requires
// ---------------------------------------------------------------------------

interface RequiredField {
  key: string;
  label: string;
  expectedType: string;
  description: string;
}

const PANEN_FIELDS: RequiredField[] = [
  { key: "kegiatan", label: "Kegiatan / Judul", expectedType: "title", description: "Nama/judul baris panen (tipe Title)" },
  { key: "jumlahPanen", label: "Jumlah Panen (kg)", expectedType: "number", description: "Berat hasil panen dalam kg" },
  { key: "hargaJualPerKg", label: "Harga Jual per Kg", expectedType: "number", description: "Harga jual per kilogram" },
  { key: "kualitas", label: "Kualitas", expectedType: "select", description: "Grade kualitas (Grade A, B, C, dst.)" },
  { key: "channelPenjualan", label: "Channel Penjualan", expectedType: "select", description: "Jalur penjualan hasil panen" },
  { key: "areaPindahTanam", label: "Area Pindah Tanam", expectedType: "relation", description: "Relasi ke database Pindah Tanam (untuk menghitung HST)" },
  { key: "areaLabaRugi", label: "Area Laba Rugi", expectedType: "relation", description: "Relasi ke database Laba Rugi (untuk merekap pendapatan)" },
];

const EXPENSES_FIELDS: RequiredField[] = [
  { key: "pengeluaran", label: "Nama Pengeluaran", expectedType: "title", description: "Nama/judul baris pengeluaran (tipe Title)" },
  { key: "date", label: "Tanggal", expectedType: "date", description: "Tanggal transaksi" },
  { key: "qty", label: "Qty / Jumlah", expectedType: "number", description: "Jumlah unit" },
  { key: "hargaPerPcs", label: "Harga per pcs", expectedType: "number", description: "Harga per satuan unit" },
  { key: "kategori", label: "Kategori", expectedType: "relation", description: "Relasi ke database Kategori Pengeluaran" },
  { key: "area", label: "Area (Laba Rugi)", expectedType: "relation", description: "Relasi ke database Laba Rugi" },
];

// ---------------------------------------------------------------------------
// Type badge helper
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, string> = {
  title: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  number: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  select: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  relation: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  date: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  formula: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  rollup: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${TYPE_COLORS[type] ?? "bg-gray-100 text-gray-600"}`}>
      {type}
    </span>
  );
}

// ---------------------------------------------------------------------------
// MappingSection — one tab (panen or expenses)
// ---------------------------------------------------------------------------

interface MappingSectionProps {
  dbType: "panen" | "expenses";
  fields: RequiredField[];
  dbLabel: string;
}

function MappingSection({ dbType, fields, dbLabel }: MappingSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Pending selections: fieldKey -> propertyId
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [hasLoadedFromSaved, setHasLoadedFromSaved] = useState(false);

  // Load existing saved mappings
  const { data: saved, isLoading: isLoadingSaved } = useGetFieldMappings(
    { type: dbType },
    { query: { queryKey: getGetFieldMappingsQueryKey({ type: dbType }) } },
  );

  // Initialise selections from saved mappings when they arrive
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

  // Inspect database — enabled:false so it only fires on refetch()
  const {
    data: inspected,
    isFetching: isInspecting,
    refetch: loadProperties,
    error: inspectError,
  } = useInspectDatabase(
    { type: dbType },
    { query: { enabled: false, queryKey: getInspectDatabaseQueryKey({ type: dbType }) } },
  );

  const properties: DatabaseProperty[] = inspected?.properties ?? [];

  // Save mutation
  const { mutate: saveMappings, isPending: isSaving } = useSaveFieldMappings({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Pemetaan berhasil disimpan",
          description: `Konfigurasi kolom database ${dbLabel} telah disimpan.`,
        });
        queryClient.invalidateQueries({ queryKey: getGetFieldMappingsQueryKey({ type: dbType }) });
        setHasLoadedFromSaved(false);
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Gagal menyimpan",
          description: err instanceof Error ? err.message : "Terjadi kesalahan.",
        });
      },
    },
  });

  function handleSave() {
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

    const mappedCount = Object.keys(mappings).length;
    if (mappedCount === 0) {
      toast({
        variant: "destructive",
        title: "Tidak ada field yang dipetakan",
        description: "Pilih minimal satu kolom Notion untuk disimpan.",
      });
      return;
    }

    saveMappings({ data: { databaseType: dbType, mappings } });
  }

  const savedCount = Object.keys(saved?.mappings ?? {}).length;
  const isMapped = savedCount > 0;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {!isLoadingSaved && (
        <Alert className={isMapped ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20" : "border-amber-200 bg-amber-50 dark:bg-amber-900/20"}>
          {isMapped ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          )}
          <AlertDescription className={isMapped ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}>
            {isMapped
              ? `${savedCount} dari ${fields.length} field sudah dipetakan. Klik "Muat Kolom" untuk memperbarui.`
              : `Belum ada pemetaan untuk database ${dbLabel}. Muat kolom dari Notion untuk memulai.`}
          </AlertDescription>
        </Alert>
      )}

      {/* Load button */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => loadProperties()}
          disabled={isInspecting}
          data-testid={`button-load-${dbType}`}
          className="gap-2"
        >
          {isInspecting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          {isInspecting ? "Memuat kolom..." : "Muat Kolom dari Notion"}
        </Button>
        {properties.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {properties.length} kolom ditemukan di database <strong>{inspected?.databaseName}</strong>
          </span>
        )}
      </div>

      {/* Error state */}
      {inspectError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {inspectError instanceof Error ? inspectError.message : "Gagal memuat kolom dari Notion."}
          </AlertDescription>
        </Alert>
      )}

      {/* Field mapping table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
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
              const typeMatch = matchedProp ? matchedProp.type === field.expectedType : null;

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
                        onValueChange={(val) =>
                          setSelections((prev) => ({ ...prev, [field.key]: val }))
                        }
                        disabled={properties.length === 0}
                      >
                        <SelectTrigger
                          className="h-8 text-sm"
                          data-testid={`select-mapping-${dbType}-${field.key}`}
                        >
                          <SelectValue
                            placeholder={
                              properties.length === 0
                                ? "Muat kolom dari Notion dulu..."
                                : "Pilih kolom Notion..."
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
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

                      {/* Type match indicator */}
                      {matchedProp && typeMatch === false && (
                        <span title={`Tipe tidak sesuai: diperlukan '${field.expectedType}', dipilih '${matchedProp.type}'`}>
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

      {/* Hint when properties loaded */}
      {properties.length > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          Ikon hijau = tipe kolom sesuai. Ikon kuning = tipe tidak sesuai (tetap bisa disimpan, namun data mungkin tidak masuk dengan benar).
        </p>
      )}

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          data-testid={`button-save-${dbType}`}
          className="gap-2"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Simpan Pemetaan
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SettingsPage
// ---------------------------------------------------------------------------

export function SettingsPage() {
  return (
    <div className="space-y-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
            <p className="text-muted-foreground mt-0.5">
              Petakan kolom Notion Anda ke field aplikasi agar data masuk dengan benar.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle>Pemetaan Kolom (Field Mapping)</CardTitle>
            <CardDescription>
              Hubungkan setiap field di aplikasi ke kolom yang sesuai di database Notion Anda.
              Klik <strong>"Muat Kolom dari Notion"</strong> untuk membaca struktur database,
              lalu pilih kolom yang tepat untuk setiap field. Simpan saat selesai.
              <br />
              <span className="text-xs mt-1 block text-muted-foreground">
                Pemetaan disimpan berdasarkan <strong>ID properti</strong> — bukan nama kolom —
                sehingga tetap valid meskipun Anda mengganti nama kolom di Notion.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="panen">
              <TabsList className="mb-6">
                <TabsTrigger value="panen" data-testid="tab-panen">
                  Database Panen
                </TabsTrigger>
                <TabsTrigger value="expenses" data-testid="tab-expenses">
                  Database Pengeluaran
                </TabsTrigger>
              </TabsList>

              <TabsContent value="panen">
                <MappingSection
                  dbType="panen"
                  fields={PANEN_FIELDS}
                  dbLabel="Panen"
                />
              </TabsContent>

              <TabsContent value="expenses">
                <MappingSection
                  dbType="expenses"
                  fields={EXPENSES_FIELDS}
                  dbLabel="Pengeluaran"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <Card className="border-border/60 bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cara Kerja Field Mapping</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              <strong className="text-foreground">1. Muat Kolom</strong> — Aplikasi membaca semua properti (kolom) dari database Notion Anda beserta tipe datanya.
            </p>
            <p>
              <strong className="text-foreground">2. Petakan Field</strong> — Pilih kolom Notion yang bersesuaian dengan setiap field di aplikasi. Ikon tipe membantu memastikan kolom yang dipilih sesuai.
            </p>
            <p>
              <strong className="text-foreground">3. Simpan</strong> — Konfigurasi disimpan menggunakan ID properti Notion (bukan nama), sehingga tetap valid jika Anda mengganti nama kolom.
            </p>
            <p>
              <strong className="text-foreground">4. Dinamis</strong> — Dropdown Area di form Panen dan Pengeluaran otomatis menggunakan database yang terhubung via relasi dari pemetaan ini — tanpa hardcode nama apapun.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
