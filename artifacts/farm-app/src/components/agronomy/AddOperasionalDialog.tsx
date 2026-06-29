import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, CheckCircle2, HardHat,
  ExternalLink, FileText, Loader2, MapPinned, PlusCircle,
  Briefcase, Wrench, Edit3, Undo2, Check, X, Plus
} from "lucide-react";

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

// ==========================================
// ZOD SCHEMA
// ==========================================
const operasionalSchema = z.object({
  namaPekerjaan: z.string().min(1, "Nama pekerjaan wajib diisi"),
  areaIds: z.array(z.string()).min(1, "Minimal pilih 1 area"),

  modeKategori: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  kategoriBroadcast: z.string().optional(),
  kategoriPerArea: z.record(z.string()).default({}),

  modeWaktu: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  waktuMulaiBroadcast: z.string().optional(),
  waktuSelesaiBroadcast: z.string().optional(),
  durasiKerjaBroadcast: z.coerce.number().min(0).default(0),
  waktuMulaiPerArea: z.record(z.string()).default({}),
  waktuSelesaiPerArea: z.record(z.string()).default({}),
  durasiKerjaPerArea: z.record(z.number()).default({}),

  modePekerja: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  pekerjaBroadcast: z.array(z.string()).default([]),
  pekerjaPerArea: z.record(z.array(z.string())).default({}),

  modeAtribut: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  statusBroadcast: z.string().default("Belum dikerjakan"),
  prioritasBroadcast: z.string().default("Medium"),
  statusPerArea: z.record(z.string()).default({}),
  prioritasPerArea: z.record(z.string()).default({}),
  jenisTenagaKerjaPerArea: z.record(z.string()).default({}),

  modeCatatan: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  catatanBroadcast: z.string().optional(),
  catatanPerArea: z.record(z.string()).default({}),
});

type OperasionalFormValues = z.infer<typeof operasionalSchema>;

interface DropdownOptions { 
  areas: Array<{ id: string; name: string }>; 
  petugas: Array<{ id: string; name: string }>; 
  kategori: Array<{ id: string; name: string; module: string }>; 
}

const OPERASIONAL_OVERRIDE_FIELDS = [
  { broadcastKey: "kategoriBroadcast", perAreaKey: "kategoriPerArea" },
  { broadcastKey: "waktuMulaiBroadcast", perAreaKey: "waktuMulaiPerArea" },
  { broadcastKey: "waktuSelesaiBroadcast", perAreaKey: "waktuSelesaiPerArea" },
  { broadcastKey: "durasiKerjaBroadcast", perAreaKey: "durasiKerjaPerArea" },
  { broadcastKey: "pekerjaBroadcast", perAreaKey: "pekerjaPerArea" },
  { broadcastKey: "statusBroadcast", perAreaKey: "statusPerArea" },
  { broadcastKey: "prioritasBroadcast", perAreaKey: "prioritasPerArea" },
  { broadcastKey: "catatanBroadcast", perAreaKey: "catatanPerArea" },
] as const satisfies Array<{ broadcastKey: keyof OperasionalFormValues; perAreaKey: keyof OperasionalFormValues }>;

const OPERASIONAL_MODE_KEYS = ["modeKategori", "modeWaktu", "modePekerja", "modeAtribut", "modeCatatan"] as const satisfies Array<keyof OperasionalFormValues>;

const EMPTY_VALUES: OperasionalFormValues = {
  namaPekerjaan: "", areaIds: [],
  modeKategori: "broadcast", kategoriBroadcast: "", kategoriPerArea: {},
  modeWaktu: "broadcast", waktuMulaiBroadcast: format(new Date(), "yyyy-MM-dd'T'HH:mm"), waktuSelesaiBroadcast: "", durasiKerjaBroadcast: 0, waktuMulaiPerArea: {}, waktuSelesaiPerArea: {}, durasiKerjaPerArea: {},
  modePekerja: "broadcast", pekerjaBroadcast: [], pekerjaPerArea: {},
  modeAtribut: "broadcast", statusBroadcast: "Belum dikerjakan", prioritasBroadcast: "Medium", statusPerArea: {}, prioritasPerArea: {},
  modeCatatan: "broadcast", catatanBroadcast: "", catatanPerArea: {},
};

