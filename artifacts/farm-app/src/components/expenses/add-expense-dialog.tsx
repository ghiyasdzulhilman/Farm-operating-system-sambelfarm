import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { PlusCircle, Loader2, CalendarIcon } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
      onSuccess: () => {
        toast({
          title: "Pengeluaran berhasil ditambahkan",
          description: "Data telah disimpan ke Notion dan dashboard diperbarui.",
        });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
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
          description: "Cek kembali koneksi Notion atau pastikan mapping sudah benar.",
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-expense" className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Tambah Pengeluaran
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg" data-testid="dialog-add-expense">
        <DialogHeader>
          <DialogTitle>Tambah Pengeluaran</DialogTitle>
        </DialogHeader>

        {isLoadingOptions ? (
          <div className="space-y-4 py-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">

              <FormField
                control={form.control}
                name="pengeluaran"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Pengeluaran</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="mis. Pupuk NPK, Pestisida..."
                        data-testid="input-pengeluaran"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="date"
                          className="pl-9"
                          data-testid="input-date"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="qty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qty</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0.1}
                          step="any"
                          placeholder="0"
                          data-testid="input-qty"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hargaPerPcs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga/pcs (IDR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          data-testid="input-harga"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {subtotal > 0 && (
                <div className="rounded-md bg-muted/50 px-4 py-2 text-sm flex justify-between items-center border border-border/60">
                  <span className="text-muted-foreground">Subtotal estimasi</span>
                  <span className="font-semibold text-foreground" data-testid="text-subtotal">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              )}

              <FormField
                control={form.control}
                name="kategoriId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori (Opsional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-kategori">
                          <SelectValue placeholder="Pilih kategori pengeluaran..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dropdownOptions?.categories?.length === 0 ? (
                          <SelectItem value="_empty" disabled>Tidak ada kategori ditemukan</SelectItem>
                        ) : (
                          dropdownOptions?.categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id} data-testid={`option-kategori-${cat.id}`}>
                              {cat.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="areaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area Laba Rugi (Opsional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-area">
                          <SelectValue placeholder="Pilih area kebun..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dropdownOptions?.areas?.length === 0 ? (
                          <SelectItem value="_empty" disabled>Tidak ada area ditemukan</SelectItem>
                        ) : (
                          dropdownOptions?.areas?.map((area) => (
                            <SelectItem key={area.id} value={area.id} data-testid={`option-area-${area.id}`}>
                              {area.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={addExpense.isPending}
                  data-testid="button-cancel-expense"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
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
      </DialogContent>
    </Dialog>
  );
}
