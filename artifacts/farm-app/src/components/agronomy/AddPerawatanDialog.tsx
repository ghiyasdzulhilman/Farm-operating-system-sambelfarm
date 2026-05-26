import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  PlusCircle,
  Loader2,
  CalendarIcon,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sprout,
  Plus,
  Trash2,
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

// 1. UPDATE SCHEMA: Tanggal cabut dari root, pindah ke mode spesifik
const perawatanSchema = z.object({
  kegiatan: z.string().min(1, "Nama kegiatan wajib diisi"),
  labaRugiIds: z.array(z.string()).min(1, "Minimal pilih 1 area"),
  
  modeTanggal: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  tanggalBroadcast: z.string().optional(),
  tanggalPerArea: z.record(z.string()).default({}),

  modePekerja: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  petugasBroadcast: z.array(z.string()).default([]),
  petugasPerArea: z.record(z.array(z.string())).default({}),
  
  modeTags: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  tagsBroadcast: z.string().optional(),
  tagsPerArea: z.record(z.string()).default({}),

  modeStatus: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  statusBroadcast: z.string().default("Rencana"),
  statusPerArea: z.record(z.string()).default({}),
  
  modeCatatan: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  catatanBroadcast: z.string().optional(),
  catatanPerArea: z.record(z.string()).optional(),
  
  modeProduk: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  logProduk: z.array(z.object({ produk: z.string().min(1, "Wajib"), dosis: z.string().min(1, "Wajib") })).default([]),
  produkPerArea: z.record(z.array(z.object({ produk: z.string(), dosis: z.string() }))).default({}),
});

type PerawatanFormValues = z.infer<typeof perawatanSchema>;

interface AddPerawatanDialogProps { onSuccess?: () => void; }

const EMPTY_VALUES: PerawatanFormValues = {
  kegiatan: "",
  labaRugiIds: [],
  modeTanggal: "broadcast", tanggalBroadcast: format(new Date(), "yyyy-MM-dd"), tanggalPerArea: {},
  modePekerja: "broadcast", petugasBroadcast: [], petugasPerArea: {},
  modeTags: "broadcast", tagsBroadcast: "", tagsPerArea: {},
  modeStatus: "broadcast", statusBroadcast: "Rencana", statusPerArea: {},
  modeCatatan: "broadcast", catatanBroadcast: "", catatanPerArea: {},
  modeProduk: "broadcast", logProduk: [], produkPerArea: {},
};