function sanitizeOperasionalPayload(payload: OperasionalFormValues): OperasionalFormValues {
  return {
    ...payload,
    durasiKerjaPerArea: payload.modeWaktu === "broadcast"
      ? buildBroadcastPerAreaRecord(payload.areaIds, payload.durasiKerjaBroadcast)
      : payload.durasiKerjaPerArea,
  };
}

export function AddOperasionalDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [overriddenAreas, setOverriddenAreas] = useState<Record<string, boolean>>({});
  const [submittedRecords, setSubmittedRecords] = useState<any[] | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dropdownOptions, isLoading: isLoadingOptions } = useQuery<DropdownOptions>({
    queryKey: ["operasional-dropdown-options"],
    queryFn: async () => {
      const res = await fetch("/api/notion/operasional-dropdown-options");
      if (!res.ok) throw new Error("Gagal mengambil data dropdown");
      return res.json();
    },
    enabled: open,
  });

  // --- STATE TAMBAH MASTER DATA ---
  const [isAddingKategori, setIsAddingKategori] = useState(false); const [newKategoriName, setNewKategoriName] = useState("");

  const addMasterMutation = useMutation({
    mutationFn: async ({ type, payload }: { type: 'kategori', payload: any }) => {
      const res = await fetch(`/api/notion/${type}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`Gagal tambah ${type}`); return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operasional-dropdown-options"] }),
    onError: (err) => toast({ variant: "destructive", title: "Gagal", description: err.message })
  });

  const form = useForm<OperasionalFormValues>({
    resolver: zodResolver(operasionalSchema),
    defaultValues: EMPTY_VALUES,
    shouldUnregister: false,
  });
  const selectedAreaIds = useWatch({ control: form.control, name: "areaIds" }) ?? [];

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (e > s) return Math.round(((e - s) / (1000 * 60 * 60)) * 10) / 10;
    return 0;
  };

  const saveOperasional = useMutation({
    mutationFn: async (payload: OperasionalFormValues) => {
      const cleanPayload = sanitizeOperasionalPayload(payload);
      const response = await fetch("/api/notion/add-operasional", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Gagal menyimpan operasional");
      }
      return response.json();
    },
        onSuccess: async (responseData) => {
      // 💡 Tambahkan ini agar tabel master langsung sinkron & narik data terbaru!
      await queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] });
      
      await queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey(), refetchType: "all" });
      const results = responseData?.data || [];

      if (results.length > 0) setSubmittedRecords(results);
      form.reset(EMPTY_VALUES); setOverriddenAreas({});
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: error instanceof Error ? error.message : "Cek kembali koneksi internet." });
    },
  });

  const handleNextStep = async () => {
    let fieldsToValidate: Array<keyof OperasionalFormValues> = [];
    if (step === 1) fieldsToValidate = ["namaPekerjaan", "areaIds"];

    if (step === 1 && form.getValues("areaIds").length === 0) {
      toast({ variant: "destructive", title: "Oops!", description: "Pilih minimal 1 Area" }); return;
    }

    if (step === 2) {
      if (!form.getValues("kategoriBroadcast")) {
        toast({ variant: "destructive", title: "Oops!", description: "Kategori wajib dipilih." }); return;
      }
      if (form.getValues("pekerjaBroadcast").length === 0) {
        toast({ variant: "destructive", title: "Oops!", description: "Minimal pilih 1 pekerja." }); return;
      }
    }

    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) setStep((prev) => prev + 1);
  };

    // 👇 MANIPULATOR PAYLOAD (SUDAH DIPERBAIKI) 👇
  function onSubmit(values: OperasionalFormValues) {
    const hasOverrides = Object.keys(overriddenAreas).length > 0;
    
    const basePayload = buildAreaOverridePayload({
      values,
      areaIds: values.areaIds,
      overriddenAreas,
      modeKeys: OPERASIONAL_MODE_KEYS,
      fields: OPERASIONAL_OVERRIDE_FIELDS,
    });

    // SELAMATKAN DATA ASLI JIKA ADA OVERRIDE
    if (hasOverrides) {
      basePayload.modeKategori = "spesifik";
      basePayload.modeWaktu = "spesifik";
      basePayload.modePekerja = "spesifik";
      basePayload.modeAtribut = "spesifik";
      basePayload.modeCatatan = "spesifik";

      // 💡 Inisialisasi ulang agar tidak undefined
      basePayload.kategoriPerArea = {};
      basePayload.waktuMulaiPerArea = {};
      basePayload.waktuSelesaiPerArea = {};
      basePayload.durasiKerjaPerArea = {};
      basePayload.pekerjaPerArea = {};
      basePayload.statusPerArea = {};
      basePayload.prioritasPerArea = {};
      basePayload.catatanPerArea = {};

      // 💡 Looping semua area. 
      // Jika area di-override, ambil data dari spesifik. 
      // Jika TIDAK, isi dengan data dari Broadcast.
      values.areaIds.forEach((areaId) => {
        const isOvr = overriddenAreas[areaId];

        basePayload.kategoriPerArea[areaId] = isOvr ? values.kategoriPerArea[areaId] : values.kategoriBroadcast;
        basePayload.waktuMulaiPerArea[areaId] = isOvr ? values.waktuMulaiPerArea[areaId] : values.waktuMulaiBroadcast;
        basePayload.waktuSelesaiPerArea[areaId] = isOvr ? values.waktuSelesaiPerArea[areaId] : values.waktuSelesaiBroadcast;
        basePayload.durasiKerjaPerArea[areaId] = isOvr ? values.durasiKerjaPerArea[areaId] : values.durasiKerjaBroadcast;
        basePayload.pekerjaPerArea[areaId] = isOvr ? (values.pekerjaPerArea[areaId] || []) : values.pekerjaBroadcast;
        basePayload.statusPerArea[areaId] = isOvr ? values.statusPerArea[areaId] : values.statusBroadcast;
        basePayload.prioritasPerArea[areaId] = isOvr ? values.prioritasPerArea[areaId] : values.prioritasBroadcast;
        basePayload.catatanPerArea[areaId] = isOvr ? values.catatanPerArea[areaId] : values.catatanBroadcast;
      });
    }

    saveOperasional.mutate(basePayload);
  }

  // --- HELPER UNTUK OVERRIDE ---
  const handleEnableOverride = (areaId: string) => {
    const updates = copyBroadcastToArea(form.getValues(), areaId, OPERASIONAL_OVERRIDE_FIELDS);
    Object.entries(updates).forEach(([key, value]) => form.setValue(key as keyof OperasionalFormValues, value));
    setOverriddenAreas(prev => ({ ...pruneOverrideState(form.getValues("areaIds"), prev), [areaId]: true }));
  };

  const handleCancelOverride = (areaId: string) => {
    const updates = resetAreaOverride(form.getValues(), areaId, OPERASIONAL_OVERRIDE_FIELDS);
    Object.entries(updates).forEach(([key, value]) => form.setValue(key as keyof OperasionalFormValues, value));
    setOverriddenAreas(prev => {
      const next = pruneOverrideState(form.getValues("areaIds"), prev);
      delete next[areaId];
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setStep(1); setSubmittedRecords(null); setOverriddenAreas({}); } }}>
      <SheetTrigger asChild>
        <Button className="h-11 rounded-xl px-5 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98] gap-2">
          <PlusCircle className="h-4 w-4" /> Operasional
        </Button>
      </SheetTrigger>

      <SheetContent side="top" className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] pb-5">
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shadow-sm"><HardHat className="h-5 w-5" /></div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Input Operasional</SheetTitle>
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
              </div>
              <div className="w-full space-y-2 pt-4">
                <Button type="button" className="w-full h-11 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground hover:opacity-90 mt-1" onClick={() => { setOpen(false); setStep(1); setSubmittedRecords(null); setOverriddenAreas({}); onSuccess?.(); }}>
                  Tutup Form
                </Button>
              </div>
            </motion.div>
          ) : isLoadingOptions ? ( <Skeleton className="h-12 w-full rounded-xl" /> ) : (
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-5 text-left">
                <div className="max-h-[55vh] overflow-y-auto pr-1 pb-2 space-y-5">
                  <AnimatePresence mode="wait">

  {/* ================= STEP 1 ================= */}
                    {step === 1 && (
                      <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5 pt-1">
                        <FormField control={form.control} name="namaPekerjaan" render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80"><Briefcase className="inline-block h-3.5 w-3.5 mr-1" /> Nama Pekerjaan</FormLabel>
                            <FormControl><Input className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium" placeholder="Cth: Pemanenan, Perbaikan Pompa..." {...field} /></FormControl>
                            <FormMessage className="text-xs text-red-500" />
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
                                  const cur = form.getValues("areaIds"); form.setValue("areaIds", isSelected ? cur.filter(id => id !== item.id) : [...cur, item.id], { shouldValidate: true });
                                }} className={`px-4 py-2 rounded-full text-xs font-semibold transition-all border ${isSelected ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.01]" : "bg-card text-muted-foreground border-border hover:bg-muted/80 shadow-sm"}`}>
                                  {item.name}
                                </button>
                              );
                            })}
                            
                          </div>
                        </div>
                      </motion.div>
                    )}

