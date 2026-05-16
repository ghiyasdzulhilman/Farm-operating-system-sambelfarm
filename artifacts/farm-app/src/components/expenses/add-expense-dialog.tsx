import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { PlusCircle, Loader2, CalendarIcon, Wallet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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
} from "@/components/ui/sheet"; // Ganti dari Dialog ke Sheet
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

        // 1. PAKSA Dashboard buat tarik data baru saat ini juga
        await queryClient.invalidateQueries({ 
          queryKey: getGetDashboardSummaryQueryKey(),
          refetchType: "all" 
        });

        // 2. KASIH TAU Staging Queue Card kalau ada data baru
        // Ini KUNCI biar staging pending card-nya langsung kerasa dapet data baru
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

  function onSubmit(values: ExpenseFormValues) {
    // Bersihkan data kosong (ubah string kosong jadi undefined biar Notion ga error)
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
    <Sheet open={open} onOpenChange={setOpen}>
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
        className="sm:max-w-lg rounded-t-[2rem] border-t-0 p-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl" 
        data-testid="dialog-add-expense"
      >
        {/* Visually indicate draggable/closable sheet */}
        <div className="mx-auto mt-4 h-1.5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />

        <SheetHeader className="px-6 py-4 flex flex-row items-center gap-3 border-b pb-4 border-slate-100 dark:border-slate-900">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <SheetTitle className="text-lg font-black tracking-tight">Tambah Pengeluaran</SheetTitle>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">Catat biaya logistik & input pertanian kebun</p>
          </div>
        </SheetHeader>

        {/* NEW: Scrollable content container for the form */}
        <div className="px-6 py-2 h-[calc(100dvh-180px)] max-h-[500px] overflow-y-auto">
          {isLoadingOptions ? (
            <div className="space-y-4 py-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">

                {/* FIELD: NAMA PENGELUARAN */}
                <FormField
                  control={form.control}
                  name="pengeluaran"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Nama Pengeluaran</FormLabel>
                      <FormControl>
                        <Input
                          className="h-11 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-slate-900/50"
                          placeholder="mis. Pupuk NPK, Pestisida..."
                          data-testid="input-pengeluaran"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs font-semibold text-red-500" />
                    </FormItem>
                  )}
                />

                {/* FIELD: TANGGAL */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tanggal</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          <Input
                            type="date"
                            className="h-11 rounded-xl bg-muted border-transparent pl-10 focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-slate-900/50"
                            data-testid="input-date"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs font-semibold text-red-500" />
                    </FormItem>
                  )}
                />

                {/* GRID: QTY & HARGA */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="qty"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Qty</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0.1}
                            step="any"
                            className="h-11 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-slate-900/50"
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
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Harga/pcs (IDR)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            className="h-11 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-primary/20 dark:bg-slate-900/50"
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

                {/* ESTIMATED SUBTOTAL PANEL (Apple-style Filled Input) */}
                {subtotal > 0 && (
                  <div className="rounded-2xl bg-muted/30 px-4 py-3 text-xs sm:text-sm flex justify-between items-center border border-primary/10 dark:bg-primary/[0.02]">
                    <span className="font-medium text-muted-foreground">Subtotal estimasi</span>
                    <span className="font-black text-primary" data-testid="text-subtotal">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                )}

                {/* FIELD: KATEGORI */}
                <FormField
                  control={form.control}
                  name="kategoriId"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Kategori (Opsional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger 
                            className="h-11 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/50" 
                            data-testid="select-kategori"
                          >
                            <SelectValue placeholder="Pilih kategori pengeluaran..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl shadow-xl border-slate-100 dark:border-slate-900">
                          {dropdownOptions?.categories?.length === 0 ? (
                            <SelectItem value="_empty" disabled>Tidak ada kategori ditemukan</SelectItem>
                          ) : (
                            dropdownOptions?.categories?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id} data-testid={`option-kategori-${cat.id}`} className="rounded-lg">
                                {cat.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs font-semibold text-red-500" />
                    </FormItem>
                  )}
                />

                {/* FIELD: AREA LABA RUGI */}
                <FormField
                  control={form.control}
                  name="areaId"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Area Laba Rugi (Opsional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger 
                            className="h-11 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-primary/20 dark:bg-slate-900/50" 
                            data-testid="select-area"
                          >
                            <SelectValue placeholder="Pilih area kebun..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl shadow-xl border-slate-100 dark:border-slate-900">
                          {dropdownOptions?.areas?.length === 0 ? (
                            <SelectItem value="_empty" disabled>Tidak ada area ditemukan</SelectItem>
                          ) : (
                            dropdownOptions?.areas?.map((area) => (
                              <SelectItem key={area.id} value={area.id} data-testid={`option-area-${area.id}`} className="rounded-lg">
                                {area.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs font-semibold text-red-500" />
                    </FormItem>
                  )}
                />

                {/* FOOTER ACTION BUTTONS */}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl px-5 font-bold border-border hover:bg-slate-50"
                    onClick={() => setOpen(false)}
                    disabled={addExpense.isPending}
                    data-testid="button-cancel-expense"
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    className="h-11 rounded-xl px-5 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98]"
                    disabled={addExpense.isPending}
                    data-testid="button-submit-expense"
                  >
                    {addExpense.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      "Simpan Pengeluaran"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
