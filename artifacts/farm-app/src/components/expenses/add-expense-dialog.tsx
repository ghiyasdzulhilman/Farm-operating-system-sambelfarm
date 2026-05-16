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
  const [step, setStep] = useState(1);
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
        setStep(1);
        setOpen(false);
        onSuccess?.();
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Gagal menyimpan",
          description: "Cek kembali koneksi internet atau server Anda.",
          bg: "destructive"
        });
      },
    },
  });

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
        side="top"
        className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl pb-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)]" 
        data-testid="dialog-add-expense"
      >
        {/* AUDIT: Mengganti border-slate kaku ke semantic border */}
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Shortcut Input</SheetTitle>
              <p className="text-[10px] font-bold text-primary tracking-wider uppercase">Step {step} dari 4</p>
            </div>
          </div>
          
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className={[
                  "h-1.5 rounded-full transition-all duration-300", 
                  /* AUDIT: Mengubah indikator tidak aktif agar adaptif mengikuti rumpun warna utama */
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
                className="space-y-5"
              >
                
                <AnimatePresence mode="wait">
                  {/* STEP 1: NAMA PENGELUARAN */}
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
                        name="pengeluaran"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            {/* AUDIT: Konversi text kaku ke muted-foreground */}
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                              1. Apa nama pengeluarannya?
                            </FormLabel>
                            <FormControl>
                              {/* AUDIT: Mengubah background dark mode input agar seirama dengan basis kustomisasi */}
                              <Input
                                className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 text-sm font-medium dark:bg-muted/50"
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
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="text-left"
                    >
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            {/* AUDIT: Konversi text kaku ke muted-foreground */}
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                              2. Kapan tanggal pengeluarannya?
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                  type="date"
                                  className="h-12 rounded-xl bg-muted border-transparent pl-11 focus-visible:ring-2 focus-visible:ring-primary/20 font-medium dark:bg-muted/50"
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
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-4 text-left"
                    >
                      {/* AUDIT: Konversi text kaku ke muted-foreground */}
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                        3. Isi Jumlah & Harga Satuan
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="qty"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              {/* AUDIT: Konversi text kaku ke muted-foreground */}
                              <FormLabel className="text-[11px] font-bold text-muted-foreground">Volume / Qty</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0.1}
                                  step="any"
                                  className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-muted/50"
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
                              {/* AUDIT: Konversi text kaku ke muted-foreground */}
                              <FormLabel className="text-[11px] font-bold text-muted-foreground">Harga per Pcs (Rp)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={0}
                                  className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-muted/50"
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

                  {/* STEP 4: KATEGORI & AREA */}
                  {step === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-4 text-left"
                    >
                      {/* AUDIT: Konversi text kaku ke muted-foreground */}
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                        4. Hubungkan ke Database (Opsional)
                      </p>
                      
                      <FormField
                        control={form.control}
                        name="kategoriId"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            {/* AUDIT: Konversi text kaku ke muted-foreground */}
                            <FormLabel className="text-[11px] font-bold text-muted-foreground">Kategori</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-primary/20 dark:bg-muted/50" data-testid="select-kategori">
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
                            {/* AUDIT: Konversi text kaku ke muted-foreground */}
                            <FormLabel className="text-[11px] font-bold text-muted-foreground">Target Area Laba Rugi</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-primary/20 dark:bg-muted/50" data-testid="select-area">
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

                {/* NAVIGATION FOOTER */}
                {/* AUDIT: Mengubah border footer kaku ke semantic border */}
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  {step > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      /* AUDIT: Mengubah warna teks tombol kembali kaku ke muted-foreground */
                      className="h-11 rounded-xl px-4 font-bold text-muted-foreground"
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
                      /* AUDIT: Mengubah warna teks tombol batal kaku ke muted-foreground */
                      className="h-11 rounded-xl px-4 font-bold text-muted-foreground"
                      onClick={() => setOpen(false)}
                      data-testid="button-cancel-expense"
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
                      disabled={addExpense.isPending}
                      onClick={form.handleSubmit(onSubmit)}
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
        
        {/* AUDIT: Mengubah warna aksen notch bawah kaku ke semantic border */}
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />
      </SheetContent>
    </Sheet>
  );
}
