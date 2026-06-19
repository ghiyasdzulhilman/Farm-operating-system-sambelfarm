import { useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  PlusCircle, Loader2, CalendarIcon, ArrowRight, ArrowLeft,
  CheckCircle2, Sprout, Plus, Trash2, Edit3, Undo2, MapPinned, FileText, ExternalLink
} from "lucide-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

import { getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  buildAreaOverridePayload,
  buildBroadcastPerAreaRecord,
  copyBroadcastToArea,
  pruneOverrideState,
  resetAreaOverride,
} from "@/lib/areaOverrideForm";

const perawatanSchema = z.object({
  kegiatan: z.string().min(1, "Nama kegiatan wajib diisi"),
  labaRugiIds: z.array(z.string()).min(1, "Minimal pilih 1 area"),

  modeTanggal: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  tanggalBroadcast: z.string().optional(), tanggalSelesaiBroadcast: z.string().optional(),
  durasiKerjaBroadcast: z.coerce.number().min(0).default(0),
  tanggalPerArea: z.record(z.string()).default({}), tanggalSelesaiPerArea: z.record(z.string()).default({}), durasiKerjaPerArea: z.record(z.number()).default({}),

  modePekerja: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  petugasBroadcast: z.array(z.string()).default([]), petugasPerArea: z.record(z.array(z.string())).default({}),

  modeTags: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  tagsBroadcast: z.string().optional(), tagsPerArea: z.record(z.string()).default({}),

  modeStatus: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  statusBroadcast: z.string().default("Rencana"), statusPerArea: z.record(z.string()).default({}),

  modeCatatan: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  catatanBroadcast: z.string().optional(), catatanPerArea: z.record(z.string()).optional(),

  modeProduk: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  logProduk: z.array(z.object({ produk: z.string().min(1, "Wajib"), dosis: z.string().min(1, "Wajib") })).default([]),
  produkPerArea: z.record(z.array(z.object({ produk: z.string(), dosis: z.string() }))).default({}),
});

type PerawatanFormValues = z.infer<typeof perawatanSchema>;

interface DropdownOptions { areas: Array<{ id: string; name: string }>; petugas: Array<{ id: string; name: string }>; }

const PERAWATAN_OVERRIDE_FIELDS = [
  { broadcastKey: "tanggalBroadcast", perAreaKey: "tanggalPerArea" },
  { broadcastKey: "tanggalSelesaiBroadcast", perAreaKey: "tanggalSelesaiPerArea" },
  { broadcastKey: "durasiKerjaBroadcast", perAreaKey: "durasiKerjaPerArea" },
  { broadcastKey: "petugasBroadcast", perAreaKey: "petugasPerArea" },
  { broadcastKey: "tagsBroadcast", perAreaKey: "tagsPerArea" },
  { broadcastKey: "statusBroadcast", perAreaKey: "statusPerArea" },
  { broadcastKey: "catatanBroadcast", perAreaKey: "catatanPerArea" },
  { broadcastKey: "logProduk", perAreaKey: "produkPerArea" },
] as const satisfies Array<{ broadcastKey: keyof PerawatanFormValues; perAreaKey: keyof PerawatanFormValues }>;

const PERAWATAN_MODE_KEYS = ["modeTanggal", "modePekerja", "modeTags", "modeStatus", "modeCatatan", "modeProduk"] as const satisfies Array<keyof PerawatanFormValues>;

const EMPTY_VALUES: PerawatanFormValues = {
  kegiatan: "", labaRugiIds: [],
  modeTanggal: "broadcast", tanggalBroadcast: format(new Date(), "yyyy-MM-dd'T'HH:mm"), tanggalSelesaiBroadcast: "", durasiKerjaBroadcast: 0, tanggalPerArea: {}, tanggalSelesaiPerArea: {}, durasiKerjaPerArea: {},
  modePekerja: "broadcast", petugasBroadcast: [], petugasPerArea: {},
  modeTags: "broadcast", tagsBroadcast: "", tagsPerArea: {},
  modeStatus: "broadcast", statusBroadcast: "Rencana", statusPerArea: {},
  modeCatatan: "broadcast", catatanBroadcast: "", catatanPerArea: {},
  modeProduk: "broadcast", logProduk: [], produkPerArea: {},
};