export function AddPerawatanDialog({ onSuccess }: AddPerawatanDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [submittedUrls, setSubmittedUrls] = useState<{pageId: string, notionUrl: string}[] | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dropdownOptions, isLoading: isLoadingOptions } = useQuery({
    queryKey: ["perawatan-dropdown-options"],
    queryFn: async () => {
      const res = await fetch("/api/notion/perawatan-dropdown-options");
      if (!res.ok) throw new Error("Gagal mengambil data dropdown");
      return res.json();
    },
    enabled: open,
  });

  const form = useForm<PerawatanFormValues>({
    resolver: zodResolver(perawatanSchema),
    defaultValues: EMPTY_VALUES,
  });

  const { fields: produkFields, append: appendProduk, remove: removeProduk } = useFieldArray({
    control: form.control, name: "logProduk",
  });

  const savePerawatan = useMutation({
    mutationFn: async (payload: PerawatanFormValues) => {
      const response = await fetch("/api/notion/add-perawatan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Gagal menyimpan perawatan");
      }
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey(), refetchType: "all" });
      if (data && data.data) setSubmittedUrls(data.data);
      form.reset(EMPTY_VALUES);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: error instanceof Error ? error.message : "Cek kembali koneksi internet.", });
    },
  });

  const handleNextStep = async () => {
    let fieldsToValidate: Array<keyof PerawatanFormValues> = [];
    if (step === 1) fieldsToValidate = ["kegiatan"]; // Tanggal dihapus dari sini
    if (step === 2) fieldsToValidate = ["labaRugiIds"];
    
    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) setStep((prev) => prev + 1);
  };

  function onSubmit(values: PerawatanFormValues) { savePerawatan.mutate(values); }

  const toggleArea = (areaId: string) => {
    const currentAreas = form.getValues("labaRugiIds");
    if (currentAreas.includes(areaId)) {
      form.setValue("labaRugiIds", currentAreas.filter((id) => id !== areaId), { shouldValidate: true });
    } else {
      form.setValue("labaRugiIds", [...currentAreas, areaId], { shouldValidate: true });
    }
  };

  const toggleWorker = (workerId: string, areaId?: string) => {
    if (areaId) {
      const current = form.getValues(`petugasPerArea.${areaId}`) || [];
      form.setValue(`petugasPerArea.${areaId}`, current.includes(workerId) ? current.filter(id => id !== workerId) : [...current, workerId], { shouldValidate: true });
    } else {
      const current = form.getValues("petugasBroadcast") || [];
      form.setValue("petugasBroadcast", current.includes(workerId) ? current.filter(id => id !== workerId) : [...current, workerId], { shouldValidate: true });
    }
  };

  const appendProdukArea = (areaId: string) => {
    const current = form.getValues(`produkPerArea.${areaId}`) || [];
    form.setValue(`produkPerArea.${areaId}`, [...current, { produk: "", dosis: "" }]);
  };
  const removeProdukArea = (areaId: string, index: number) => {
    const current = form.getValues(`produkPerArea.${areaId}`) || [];
    form.setValue(`produkPerArea.${areaId}`, current.filter((_, i) => i !== index));
  };
  const updateProdukArea = (areaId: string, index: number, field: "produk"|"dosis", value: string) => {
    const current = form.getValues(`produkPerArea.${areaId}`) || [];
    const newArr = [...current];
    newArr[index] = { ...newArr[index], [field]: value };
    form.setValue(`produkPerArea.${areaId}`, newArr);
  };

  return (
    <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setStep(1); setSubmittedUrls(null); } }}>
      <SheetTrigger asChild>
        <Button className="h-11 rounded-xl px-5 font-bold bg-green-600 text-white hover:bg-green-700 transition-all active:scale-[0.98] gap-2">
          <PlusCircle className="h-4 w-4" /> Perawatan
        </Button>
      </SheetTrigger>
      <SheetContent side="top" className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl pb-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)] flex flex-col max-h-[95vh]">
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-500/10 p-2 text-green-600"><Sprout className="h-5 w-5" /></div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Input Perawatan</SheetTitle>
              <p className="text-[10px] font-bold text-green-600 tracking-wider uppercase">Step {step} dari 5</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (<div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? "w-4 bg-green-600" : "w-1.5 bg-border"}`} />))}
          </div>
        </SheetHeader>
 
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {submittedUrls ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-10 text-center space-y-5">
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-2"><CheckCircle2 className="h-10 w-10 text-green-600" /></div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-foreground tracking-tight">Sukses Tersimpan!</h3>
                <p className="text-sm text-muted-foreground font-medium px-4">Data berhasil dicatat ke Notion.</p>
              </div>
              <div className="w-full space-y-2.5 pt-4">
                {submittedUrls.map((item, idx) => (
                  <Button key={item.pageId} type="button" variant="outline" className="w-full h-12 rounded-xl font-bold border-green-200 text-green-700 bg-green-50/50 hover:bg-green-100" onClick={() => window.open(item.notionUrl, "_blank")}>Buka Notion Area {idx + 1}</Button>
                ))}
                <Button type="button" className="w-full h-12 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 mt-2" onClick={() => { setOpen(false); setStep(1); setSubmittedUrls(null); onSuccess?.(); }}>Tutup Form</Button>
              </div>
            </motion.div>
          ) : isLoadingOptions ? (
            <Skeleton className="h-12 w-full rounded-xl" />
          ) : (
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-5 text-left h-full flex flex-col">
                <AnimatePresence mode="wait">
                  {/* STEP 1: KEGIATAN */}
                  {step === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4">
                      <FormField control={form.control} name="kegiatan" render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">1. Nama Kegiatan</FormLabel>
                          <FormControl><Input className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-green-600/20 text-sm font-medium" placeholder="Cth: Kocor Kalinet..." {...field} /></FormControl>
                          <FormMessage className="text-xs text-red-500" />
                        </FormItem>
                      )} />
                    </motion.div>
                  )}

                  {/* STEP 2: AREA */}
                  {step === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4">
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">2. Pilih Area Laba Rugi</p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {dropdownOptions?.areas?.map((item) => (
                            <Badge key={item.id} variant="outline" className={`px-4 py-2.5 text-sm cursor-pointer rounded-xl transition-all ${form.watch("labaRugiIds").includes(item.id) ? "bg-green-600 text-white border-green-600 font-bold shadow-md scale-[1.02]" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`} onClick={() => toggleArea(item.id)}>
                              {item.name}
                            </Badge>
                          ))}
                        </div>
                        {form.formState.errors.labaRugiIds && <p className="text-xs text-red-500 mt-2 font-medium">{form.formState.errors.labaRugiIds.message}</p>}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: PRODUK / DOSIS */}
                  {step === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">3. Racikan Bahan / Produk</p>
                      <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
                        <button type="button" onClick={() => form.setValue("modeProduk", "broadcast")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeProduk") === "broadcast" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Sama Semua</button>
                        <button type="button" onClick={() => form.setValue("modeProduk", "spesifik")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeProduk") === "spesifik" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Isi Per Area</button>
                      </div>

                      {form.watch("modeProduk") === "broadcast" ? (
                        <div className="space-y-3 animate-in fade-in pt-2">
                           <div className="flex justify-between items-center">
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold">Semua Area</Badge>
                              <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold border-green-200 text-green-700 bg-green-50" onClick={() => appendProduk({ produk: "", dosis: "" })}><Plus className="h-3 w-3 mr-1" /> Tambah</Button>
                           </div>
                           {produkFields.map((field, index) => (
                             <div key={field.id} className="flex gap-2 items-start bg-muted/40 p-3 rounded-xl border border-border/40">
                               <div className="grid grid-cols-2 gap-2 flex-1">
                                 <Input className="h-10 text-sm bg-white dark:bg-slate-900 rounded-lg" placeholder="Nama Produk" {...form.register(`logProduk.${index}.produk`)} />
                                 <Input className="h-10 text-sm bg-white dark:bg-slate-900 rounded-lg" placeholder="Dosis" {...form.register(`logProduk.${index}.dosis`)} />
                               </div>
                               <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-red-500 hover:bg-red-50 shrink-0" onClick={() => removeProduk(index)}><Trash2 className="h-4 w-4" /></Button>
                             </div>
                           ))}
                        </div>
                      ) : (
                        <div className="space-y-4 animate-in fade-in pt-2">
                          {form.watch("labaRugiIds").map((areaId) => {
                            const areaName = dropdownOptions?.areas?.find((a) => a.id === areaId)?.name || `Area`;
                            return (
                              <div key={areaId} className="space-y-2 p-3 rounded-xl border border-border bg-muted/20">
                                <div className="flex justify-between items-center">
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold">{areaName}</Badge>
                                  <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold border-green-200 text-green-700 bg-green-50" onClick={() => appendProdukArea(areaId)}><Plus className="h-3 w-3 mr-1" /> Tambah</Button>
                                </div>
                                {(form.watch(`produkPerArea.${areaId}`) || []).map((prod, idx) => (
                                  <div key={idx} className="flex gap-2 items-start bg-white dark:bg-slate-900 p-2 rounded-lg border border-border/40">
                                    <div className="grid grid-cols-2 gap-2 flex-1">
                                      <Input className="h-9 text-sm" placeholder="Nama Produk" value={prod.produk} onChange={(e) => updateProdukArea(areaId, idx, "produk", e.target.value)} />
                                      <Input className="h-9 text-sm" placeholder="Dosis" value={prod.dosis} onChange={(e) => updateProdukArea(areaId, idx, "dosis", e.target.value)} />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:bg-red-50 shrink-0" onClick={() => removeProdukArea(areaId, idx)}><Trash2 className="h-3 w-3" /></Button>
                                  </div>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 4: TANGGAL, PEKERJA, TAGS & STATUS */}
                  {step === 4 && (
                    <motion.div key="step4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-6">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">4. Detail Pekerjaan & Jadwal</p>
                      
                      {/* MULTI TANGGAL MODE */}
                      <div className="space-y-2.5">
                        <p className="text-[11px] font-bold text-muted-foreground">Tanggal Pelaksanaan</p>
                        <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
                          <button type="button" onClick={() => form.setValue("modeTanggal", "broadcast")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeTanggal") === "broadcast" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Sama Semua</button>
                          <button type="button" onClick={() => form.setValue("modeTanggal", "spesifik")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeTanggal") === "spesifik" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Isi Per Area</button>
                        </div>
                        {form.watch("modeTanggal") === "broadcast" ? (
                           <div className="animate-in fade-in relative">
                             <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                             <Input type="date" className="h-12 rounded-xl bg-muted border-transparent pl-11 pr-4 focus-visible:ring-2 focus-visible:ring-green-600/20 text-sm font-bold w-full" {...form.register("tanggalBroadcast")} />
                           </div>
                        ) : (
                          <div className="space-y-3 animate-in fade-in">
                            {form.watch("labaRugiIds").map((areaId) => {
                              const areaName = dropdownOptions?.areas?.find((a) => a.id === areaId)?.name || `Area`;
                              // Fallback ke hari ini kalau belum diisi
                              const defaultDate = format(new Date(), "yyyy-MM-dd");
                              return (
                                <div key={areaId} className="space-y-1.5 p-2.5 rounded-xl border border-border bg-muted/5">
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold mb-1">{areaName}</Badge>
                                  <Input type="date" className="h-10 rounded-lg bg-background border-border/80 text-xs font-bold w-full px-3" value={form.watch(`tanggalPerArea.${areaId}`) || defaultDate} onChange={(e) => form.setValue(`tanggalPerArea.${areaId}`, e.target.value)} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* MULTI PEKERJA MODE */}
                      <div className="space-y-2.5 pt-2 border-t border-border">
                        <p className="text-[11px] font-bold text-muted-foreground">Petugas Lapangan</p>
                        <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
                          <button type="button" onClick={() => form.setValue("modePekerja", "broadcast")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modePekerja") === "broadcast" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Sama Semua</button>
                          <button type="button" onClick={() => form.setValue("modePekerja", "spesifik")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modePekerja") === "spesifik" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Isi Per Area</button>
                        </div>
                        {form.watch("modePekerja") === "broadcast" ? (
                          <div className="rounded-2xl border border-border/60 bg-muted/5 p-2 animate-in fade-in">
                            <div className="max-h-[130px] overflow-y-auto flex flex-wrap gap-1.5 pr-1">
                              {dropdownOptions?.petugas?.map((item) => (
                                <button key={item.id} type="button" onClick={() => toggleWorker(item.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${form.watch("petugasBroadcast").includes(item.id) ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-background text-muted-foreground border-border/50 hover:bg-muted"}`}>{item.name}</button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 animate-in fade-in">
                            {form.watch("labaRugiIds").map((areaId) => {
                              const areaName = dropdownOptions?.areas?.find((a) => a.id === areaId)?.name || `Area`;
                              const currentWorkers = form.watch(`petugasPerArea.${areaId}`) || [];
                              return (
                                <div key={areaId} className="space-y-2 p-2.5 rounded-xl border border-border bg-muted/5">
                                  <div className="flex justify-between items-center">
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold">{areaName}</Badge>
                                    <span className="text-[10px] text-muted-foreground font-medium">{currentWorkers.length} dipilih</span>
                                  </div>
                                  <div className="max-h-[110px] overflow-y-auto flex flex-wrap gap-1.5 mt-1 pr-1">
                                    {dropdownOptions?.petugas?.map((item) => (
                                      <button key={item.id} type="button" onClick={() => toggleWorker(item.id, areaId)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${currentWorkers.includes(item.id) ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-background text-muted-foreground border-border/50 hover:bg-muted"}`}>{item.name}</button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* MULTI TAGS MODE */}
                      <div className="space-y-2.5 pt-2 border-t border-border">
                        <p className="text-[11px] font-bold text-muted-foreground">Jenis Kegiatan / Tags</p>
                        <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
                          <button type="button" onClick={() => form.setValue("modeTags", "broadcast")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeTags") === "broadcast" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Sama Semua</button>
                          <button type="button" onClick={() => form.setValue("modeTags", "spesifik")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeTags") === "spesifik" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Isi Per Area</button>
                        </div>
                        {form.watch("modeTags") === "broadcast" ? (
                           <div className="animate-in fade-in">
                             <Select onValueChange={(val) => form.setValue("tagsBroadcast", val)} value={form.watch("tagsBroadcast") || ""}>
                               <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-green-600/20"><SelectValue placeholder="Pilih tag..." /></SelectTrigger>
                               <SelectContent className="rounded-xl">
                                 <SelectItem value="Pengocoran">Pengocoran</SelectItem><SelectItem value="Penyemprotan">Penyemprotan</SelectItem><SelectItem value="Pemupukan Dasar">Pemupukan Dasar</SelectItem><SelectItem value="Selingan">Selingan</SelectItem><SelectItem value="Lainnya">Lainnya</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                        ) : (
                          <div className="space-y-3 animate-in fade-in">
                            {form.watch("labaRugiIds").map((areaId) => {
                              const areaName = dropdownOptions?.areas?.find((a) => a.id === areaId)?.name || `Area`;
                              return (
                                <div key={areaId} className="space-y-1.5 p-2.5 rounded-xl border border-border bg-muted/5">
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold mb-1">{areaName}</Badge>
                                  <Select onValueChange={(val) => form.setValue(`tagsPerArea.${areaId}`, val)} value={form.watch(`tagsPerArea.${areaId}`) || ""}>
                                    <SelectTrigger className="h-10 rounded-lg bg-background border-border/80 text-xs"><SelectValue placeholder="Pilih tag area ini..." /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      <SelectItem value="Pengocoran">Pengocoran</SelectItem><SelectItem value="Penyemprotan">Penyemprotan</SelectItem><SelectItem value="Pemupukan Dasar">Pemupukan Dasar</SelectItem><SelectItem value="Selingan">Selingan</SelectItem><SelectItem value="Lainnya">Lainnya</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* MULTI STATUS MODE */}
                      <div className="space-y-2.5 pt-2 border-t border-border">
                        <p className="text-[11px] font-bold text-muted-foreground">Status Pekerjaan</p>
                        <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
                          <button type="button" onClick={() => form.setValue("modeStatus", "broadcast")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeStatus") === "broadcast" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Sama Semua</button>
                          <button type="button" onClick={() => form.setValue("modeStatus", "spesifik")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeStatus") === "spesifik" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Isi Per Area</button>
                        </div>
                        {form.watch("modeStatus") === "broadcast" ? (
                           <div className="animate-in fade-in">
                             <Select onValueChange={(val) => form.setValue("statusBroadcast", val)} value={form.watch("statusBroadcast") || ""}>
                               <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-green-600/20"><SelectValue placeholder="Pilih status..." /></SelectTrigger>
                               <SelectContent className="rounded-xl">
                                 <SelectItem value="Rencana">Rencana</SelectItem><SelectItem value="Proses">Sedang Berlangsung (Proses)</SelectItem><SelectItem value="Selesai">Selesai</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                        ) : (
                          <div className="space-y-3 animate-in fade-in">
                            {form.watch("labaRugiIds").map((areaId) => {
                              const areaName = dropdownOptions?.areas?.find((a) => a.id === areaId)?.name || `Area`;
                              return (
                                <div key={areaId} className="space-y-1.5 p-2.5 rounded-xl border border-border bg-muted/5">
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold mb-1">{areaName}</Badge>
                                  <Select onValueChange={(val) => form.setValue(`statusPerArea.${areaId}`, val)} value={form.watch(`statusPerArea.${areaId}`) || "Rencana"}>
                                    <SelectTrigger className="h-10 rounded-lg bg-background border-border/80 text-xs"><SelectValue placeholder="Pilih status area ini..." /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                      <SelectItem value="Rencana">Rencana</SelectItem><SelectItem value="Proses">Sedang Berlangsung</SelectItem><SelectItem value="Selesai">Selesai</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                    </motion.div>
                  )}

                  {/* STEP 5: CATATAN & FINALISASI */}
                  {step === 5 && (
                    <motion.div key="step5" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">5. Finalisasi & Catatan</p>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
                          <button type="button" onClick={() => form.setValue("modeCatatan", "broadcast")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeCatatan") === "broadcast" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Sama Semua</button>
                          <button type="button" onClick={() => form.setValue("modeCatatan", "spesifik")} className={`py-2 text-xs font-bold rounded-lg transition-all ${form.watch("modeCatatan") === "spesifik" ? "bg-white dark:bg-slate-900 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Isi Per Area</button>
                        </div>
                        {form.watch("modeCatatan") === "broadcast" ? (
                          <div className="space-y-2 animate-in fade-in pt-1">
                            <Textarea placeholder="Ketik catatan detail untuk diterapkan ke semua area..." className="min-h-[140px] rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-green-600/20 text-sm" {...form.register("catatanBroadcast")} />
                          </div>
                        ) : (
                          <div className="space-y-3 animate-in fade-in pt-1">
                            {form.watch("labaRugiIds").map((areaId) => {
                              const areaName = dropdownOptions?.areas?.find((a) => a.id === areaId)?.name || `Area`;
                              return (
                                <div key={areaId} className="space-y-1.5 p-3 rounded-xl border border-border bg-muted/20">
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold mb-1">{areaName}</Badge>
                                  <Textarea placeholder={`Catatan untuk ${areaName}...`} className="min-h-[80px] rounded-xl bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-green-600/20 text-sm" value={form.watch(`catatanPerArea.${areaId}`) || ""} onChange={(e) => form.setValue(`catatanPerArea.${areaId}`, e.target.value)} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* BOTTOM NAVIGATION */}
                <div className="flex justify-between items-center pt-4 border-t border-border mt-auto shrink-0 pb-8 md:pb-2">
                  {step > 1 ? (
                    <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground" onClick={() => setStep((p) => p - 1)} disabled={savePerawatan.isPending}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
                  ) : (
                    <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground" onClick={() => setOpen(false)}>Batal</Button>
                  )}
                  {step < 5 ? (
                    <Button type="button" className="h-11 rounded-xl px-5 font-bold bg-green-600 text-white hover:bg-green-700" onClick={handleNextStep}>Lanjut <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  ) : (
                    <Button type="button" className="h-11 rounded-xl px-6 font-bold bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]" disabled={savePerawatan.isPending} onClick={form.handleSubmit(onSubmit)}>
                      {savePerawatan.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Kirim ke Notion</>}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
