import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Activity, Trash2, CalendarIcon,
  ExternalLink, Loader2, MapPinned, PlusCircle, Briefcase, Bug
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
// 1. ZOD SCHEMA (ULTIMATE CUSTOM ENGINE)
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
  const [successUrls, setSuccessUrls] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dropdownOptions, isLoading: isLoadingOptions } = useQuery<DropdownOptions>({
    queryKey: ["inspeksi-dropdown-options"],
    queryFn: async () => {
      const res = await fetch("/api/notion/inspeksi-dropdown-options");
      if (!res.ok) throw new Error("Gagal mengambil data dropdown");
      return res.json();
    },
    enabled: open,
  });

  const form = useForm<InspeksiFormValues>({
    resolver: zodResolver(inspeksiSchema),
    defaultValues: EMPTY_VALUES,
  });

  const closeAndReset = () => {
    form.reset(EMPTY_VALUES);
    setStep(1); setSuccessUrls([]); setOpen(false); onSuccess?.();
  };

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return 0;
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (e > s) return Math.round(((e - s) / (1000 * 60 * 60)) * 10) / 10;
    return 0;
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
        kegiatan: payload.kegiatan,
        areaIds: payload.areaIds,
        
        modeWaktu: payload.modeWaktu,
        waktuMulaiBroadcast: payload.waktuMulaiBroadcast,
        waktuSelesaiBroadcast: payload.waktuSelesaiBroadcast,
        waktuMulaiPerArea: payload.waktuMulaiPerArea,
        waktuSelesaiPerArea: payload.waktuSelesaiPerArea,
        durasiKerjaPerArea: finalDurasiPerArea,
        
        modeKendala: payload.modeKendala,
        hamaBroadcast, penyakitBroadcast,
        hamaPerArea, penyakitPerArea,
        temuanBroadcast: formatTemuanBroadcast,
        temuanPerArea: formatTemuanPerArea,

        modeAngka: payload.modeAngka,
        tingkatSeranganBroadcast: parseSerangan(payload.tingkatSeranganBroadcast),
        radiusBroadcast: parseAngka(payload.radiusBroadcast),
        phTanahBroadcast: parseAngka(payload.phTanahBroadcast),
        tingkatSeranganPerArea: tsPerArea,
        radiusPerArea: radPerArea,
        phTanahPerArea: phPerArea,

        modePekerja: payload.modePekerja,
        petugasBroadcast: payload.pekerjaBroadcast,
        petugasPerArea: payload.pekerjaPerArea,

        modeAtribut: payload.modeAtribut,
        statusBroadcast: payload.statusBroadcast,
        statusPerArea: payload.statusPerArea,

        modeCatatan: payload.modeCatatan,
        keteranganBroadcast: payload.keteranganBroadcast,
        keteranganPerArea: payload.keteranganPerArea,
      };

      const response = await fetch("/api/notion/add-inspeksi", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Gagal menyimpan inspeksi");
      }
      return response.json();
    },
    onSuccess: async (responseData) => {
      await queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey(), refetchType: "all" });
      const results = responseData?.data || [];
      const urls = results.map((d: any) => d.notionUrl).filter(Boolean);
      if (urls.length > 0) setSuccessUrls(urls);
      else { toast({ title: "Berhasil", description: "Data tersimpan." }); closeAndReset(); }
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: error instanceof Error ? error.message : "Cek kembali koneksi internet." });
    },
  });

  const toggleArea = (areaId: string) => {
    const current = form.getValues("areaIds");
    if (current.includes(areaId)) form.setValue("areaIds", current.filter((id) => id !== areaId), { shouldValidate: true });
    else form.setValue("areaIds", [...current, areaId], { shouldValidate: true });
  };

  const toggleWorkerBroadcast = (workerId: string) => {
    const current = form.getValues("pekerjaBroadcast");
    if (current.includes(workerId)) form.setValue("pekerjaBroadcast", current.filter((id) => id !== workerId), { shouldValidate: true });
    else form.setValue("pekerjaBroadcast", [...current, workerId], { shouldValidate: true });
  };

  const toggleWorkerPerArea = (areaId: string, workerId: string) => {
    const current = form.getValues(`pekerjaPerArea.${areaId}`) || [];
    if (current.includes(workerId)) form.setValue(`pekerjaPerArea.${areaId}`, current.filter((id) => id !== workerId), { shouldValidate: true });
    else form.setValue(`pekerjaPerArea.${areaId}`, [...current, workerId], { shouldValidate: true });
  };

  const handleNextStep = async () => {
    let fieldsToValidate: Array<keyof InspeksiFormValues> = [];
    if (step === 1) fieldsToValidate = ["kegiatan", "areaIds"];
    
    if (step === 1 && form.getValues("areaIds").length === 0) {
      toast({ variant: "destructive", title: "Oops!", description: "Pilih minimal 1 Area / Laba Rugi." }); return;
    }

    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) setStep((prev) => prev + 1);
  };

  function onSubmit(values: InspeksiFormValues) {
    saveInspeksi.mutate(values);
  }

  const handleToggleHamaBroadcast = (item: string) => {
    const cur = form.getValues("kendalaBroadcast");
    if (cur.includes(item)) {
      form.setValue("kendalaBroadcast", cur.filter(i => i !== item));
      const newTemuan = { ...form.getValues("temuanBroadcast") };
      delete newTemuan[item];
      form.setValue("temuanBroadcast", newTemuan);
    } else {
      form.setValue("kendalaBroadcast", [...cur, item]);
    }
  };

  const handleToggleHamaSpesifik = (areaId: string, item: string) => {
    const cur = form.getValues(`kendalaPerArea.${areaId}`) || [];
    if (cur.includes(item)) {
      form.setValue(`kendalaPerArea.${areaId}`, cur.filter(i => i !== item));
      const newTemuan = { ...form.getValues(`temuanPerArea.${areaId}`) };
      delete newTemuan[item];
      form.setValue(`temuanPerArea.${areaId}`, newTemuan);
    } else {
      form.setValue(`kendalaPerArea.${areaId}`, [...cur, item]);
    }
  };


  return (
    <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (!val) setStep(1); }}>
      <SheetTrigger asChild>
        <Button className="h-11 rounded-xl px-5 font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all active:scale-[0.98] gap-2"><Activity className="h-4 w-4" /> Inspeksi</Button>
      </SheetTrigger>

      <SheetContent side="top" className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl pb-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
        {successUrls.length > 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center px-6 py-12 text-center space-y-6">
            <div className="h-20 w-20 bg-orange-500/10 text-orange-600 rounded-full flex items-center justify-center"><CheckCircle2 className="h-10 w-10" /></div>
            <div>
              <h3 className="text-xl font-black text-foreground">Sukses Terkirim!</h3>
              <p className="text-sm text-muted-foreground mt-2 font-medium">Data inspeksi sudah mendarat di Notion.</p>
            </div>
            <div className="w-full space-y-3 pt-4 max-h-[40vh] overflow-y-auto">
              {successUrls.map((url, i) => (
                <Button key={i} onClick={() => { window.open(url, "_blank"); if (i === successUrls.length - 1) closeAndReset(); }} className="w-full h-12 rounded-xl bg-[#2b2b2b] hover:bg-black text-white font-bold text-sm shadow-md">
                  <ExternalLink className="mr-2 h-4 w-4" /> Buka Area {i + 1}
                </Button>
              ))}
              <Button variant="ghost" onClick={closeAndReset} className="w-full h-12 rounded-xl font-bold text-muted-foreground hover:bg-muted mt-2">Selesai</Button>
            </div>
          </motion.div>
        ) : (
          <>
            <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-orange-500/10 p-2 text-orange-500"><Activity className="h-5 w-5" /></div>
                <div className="text-left">
                  <SheetTitle className="text-base font-black tracking-tight">Input Inspeksi</SheetTitle>
                  <p className="text-[10px] font-bold text-orange-500 tracking-wider uppercase">Step {step} dari 5</p>
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? "w-3 bg-orange-500" : "w-1 bg-border"}`} />
                ))}
              </div>
            </SheetHeader>

            <div className="px-6 py-4">
              {isLoadingOptions && step >= 1 ? (
                <Skeleton className="h-12 w-full rounded-xl" />
              ) : (
                <Form {...form}>
                  <form onSubmit={(e) => e.preventDefault()} className="space-y-5 text-left">
                    <AnimatePresence mode="wait">
                      
                                            {/* STEP 1: INFO DASAR & WAKTU KERJA */}
                      {step === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                          {/* 👇 BUNGKUSAN SCROLL UTAMA ADA DI SINI BORR 👇 */}
                          <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1 pb-4">
                            
                            <FormField control={form.control} name="kegiatan" render={({ field }) => (
                              <FormItem className="space-y-1.5">
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80"><Briefcase className="inline-block h-3.5 w-3.5 mr-1" /> Nama Inspeksi</FormLabel>
                                <FormControl><Input className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-orange-500/20 text-sm font-medium" placeholder="Cth: Inspeksi Rutin..." {...field} /></FormControl>
                                <FormMessage className="text-xs text-red-500" />
                              </FormItem>
                            )} />
                            
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between sticky top-0 bg-white/90 dark:bg-slate-950/90 py-1 z-10">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80"><MapPinned className="inline-block h-3.5 w-3.5 mr-1" /> Pilih Area Lokasi</p>
                                <span className="text-[10px] font-semibold text-muted-foreground">{form.watch("areaIds").length} terpilih</span>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-2">
                                {dropdownOptions?.areas?.map((item) => {
                                  const isSelected = form.watch("areaIds").includes(item.id);
                                  return (
                                    <button key={item.id} type="button" onClick={() => toggleArea(item.id)} className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border ${isSelected ? "bg-orange-500 text-white border-orange-500 shadow-sm scale-[1.02]" : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"}`}>
                                      {item.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="space-y-3 pt-3 border-t border-border">
                              <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
                                <button type="button" onClick={() => form.setValue("modeWaktu", "broadcast")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeWaktu") === "broadcast" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Sama Semua</button>
                                <button type="button" onClick={() => {
                                  form.setValue("modeWaktu", "spesifik");
                                  const curMulai = form.getValues("waktuMulaiBroadcast");
                                  const curSelesai = form.getValues("waktuSelesaiBroadcast");
                                  const curDurasi = form.getValues("durasiKerjaBroadcast");
                                  form.getValues("areaIds").forEach(id => {
                                    if (!form.getValues(`waktuMulaiPerArea.${id}`)) form.setValue(`waktuMulaiPerArea.${id}`, curMulai || "");
                                    if (!form.getValues(`waktuSelesaiPerArea.${id}`)) form.setValue(`waktuSelesaiPerArea.${id}`, curSelesai || "");
                                    if (!form.getValues(`durasiKerjaPerArea.${id}`)) form.setValue(`durasiKerjaPerArea.${id}`, curDurasi || 0);
                                  });
                                }} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeWaktu") === "spesifik" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Isi Per Area</button>
                              </div>
                              
                              {form.watch("modeWaktu") === "broadcast" ? (
                                <div className="space-y-3 animate-in fade-in">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Mulai</label><Input type="datetime-local" className="h-11 rounded-xl bg-muted border-transparent text-xs font-bold" value={form.watch("waktuMulaiBroadcast") || ""} onChange={(e) => { form.setValue("waktuMulaiBroadcast", e.target.value); form.setValue("durasiKerjaBroadcast", calculateDuration(e.target.value, form.getValues("waktuSelesaiBroadcast"))); }} /></div>
                                    <div className="space-y-1"><label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Selesai</label><Input type="datetime-local" className="h-11 rounded-xl bg-muted border-transparent text-xs font-bold" value={form.watch("waktuSelesaiBroadcast") || ""} onChange={(e) => { form.setValue("waktuSelesaiBroadcast", e.target.value); form.setValue("durasiKerjaBroadcast", calculateDuration(form.getValues("waktuMulaiBroadcast"), e.target.value)); }} /></div>
                                  </div>
                                  <div className="space-y-1"><label className="text-[10px] font-bold text-muted-foreground uppercase ml-1">Total Durasi (Jam)</label><Input type="number" step="0.1" className="h-11 rounded-xl bg-muted border-transparent text-sm font-bold w-1/2" value={form.watch("durasiKerjaBroadcast") || 0} onChange={(e) => form.setValue("durasiKerjaBroadcast", Number(e.target.value))} /></div>
                                </div>
                              ) : (
                                <div className="space-y-4 animate-in fade-in">
                                  {form.watch("areaIds").map((areaId) => {
                                    const areaName = dropdownOptions?.areas?.find((a) => a.id === areaId)?.name || `Area`;
                                    return (
                                      <div key={areaId} className="space-y-2 p-3 rounded-xl border border-border bg-muted/10">
                                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-bold mb-1">{areaName}</Badge>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1"><label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Mulai</label><Input type="datetime-local" className="h-9 text-[11px] font-bold bg-background" value={form.watch(`waktuMulaiPerArea.${areaId}`) || ""} onChange={(e) => { form.setValue(`waktuMulaiPerArea.${areaId}`, e.target.value); form.setValue(`durasiKerjaPerArea.${areaId}`, calculateDuration(e.target.value, form.getValues(`waktuSelesaiPerArea.${areaId}`))); }} /></div>
                                          <div className="space-y-1"><label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Selesai</label><Input type="datetime-local" className="h-9 text-[11px] font-bold bg-background" value={form.watch(`waktuSelesaiPerArea.${areaId}`) || ""} onChange={(e) => { form.setValue(`waktuSelesaiPerArea.${areaId}`, e.target.value); form.setValue(`durasiKerjaPerArea.${areaId}`, calculateDuration(form.getValues(`waktuMulaiPerArea.${areaId}`), e.target.value)); }} /></div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1"><label className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Durasi:</label><Input type="number" step="0.1" className="h-7 w-16 text-[10px] font-bold px-1 bg-background" value={form.watch(`durasiKerjaPerArea.${areaId}`) || 0} onChange={(e) => form.setValue(`durasiKerjaPerArea.${areaId}`, Number(e.target.value))} /><span className="text-[9px] text-muted-foreground font-bold">Jam</span></div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            
                          </div>
                        </motion.div>
                      )}

                      {/* STEP 2: CEKLIS TEMUAN HAMA & PENYAKIT */}
                      {step === 2 && (
                        <motion.div key="step2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1 pb-4">
                            <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
                              <button type="button" onClick={() => form.setValue("modeKendala", "broadcast")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeKendala") === "broadcast" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Temuan Sama</button>
                              <button type="button" onClick={() => form.setValue("modeKendala", "spesifik")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeKendala") === "spesifik" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Beda Per Area</button>
                            </div>

                            {form.watch("modeKendala") === "broadcast" ? (
                              <div className="space-y-3 animate-in fade-in">
                                <Select onValueChange={(val) => handleToggleHamaBroadcast(val)}>
                                  <SelectTrigger className="w-full h-10 rounded-xl bg-muted border-none font-bold text-xs"><SelectValue placeholder="+ Tambah Temuan" /></SelectTrigger>
                                  <SelectContent className="max-h-60">{PRESET_HAMA_PENYAKIT.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                </Select>
                                {form.watch("kendalaBroadcast").map((item) => (
                                  <div key={item} className="bg-muted/30 p-3 rounded-xl border border-border/50">
                                    <div className="flex justify-between items-center mb-2">
                                      <Badge className={DAFTAR_PENYAKIT.includes(item) ? "bg-purple-600" : "bg-red-500"}>{item}</Badge>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleToggleHamaBroadcast(item)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                                    </div>
                                    <Input placeholder={`Catatan untuk ${item}...`} className="h-8 text-xs bg-white" value={form.watch(`temuanBroadcast.${item}`) || ""} onChange={(e) => form.setValue(`temuanBroadcast.${item}`, e.target.value)} />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="space-y-4 animate-in fade-in">
                                {form.watch("areaIds").map((areaId) => {
                                  const areaName = dropdownOptions?.areas?.find((a) => a.id === areaId)?.name || `Area`;
                                  return (
                                    <div key={areaId} className="space-y-2 p-3 rounded-xl border border-border bg-muted/10">
                                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-bold mb-1">{areaName}</Badge>
                                      <Select onValueChange={(val) => handleToggleHamaSpesifik(areaId, val)}>
                                        <SelectTrigger className="w-full h-8 rounded-lg bg-background border-border/50 font-bold text-[11px]"><SelectValue placeholder="+ Tambah Temuan" /></SelectTrigger>
                                        <SelectContent className="max-h-60">{PRESET_HAMA_PENYAKIT.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                      </Select>
                                      {form.watch(`kendalaPerArea.${areaId}`)?.map((item) => (
                                        <div key={item} className="bg-background p-2 rounded-lg border border-border/50 mt-2">
                                          <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-[10px] font-bold">{item}</span>
                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleToggleHamaSpesifik(areaId, item)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                                          </div>
                                          <Input placeholder={`Catatan ${item}...`} className="h-7 text-[10px] bg-muted/30" value={form.watch(`temuanPerArea.${areaId}.${item}`) || ""} onChange={(e) => form.setValue(`temuanPerArea.${areaId}.${item}`, e.target.value)} />
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* STEP 3: ANGKA (SERANGAN, RADIUS, PH) */}
                      {step === 3 && (
                        <motion.div key="step3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 pb-4">
                            <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
                              <button type="button" onClick={() => form.setValue("modeAngka", "broadcast")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeAngka") === "broadcast" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Sama Semua</button>
                              <button type="button" onClick={() => {
                                form.setValue("modeAngka", "spesifik");
                                const cPH = form.getValues("phTanahBroadcast"); const cSer = form.getValues("tingkatSeranganBroadcast"); const cRad = form.getValues("radiusBroadcast");
                                form.getValues("areaIds").forEach(id => {
                                  if (!form.getValues(`phTanahPerArea.${id}`)) form.setValue(`phTanahPerArea.${id}`, cPH || "");
                                  if (!form.getValues(`tingkatSeranganPerArea.${id}`)) form.setValue(`tingkatSeranganPerArea.${id}`, cSer || "");
                                  if (!form.getValues(`radiusPerArea.${id}`)) form.setValue(`radiusPerArea.${id}`, cRad || "");
                                });
                              }} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeAngka") === "spesifik" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Beda Per Area</button>
                            </div>

                            {form.watch("modeAngka") === "broadcast" ? (
                              <div className="grid grid-cols-3 gap-3 animate-in fade-in">
                                <div className="space-y-1"><label className="text-[10px] font-bold text-muted-foreground">pH Tanah</label><Input type="number" step="0.1" className="h-11 rounded-xl bg-muted border-transparent text-sm font-bold" placeholder="6.5" value={form.watch("phTanahBroadcast") || ""} onChange={(e) => form.setValue("phTanahBroadcast", e.target.value)} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-muted-foreground">Serangan(%)</label><Input type="number" className="h-11 rounded-xl bg-muted border-transparent text-sm font-bold" placeholder="15" value={form.watch("tingkatSeranganBroadcast") || ""} onChange={(e) => form.setValue("tingkatSeranganBroadcast", e.target.value)} /></div>
                                <div className="space-y-1"><label className="text-[10px] font-bold text-muted-foreground">Radius(m2)</label><Input type="number" className="h-11 rounded-xl bg-muted border-transparent text-sm font-bold" placeholder="10" value={form.watch("radiusBroadcast") || ""} onChange={(e) => form.setValue("radiusBroadcast", e.target.value)} /></div>
                              </div>
                            ) : (
                              <div className="space-y-4 animate-in fade-in">
                                {form.watch("areaIds").map((areaId) => {
                                  const areaName = dropdownOptions?.areas?.find((a) => a.id === areaId)?.name || `Area`;
                                  return (
                                    <div key={areaId} className="space-y-2 p-3 rounded-xl border border-border bg-muted/10">
                                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-bold mb-1">{areaName}</Badge>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className="space-y-1"><label className="text-[9px] font-bold text-muted-foreground">pH</label><Input type="number" step="0.1" className="h-9 text-[11px] font-bold bg-background" value={form.watch(`phTanahPerArea.${areaId}`) || ""} onChange={(e) => form.setValue(`phTanahPerArea.${areaId}`, e.target.value)} /></div>
                                        <div className="space-y-1"><label className="text-[9px] font-bold text-muted-foreground">Serangan(%)</label><Input type="number" className="h-9 text-[11px] font-bold bg-background" value={form.watch(`tingkatSeranganPerArea.${areaId}`) || ""} onChange={(e) => form.setValue(`tingkatSeranganPerArea.${areaId}`, e.target.value)} /></div>
                                        <div className="space-y-1"><label className="text-[9px] font-bold text-muted-foreground">Rad(m2)</label><Input type="number" className="h-9 text-[11px] font-bold bg-background" value={form.watch(`radiusPerArea.${areaId}`) || ""} onChange={(e) => form.setValue(`radiusPerArea.${areaId}`, e.target.value)} /></div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* STEP 4: PEKERJA & STATUS */}
                      {step === 4 && (
                        <motion.div key="step4" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 pb-4">
                            
                            {/* PEKERJA (Broadcast vs Spesifik) */}
                            <div className="space-y-2 border-b border-border/50 pb-4">
                              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">Tim Pekerja</p>
                              <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
                                <button type="button" onClick={() => form.setValue("modePekerja", "broadcast")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modePekerja") === "broadcast" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Tim Sama</button>
                                <button type="button" onClick={() => form.setValue("modePekerja", "spesifik")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modePekerja") === "spesifik" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Beda Per Area</button>
                              </div>
                              {form.watch("modePekerja") === "broadcast" ? (
                                <div className="flex flex-wrap gap-2 animate-in fade-in pt-1">
                                  {dropdownOptions?.petugas?.map((item) => (
                                    <button key={item.id} type="button" onClick={() => toggleWorkerBroadcast(item.id)} className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border ${form.watch("pekerjaBroadcast").includes(item.id) ? "bg-orange-500 text-white border-orange-500 shadow-sm scale-[1.02]" : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"}`}>{item.name}</button>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-4 animate-in fade-in pt-1">
                                  {form.watch("areaIds").map((areaId) => {
                                    const areaName = dropdownOptions?.areas?.find((a) => a.id === areaId)?.name || `Area`;
                                    return (
                                      <div key={areaId} className="space-y-2 p-3 rounded-xl border border-border bg-muted/10">
                                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-bold mb-2">{areaName}</Badge>
                                        <div className="flex flex-wrap gap-1.5">
                                          {dropdownOptions?.petugas?.map((item) => (
                                            <button key={item.id} type="button" onClick={() => toggleWorkerPerArea(areaId, item.id)} className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all border ${form.watch(`pekerjaPerArea.${areaId}`)?.includes(item.id) ? "bg-orange-500 text-white border-orange-500 shadow-sm" : "bg-background text-muted-foreground border-border/50 hover:bg-muted"}`}>{item.name}</button>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* STATUS (Broadcast vs Spesifik) */}
                            <div className="space-y-2 pt-2">
                              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">Status Penanganan</p>
                              <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
                                <button type="button" onClick={() => form.setValue("modeAtribut", "broadcast")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeAtribut") === "broadcast" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Sama Semua</button>
                                <button type="button" onClick={() => {
                                  form.setValue("modeAtribut", "spesifik");
                                  const curStatus = form.getValues("statusBroadcast");
                                  form.getValues("areaIds").forEach(id => {
                                    if (!form.getValues(`statusPerArea.${id}`)) form.setValue(`statusPerArea.${id}`, curStatus || "Baru di temukan");
                                  });
                                }} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeAtribut") === "spesifik" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Beda Per Area</button>
                              </div>
                              {form.watch("modeAtribut") === "broadcast" ? (
                                <div className="space-y-1.5 animate-in fade-in">
                                  <Select onValueChange={(val) => form.setValue("statusBroadcast", val)} value={form.watch("statusBroadcast")}>
                                    <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent font-bold"><SelectValue placeholder="Pilih status..." /></SelectTrigger>
                                    <SelectContent><SelectItem value="Baru di temukan">Baru di temukan</SelectItem><SelectItem value="Sedang ditangani">Sedang ditangani</SelectItem><SelectItem value="Sudah ditangani">Sudah ditangani</SelectItem></SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <div className="space-y-4 animate-in fade-in">
                                  {form.watch("areaIds").map((areaId) => {
                                    const areaName = dropdownOptions?.areas?.find((a) => a.id === areaId)?.name || `Area`;
                                    return (
                                      <div key={areaId} className="flex items-center justify-between p-2 rounded-xl border border-border bg-muted/10">
                                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-bold">{areaName}</Badge>
                                        <Select onValueChange={(val) => form.setValue(`statusPerArea.${areaId}`, val)} value={form.watch(`statusPerArea.${areaId}`)}>
                                          <SelectTrigger className="h-9 w-[160px] text-[11px] font-bold bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
                                          <SelectContent><SelectItem value="Baru di temukan">Baru di temukan</SelectItem><SelectItem value="Sedang ditangani">Sedang ditangani</SelectItem><SelectItem value="Sudah ditangani">Sudah ditangani</SelectItem></SelectContent>
                                        </Select>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                          </div>
                        </motion.div>
                      )}

                      {/* STEP 5: CATATAN UMUM */}
                      {step === 5 && (
                        <motion.div key="step5" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 pb-4">
                            <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
                              <button type="button" onClick={() => form.setValue("modeCatatan", "broadcast")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeCatatan") === "broadcast" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Satu Catatan Cuaca</button>
                              <button type="button" onClick={() => form.setValue("modeCatatan", "spesifik")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeCatatan") === "spesifik" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Beda Per Area</button>
                            </div>
                            {form.watch("modeCatatan") === "broadcast" ? (
                              <div className="space-y-2 animate-in fade-in">
                                <Textarea placeholder="Cth: Semalam hujan lebat, saluran irigasi aman..." className="min-h-[140px] rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-orange-500/20 text-sm" value={form.watch("keteranganBroadcast") || ""} onChange={(e) => form.setValue("keteranganBroadcast", e.target.value)} />
                              </div>
                            ) : (
                              <div className="space-y-3 animate-in fade-in">
                                {form.watch("areaIds").map((areaId) => {
                                  const areaName = dropdownOptions?.areas?.find((a) => a.id === areaId)?.name || `Area`;
                                  return (
                                    <div key={areaId} className="space-y-1.5 p-3 rounded-xl border border-border bg-muted/20">
                                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 font-bold mb-1">{areaName}</Badge>
                                      <Textarea placeholder={`Catatan untuk ${areaName}...`} className="min-h-[80px] rounded-xl bg-background border-border/80 text-sm" value={form.watch(`keteranganPerArea.${areaId}`) || ""} onChange={(e) => form.setValue(`keteranganPerArea.${areaId}`, e.target.value)} />
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                    </AnimatePresence>

                    {/* NAVIGATION FOOTER */}
                    <div className="flex justify-between items-center pt-4 border-t border-border">
                      {step > 1 ? (
                        <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground" onClick={() => setStep((p) => p - 1)} disabled={saveInspeksi.isPending}>
                          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                        </Button>
                      ) : (
                        <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground" onClick={() => setOpen(false)}>Batal</Button>
                      )}
                      
                      {step < 5 ? (
                        <Button type="button" className="h-11 rounded-xl px-5 font-bold bg-orange-500 text-white hover:bg-orange-600" onClick={handleNextStep}>
                          Lanjut <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button type="button" className="h-11 rounded-xl px-6 font-bold bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98]" disabled={saveInspeksi.isPending} onClick={form.handleSubmit(onSubmit)}>
                          {saveInspeksi.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Kirim Data</>}
                        </Button>
                      )}
                    </div>

                  </form>
                </Form>
              )}
            </div>
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
