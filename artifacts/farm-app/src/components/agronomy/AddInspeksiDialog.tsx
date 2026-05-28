import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Activity, Trash2, 
  ExternalLink, Loader2, MapPinned, Briefcase, PlusCircle, Edit3, Undo2
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

// --- DAFTAR HAMA & PENYAKIT BAWAAN ---
const DAFTAR_HAMA = ["Thrips", "Kutu Kebul", "Aphids", "Tungau", "Ulat", "Lalat Buah"];
const DAFTAR_PENYAKIT = ["Antraknosa / Patek", "Bercak Daun", "Layu Fusarium", "Layu Bakteri", "Virus Kuning / Bule"];
const PRESET_HAMA_PENYAKIT = [...DAFTAR_HAMA, ...DAFTAR_PENYAKIT];

// ==========================================
// ZOD SCHEMA
// ==========================================
const inspeksiSchema = z.object({
  kegiatan: z.string().min(1, "Nama kegiatan wajib diisi"),
  areaIds: z.array(z.string()).min(1, "Minimal pilih 1 area"),

  modeWaktu: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  waktuMulaiBroadcast: z.string().optional(),
  waktuSelesaiBroadcast: z.string().optional(),
  durasiKerjaBroadcast: z.coerce.number().min(0).default(0),
  waktuMulaiPerArea: z.record(z.string()).default({}),
  waktuSelesaiPerArea: z.record(z.string()).default({}),
  durasiKerjaPerArea: z.record(z.number()).default({}),

  modeKendala: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  kendalaBroadcast: z.array(z.string()).default([]),
  kendalaPerArea: z.record(z.array(z.string())).default({}),
  temuanBroadcast: z.record(z.string()).default({}), 
  temuanPerArea: z.record(z.record(z.string())).default({}), 

  modeAngka: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  phTanahBroadcast: z.string().optional(),
  tingkatSeranganBroadcast: z.string().optional(),
  radiusBroadcast: z.string().optional(),
  phTanahPerArea: z.record(z.string()).default({}),
  tingkatSeranganPerArea: z.record(z.string()).default({}),
  radiusPerArea: z.record(z.string()).default({}),

  modePekerja: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  pekerjaBroadcast: z.array(z.string()).default([]),
  pekerjaPerArea: z.record(z.array(z.string())).default({}),

  modeAtribut: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  statusBroadcast: z.string().default("Baru di temukan"),
  statusPerArea: z.record(z.string()).default({}),

  modeCatatan: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  keteranganBroadcast: z.string().optional(),
  keteranganPerArea: z.record(z.string()).default({}),
});

type InspeksiFormValues = z.infer<typeof inspeksiSchema>;

interface DropdownOptions { areas: Array<{ id: string; name: string }>; petugas: Array<{ id: string; name: string }>; }

const EMPTY_VALUES: InspeksiFormValues = {
  kegiatan: "Inspeksi Rutin", areaIds: [],
  modeWaktu: "broadcast", waktuMulaiBroadcast: format(new Date(), "yyyy-MM-dd'T'HH:mm"), waktuSelesaiBroadcast: "", durasiKerjaBroadcast: 0, waktuMulaiPerArea: {}, waktuSelesaiPerArea: {}, durasiKerjaPerArea: {},
  modeKendala: "broadcast", kendalaBroadcast: [], kendalaPerArea: {}, temuanBroadcast: {}, temuanPerArea: {},
  modeAngka: "broadcast", phTanahBroadcast: "", tingkatSeranganBroadcast: "", radiusBroadcast: "", phTanahPerArea: {}, tingkatSeranganPerArea: {}, radiusPerArea: {},
  modePekerja: "broadcast", pekerjaBroadcast: [], pekerjaPerArea: {},
  modeAtribut: "broadcast", statusBroadcast: "Baru di temukan", statusPerArea: {},
  modeCatatan: "broadcast", keteranganBroadcast: "", keteranganPerArea: {},
};

