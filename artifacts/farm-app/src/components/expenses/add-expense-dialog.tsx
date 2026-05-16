import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { PlusCircle, Loader2, CalendarIcon, Wallet, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

import {
  useAddExpense,
  useGetDropdownOptions,
  getGetDropdownOptionsQueryKey,
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

// SATPAM DILONGGARIN: kategoriId & areaId dibuat optional biar form ga macet
const expenseSchema = z.object({
  pengeluaran: z.string().min(1, "Nama pengeluaran wajib diisi"),
  date: z.string().min(1, "Tanggal wajib diisi"),
  qty: z.coerce.number().min(0.1, "Qty tidak valid"),
  hargaPerPcs: z.coerce.number().min(0, "Harga tidak boleh negatif"),
  kategoriId: z.string().optional(),
  areaId: z.string().optional(),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface AddExpenseDialogProps {
  onSuccess?: () => void;
}

export function AddExpenseDialog({ onSuccess }: AddExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // Tracker Pop-up Step ala iOS Shortcut
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dropdownOptions, isLoading: isLoadingOptions } = useGetDropdownOptions({
    query: { enabled: open, queryKey: getGetDropdownOptionsQueryKey() },
  });

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      pengeluaran: "",
      date: format(new Date(), "yyyy-MM-dd"),
      qty: 1,
      hargaPerPcs: 0,
      kategoriId: "",
      areaId: "",
    },
  });

  const addExpense = useAddExpense({
    mutation: {
      onSuccess: async () => {
        toast({
          title: "Disimpan ke Antrean",
          description: "Data masuk Staging dan dashboard diperbarui secara instan.",
        });

        await queryClient.invalidateQueries({ 
          queryKey: getGetDashboardSummaryQueryKey(),
          refetchType: "all" 
        });

        await queryClient.invalidateQueries({
          queryKey: ["staging", "list"]
        });

        form.reset({
          pengeluaran: "",
          date: format(new Date(), "yyyy-MM-dd"),
          qty: 1,
          hargaPerPcs: 0,
          kategoriId: "",
          areaId: "",
        });
        setStep(1); // Kembalikan ke step 1 pas sukses
        setOpen(false);
        onSuccess?.();
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Gagal menyimpan",
          description: "Cek kembali koneksi internet atau server Anda.",
        });
      },
    },
  });

  // Fungsi Validasi tiap step sebelum diperbolehkan klik "Lanjut"
  const handleNextStep = async () => {
    let fieldsToValidate: ("pengeluaran" | "date" | "qty" | "hargaPerPcs")[] = [];
    if (step === 1) fieldsToValidate = ["pengeluaran"];
    if (step === 2) fieldsToValidate = ["date"];
    if (step === 3) fieldsToValidate = ["qty", "hargaPerPcs"];

    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) {
      setStep((prev) => prev + 1);
    }
  };

  function onSubmit(values: ExpenseFormValues) {
    const cleanPayload = {
      ...values,
      kategoriId: values.kategoriId === "" ? undefined : values.kategoriId,
      areaId: values.areaId === "" ? undefined : values.areaId,
    };
    addExpense.mutate({ data: cleanPayload as any });
  }

  const subtotal = (form.watch("qty") || 0) * (form.watch("hargaPerPcs") || 0);
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
          data-testid="button-add-expense" 
          className="h-11 rounded-xl px-5 font-bold transition-all active:scale-[0.98] bg-primary text-primary-foreground hover:opacity-90 gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Tambah Pengeluaran
        </Button>
      </SheetTrigger>

      <SheetContent 
        side="bottom"
        className="mx-auto max-w-md rounded-t-[2rem] border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl pb-6" 
        data-testid="dialog-add-expense"
      >
        {/* Handle Bar Laci Bawah */}
        <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-800" />

        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-900">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Shortcut Input</SheetTitle>
              <p className="text-[10px] font-bold text-primary tracking-wider uppercase">Step {step} dari 4</p>
            </div>
          </div>
          
          {/* Progress Indicator Dots */}
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
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

        <div className="px-6 py-6">
          {isLoadingOptions ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* ANIMATION CONTAINER AGAR BELAK-BELOK STEP BERASA HALUS */}
                <AnimatePresence mode="wait">
                  
                  {/* STEP 1: NAMA PENGELUARAN */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      className="space-y-1.5 text-left"
                    >
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        1. Apa nama pengeluarannya?
                      </FormLabel>
                      <FormField
                        control={form.control}
                        name="pengeluaran"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 text-sm font-medium dark:bg-slate-900/50"
                                placeholder="mis. Beli Pupuk Kalinet, Bayar Harian..."
                                data-testid="input-pengeluaran"
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
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      className="space-y-1.5 text-left"
                    >
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        2. Kapan tanggal pengeluarannya?
                      </FormLabel>
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="relative">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                  type="date"
                                  className="h-12 rounded-xl bg-muted border-transparent pl-11 focus-visible:ring-2 focus-visible:ring-primary/20 font-medium dark:bg-slate-900/50"
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

                  {/* STEP 3: QTY & HARGA */}
                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      className="space-y-4 text-left"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        3. Isi Jumlah & Harga Satuan
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="qty"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-[11px] font-bold text-slate-400">Volume / Qty</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0.1}
                                  step="any"
                                  className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-slate-900/50"
                                  placeholder="0"
                                  data-testid="input-qty"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-xs font-semibold text-red-500" />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="hargaPerPcs"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-[11px] font-bold text-slate-400">Harga per Pcs (Rp)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-slate-900/50"
                                  placeholder="0"
                                  data-testid="input-harga"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage className="text-xs font-semibold text-red-500" />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Live Subtotal Badge */}
                      {subtotal > 0 && (
                        <div className="rounded-2xl bg-primary/[0.04] px-4 py-3 text-sm flex justify-between items-center border border-primary/10 dark:bg-primary/[0.02]">
                          <span className="font-medium text-muted-foreground">Total Pengeluaran:</span>
                          <span className="font-black text-primary text-base" data-testid="text-subtotal">
                            {formatCurrency(subtotal)}
                          </span>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 4: KATEGORI & AREA (OPSIONAL) */}
                  {step === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      className="space-y-4 text-left"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        4. Hubungkan ke Database (Opsional)
                      </p>
                      
                      <FormField
                        control={form.control}
                        name="kategoriId"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[11px] font-bold text-slate-400">Kategori</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/50" data-testid="select-kategori">
                                  <SelectValue placeholder="Pilih kategori (Bisa dilewati)..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl shadow-xl">
                                {dropdownOptions?.categories?.length === 0 ? (
                                  <SelectItem value="_empty" disabled>Tidak ada kategori</SelectItem>
                                ) : (
                                  dropdownOptions?.categories?.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id} data-testid={`option-kategori-${cat.id}`} className="rounded-lg">
                                      {cat.name}
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
                        name="areaId"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[11px] font-bold text-slate-400">Target Area Laba Rugi</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/50" data-testid="select-area">
                                  <SelectValue placeholder="Pilih area kebun (Bisa dilewati)..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl shadow-xl">
                                {dropdownOptions?.areas?.length === 0 ? (
                                  <SelectItem value="_empty" disabled>Tidak ada area</SelectItem>
                                ) : (
                                  dropdownOptions?.areas?.map((area) => (
                                    <SelectItem key={area.id} value={area.id} data-testid={`option-area-${area.id}`} className="rounded-lg">
                                      {area.name}
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

                {/* DYNAMIC ACTION NAVIGATION FOOTER */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-900">
                  {/* Button Kiri: Kembali atau Batal */}
                  {step > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 rounded-xl px-4 font-bold text-slate-500"
                      onClick={() => setStep((p) => p - 1)}
                      disabled={addExpense.isPending}
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
                      data-testid="button-cancel-expense"
                    >
                      Batal
                    </Button>
                  )}

                  {/* Button Kanan: Lanjut atau Simpan (Submit) */}
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
                      type="submit"
                      className="h-11 rounded-xl px-6 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98]"
                      disabled={addExpense.isPending}
                      data-testid="button-submit-expense"
                    >
                      {addExpense.isPending ? (
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
      </SheetContent>
    </Sheet>
  );
}
