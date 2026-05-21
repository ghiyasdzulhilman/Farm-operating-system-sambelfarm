import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2, CalendarIcon, ArrowRight, ArrowLeft, CheckCircle2, Activity } from "lucide-react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

import { getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// --- DAFTAR HAMA & PENYAKIT BAWAAN ---
const PRESET_HAMA_PENYAKIT = [
  "Thrips", "Kutu Kebul", "Aphids", "Tungau", "Ulat", "Lalat Buah", 
  "Antraknosa / Patek", "Bercak Daun", "Layu Fusarium", "Layu Bakteri", "Virus Kuning / Bule"
];

// --- SCHEMA VALIDASI ---
const inspeksiSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  areaId: z.string().min(1, "Wajib pilih 1 area"),
  hamaPenyakit: z.array(z.string()).default([]),
  phTanah: z.string().optional(),
  tingkatSerangan: z.string().optional(),
});

type InspeksiFormValues = z.infer<typeof inspeksiSchema>;

interface AddInspeksiDialogProps {
  onSuccess?: () => void;
}

export function AddInspeksiDialog({ onSuccess }: AddInspeksiDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. Fetch data dropdown langsung mengarah ke rute Inspeksi baru
  const { data: dropdownOptions, isLoading: isLoadingOptions } = useQuery({
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
    defaultValues: {
      tanggal: format(new Date(), "yyyy-MM-dd"),
      areaId: "",
      hamaPenyakit: [],
      phTanah: "",
      tingkatSerangan: "",
    },
  });

  // 2. Mutasi kirim data beralih ke Direct Notion
  const saveInspeksi = useMutation({
    mutationFn: async (payload: any) => {
      const response = await fetch("/api/notion/add-inspeksi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Gagal menyimpan data ke Notion");
      }
      return response.json();
    },
    onSuccess: async (_, variables) => {
      const areaName = dropdownOptions?.areas?.find((a: any) => a.id === variables.labaRugiId)?.name || "Area";
      
      // 3. Pesan Toast disesuaikan (Bukan antrean lagi!)
      toast({
        description: (
          <div className="w-full space-y-3 pt-1 text-left">
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mt-1.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="font-black text-sm text-foreground tracking-tight">Inspeksi Berhasil</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Laporan untuk <span className="text-green-600 font-semibold">{areaName}</span> sukses disimpan langsung ke Notion.
                </p>
              </div>
            </div>
          </div>
        ),
      });

      // 4. Invalidate cache dashboard utama biar data langsung sinkron terupdate
      await queryClient.invalidateQueries({
        queryKey: getGetDashboardSummaryQueryKey(),
        refetchType: "all",
      });

      form.reset();
      setStep(1);
      setOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({ 
        variant: "destructive", 
        title: "Gagal menyimpan", 
        description: error instanceof Error ? error.message : "Cek koneksi internet Anda." 
      });
    },
  });

  const handleNextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ["areaId", "tanggal"];
    
    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) setStep((prev) => prev + 1);
  };

  function onSubmit(values: InspeksiFormValues) {
    const payload = {
      labaRugiId: values.areaId, // Kita kirim key 'labaRugiId' biar pas sama backend
      tanggal: values.tanggal,
      kegiatan: "Inspeksi Rutin", 
      hama: values.hamaPenyakit,
      penyakit: [], 
      phTanah: values.phTanah ? Number(values.phTanah) : null,
      tingkatSerangan: values.tingkatSerangan ? Number(values.tingkatSerangan) : null,
      status: "Selesai"
    };
    saveInspeksi.mutate(payload);
  }

  const toggleHama = (item: string) => {
    const current = form.getValues("hamaPenyakit");
    if (current.includes(item)) {
      form.setValue("hamaPenyakit", current.filter((i) => i !== item), { shouldValidate: true });
    } else {
      form.setValue("hamaPenyakit", [...current, item], { shouldValidate: true });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (!val) setStep(1); }}>
      <SheetTrigger asChild>
        <Button className="h-11 rounded-xl px-5 font-bold bg-orange-500 text-white hover:bg-orange-600 transition-all active:scale-[0.98] gap-2">
          <Activity className="h-4 w-4" />
          Inspeksi
        </Button>
      </SheetTrigger>

      <SheetContent side="top" className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl pb-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)]">
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-orange-500/10 p-2 text-orange-500">
              <Activity className="h-5 w-5" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Inspeksi Rutin</SheetTitle>
              <p className="text-[10px] font-bold text-orange-500 tracking-wider uppercase">Step {step} dari 3</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? "w-4 bg-orange-500" : "w-1.5 bg-border"}`} />
            ))}
          </div>
        </SheetHeader>

        <div className="px-6 py-4">
          {isLoadingOptions ? (
            <Skeleton className="h-12 w-full rounded-xl" />
          ) : (
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-5 text-left">
                
                <AnimatePresence mode="wait">
                  {/* STEP 1: PILIH 1 AREA & TANGGAL */}
                  {step === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4">
                      
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">1. Area yang Diinspeksi</p>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {dropdownOptions?.areas?.map((area: any) => {
                            const isSelected = form.watch("areaId") === area.id;
                            return (
                              <Badge 
                                key={area.id} variant="outline"
                                className={`px-4 py-2.5 text-sm cursor-pointer rounded-xl transition-all ${isSelected ? "bg-orange-500 text-white border-orange-500 font-bold shadow-md scale-[1.02]" : "bg-muted/50 text-muted-foreground hover:bg-muted"}`}
                                onClick={() => form.setValue("areaId", area.id, { shouldValidate: true })}
                              >
                                {area.name}
                              </Badge>
                            );
                          })}
                        </div>
                        {form.formState.errors.areaId && <p className="text-xs text-red-500 mt-2">{form.formState.errors.areaId.message}</p>}
                      </div>

                      <FormField control={form.control} name="tanggal" render={({ field }) => (
                        <FormItem className="space-y-1.5 pt-2 border-t border-border/50">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Tanggal</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                              <Input type="date" className="h-12 rounded-xl bg-muted border-transparent pl-11 pr-4 focus-visible:ring-2 focus-visible:ring-orange-500/20 font-bold text-sm w-full" {...field} />
                            </div>
                          </FormControl>
                        </FormItem>
                      )} />
                    </motion.div>
                  )}

                  {/* STEP 2: CEKLIS HAMA & PENYAKIT */}
                  {step === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">2. Temuan Hama / Penyakit</p>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_HAMA_PENYAKIT.map((item) => {
                          const isSelected = form.watch("hamaPenyakit").includes(item);
                          return (
                            <Badge 
                              key={item} variant="outline"
                              className={`px-3 py-2 text-xs cursor-pointer rounded-lg transition-all ${isSelected ? "bg-red-500 text-white border-red-500 font-bold" : "bg-muted/30 text-muted-foreground hover:bg-muted"}`}
                              onClick={() => toggleHama(item)}
                            >
                              {item}
                            </Badge>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">*Bisa pilih lebih dari satu, biarkan kosong jika aman.</p>
                    </motion.div>
                  )}

                  {/* STEP 3: INDIKATOR ANGKA */}
                  {step === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">3. Indikator Lapangan (Opsional)</p>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="phTanah" render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[11px] font-bold text-muted-foreground">pH Tanah</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-orange-500/20 text-sm font-bold" placeholder="Cth: 6.5" onFocus={(e) => e.target.select()} {...field} />
                            </FormControl>
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="tingkatSerangan" render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[11px] font-bold text-muted-foreground">Tingkat Serangan (%)</FormLabel>
                            <FormControl>
                              <Input type="number" className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-orange-500/20 text-sm font-bold" placeholder="Cth: 15" onFocus={(e) => e.target.select()} {...field} />
                            </FormControl>
                          </FormItem>
                        )} />
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
                    <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground" onClick={() => setOpen(false)}>
                      Batal
                    </Button>
                  )}

                  {step < 3 ? (
                    <Button type="button" className="h-11 rounded-xl px-5 font-bold bg-orange-500 text-white hover:bg-orange-600" onClick={handleNextStep}>
                      Lanjut <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="button" className="h-11 rounded-xl px-6 font-bold bg-orange-500 text-white hover:bg-orange-600 active:scale-[0.98]" disabled={saveInspeksi.isPending} onClick={form.handleSubmit(onSubmit)}>
                      {saveInspeksi.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
                      ) : (
                        <><CheckCircle2 className="mr-2 h-4 w-4" /> Simpan</>
                      )}
                    </Button>
                  )}
                </div>

              </form>
            </Form>
          )}
        </div>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />
      </SheetContent>
    </Sheet>
  );
}