export function AddInspeksiDialog({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [overriddenAreas, setOverriddenAreas] = useState<Record<string, boolean>>({}); 
  const [successUrls, setSuccessUrls] = useState<{pageId: string, notionUrl: string}[] | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dropdownOptions, isLoading: isLoadingOptions } = useQuery<DropdownOptions>({
    queryKey: ["inspeksi-dropdown-options"], queryFn: async () => {
      const res = await fetch("/api/notion/inspeksi-dropdown-options");
      if (!res.ok) throw new Error("Gagal mengambil data dropdown");
      return res.json();
    }, enabled: open,
  });

  const form = useForm<InspeksiFormValues>({ resolver: zodResolver(inspeksiSchema), defaultValues: EMPTY_VALUES, shouldUnregister: false });

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    const s = new Date(start).getTime(); const e = new Date(end).getTime();
    if (e > s) return Math.round(((e - s) / (1000 * 60 * 60)) * 10) / 10; return 0;
  };

  const saveInspeksi = useMutation({
    mutationFn: async (payload: InspeksiFormValues) => {
      const hamaBroadcast = payload.kendalaBroadcast.filter(k => DAFTAR_HAMA.includes(k));
      const penyakitBroadcast = payload.kendalaBroadcast.filter(k => DAFTAR_PENYAKIT.includes(k));
      const formatTemuanBroadcast = Object.entries(payload.temuanBroadcast).map(([nama, catatan]) => ({ nama, catatan }));

      const hamaPerArea: Record<string, string[]> = {};
      const penyakitPerArea: Record<string, string[]> = {};
      const formatTemuanPerArea: Record<string, Array<{nama: string; catatan: string}>> = {};
      
      payload.areaIds.forEach(id => {
        const k = payload.kendalaPerArea[id] || [];
        hamaPerArea[id] = k.filter(item => DAFTAR_HAMA.includes(item));
        penyakitPerArea[id] = k.filter(item => DAFTAR_PENYAKIT.includes(item));
        
        const tArea = payload.temuanPerArea[id] || {};
        formatTemuanPerArea[id] = Object.entries(tArea).map(([nama, catatan]) => ({ nama, catatan }));
      });

      const parseAngka = (val?: string) => val ? Number(val) : undefined;
      const parseSerangan = (val?: string) => val ? Number(val) / 100 : undefined;
      
      const tsPerArea: Record<string, number> = {};
      const radPerArea: Record<string, number> = {};
      const phPerArea: Record<string, number> = {};
      payload.areaIds.forEach(id => {
        const ts = parseSerangan(payload.tingkatSeranganPerArea[id]); if (ts !== undefined) tsPerArea[id] = ts;
        const rd = parseAngka(payload.radiusPerArea[id]); if (rd !== undefined) radPerArea[id] = rd;
        const ph = parseAngka(payload.phTanahPerArea[id]); if (ph !== undefined) phPerArea[id] = ph;
      });

      const finalDurasiPerArea = payload.modeWaktu === "broadcast" 
        ? payload.areaIds.reduce((acc, id) => ({ ...acc, [id]: payload.durasiKerjaBroadcast }), {}) 
        : payload.durasiKerjaPerArea;

      const cleanPayload = {
        ...payload,
        durasiKerjaPerArea: finalDurasiPerArea,
        hamaBroadcast, penyakitBroadcast, hamaPerArea, penyakitPerArea,
        temuanBroadcast: formatTemuanBroadcast, temuanPerArea: formatTemuanPerArea,
        tingkatSeranganBroadcast: parseSerangan(payload.tingkatSeranganBroadcast),
        radiusBroadcast: parseAngka(payload.radiusBroadcast), phTanahBroadcast: parseAngka(payload.phTanahBroadcast),
        tingkatSeranganPerArea: tsPerArea, radiusPerArea: radPerArea, phTanahPerArea: phPerArea,
        petugasBroadcast: payload.pekerjaBroadcast, petugasPerArea: payload.pekerjaPerArea,
      };

      const response = await fetch("/api/notion/add-inspeksi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cleanPayload) });
      if (!response.ok) { const errText = await response.text(); throw new Error(errText || "Gagal menyimpan inspeksi"); }
      return response.json();
    },
    onSuccess: async (responseData) => {
      await queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey(), refetchType: "all" });
      const results = responseData?.data || [];
      if (results.length > 0) setSuccessUrls(results);
      form.reset(EMPTY_VALUES); setOverriddenAreas({});
    },
    onError: (error) => toast({ variant: "destructive", title: "Gagal menyimpan", description: error instanceof Error ? error.message : "Cek kembali koneksi internet." }),
  });

  const handleNextStep = async () => {
    let fieldsToValidate: Array<keyof InspeksiFormValues> = [];
    if (step === 1) fieldsToValidate = ["kegiatan", "areaIds"];
    if (step === 1 && form.getValues("areaIds").length === 0) { toast({ variant: "destructive", title: "Oops!", description: "Pilih minimal 1 Area." }); return; }

    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) setStep((prev) => prev + 1);
  };

  // 👇 MANIPULATOR PAYLOAD OTOMATIS SEBELUM SUBMIT 👇
  function onSubmit(values: InspeksiFormValues) {
    const hasOverride = Object.values(overriddenAreas).some(Boolean);
    const finalPayload = { ...values };

    if (hasOverride) {
      finalPayload.modeWaktu = "spesifik"; finalPayload.modeKendala = "spesifik"; finalPayload.modeAngka = "spesifik"; finalPayload.modePekerja = "spesifik"; finalPayload.modeAtribut = "spesifik"; finalPayload.modeCatatan = "spesifik";
      
      finalPayload.areaIds.forEach(id => {
        if (!overriddenAreas[id]) {
          finalPayload.waktuMulaiPerArea[id] = values.waktuMulaiBroadcast || "";
          finalPayload.waktuSelesaiPerArea[id] = values.waktuSelesaiBroadcast || "";
          finalPayload.durasiKerjaPerArea[id] = values.durasiKerjaBroadcast || 0;
          finalPayload.kendalaPerArea[id] = [...values.kendalaBroadcast];
          finalPayload.temuanPerArea[id] = { ...values.temuanBroadcast };
          finalPayload.phTanahPerArea[id] = values.phTanahBroadcast || "";
          finalPayload.tingkatSeranganPerArea[id] = values.tingkatSeranganBroadcast || "";
          finalPayload.radiusPerArea[id] = values.radiusBroadcast || "";
          finalPayload.pekerjaPerArea[id] = [...values.pekerjaBroadcast];
          finalPayload.statusPerArea[id] = values.statusBroadcast || "Baru di temukan";
          finalPayload.keteranganPerArea[id] = values.keteranganBroadcast || "";
        }
      });
    } else {
      finalPayload.modeWaktu = "broadcast"; finalPayload.modeKendala = "broadcast"; finalPayload.modeAngka = "broadcast"; finalPayload.modePekerja = "broadcast"; finalPayload.modeAtribut = "broadcast"; finalPayload.modeCatatan = "broadcast";
    }
    
    saveInspeksi.mutate(finalPayload);
  }

  // --- HELPER UNTUK OVERRIDE ---
  const handleEnableOverride = (areaId: string) => {
    form.setValue(`waktuMulaiPerArea.${areaId}`, form.getValues("waktuMulaiBroadcast"));
    form.setValue(`waktuSelesaiPerArea.${areaId}`, form.getValues("waktuSelesaiBroadcast"));
    form.setValue(`durasiKerjaPerArea.${areaId}`, form.getValues("durasiKerjaBroadcast"));
    form.setValue(`kendalaPerArea.${areaId}`, [...form.getValues("kendalaBroadcast")]);
    form.setValue(`temuanPerArea.${areaId}`, { ...form.getValues("temuanBroadcast") });
    form.setValue(`phTanahPerArea.${areaId}`, form.getValues("phTanahBroadcast"));
    form.setValue(`tingkatSeranganPerArea.${areaId}`, form.getValues("tingkatSeranganBroadcast"));
    form.setValue(`radiusPerArea.${areaId}`, form.getValues("radiusBroadcast"));
    form.setValue(`pekerjaPerArea.${areaId}`, [...form.getValues("pekerjaBroadcast")]);
    form.setValue(`statusPerArea.${areaId}`, form.getValues("statusBroadcast"));
    form.setValue(`keteranganPerArea.${areaId}`, form.getValues("keteranganBroadcast"));
    setOverriddenAreas(prev => ({ ...prev, [areaId]: true }));
  };

  const handleCancelOverride = (areaId: string) => {
    setOverriddenAreas(prev => ({ ...prev, [areaId]: false }));
  };

  const handleToggleHamaBroadcast = (item: string) => {
    const cur = form.getValues("kendalaBroadcast");
    if (cur.includes(item)) {
      form.setValue("kendalaBroadcast", cur.filter(i => i !== item));
      const newTemuan = { ...form.getValues("temuanBroadcast") }; delete newTemuan[item]; form.setValue("temuanBroadcast", newTemuan);
    } else form.setValue("kendalaBroadcast", [...cur, item]);
  };

  const handleToggleHamaSpesifik = (areaId: string, item: string) => {
    const cur = form.getValues(`kendalaPerArea.${areaId}`) || [];
    if (cur.includes(item)) {
      form.setValue(`kendalaPerArea.${areaId}`, cur.filter(i => i !== item));
      const newTemuan = { ...form.getValues(`temuanPerArea.${areaId}`) }; delete newTemuan[item]; form.setValue(`temuanPerArea.${areaId}`, newTemuan);
    } else form.setValue(`kendalaPerArea.${areaId}`, [...cur, item]);
  };

  return (
    <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setStep(1); setSuccessUrls(null); setOverriddenAreas({}); } }}>
      <SheetTrigger asChild>
        <Button className="h-11 rounded-xl px-5 font-bold transition-all active:scale-[0.98] bg-primary text-primary-foreground hover:opacity-90 gap-2">
          <Activity className="h-4 w-4" /> Inspeksi
        </Button>
      </SheetTrigger>

      {/* FLOAT SHEET iPHONE STYLE */}
      <SheetContent side="top" className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] pb-5">
        
        {/* HEADER */}
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shadow-sm"><Activity className="h-5 w-5" /></div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Input Inspeksi</SheetTitle>
              <p className="text-[10px] font-bold text-primary tracking-wider uppercase">Step {step} dari 3</p>
            </div>
          </div>
          <div className="flex gap-1.5">{[1, 2, 3].map((i) => (<div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />))}</div>
        </SheetHeader>

        <div className="px-6 py-4">
          {successUrls ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-6 text-center space-y-5">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-1"><CheckCircle2 className="h-8 w-8 text-primary" /></div>
              <div className="space-y-1"><h3 className="text-base font-black text-foreground tracking-tight">Sukses Tersimpan!</h3><p className="text-xs text-muted-foreground font-medium px-4">Data berhasil dicatat ke Notion.</p></div>
              <div className="w-full space-y-2 pt-2 max-h-[40vh] overflow-y-auto">
                {successUrls.map((item, idx) => (
                  <Button key={item.pageId} type="button" variant="outline" className="w-full h-11 rounded-xl text-xs font-bold border-primary/20 text-primary bg-primary/5 hover:bg-primary/10" onClick={() => window.open(item.notionUrl, "_blank")}>
                    <ExternalLink className="mr-2 h-3.5 w-3.5" /> Buka Notion Area {idx + 1}
                  </Button>
                ))}
                <Button type="button" className="w-full h-11 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground hover:opacity-90 mt-1" onClick={() => { setOpen(false); setStep(1); setSuccessUrls(null); setOverriddenAreas({}); onSuccess?.(); }}>Tutup Form</Button>
              </div>
            </motion.div>
          ) : isLoadingOptions ? ( <Skeleton className="h-12 w-full rounded-xl" /> ) : (
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-5 text-left">
                
                {/* 👇 PANEL SCROLLING KHUSUS KONTEN 👇 */}
                <div className="max-h-[55vh] overflow-y-auto pr-1 pb-2 space-y-5">
                  <AnimatePresence mode="wait">
                    
                    {/* ================= STEP 1: INFO DASAR (ANCHOR) ================= */}
                    {step === 1 && (
                      <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5 pt-1">
                        <FormField control={form.control} name="kegiatan" render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80"><Briefcase className="inline-block h-3.5 w-3.5 mr-1" /> Nama Inspeksi</FormLabel>
                            <FormControl><Input className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary shadow-sm text-sm font-medium" placeholder="Cth: Inspeksi Rutin..." {...field} /></FormControl>
                            <FormMessage className="text-xs text-destructive" />
                          </FormItem>
                        )} />
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80"><MapPinned className="inline-block h-3.5 w-3.5 mr-1" /> Pilih Area Lokasi</p>
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{form.watch("areaIds").length} terpilih</span>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {dropdownOptions?.areas?.map((item) => {
                              const isSelected = form.watch("areaIds").includes(item.id);
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

                    {/* ================= STEP 2: DATA MASTER INSPEKSI ================= */}
                    {step === 2 && (
                      <motion.div key="step2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4 pt-1">
                        
                        {/* Waktu & Durasi */}
                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-3">
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">1. Waktu & Durasi</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5"><p className="text-[10px] font-bold text-muted-foreground ml-1">Mulai</p>
                              <Input type="datetime-local" className="h-11 rounded-xl bg-background border-input focus-visible:ring-primary/20 text-xs font-bold w-full" value={form.watch("waktuMulaiBroadcast") || ""} onChange={(e) => { form.setValue("waktuMulaiBroadcast", e.target.value); form.setValue("durasiKerjaBroadcast", calculateDuration(e.target.value, form.getValues("waktuSelesaiBroadcast"))); }} />
                            </div>
                            <div className="space-y-1.5"><p className="text-[10px] font-bold text-muted-foreground ml-1">Selesai</p>
                              <Input type="datetime-local" className="h-11 rounded-xl bg-background border-input focus-visible:ring-primary/20 text-xs font-bold w-full" value={form.watch("waktuSelesaiBroadcast") || ""} onChange={(e) => { form.setValue("waktuSelesaiBroadcast", e.target.value); form.setValue("durasiKerjaBroadcast", calculateDuration(form.getValues("waktuMulaiBroadcast"), e.target.value)); }} />
                            </div>
                          </div>
                          <div className="space-y-1.5 pt-1.5"><p className="text-[10px] font-bold text-muted-foreground ml-1">Total Durasi (Jam)</p>
                            <Input type="number" step="0.1" className="h-11 rounded-xl bg-background border-input focus-visible:ring-primary/20 text-sm font-bold w-1/2" value={form.watch("durasiKerjaBroadcast") || 0} onChange={(e) => form.setValue("durasiKerjaBroadcast", Number(e.target.value))} />
                          </div>
                        </div>

                        {/* Temuan Hama / Penyakit */}
                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-3">
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">2. Catatan Temuan Lapangan</p>
                          <Select onValueChange={(val) => handleToggleHamaBroadcast(val)}>
                            <SelectTrigger className="w-full h-11 rounded-xl bg-background border-input font-bold text-xs"><SelectValue placeholder="+ Tambah Hama / Penyakit" /></SelectTrigger>
                            <SelectContent className="max-h-60 rounded-xl">{PRESET_HAMA_PENYAKIT.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                          </Select>
                          
                          {form.watch("kendalaBroadcast").length === 0 && <p className="text-xs text-muted-foreground/60 italic p-3 text-center border border-dashed border-border rounded-xl mt-2">Belum ada temuan.</p>}
                          
                          <div className="space-y-2 mt-2">
                            <AnimatePresence>
                              {form.watch("kendalaBroadcast").map((item) => (
                                <motion.div key={item} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-muted/40 p-3 rounded-xl border border-border overflow-hidden">
                                  <div className="flex justify-between items-center mb-2">
                                    <Badge className={`${DAFTAR_PENYAKIT.includes(item) ? "bg-purple-500/10 text-purple-600 border-purple-200" : "bg-destructive/10 text-destructive border-destructive/20"}`} variant="outline">{item}</Badge>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-md" onClick={() => handleToggleHamaBroadcast(item)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                  </div>
                                  <Input placeholder={`Deskripsi khusus ${item}...`} className="h-10 text-xs bg-background border-input rounded-lg" value={form.watch(`temuanBroadcast.${item}`) || ""} onChange={(e) => form.setValue(`temuanBroadcast.${item}`, e.target.value)} />
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Angka Terukur */}
                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-3">
                           <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">3. Parameter Terukur (Opsional)</p>
                           <div className="grid grid-cols-3 gap-3">
                              <div className="space-y-1.5"><p className="text-[10px] font-bold text-muted-foreground ml-1">pH Tanah</p><Input type="number" step="0.1" className="h-11 rounded-xl bg-background border-input text-sm font-bold" placeholder="6.5" value={form.watch("phTanahBroadcast") || ""} onChange={(e) => form.setValue("phTanahBroadcast", e.target.value)} /></div>
                              <div className="space-y-1.5"><p className="text-[10px] font-bold text-muted-foreground ml-1">Serangan(%)</p><Input type="number" className="h-11 rounded-xl bg-background border-input text-sm font-bold" placeholder="15" value={form.watch("tingkatSeranganBroadcast") || ""} onChange={(e) => form.setValue("tingkatSeranganBroadcast", e.target.value)} /></div>
                              <div className="space-y-1.5"><p className="text-[10px] font-bold text-muted-foreground ml-1">Radius(m2)</p><Input type="number" className="h-11 rounded-xl bg-background border-input text-sm font-bold" placeholder="10" value={form.watch("radiusBroadcast") || ""} onChange={(e) => form.setValue("radiusBroadcast", e.target.value)} /></div>
                           </div>
                        </div>

                        {/* Pekerja, Status, Catatan Tambahan */}
                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
                          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">4. Tim & Status Penyelesaian</p>
                          <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto pr-1">
                            {dropdownOptions?.petugas?.map((item) => {
                              const isSelected = form.watch("pekerjaBroadcast").includes(item.id);
                              return (
                              <button key={item.id} type="button" onClick={() => {
                                const cur = form.getValues("pekerjaBroadcast"); form.setValue("pekerjaBroadcast", isSelected ? cur.filter(id => id !== item.id) : [...cur, item.id]);
                              }} className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border ${isSelected ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105" : "bg-background text-muted-foreground border-border hover:bg-muted/80 shadow-sm"}`}>{item.name}</button>
                            )})}
                          </div>
                          <Select onValueChange={(val) => form.setValue("statusBroadcast", val)} value={form.watch("statusBroadcast")}>
                            <SelectTrigger className="h-11 rounded-xl bg-background border-input text-xs font-bold"><SelectValue placeholder="Pilih status..." /></SelectTrigger>
                            <SelectContent className="rounded-xl"><SelectItem value="Baru di temukan">Baru di temukan</SelectItem><SelectItem value="Sedang ditangani">Sedang ditangani</SelectItem><SelectItem value="Sudah ditangani">Sudah ditangani</SelectItem></SelectContent>
                          </Select>
                          <Textarea placeholder="Catatan cuaca atau operasional opsional..." className="min-h-[80px] rounded-xl bg-background border-input focus-visible:ring-primary/20 text-xs p-3" value={form.watch("keteranganBroadcast") || ""} onChange={(e) => form.setValue("keteranganBroadcast", e.target.value)} />
                        </div>
                      </motion.div>
                    )}

                    {/* ================= STEP 3: REVIEW & CUSTOM PER AREA ================= */}
                    {step === 3 && (
                      <motion.div key="step3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4 pt-1">
                        <div className="bg-primary/10 text-primary p-3 rounded-2xl border border-primary/20 text-[11px] font-medium leading-relaxed shadow-sm">
                          💡 <span className="font-bold">Info:</span> Semua area otomatis memakai <span className="font-bold">Data Master</span>. Klik "Ubah Khusus" jika ada area dengan jenis hama atau status yang berbeda.
                        </div>

                        {form.watch("areaIds").map((areaId) => {
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
                                  {/* Waktu Spesifik */}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1"><p className="text-[9px] font-bold text-muted-foreground uppercase">Mulai</p><Input type="datetime-local" className="h-8 text-[10px] bg-background border-input" value={form.watch(`waktuMulaiPerArea.${areaId}`) || ""} onChange={(e) => { form.setValue(`waktuMulaiPerArea.${areaId}`, e.target.value); form.setValue(`durasiKerjaPerArea.${areaId}`, calculateDuration(e.target.value, form.getValues(`waktuSelesaiPerArea.${areaId}`))); }} /></div>
                                    <div className="space-y-1"><p className="text-[9px] font-bold text-muted-foreground uppercase">Selesai</p><Input type="datetime-local" className="h-8 text-[10px] bg-background border-input" value={form.watch(`waktuSelesaiPerArea.${areaId}`) || ""} onChange={(e) => { form.setValue(`waktuSelesaiPerArea.${areaId}`, e.target.value); form.setValue(`durasiKerjaPerArea.${areaId}`, calculateDuration(form.getValues(`waktuMulaiPerArea.${areaId}`), e.target.value)); }} /></div>
                                  </div>
                                  <div className="flex items-center gap-2"><p className="text-[9px] font-bold text-muted-foreground uppercase">Durasi:</p><Input type="number" step="0.1" className="h-7 w-16 text-[10px] font-bold px-1 bg-background border-input" value={form.watch(`durasiKerjaPerArea.${areaId}`) || 0} onChange={(e) => form.setValue(`durasiKerjaPerArea.${areaId}`, Number(e.target.value))} /><span className="text-[9px] font-bold">Jam</span></div>
                                  
                                  {/* Temuan Hama / Penyakit Spesifik */}
                                  <div className="space-y-2 pt-2 border-t border-border/50">
                                    <Select onValueChange={(val) => handleToggleHamaSpesifik(areaId, val)}>
                                      <SelectTrigger className="w-full h-8 rounded-lg bg-background border-input font-bold text-[10px]"><SelectValue placeholder="+ Tambah Temuan Khusus Area Ini" /></SelectTrigger>
                                      <SelectContent className="max-h-60 rounded-xl">{PRESET_HAMA_PENYAKIT.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                    </Select>
                                    {form.watch(`kendalaPerArea.${areaId}`)?.map((item) => (
                                      <div key={item} className="bg-muted/30 p-2 rounded-lg border border-border/50 mt-2">
                                        <div className="flex justify-between items-center mb-1.5"><span className="text-[10px] font-bold">{item}</span><Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleToggleHamaSpesifik(areaId, item)}><Trash2 className="h-3 w-3 text-destructive" /></Button></div>
                                        <Input placeholder={`Catatan ${item}...`} className="h-7 text-[10px] bg-background border-input" value={form.watch(`temuanPerArea.${areaId}.${item}`) || ""} onChange={(e) => form.setValue(`temuanPerArea.${areaId}.${item}`, e.target.value)} />
                                      </div>
                                    ))}
                                  </div>

                                  {/* Parameter Spesifik */}
                                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                                    <div className="space-y-1"><p className="text-[9px] font-bold text-muted-foreground">pH Tanah</p><Input type="number" step="0.1" className="h-8 text-[10px] font-bold bg-background border-input" value={form.watch(`phTanahPerArea.${areaId}`) || ""} onChange={(e) => form.setValue(`phTanahPerArea.${areaId}`, e.target.value)} /></div>
                                    <div className="space-y-1"><p className="text-[9px] font-bold text-muted-foreground">Serangan(%)</p><Input type="number" className="h-8 text-[10px] font-bold bg-background border-input" value={form.watch(`tingkatSeranganPerArea.${areaId}`) || ""} onChange={(e) => form.setValue(`tingkatSeranganPerArea.${areaId}`, e.target.value)} /></div>
                                    <div className="space-y-1"><p className="text-[9px] font-bold text-muted-foreground">Radius(m2)</p><Input type="number" className="h-8 text-[10px] font-bold bg-background border-input" value={form.watch(`radiusPerArea.${areaId}`) || ""} onChange={(e) => form.setValue(`radiusPerArea.${areaId}`, e.target.value)} /></div>
                                  </div>
                                  
                                  {/* Pekerja Spesifik */}
                                  <div className="space-y-1.5 pt-2 border-t border-border/50">
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
                                  
                                  {/* Status & Catatan Spesifik */}
                                  <div className="pt-2 border-t border-border/50 space-y-2">
                                    <Select onValueChange={(val) => form.setValue(`statusPerArea.${areaId}`, val)} value={form.watch(`statusPerArea.${areaId}`) || ""}><SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="Baru di temukan">Baru di temukan</SelectItem><SelectItem value="Sedang ditangani">Sedang ditangani</SelectItem><SelectItem value="Sudah ditangani">Sudah ditangani</SelectItem></SelectContent></Select>
                                    <Textarea placeholder="Catatan khusus area ini..." className="min-h-[50px] text-[10px] bg-background border-input rounded-lg p-2" value={form.watch(`keteranganPerArea.${areaId}`) || ""} onChange={(e) => form.setValue(`keteranganPerArea.${areaId}`, e.target.value)} />
                                  </div>
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
                    <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted" onClick={() => setStep((p) => p - 1)} disabled={saveInspeksi.isPending}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
                  ) : (
                    <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted" onClick={() => setOpen(false)}>Batal</Button>
                  )}
                  
                  {step < 3 ? (
                    <Button type="button" className="h-11 rounded-xl px-5 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm" onClick={handleNextStep}>Lanjut <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  ) : (
                    <Button type="button" className="h-11 rounded-xl px-6 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98] shadow-sm" disabled={saveInspeksi.isPending} onClick={form.handleSubmit(onSubmit)}>
                      {saveInspeksi.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Kirim ke Notion</>}
                    </Button>
                  )}
                </div>

              </form>
            </Form>
          )}
        </div>
        
        {/* CAPSULE BAR KHAS IPHONE */}
        <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-border" />
      </SheetContent>
    </Sheet>
  );
}
