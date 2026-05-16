import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Sprout, Loader2, CalendarIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import {
  useAddHarvest,
  useGetHarvestDropdownOptions,
  getGetHarvestDropdownOptionsQueryKey,
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
  tanggal: format(new Date(), "yyyy-MM-dd"), // Default hari ini
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
    // Bersihkan id yang kosong biar gak bikin error di Notion
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" data-testid="button-add-harvest" className="gap-2">
          <Sprout className="h-4 w-4" />
          Tambah Panen
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg" data-testid="dialog-add-harvest">
        <DialogHeader>
          <DialogTitle>Tambah Data Panen</DialogTitle>
        </DialogHeader>

        {isLoadingOptions ? (
          <div className="space-y-4 py-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">

              {/* Kegiatan */}
              <FormField
                control={form.control}
                name="kegiatan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kegiatan</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="mis. Panen Cabai Merah Keriting..."
                        data-testid="input-kegiatan"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tanggal (Baru Ditambahkan) */}
              <FormField
                control={form.control}
                name="tanggal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tanggal Panen</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          type="date"
                          className="pl-9"
                          data-testid="input-tanggal"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Jumlah Panen + Harga Jual */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="jumlahPanen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jumlah Panen (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0"
                          data-testid="input-jumlah-panen"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hargaJualPerKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga Jual per (Kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          data-testid="input-harga-jual"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Estimasi total pendapatan */}
              {totalPendapatan > 0 && (
                <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 text-sm flex justify-between items-center border border-emerald-200 dark:border-emerald-800">
                  <span className="text-emerald-700 dark:text-emerald-400">Total Pendapatan estimasi</span>
                  <span
                    className="font-semibold text-emerald-700 dark:text-emerald-400"
                    data-testid="text-total-pendapatan-estimasi"
                  >
                    {formatCurrency(totalPendapatan)}
                  </span>
                </div>
              )}

              {/* Kualitas */}
              <FormField
                control={form.control}
                name="kualitas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kualitas</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-kualitas">
                          <SelectValue placeholder="Pilih grade kualitas..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {KUALITAS_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Channel Penjualan */}
              <FormField
                control={form.control}
                name="channelPenjualan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel Penjualan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-channel">
                          <SelectValue placeholder="Pilih channel penjualan..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CHANNEL_OPTIONS.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Area Pindah Tanam (Dibuat Opsional) */}
              <FormField
                control={form.control}
                name="pindahTanamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area Pindah Tanam (Opsional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-pindah-tanam">
                          <SelectValue placeholder="Pilih area pindah tanam..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dropdownOptions?.pindahTanam?.length === 0 ? (
                          <SelectItem value="_empty" disabled>
                            Tidak ada data ditemukan
                          </SelectItem>
                        ) : (
                          dropdownOptions?.pindahTanam?.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Area Laba Rugi (Dibuat Opsional) */}
              <FormField
                control={form.control}
                name="labaRugiId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area Laba Rugi (Opsional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-laba-rugi">
                          <SelectValue placeholder="Pilih area laba rugi..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dropdownOptions?.labaRugi?.length === 0 ? (
                          <SelectItem value="_empty" disabled>
                            Tidak ada data ditemukan
                          </SelectItem>
                        ) : (
                          dropdownOptions?.labaRugi?.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
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
                  disabled={addHarvest.isPending}
                  data-testid="button-cancel-harvest"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={addHarvest.isPending}
                  data-testid="button-submit-harvest"
                >
                  {addHarvest.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Data Panen"
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
