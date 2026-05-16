import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Sprout, Loader2, CalendarIcon, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

import {
  useAddHarvest,
  useGetHarvestDropdownOptions,
  getGetHarvestDropdownOptionsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const KUALITAS_OPTIONS = [
  "Grade A (Premium)",
  "Grade A",
  "Grade B",
  "Grade C",
] as const;

const CHANNEL_OPTIONS = [
  "Pengepul",
  "Pasar modern",
  "Pasar tradisional",
  "Pedagang eceran",
  "Konsumen",
] as const;

// SATPAM DILONGGARIN: pindahTanamId & labaRugiId dibuat optional. Ditambah field 'tanggal'.
const harvestSchema = z.object({
  kegiatan: z.string().min(1, "Nama kegiatan wajib diisi"),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  jumlahPanen: z.coerce.number().min(0.01, "Jumlah panen harus lebih dari 0"),
  hargaJualPerKg: z.coerce.number().min(0, "Harga tidak boleh negatif"),
  kualitas: z.string().min(1, "Pilih kualitas"),
  channelPenjualan: z.string().min(1, "Pilih channel penjualan"),
  pindahTanamId: z.string().optional(),
  labaRugiId: z.string().optional(),
});

type HarvestFormValues = z.infer<typeof harvestSchema>;

const EMPTY_VALUES: HarvestFormValues = {
  kegiatan: "",
  tanggal: format(new Date(), "yyyy-MM-dd"),
  jumlahPanen: 0,
  hargaJualPerKg: 0,
  kualitas: "",
  channelPenjualan: "",
  pindahTanamId: "",
  labaRugiId: "",
};

interface AddHarvestDialogProps {
  onSuccess?: () => void;
}

export function AddHarvestDialog({ onSuccess }: AddHarvestDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // Tracker Pop-up Step ala iOS Shortcut
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dropdownOptions, isLoading: isLoadingOptions } = useGetHarvestDropdownOptions({
    query: { enabled: open, queryKey: getGetHarvestDropdownOptionsQueryKey() },
  });

  const form = useForm<HarvestFormValues>({
    resolver: zodResolver(harvestSchema),
    defaultValues: EMPTY_VALUES,
  });

  const addHarvest = useAddHarvest({
    mutation: {
      onSuccess: async () => {
        toast({
          title: "Disimpan ke Antrean",
          description: "Data masuk Staging dan dashboard diperbarui secara instan.",
        });

        // 1. PAKSA Dashboard buat tarik data baru saat ini juga
        await queryClient.invalidateQueries({ 
          queryKey: getGetDashboardSummaryQueryKey(),
          refetchType: "all" 
        });

        // 2. KASIH TAU Staging Queue Card kalau ada data baru
        await queryClient.invalidateQueries({
          queryKey: ["staging", "list"]
        });

        form.reset({ ...EMPTY_VALUES, tanggal: format(new Date(), "yyyy-MM-dd") });
        setStep(1); // Balik ke step 1 pas sukses
        setOpen(false);
        onSuccess?.();
      },
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data panen.";
        toast({
          variant: "destructive",
          title: "Gagal menyimpan",
          description: message,
        });
      },
    },
  });

  // Fungsi Validasi tiap step sebelum diperbolehkan maju ke depan
  const handleNextStep = async () => {
    let fieldsToValidate: ("kegiatan" | "tanggal" | "jumlahPanen" | "hargaJualPerKg" | "kualitas" | "channelPenjualan")[] = [];
    if (step === 1) fieldsToValidate = ["kegiatan"];
    if (step === 2) fieldsToValidate = ["tanggal"];
    if (step === 3) fieldsToValidate = ["jumlahPanen", "hargaJualPerKg"];
    if (step === 4) fieldsToValidate = ["kualitas", "channelPenjualan"];

    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) {
      setStep((prev) => prev + 1);
    }
  };

  function onSubmit(values: HarvestFormValues) {
    const cleanPayload = {
      ...values,
      pindahTanamId: values.pindahTanamId === "" ? undefined : values.pindahTanamId,
      labaRugiId: values.labaRugiId === "" ? undefined : values.labaRugiId,
    };
    addHarvest.mutate({ data: cleanPayload as any });
  }

  const totalPendapatan =
    (form.watch("jumlahPanen") || 0) * (form.watch("hargaJualPerKg") || 0);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <Sheet open={open} onOpenChange={(val) => { setOpen(val); if(!val) setStep(1); }}>
      <SheetTrigger asChild>
        <Button 
          variant="default" 
          data-testid="button-add-harvest" 
          className="h-11 rounded-xl px-5 font-bold transition-all active:scale-[0.98] bg-primary text-primary-foreground hover:opacity-90 gap-2"
        >
          <Sprout className="h-4 w-4" />
          Tambah Panen
        </Button>
      </SheetTrigger>

      {/* TAMPILAN IPHONE SHORTCUT BANNER FROM TOP */}
      <SheetContent 
        side="top"
        className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl pb-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)]" 
        data-testid="dialog-add-harvest"
      >
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-900">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Sprout className="h-5 w-5" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Shortcut Panen</SheetTitle>
              <p className="text-[10px] font-bold text-primary tracking-wider uppercase">Step {step} dari 5</p>
            </div>
          </div>
          
          {/* Progress Indicator Dots */}
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className={[
                  "h-1.5 rounded-full transition-all duration-300", 
                  step === i ? "w-4 bg-primary" : "w-1.5 bg-slate-200 dark:bg-slate-800"
                ].join(" ")} 
              />
            ))}
          </div>
        </SheetHeader>

        <div className="px-6 py-4">
          {isLoadingOptions ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : (
            <Form {...form}>
              {/* LOCK SYSTEM: Cegah submission liar via enter keyboard */}
              <form 
                onSubmit={(e) => e.preventDefault()} 
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                className="space-y-5"
              >
                <AnimatePresence mode="wait">
                  
                  {/* STEP 1: KEGIATAN */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="text-left"
                    >
                      <FormField
                        control={form.control}
                        name="kegiatan"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              1. Apa nama kegiatan panennya?
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 text-sm font-medium dark:bg-slate-900/50"
                                placeholder="mis. Panen Cabai Merah Keriting Blok A..."
                                data-testid="input-kegiatan"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs font-semibold text-red-500 mt-1" />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}

                  {/* STEP 2: TANGGAL */}
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="text-left"
                    >
                      <FormField
                        control={form.control}
                        name="tanggal"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                              2. Kapan tanggal pemanenannya?
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                  type="date"
                                  className="h-12 rounded-xl bg-muted border-transparent pl-11 focus-visible:ring-2 focus-visible:ring-primary/20 font-medium dark:bg-slate-900/50"
                                  data-testid="input-tanggal"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs font-semibold text-red-500 mt-1" />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}

                  {/* STEP 3: JUMLAH PANEN & HARGA */}
                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-4 text-left"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        3. Isi Tonase Hasil & Harga Pasar
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="jumlahPanen"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-[11px] font-bold text-slate-400">Total Berat (Kg)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-slate-900/50"
                                  placeholder="0"
                                  data-testid="input-jumlah-panen"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-xs font-semibold text-red-500" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="hargaJualPerKg"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-[11px] font-bold text-slate-400">Harga Jual per Kg (Rp)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-slate-900/50"
                                  placeholder="0"
                                  data-testid="input-harga-jual"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-xs font-semibold text-red-500" />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Live Profit/Revenue Estimator */}
                      {totalPendapatan > 0 && (
                        <div className="rounded-2xl bg-primary/[0.04] px-4 py-3 text-sm flex justify-between items-center border border-primary/10 dark:bg-primary/[0.02]">
                          <span className="font-medium text-emerald-700/80 dark:text-emerald-400/80">Estimasi Omset Panen:</span>
                          <span className="font-black text-primary text-base" data-testid="text-total-pendapatan-estimasi">
                            {formatCurrency(totalPendapatan)}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 4: GRADE KUALITAS & CHANNEL */}
                  {step === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-4 text-left"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        4. Klasifikasi Hasil & Jalur Distribusi
                      </p>

                      <FormField
                        control={form.control}
                        name="kualitas"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[11px] font-bold text-slate-400">Grade Kualitas</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/50" data-testid="select-kualitas">
                                  <SelectValue placeholder="Pilih grade kualitas..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl shadow-xl">
                                {KUALITAS_OPTIONS.map((opt) => (
                                  <SelectItem key={opt} value={opt} className="rounded-lg">
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs font-semibold text-red-500" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="channelPenjualan"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[11px] font-bold text-slate-400">Target Pasar / Channel</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/50" data-testid="select-channel">
                                  <SelectValue placeholder="Pilih channel penjualan..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl shadow-xl">
                                {CHANNEL_OPTIONS.map((opt) => (
                                  <SelectItem key={opt} value={opt} className="rounded-lg">
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs font-semibold text-red-500" />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}

                  {/* STEP 5: PEMETAAN NOTION DATABASE (OPSIONAL) */}
                  {step === 5 && (
                    <motion.div
                      key="step5"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-4 text-left"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        5. Alokasi Database Kebun (Opsional)
                      </p>

                      <FormField
                        control={form.control}
                        name="pindahTanamId"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[11px] font-bold text-slate-400">Area Pindah Tanam</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/50" data-testid="select-pindah-tanam">
                                  <SelectValue placeholder="Pilih area pindah tanam (Bisa dilewati)..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl shadow-xl">
                                {dropdownOptions?.pindahTanam?.length === 0 ? (
                                  <SelectItem value="_empty" disabled>Tidak ada data ditemukan</SelectItem>
                                ) : (
                                  dropdownOptions?.pindahTanam?.map((item) => (
                                    <SelectItem key={item.id} value={item.id} className="rounded-lg">
                                      {item.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="labaRugiId"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[11px] font-bold text-slate-400">Target Mapping Laba Rugi</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/50" data-testid="select-laba-rugi">
                                  <SelectValue placeholder="Pilih area laba rugi (Bisa dilewati)..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl shadow-xl">
                                {dropdownOptions?.labaRugi?.length === 0 ? (
                                  <SelectItem value="_empty" disabled>Tidak ada data ditemukan</SelectItem>
                                ) : (
                                  dropdownOptions?.labaRugi?.map((item) => (
                                    <SelectItem key={item.id} value={item.id} className="rounded-lg">
                                      {item.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}

                </AnimatePresence>

                {/* DYNAMIC NAVIGATION CONTROL FOOTER */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-900">
                  {step > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 rounded-xl px-4 font-bold text-slate-500"
                      onClick={() => setStep((p) => p - 1)}
                      disabled={addHarvest.isPending}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Kembali
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 rounded-xl px-4 font-bold text-slate-400"
                      onClick={() => setOpen(false)}
                      data-testid="button-cancel-harvest"
                    >
                      Batal
                    </Button>
                  )}

                  {step < 5 ? (
                    <Button
                      type="button"
                      className="h-11 rounded-xl px-5 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all"
                      onClick={handleNextStep}
                    >
                      Lanjut
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="h-11 rounded-xl px-6 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98]"
                      disabled={addHarvest.isPending}
                      onClick={form.handleSubmit(onSubmit)}
                      data-testid="button-submit-harvest"
                    >
                      {addHarvest.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Kirim ke Notion
                        </>
                      )}
                    </Button>
                  )}
                </div>

              </form>
            </Form>
          )}
        </div>
        
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-100 dark:bg-slate-900" />
      </SheetContent>
    </Sheet>
  );
}