{/* ================= STEP 2 ================= */}
                    {step === 2 && (
                      <motion.div key="step2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4 pt-1">
  <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-3">
  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">1. Waktu & Durasi</p>
  <div className="grid grid-cols-2 gap-2">
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-muted-foreground ml-1">Mulai</p>
      <Input type="datetime-local" className="h-11 rounded-xl bg-background border-input text-xs font-bold w-full px-2 appearance-none" value={form.watch("waktuMulaiBroadcast") || ""} onChange={(e) => { form.setValue("waktuMulaiBroadcast", e.target.value); form.setValue("durasiKerjaBroadcast", calculateDuration(e.target.value, form.getValues("waktuSelesaiBroadcast"))); }} />
    </div>
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-muted-foreground ml-1">Selesai</p>
      <Input type="datetime-local" className="h-11 rounded-xl bg-background border-input text-xs font-bold w-full px-2 appearance-none" value={form.watch("waktuSelesaiBroadcast") || ""} onChange={(e) => { form.setValue("waktuSelesaiBroadcast", e.target.value); form.setValue("durasiKerjaBroadcast", calculateDuration(form.getValues("waktuMulaiBroadcast"), e.target.value)); }} />
    </div>
  </div>

                          <div className="space-y-1.5 pt-1.5"><p className="text-[10px] font-bold text-muted-foreground ml-1">Total Durasi (Jam)</p>
                            <Input type="number" step="0.1" className="h-11 rounded-xl bg-background border-input text-sm font-bold w-1/2" value={form.watch("durasiKerjaBroadcast") || 0} onChange={(e) => form.setValue("durasiKerjaBroadcast", Number(e.target.value))} />
                          </div>
                        </div>

                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
                          <div className="space-y-1.5">
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">2. Kategori & Tim Pekerja</p>
                            <Select onValueChange={(val) => form.setValue("kategoriBroadcast", val)} value={form.watch("kategoriBroadcast") || ""}>
                              <SelectTrigger className="h-11 rounded-xl bg-background border-input text-xs font-medium"><SelectValue placeholder="Pilih Kategori..." /></SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {dropdownOptions?.kategori
                                  ?.filter((kat) => kat.module === "operasional")
                                  .map((kat) => (
                                    <SelectItem key={kat.id} value={kat.id}>{kat.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {/* INPUT TAMBAH KATEGORI */}
                            {isAddingKategori ? (
                              <div className="flex items-center gap-1 mt-1 bg-muted/50 rounded-lg p-1 border border-border">
                                <input autoFocus className="bg-transparent text-[11px] px-1 outline-none w-full font-medium" placeholder="Kategori baru..." value={newKategoriName} onChange={(e) => setNewKategoriName(e.target.value)} />
                                <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-green-600 rounded-md shrink-0" onClick={() => { addMasterMutation.mutate({ type: 'kategori', payload: { name: newKategoriName, module: 'operasional' }}); setIsAddingKategori(false); setNewKategoriName(""); }}><Check className="h-3 w-3"/></Button>
                                <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive rounded-md shrink-0" onClick={() => setIsAddingKategori(false)}><X className="h-3 w-3"/></Button>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setIsAddingKategori(true)} className="text-[10px] font-bold text-primary flex items-center hover:underline pl-1 pt-0.5"><Plus className="h-3 w-3 mr-0.5"/> Tambah Kategori</button>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 items-center pt-2 border-t border-border/50 mt-3">
                            {dropdownOptions?.petugas?.map((item) => {
                              const isSelected = form.watch("pekerjaBroadcast").includes(item.id);
                              return (
                              <button key={item.id} type="button" onClick={() => {
                                const cur = form.getValues("pekerjaBroadcast"); form.setValue("pekerjaBroadcast", isSelected ? cur.filter(id => id !== item.id) : [...cur, item.id]);
                              }} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${isSelected ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105" : "bg-background text-muted-foreground border-border hover:bg-muted/80 shadow-sm"}`}>{item.name}</button>
                            )})}
                          
                          </div>
                        </div>

                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-3">
                           <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">3. Atribut & Catatan Lapangan</p>
                            <div className="grid grid-cols-2 gap-3">
                              <Select onValueChange={(val) => form.setValue("statusBroadcast", val)} value={form.watch("statusBroadcast") || ""}>
                                <SelectTrigger className="h-11 rounded-xl bg-background border-input text-xs font-medium"><SelectValue placeholder="Status..." /></SelectTrigger>
                                <SelectContent className="rounded-xl"><SelectItem value="Belum dikerjakan">Belum dikerjakan</SelectItem><SelectItem value="Dalam proses">Dalam proses</SelectItem><SelectItem value="Selesai">Selesai</SelectItem></SelectContent>
                              </Select>
                              <Select onValueChange={(val) => form.setValue("prioritasBroadcast", val)} value={form.watch("prioritasBroadcast") || ""}>
                                <SelectTrigger className="h-11 rounded-xl bg-background border-input text-xs font-medium"><SelectValue placeholder="Prioritas..." /></SelectTrigger>
                                <SelectContent className="rounded-xl"><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent>
                              </Select>
                           </div>
                           <Textarea placeholder="Catatan opsional..." className="min-h-[90px] rounded-xl bg-background border-input text-xs mt-2 p-3" {...form.register("catatanBroadcast")} />

                        </div>
                      </motion.div>
                    )}

                    {/* ================= STEP 3 ================= */}
                    {step === 3 && (
                      <motion.div key="step3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4 pt-1">
                        <div className="bg-primary/10 text-primary p-3 rounded-2xl border border-primary/20 text-[11px] font-medium leading-relaxed shadow-sm">
                          💡 <span className="font-bold">Info:</span> Semua area otomatis memakai <span className="font-bold">Data Master</span>. Klik "Ubah Khusus" jika ada area dengan prioritas, pekerja, atau jam yang berbeda.
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

                              {isOverridden && (
                                <div className="mt-3 space-y-3.5 pt-3 border-t border-border/50 animate-in fade-in zoom-in-95">
 <div className="grid grid-cols-2 gap-2">
  <div className="space-y-1">
    <p className="text-[9px] font-bold text-muted-foreground uppercase">Mulai</p>
    <Input type="datetime-local" className="h-8 text-[10px] bg-background border-input w-full px-1 appearance-none" value={form.watch(`waktuMulaiPerArea.${areaId}`) || ""} onChange={(e) => { form.setValue(`waktuMulaiPerArea.${areaId}`, e.target.value); form.setValue(`durasiKerjaPerArea.${areaId}`, calculateDuration(e.target.value, form.getValues(`waktuSelesaiPerArea.${areaId}`))); }} />
  </div>
  <div className="space-y-1">
    <p className="text-[9px] font-bold text-muted-foreground uppercase">Selesai</p>
    <Input type="datetime-local" className="h-8 text-[10px] bg-background border-input w-full px-1 appearance-none" value={form.watch(`waktuSelesaiPerArea.${areaId}`) || ""} onChange={(e) => { form.setValue(`waktuSelesaiPerArea.${areaId}`, e.target.value); form.setValue(`durasiKerjaPerArea.${areaId}`, calculateDuration(form.getValues(`waktuMulaiPerArea.${areaId}`), e.target.value)); }} />
  </div>
</div>

                                  <div className="flex items-center gap-2"><p className="text-[9px] font-bold text-muted-foreground uppercase">Durasi:</p><Input type="number" step="0.1" className="h-7 w-16 text-[10px] font-bold px-1 bg-background border-input" value={form.watch(`durasiKerjaPerArea.${areaId}`) || 0} onChange={(e) => form.setValue(`durasiKerjaPerArea.${areaId}`, Number(e.target.value))} /><span className="text-[9px] font-bold">Jam</span></div>

                                  <div className="space-y-2 pt-2 border-t border-border/50">
                                    <Select onValueChange={(val) => form.setValue(`kategoriPerArea.${areaId}`, val)} value={form.watch(`kategoriPerArea.${areaId}`) || ""}>
                                      <SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="Kategori" /></SelectTrigger>
                                       <SelectContent>
                                        {dropdownOptions?.kategori
                                          ?.filter((kat) => kat.module === "operasional")
                                          .map((kat) => (
                                            <SelectItem key={kat.id} value={kat.id}>{kat.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>

                                    <div className="space-y-1.5 pt-1">
                                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Tim Pekerja Area Ini</p>
                                      <div className="flex flex-wrap gap-1">
                                        {dropdownOptions?.petugas?.map((item) => {
                                          const isSelected = form.watch(`pekerjaPerArea.${areaId}`)?.includes(item.id);
                                          return (
                                            <button key={item.id} type="button" onClick={() => {
                                              const cur = form.getValues(`pekerjaPerArea.${areaId}`) || []; form.setValue(`pekerjaPerArea.${areaId}`, isSelected ? cur.filter(id => id !== item.id) : [...cur, item.id]);
                                            }} className={`px-2 py-1 rounded-full text-[9px] font-semibold transition-all border ${isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border"}`}>{item.name}</button>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                                    <Select onValueChange={(val) => form.setValue(`statusPerArea.${areaId}`, val)} value={form.watch(`statusPerArea.${areaId}`) || ""}><SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="Belum dikerjakan">Belum dikerjakan</SelectItem><SelectItem value="Dalam proses">Dalam proses</SelectItem><SelectItem value="Selesai">Selesai</SelectItem></SelectContent></Select>
                                    <Select onValueChange={(val) => form.setValue(`prioritasPerArea.${areaId}`, val)} value={form.watch(`prioritasPerArea.${areaId}`) || ""}><SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="Prioritas" /></SelectTrigger><SelectContent><SelectItem value="Low">Low</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="High">High</SelectItem></SelectContent></Select>
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
 
                 {/* ================= NAVIGASI ================= */}
                 <div className="flex justify-between items-center pt-4 border-t border-border mt-2">
                   {step > 1 ? (
                     <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted" onClick={() => setStep((p) => p - 1)} disabled={saveOperasional.isPending}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
                   ) : (
                     <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted" onClick={() => setOpen(false)}>Batal</Button>
                   )}

                   {step < 3 ? (
                     <Button type="button" className="h-11 rounded-xl px-5 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm" onClick={handleNextStep}>Lanjut <ArrowRight className="ml-2 h-4 w-4" /></Button>
                   ) : (
                     <Button type="button" className="h-11 rounded-xl px-6 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm" disabled={saveOperasional.isPending} onClick={form.handleSubmit(onSubmit)}>
                       {saveOperasional.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Simpan Data</>}
                     </Button>
                   )}
                 </div>
               </form>
             </Form>
           )}
         </div>
         <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-border" />
       </SheetContent>
     </Sheet>
   );
 }
