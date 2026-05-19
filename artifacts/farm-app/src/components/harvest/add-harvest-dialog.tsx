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

const harvestSchema = z.object({
  kegiatan: z.string().min(1, "Nama kegiatan wajib diisi"),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  jumlahPanen: z.coerce.number().min(0.01, "Jumlah panen harus lebih dari 0"),
  hargaJualPerKg: z.coerce.number().min(0, "Harga tidak boleh negatif"),
  kualitas: z.string().min(1, "Pilih kualitas"),
  channelPenjualan: z.string().min(1, "Pilih channel penjualan"),
  labaRugiId: z.string().optional(),
});

type HarvestFormValues = z.infer<typeof harvestSchema>;

// FIX UX: Mengubah default nilai angka 0 jadi string kosong agar placeholder murni aktif
const EMPTY_VALUES: HarvestFormValues = {
  kegiatan: "",
  tanggal: format(new Date(), "yyyy-MM-dd"),
  jumlahPanen: "" as any,
  hargaJualPerKg: "" as any,
  kualitas: "",
  channelPenjualan: "",
  labaRugiId: "",
};

interface AddHarvestDialogProps {
  onSuccess?: () => void;
}

export function AddHarvestDialog({ onSuccess }: AddHarvestDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); 
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
      // FIX LOGIC: Menangkap data variables input untuk di-render ke Cyber Toast
      onSuccess: async (data, variables) => {
        
                // Pemetaan otomatis ID panen ke nama lokasi asli manusia (Notion V2: Menggunakan Laba Rugi)
        const resolvedArea = dropdownOptions?.labaRugi?.find(
          (p) => p.id === variables?.labaRugiId
        )?.name || variables?.kegiatan || "Panen Cabe";

        const resolvedChannel = variables?.channelPenjualan || "Pasar Distribusi";

        // SINKRONISASI NOTIFIKASI TOAST PREMIUM DENGAN EXPENSES
        toast({
          description: (
            <div className="w-full space-y-3 pt-1 text-left">
              {/* Baris Atas: Indikator Lampu LED Neon Mini */}
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse mt-1.5 shrink-0 shadow-[0_0_8px_var(--primary)]" />
                <div className="space-y-0.5">
                  <p className="font-black text-sm text-foreground tracking-tight">
                    Disimpan ke Antrean
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Data masuk Staging lokal dan dashboard diperbarui secara <span className="text-primary font-semibold">instan</span>.
                  </p>
                </div>
              </div>

              {/* Garis Pembatas Tipis */}
              <div className="border-t border-border/40 my-1" />

              {/* Baris Bawah: Manifes Data Kebun */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/40 border border-border/40 rounded-xl p-2 min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 block">
                    Kegiatan / Lokasi
                  </span>
                  <p className="text-xs font-bold text-foreground truncate mt-0.5">
                    {resolvedArea}
                  </p>
                </div>

                <div className="bg-muted/40 border border-border/40 rounded-xl p-2 min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 block">
                    Channel Pasar
                  </span>
                  <p className="text-xs font-bold text-foreground truncate mt-0.5">
                    {resolvedChannel}
                  </p>
                </div>
              </div>
            </div>
          ),
        });

        await queryClient.invalidateQueries({ 
          queryKey: getGetDashboardSummaryQueryKey(),
          refetchType: "all" 
        });

        await queryClient.invalidateQueries({
          queryKey: ["staging", "list"]
        });

        form.reset({ ...EMPTY_VALUES, tanggal: format(new Date(), "yyyy-MM-dd") });
        setStep(1); 
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

    function onSubmit(values: HarvestFormValues) {
    const cleanPayload = {
      ...values,
      pindahTanamId: "", // 👈 Trik bypass satpam backend lama
      labaRugiId: values.labaRugiId || "", // 👈 Pastikan selalu ngirim string, bukan undefined
    };
    addHarvest.mutate({ data: cleanPayload as any });
  }

  const handleNextStep = async () => {
    let fieldsToValidate: ("kegiatan" | "tanggal" | "jumlahPanen" | "hargaJualPerKg" | "kualitas" | "channelPenjualan")[] = [];
    if (step === 1) fieldsToValidate = ["kegiatan"];
    // AUDIT BUG: Mengubah validasi agar mengarah ke properti 'tanggal' yang valid sesuai schema
    if (step === 2) fieldsToValidate = ["tanggal"];
    if (step === 3) fieldsToValidate = ["jumlahPanen", "hargaJualPerKg"];
    if (step === 4) fieldsToValidate = ["kualitas", "channelPenjualan"];

    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) {
      setStep((prev) => prev + 1);
    }
  };


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

      <SheetContent 
        side="top"
        className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl pb-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)]" 
        data-testid="dialog-add-harvest"
      >
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Sprout className="h-5 w-5" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Shortcut Panen</SheetTitle>
              
              <p className="text-[10px] font-bold text-primary tracking-wider uppercase">Step {step} dari 4</p>
            </div>
          </div>
          
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (

              <div 
                key={i} 
                className={[
                  "h-1.5 rounded-full transition-all duration-300", 
                  step === i ? "w-4 bg-primary" : "w-1.5 bg-border"
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
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                              1. Apa nama kegiatan panennya?
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 text-sm font-medium dark:bg-muted/50"
                                placeholder="Panen cabe di blok A"
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
                        name="tanggal" // FIX BUG & SINKRONISASI: Mengubah dari kaku 'date' ke skema asli 'tanggal'
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                              2. Kapan tanggal panennya?
                            </FormLabel>
                            <FormControl>
                              {/* FIX VISUAL: Mengunci lebar maksimal agar presisi kapsul seperti Expenses */}
                              <div className="relative max-w-[220px] w-full">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                  type="date"
                                  className="h-12 rounded-xl bg-muted border-transparent pl-11 pr-4 focus-visible:ring-2 focus-visible:ring-primary/20 font-bold text-sm tracking-tight text-foreground w-full dark:bg-muted/50"
                                  data-testid="input-date"
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
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                        3. Isi Tonase Hasil & Harga Pasar
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="jumlahPanen"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-[11px] font-bold text-muted-foreground">Total Berat (Kg)</FormLabel>
                              <FormControl>
                                {/* FIX UX PRO: Menggunakan placeholder="0" + onFocus auto select text */}
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-muted/50 font-bold text-sm"
                                  placeholder="0.00"
                                  onFocus={(e) => e.target.select()}
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
                              <FormLabel className="text-[11px] font-bold text-muted-foreground">Harga Jual per Kg (Rp)</FormLabel>
                              <FormControl>
                                {/* FIX UX PRO: Menggunakan placeholder="0" + onFocus auto select text */}
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-muted/50 font-bold text-sm"
                                  placeholder="0"
                                  onFocus={(e) => e.target.select()}
                                  data-testid="input-harga-jual"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-xs font-semibold text-red-500" />
                            </FormItem>
                          )}
                        />
                      </div>

                      {totalPendapatan > 0 && (
                        <div className="rounded-2xl bg-primary/[0.04] px-4 py-3 text-sm flex justify-between items-center border border-primary/10 dark:bg-primary/[0.02]">
                          <span className="font-medium text-muted-foreground">Estimasi Omset Panen:</span>
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
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                        4. Klasifikasi Hasil & Jalur Distribusi
                      </p>

                      <FormField
                        control={form.control}
                        name="kualitas"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[11px] font-bold text-muted-foreground">Grade Kualitas</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-primary/20 dark:bg-muted/50" data-testid="select-kualitas">
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
                            <FormLabel className="text-[11px] font-bold text-muted-foreground">Target Pasar / Channel</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-primary/20 dark:bg-muted/50" data-testid="select-channel">
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

                  {/* STEP 5: PEMETAAN NOTION DATABASE */}
                  {step === 5 && (
                    <motion.div
                      key="step5"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-4 text-left"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                        5. Hubungkan Ke Database
                      </p>


                      <FormField
                        control={form.control}
                        name="labaRugiId"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[11px] font-bold text-muted-foreground">Target Mapping Laba Rugi</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-primary/20 dark:bg-muted/50" data-testid="select-laba-rugi">
                                  <SelectValue placeholder="Pilih area laba rugi" />
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
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  {step > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 rounded-xl px-4 font-bold text-muted-foreground"
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
                      className="h-11 rounded-xl px-4 font-bold text-muted-foreground"
                      onClick={() => setOpen(false)}
                      data-testid="button-cancel-harvest"
                    >
                      Batal
                    </Button>
                  )}

                                    {step < 4 ? (
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
        
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />
      </SheetContent>
    </Sheet>
  );
}