function sanitizePerawatanPayload(payload: PerawatanFormValues): PerawatanFormValues {
  return {
    ...payload,
    durasiKerjaPerArea: payload.modeTanggal === "broadcast"
      ? buildBroadcastPerAreaRecord(payload.labaRugiIds, payload.durasiKerjaBroadcast)
      : payload.durasiKerjaPerArea,
  };
}

export function AddPerawatanDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [overriddenAreas, setOverriddenAreas] = useState<Record<string, boolean>>({});
  const [submittedRecords, setSubmittedRecords] = useState<any[] | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dropdownOptions, isLoading: isLoadingOptions } = useQuery<DropdownOptions>({
    queryKey: ["perawatan-dropdown-options"], queryFn: async () => {
      const res = await fetch("/api/notion/perawatan-dropdown-options");
      if (!res.ok) throw new Error("Gagal mengambil dropdown"); return res.json();
    }, enabled: open,
  });

  const form = useForm<PerawatanFormValues>({ resolver: zodResolver(perawatanSchema), defaultValues: EMPTY_VALUES, shouldUnregister: false });
  const { fields: produkFields, append: appendProduk, remove: removeProduk } = useFieldArray({ control: form.control, name: "logProduk" });
  const selectedAreaIds = useWatch({ control: form.control, name: "labaRugiIds" }) ?? [];

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    const s = new Date(start).getTime(); const e = new Date(end).getTime();
    if (e > s) return Math.round(((e - s) / (1000 * 60 * 60)) * 10) / 10;
    return 0;
  };

  const savePerawatan = useMutation({
    mutationFn: async (payload: PerawatanFormValues) => {
      const cleanPayload = sanitizePerawatanPayload(payload);

      const response = await fetch("/api/notion/add-perawatan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cleanPayload) });
      if (!response.ok) { const errText = await response.text(); throw new Error(errText || "Gagal menyimpan perawatan"); }
      return response.json();
    },
    onSuccess: async (data) => {
  await queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey(), refetchType: "all" });
  
  // 🎯 GANTI DI SINI: Sesuaikan nama fungsinya dengan state yang baru
  if (data && data.data) setSubmittedRecords(data.data);
  
  form.reset(EMPTY_VALUES); 
  setOverriddenAreas({});
},
    onError: (error) => toast({ variant: "destructive", title: "Gagal menyimpan", description: error instanceof Error ? error.message : "Cek kembali koneksi internet.", }),
  });

  const handleNextStep = async () => {
    let fieldsToValidate: Array<keyof PerawatanFormValues> = [];
    if (step === 1) fieldsToValidate = ["kegiatan", "labaRugiIds"];
    if (step === 1 && form.getValues("labaRugiIds").length === 0) { toast({ variant: "destructive", title: "Oops!", description: "Pilih minimal 1 Area." }); return; }

    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) setStep((prev) => prev + 1);
  };

  function onSubmit(values: PerawatanFormValues) {
    savePerawatan.mutate(
      buildAreaOverridePayload({
        values,
        areaIds: values.labaRugiIds,
        overriddenAreas,
        modeKeys: PERAWATAN_MODE_KEYS,
        fields: PERAWATAN_OVERRIDE_FIELDS,
      }),
    );
  }

  const handleEnableOverride = (areaId: string) => {
    const updates = copyBroadcastToArea(form.getValues(), areaId, PERAWATAN_OVERRIDE_FIELDS);
    Object.entries(updates).forEach(([key, value]) => form.setValue(key as keyof PerawatanFormValues, value));
    setOverriddenAreas(prev => ({ ...pruneOverrideState(form.getValues("labaRugiIds"), prev), [areaId]: true }));
  };

  const handleCancelOverride = (areaId: string) => {
    const updates = resetAreaOverride(form.getValues(), areaId, PERAWATAN_OVERRIDE_FIELDS);
    Object.entries(updates).forEach(([key, value]) => form.setValue(key as keyof PerawatanFormValues, value));
    setOverriddenAreas(prev => {
      const next = pruneOverrideState(form.getValues("labaRugiIds"), prev);
      delete next[areaId];
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setStep(1); setSubmittedRecords(null); setOverriddenAreas({}); } }}>
      <SheetTrigger asChild>
        <Button className="h-11 rounded-xl px-5 font-bold transition-all active:scale-[0.98] bg-primary text-primary-foreground hover:opacity-90 gap-2">
          <PlusCircle className="h-4 w-4" /> Perawatan
        </Button>
      </SheetTrigger>

      {/* TINGGI FULL-LAYAR DIHAPUS, BIAR SERAGAM IPHONE SHORTCUT SHEET */}
      <SheetContent side="top" className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] pb-5">

        {/* HEADER */}
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shadow-sm"><Sprout className="h-5 w-5" /></div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Input Perawatan</SheetTitle>
              <p className="text-[10px] font-bold text-primary tracking-wider uppercase">Step {step} dari 3</p>
            </div>
          </div>
          <div className="flex gap-1.5">{[1, 2, 3].map((i) => (<div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />))}</div>
        </SheetHeader>

        <div className="px-6 py-4">
            {submittedRecords ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-6 text-center space-y-5">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-1">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-foreground tracking-tight">Data Berhasil Disimpan</h3>
                <p className="text-xs text-muted-foreground font-medium px-4">
                </p>
              </div>
              <div className="w-full space-y-2 pt-4">
                <Button 
                  type="button" 
                  className="w-full h-11 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground hover:opacity-90 mt-1" 
                  onClick={() => { 
                    setOpen(false); 
                    setStep(1); 
                    setSubmittedRecords(null); 
                    setOverriddenAreas({}); 
                    onSuccess?.(); 
                  }}
                >
                  Tutup Form
                </Button>
              </div>
            </motion.div>
          ) : isLoadingOptions ? ( <Skeleton className="h-12 w-full rounded-xl" /> ) : (
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-5 text-left">

                {/* PANEL SCROLLING KHUSUS UNTUK KONTEN INPUTAN SAJA */}
                <div className="max-h-[55vh] overflow-y-auto pr-1 pb-2 space-y-5">
                  <AnimatePresence mode="wait">

                    {/* ================= STEP 1: INFO DASAR & AREA ================= */}
                    {step === 1 && (
                      <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5 pt-1">
                        <FormField control={form.control} name="kegiatan" render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80"><FileText className="inline-block h-3.5 w-3.5 mr-1" /> Nama Kegiatan</FormLabel>
                            <FormControl>
                              <Input className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary shadow-sm text-sm font-medium" placeholder="Cth: Pemupukan..." {...field} />
                            </FormControl>
                          </FormItem>
                        )} />

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80"><MapPinned className="inline-block h-3.5 w-3.5 mr-1" /> Pilih Area Lokasi</p>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{selectedAreaIds.length} terpilih</span>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {dropdownOptions?.areas?.map((item) => {
                              const isSelected = selectedAreaIds.includes(item.id);
                              return (
                                <button key={item.id} type="button" onClick={() => {
                                  const cur = form.getValues("labaRugiIds"); form.setValue("labaRugiIds", isSelected ? cur.filter(id => id !== item.id) : [...cur, item.id], { shouldValidate: true });
                                }} className={`px-4 py-2 rounded-full text-xs font-semibold transition-all border ${isSelected ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.01]" : "bg-card text-muted-foreground border-border hover:bg-muted/80 shadow-sm"}`}>
                                  {item.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* ================= STEP 2: DATA MASTER ================= */}
                    {step === 2 && (
                      <motion.div key="step2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4 pt-1">

                        {/* CARD 1. Waktu */}
                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-3">
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">1. Waktu & Durasi</p>
                          <div className="flex flex-col gap-3">
                           <div className="space-y-1.5"><p className="text-[10px] font-bold text-muted-foreground ml-1">Mulai</p>
                           <Input type="datetime-local" 
    className="h-11 rounded-xl bg-background border-input focus-visible:ring-primary/20 text-xs font-bold w-full min-w-0 flex-1 px-3 appearance-none" value={form.watch("tanggalBroadcast") || ""} onChange={(e) => { form.setValue("tanggalBroadcast", e.target.value); form.setValue("durasiKerjaBroadcast", calculateDuration(e.target.value, form.getValues("tanggalSelesaiBroadcast"))); }} />
                           </div>
                           <div className="space-y-1.5"><p className="text-[10px] font-bold text-muted-foreground ml-1">Selesai</p>
                           <Input type="datetime-local" 
    className="h-11 rounded-xl bg-background border-input focus-visible:ring-primary/20 text-xs font-bold w-full min-w-0 flex-1 px-3 appearance-none" value={form.watch("tanggalSelesaiBroadcast") || ""} onChange={(e) => { form.setValue("tanggalSelesaiBroadcast", e.target.value); form.setValue("durasiKerjaBroadcast", calculateDuration(form.getValues("tanggalBroadcast"), e.target.value)); }} />
                           </div>
                           </div>

                          <div className="space-y-1.5 pt-1.5"><p className="text-[10px] font-bold text-muted-foreground ml-1">Durasi Total (Jam)</p>
                            <Input type="number" step="0.1" className="h-11 rounded-xl bg-background border-input focus-visible:ring-primary/20 text-sm font-bold w-1/2" value={form.watch("durasiKerjaBroadcast") || 0} onChange={(e) => form.setValue("durasiKerjaBroadcast", Number(e.target.value))} />
                          </div>
                        </div>

                        {/* CARD 2. Bahan / Produk */}
                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-3">
                          <div className="flex justify-between items-center">
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">2. Racikan Bahan</p>
                            <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] rounded-md bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" onClick={() => appendProduk({ produk: "", dosis: "" })}><Plus className="h-3 w-3 mr-1" /> Tambah</Button>
                          </div>
                          {produkFields.length === 0 && <p className="text-xs text-muted-foreground/60 italic p-3 text-center border border-dashed border-border rounded-xl">Belum ada bahan ditambahkan.</p>}

                          <div className="space-y-2">
                            <AnimatePresence>
                              {produkFields.map((field, index) => (
                                <motion.div key={field.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex gap-2 items-start bg-muted/40 p-2 rounded-xl border border-border overflow-hidden">
                                  <div className="grid grid-cols-2 gap-2 flex-1">
                                    <Input className="h-9 text-xs bg-background border-input rounded-lg focus-visible:ring-primary/20" placeholder="Nama Produk" {...form.register(`logProduk.${index}.produk`)} />
                                    <Input className="h-9 text-xs bg-background border-input rounded-lg focus-visible:ring-primary/20" placeholder="Dosis" {...form.register(`logProduk.${index}.dosis`)} />
                                  </div>
                                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0 rounded-lg" onClick={() => removeProduk(index)}><Trash2 className="h-4 w-4" /></Button>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* CARD 3. Pekerja */}
                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-3">
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">3. Tim Pekerja</p>
                          <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                            {dropdownOptions?.petugas?.map((item) => {
                              const isSelected = form.watch("petugasBroadcast").includes(item.id);
                              return (
                              <button key={item.id} type="button" onClick={() => {
                                const cur = form.getValues("petugasBroadcast"); form.setValue("petugasBroadcast", isSelected ? cur.filter(id => id !== item.id) : [...cur, item.id]);
                              }} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${isSelected ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105" : "bg-background text-muted-foreground border-border hover:bg-muted/80 shadow-sm"}`}>{item.name}</button>
                            )})}
                          </div>
                        </div>

                        {/* CARD 4. Tags, Status & Catatan */}
                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-3">
                           <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">4. Atribut & Catatan</p>
                           <div className="grid grid-cols-2 gap-3">
                              <Select onValueChange={(val) => form.setValue("tagsBroadcast", val)} value={form.watch("tagsBroadcast") || ""}>
                                <SelectTrigger className="h-10 rounded-xl bg-background border-input text-xs font-medium"><SelectValue placeholder="Pilih tag..." /></SelectTrigger>
                                <SelectContent className="rounded-xl"><SelectItem value="Pengocoran">Pengocoran</SelectItem><SelectItem value="Penyemprotan">Penyemprotan</SelectItem><SelectItem value="Pemupukan Dasar">Pemupukan Dasar</SelectItem><SelectItem value="Selingan">Selingan</SelectItem><SelectItem value="Lainnya">Lainnya</SelectItem></SelectContent>
                              </Select>
                              <Select onValueChange={(val) => form.setValue("statusBroadcast", val)} value={form.watch("statusBroadcast") || ""}>
                                <SelectTrigger className="h-10 rounded-xl bg-background border-input text-xs font-medium"><SelectValue placeholder="Status..." /></SelectTrigger>
                                <SelectContent className="rounded-xl"><SelectItem value="Rencana">Rencana</SelectItem><SelectItem value="Proses">Sedang Berlangsung</SelectItem><SelectItem value="Selesai">Selesai</SelectItem></SelectContent>
                              </Select>
                           </div>
                           <Textarea placeholder="Catatan opsional..." className="min-h-[80px] rounded-xl bg-background border-input text-xs mt-1 p-2.5" {...form.register("catatanBroadcast")} />
                        </div>
                      </motion.div>
                    )}

                    {/* ================= STEP 3: REVIEW & CUSTOM PER AREA ================= */}
                    {step === 3 && (
                      <motion.div key="step3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4 pt-1">
                        <div className="bg-primary/10 text-primary p-3 rounded-2xl border border-primary/20 text-[11px] font-medium leading-relaxed shadow-sm">
                          💡 <span className="font-bold">Info:</span> Semua area otomatis memakai <span className="font-bold">Data Master</span>. Klik "Ubah Khusus" jika ada area dengan racikan / jam kerja yang berbeda.
                        </div>

                        {selectedAreaIds.map((areaId) => {
                          const areaName = dropdownOptions?.areas?.find((a) => a.id === areaId)?.name || `Area`;
                          const isOverridden = overriddenAreas[areaId];

                          return (
                            <div key={areaId} className={`p-3.5 rounded-2xl border transition-all shadow-sm ${isOverridden ? "border-primary/50 ring-1 ring-primary/15 bg-card" : "border-border bg-card"}`}>
                              <div className="flex justify-between items-center">
                                <Badge variant="outline" className={`font-bold px-2.5 py-0.5 text-[11px] ${isOverridden ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}`}>{areaName}</Badge>
                                {!isOverridden ? (
                                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg" onClick={() => handleEnableOverride(areaId)}><Edit3 className="h-3 w-3 mr-1" /> Ubah Khusus</Button>
                                ) : (
                                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-destructive hover:bg-destructive/5 rounded-lg" onClick={() => handleCancelOverride(areaId)}><Undo2 className="h-3 w-3 mr-1" /> Batal</Button>
                                )}
                              </div>

{/* TAMPILAN MINI-FORM JIKA DI-OVERRIDE */}
{isOverridden && (
  <div className="mt-4 space-y-4 pt-4 border-t border-border/50 animate-in fade-in zoom-in-95">
    {/* Waktu Spesifik */}
    <div className="flex flex-col gap-2">
      <div className="space-y-1 w-full max-w-full overflow-hidden">
        <p className="text-[9px] font-bold text-muted-foreground uppercase">Mulai</p>
        <div className="w-full flex">
          <Input 
            type="datetime-local" 
            className="h-8 text-[10px] bg-background border-input w-full min-w-0 flex-1 px-2 appearance-none" 
            value={form.watch(`tanggalPerArea.${areaId}`) || ""} 
            onChange={(e) => { form.setValue(`tanggalPerArea.${areaId}`, e.target.value); form.setValue(`durasiKerjaPerArea.${areaId}`, calculateDuration(e.target.value, form.getValues(`tanggalSelesaiPerArea.${areaId}`))); }} 
          />
        </div>
      </div>
      
      <div className="space-y-1 w-full max-w-full overflow-hidden">
        <p className="text-[9px] font-bold text-muted-foreground uppercase">Selesai</p>
        <div className="w-full flex">
          <Input 
            type="datetime-local" 
            className="h-8 text-[10px] bg-background border-input w-full min-w-0 flex-1 px-2 appearance-none" 
            value={form.watch(`tanggalSelesaiPerArea.${areaId}`) || ""} 
            onChange={(e) => { form.setValue(`tanggalSelesaiPerArea.${areaId}`, e.target.value); form.setValue(`durasiKerjaPerArea.${areaId}`, calculateDuration(form.getValues(`tanggalPerArea.${areaId}`), e.target.value)); }} 
          />
        </div>
      </div>
    </div>
   <div className="flex items-center gap-2"><p className="text-[9px] font-bold text-muted-foreground uppercase">Durasi:</p><Input type="number" step="0.1" className="h-7 w-16 text-[10px] font-bold px-1 bg-background border-input" value={form.watch(`durasiKerjaPerArea.${areaId}`) || 0} onChange={(e) => form.setValue(`durasiKerjaPerArea.${areaId}`, Number(e.target.value))} /><span className="text-[9px] font-bold">Jam</span></div>

                                  {/* Bahan Spesifik */}
                                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                                    <div className="flex justify-between items-center"><p className="text-[9px] font-bold text-muted-foreground uppercase">Bahan / Dosis</p><Button type="button" variant="outline" size="sm" className="h-6 text-[9px] py-0 px-1.5 rounded bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" onClick={() => form.setValue(`produkPerArea.${areaId}`, [...(form.getValues(`produkPerArea.${areaId}`)||[]), {produk:"", dosis:""}])}><Plus className="h-2 w-2 mr-1" /> Tambah</Button></div>
                                    {(form.watch(`produkPerArea.${areaId}`) || []).map((prod, idx) => (
                                      <div key={idx} className="flex gap-1.5"><Input className="h-8 text-[10px] bg-background border-input" placeholder="Produk" value={prod.produk} onChange={(e) => { const arr = [...form.getValues(`produkPerArea.${areaId}`)]; arr[idx].produk = e.target.value; form.setValue(`produkPerArea.${areaId}`, arr); }} /><Input className="h-8 text-[10px] bg-background border-input" placeholder="Dosis" value={prod.dosis} onChange={(e) => { const arr = [...form.getValues(`produkPerArea.${areaId}`)]; arr[idx].dosis = e.target.value; form.setValue(`produkPerArea.${areaId}`, arr); }} /><Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-md" onClick={() => { const arr = [...form.getValues(`produkPerArea.${areaId}`)]; arr.splice(idx,1); form.setValue(`produkPerArea.${areaId}`, arr); }}><Trash2 className="h-3.5 w-3.5" /></Button></div>
                                    ))}
                                  </div>

                                  {/* Status & Catatan Spesifik */}
                                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                                    <Select onValueChange={(val) => form.setValue(`tagsPerArea.${areaId}`, val)} value={form.watch(`tagsPerArea.${areaId}`) || ""}><SelectTrigger className="h-8 text-[10px] bg-background border-input"><SelectValue placeholder="Tag" /></SelectTrigger><SelectContent><SelectItem value="Pengocoran">Pengocoran</SelectItem><SelectItem value="Penyemprotan">Penyemprotan</SelectItem><SelectItem value="Lainnya">Lainnya</SelectItem></SelectContent></Select>
                                    <Select onValueChange={(val) => form.setValue(`statusPerArea.${areaId}`, val)} value={form.watch(`statusPerArea.${areaId}`) || ""}><SelectTrigger className="h-8 text-[10px] bg-background border-input"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="Rencana">Rencana</SelectItem><SelectItem value="Proses">Sedang Berlangsung</SelectItem><SelectItem value="Selesai">Selesai</SelectItem></SelectContent></Select>
                                  </div>
                                  <Textarea placeholder="Catatan khusus area ini..." className="min-h-[50px] text-[10px] bg-background border-input rounded-lg p-2" {...form.register(`catatanPerArea.${areaId}` as any)} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ================= NAVIGASI NORMAL DI BAWAH KONTEN ================= */}
                <div className="flex justify-between items-center pt-4 border-t border-border mt-2">
                  {step > 1 ? (
                    <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted" onClick={() => setStep((p) => p - 1)} disabled={savePerawatan.isPending}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
                  ) : (
                    <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted" onClick={() => setOpen(false)}>Batal</Button>
                  )}

                  {step < 3 ? (
                    <Button type="button" className="h-11 rounded-xl px-5 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm" onClick={handleNextStep}>Lanjut <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  ) : (
                    <Button type="button" className="h-11 rounded-xl px-6 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98] shadow-sm" disabled={savePerawatan.isPending} onClick={form.handleSubmit(onSubmit)}>
                      {savePerawatan.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Simpan Data</>}
                    </Button>
                  )}
                </div>

              </form>
            </Form>
          )}
        </div>

        {/* CAPSULE BAR KHAS IPHONE DI SINI TETAP UTUH & MELAYANG INDAH */}
        <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-border" />
      </SheetContent>
    </Sheet>
  );
}
