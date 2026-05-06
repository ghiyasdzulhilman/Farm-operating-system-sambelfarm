import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sprout, Loader2 } from "lucide-react";
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

const harvestSchema = z.object({
  kegiatan: z.string().min(1, "Nama kegiatan wajib diisi"),
  jumlahPanen: z.coerce.number().min(0.01, "Jumlah panen harus lebih dari 0"),
  hargaJualPerKg: z.coerce.number().min(0, "Harga tidak boleh negatif"),
  kualitas: z.string().min(1, "Pilih kualitas"),
  channelPenjualan: z.string().min(1, "Pilih channel penjualan"),
  areaId: z.string().min(1, "Pilih area"),
});

type HarvestFormValues = z.infer<typeof harvestSchema>;

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
    defaultValues: {
      kegiatan: "",
      jumlahPanen: 0,
      hargaJualPerKg: 0,
      kualitas: "",
      channelPenjualan: "",
      areaId: "",
    },
  });

  const addHarvest = useAddHarvest({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Data panen berhasil ditambahkan",
          description: "Data telah disimpan ke Notion dan dashboard diperbarui.",
        });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        form.reset({
          kegiatan: "",
          jumlahPanen: 0,
          hargaJualPerKg: 0,
          kualitas: "",
          channelPenjualan: "",
          areaId: "",
        });
        setOpen(false);
        onSuccess?.();
      },
      onError: () => {
        toast({
          variant: "destructive",
          title: "Gagal menyimpan",
          description: "Terjadi kesalahan saat menyimpan data panen ke Notion.",
        });
      },
    },
  });

  function onSubmit(values: HarvestFormValues) {
    addHarvest.mutate({ data: values });
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
        <Button
          variant="secondary"
          data-testid="button-add-harvest"
          className="gap-2"
        >
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
            {[1, 2, 3, 4].map((i) => (
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
                          <SelectItem key={opt} value={opt} data-testid={`option-kualitas-${opt}`}>
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
                          <SelectItem key={opt} value={opt} data-testid={`option-channel-${opt}`}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Area (dari Pindah Tanam) */}
              <FormField
                control={form.control}
                name="areaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area (Pindah Tanam)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-area-panen">
                          <SelectValue placeholder="Pilih area tanam..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dropdownOptions?.pindahTanam.length === 0 && (
                          <SelectItem value="_empty" disabled>
                            Tidak ada area ditemukan
                          </SelectItem>
                        )}
                        {dropdownOptions?.pindahTanam.map((area) => (
                          <SelectItem
                            key={area.id}
                            value={area.id}
                            data-testid={`option-area-${area.id}`}
                          >
                            {area.name}
                          </SelectItem>
                        ))}
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
