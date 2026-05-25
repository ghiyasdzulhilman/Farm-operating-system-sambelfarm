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

import {
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const perawatanSchema = z.object({
  kegiatan: z.string().min(1, "Nama kegiatan wajib diisi"),
  tanggal: z.string().min(1, "Tanggal kegiatan"),
  labaRugiIds: z.array(z.string()).min(1, "Minimal pilih 1 area"),
  petugasId: z.string().optional(),
  tags: z.string().optional(),
  status: z.string().optional(),
  modeCatatan: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  catatanBroadcast: z.string().optional(),
  catatanPerArea: z.record(z.string()).optional(),
  logProduk: z
    .array(
      z.object({
        produk: z.string().min(1, "Nama produk wajib diisi"),
        dosis: z.string().min(1, "Dosis wajib diisi"),
      }),
    )
    .default([]),
});

type PerawatanFormValues = z.infer<typeof perawatanSchema>;

interface AddPerawatanDialogProps {
  onSuccess?: () => void;
}

const EMPTY_VALUES: PerawatanFormValues = {
  kegiatan: "",
  tanggal: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  labaRugiIds: [],
  petugasId: "",
  tags: "",
  status: "Rencana",
  modeCatatan: "broadcast",
  catatanBroadcast: "",
  catatanPerArea: {},
  logProduk: [],
};

export function AddPerawatanDialog({ onSuccess }: AddPerawatanDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [submittedUrls, setSubmittedUrls] = useState<{pageId: string, notionUrl: string}[] | null>(null); // <--- TAMBAHAN BARU
  const { toast } = useToast();
  const queryClient = useQueryClient();

    // Fetch manual langsung tembak ke rute Perawatan baru lu
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

  const { fields: produkFields, append: appendProduk, remove: removeProduk } =
    useFieldArray({
      control: form.control,
      name: "logProduk",
    });

  
    const savePerawatan = useMutation({
        mutationFn: async (payload: PerawatanFormValues) => {
      // 1. Rakit catatan sesuai mode sakelar
      const dirakitDetailNotes = payload.modeCatatan === "broadcast"
        ? payload.labaRugiIds.reduce((acc, id) => ({ ...acc, [id]: payload.catatanBroadcast || "" }), {})
        : payload.catatanPerArea || {};

      // 2. Siapkan payload final
      const finalPayload = {
        ...payload,
        detailNotes: dirakitDetailNotes,
      };

      const response = await fetch("/api/notion/add-perawatan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Gagal menyimpan perawatan");
      }

      return response.json();
    },
    
        onSuccess: async (data, variables) => {
      // 1. Munculin notif toast hijau

      await queryClient.invalidateQueries({
        queryKey: getGetDashboardSummaryQueryKey(),
        refetchType: "all",
      });
      
      // 2. Simpan URL buat nampilin Layar Sukses
      if (data && data.data) {
        setSubmittedUrls(data.data);
      }
      
      form.reset(EMPTY_VALUES);
      
      // CATATAN: onSuccess?.() KITA HAPUS DARI SINI BIAR GAK LANGSUNG NUTUP
    },

    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan",
        description:
          error instanceof Error
            ? error.message
            : "Cek kembali koneksi internet.",
      });
    },
  });

    const handleNextStep = async () => {
    let fieldsToValidate: Array<keyof PerawatanFormValues> = [];
    if (step === 1) fieldsToValidate = ["kegiatan", "tanggal"];
    if (step === 2) fieldsToValidate = ["labaRugiIds"];
    if (step === 3) fieldsToValidate = ["logProduk"];
    if (step === 4) fieldsToValidate = ["tags", "status", "petugasId"]; // Tambahan baru

    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) setStep((prev) => prev + 1);
  };

  function onSubmit(values: PerawatanFormValues) {
    savePerawatan.mutate(values);
  }

  const toggleArea = (areaId: string) => {
    const currentAreas = form.getValues("labaRugiIds");
    if (currentAreas.includes(areaId)) {
      form.setValue(
        "labaRugiIds",
        currentAreas.filter((id) => id !== areaId),
        { shouldValidate: true },
      );
    } else {
      form.setValue("labaRugiIds", [...currentAreas, areaId], {
        shouldValidate: true,
      });
    }
  };

  return (
    <Sheet
      open={open}
        onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          setStep(1);
          setSubmittedUrls(null); // <-- Tambahin ini
        }
      }}

    >
      <SheetTrigger asChild>
        <Button className="h-11 rounded-xl px-5 font-bold bg-green-600 text-white hover:bg-green-700 transition-all active:scale-[0.98] gap-2">
          <PlusCircle className="h-4 w-4" />
          Perawatan
        </Button>
      </SheetTrigger>

      <SheetContent
        side="top"
        className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl pb-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)]"
      >
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-green-500/10 p-2 text-green-600">
              <Sprout className="h-5 w-5" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">
                Input Perawatan
              </SheetTitle>
              
  <p className="text-[10px] font-bold text-green-600 tracking-wider uppercase">
    Step {step} dari 5
  </p>
</div>
</div>

<div className="flex gap-1.5">
  {[1, 2, 3, 4, 5].map((i) => (

              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === i ? "w-4 bg-green-600" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
        </SheetHeader>
 
        <div className="px-6 py-4">
          {/* JIKA BERHASIL SUBMIT, TAMPILKAN LAYAR SUKSES */}
          {submittedUrls ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-10 text-center space-y-5"
            >
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-foreground tracking-tight">Sukses Tersimpan!</h3>
                <p className="text-sm text-muted-foreground font-medium px-4">
                  Data perawatan berhasil dicatat ke database Notion.
                </p>
              </div>
              
              <div className="w-full space-y-2.5 pt-4">
                {submittedUrls.map((item, idx) => (
                  <Button
                    key={item.pageId}
                    type="button"
                    variant="outline"
                    className="w-full h-12 rounded-xl font-bold border-green-200 text-green-700 bg-green-50/50 hover:bg-green-100"
                    onClick={() => window.open(item.notionUrl, "_blank")}
                  >
                    Buka Notion Area {idx + 1}
                  </Button>
                ))}
                
                  <Button
                  type="button"
                  className="w-full h-12 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 mt-2"
                  onClick={() => {
                    setOpen(false);
                    setStep(1);
                    setSubmittedUrls(null);
                    onSuccess?.(); // <--- KITA PINDAHIN KE SINI
                  }}
                >
                  Tutup Form
                </Button>

              </div>
            </motion.div>
          ) : isLoadingOptions ? (
            <Skeleton className="h-12 w-full rounded-xl" />
          ) : (
            <Form {...form}>
            {/* ... (SISA KODE FORM LU DI BAWAHNYA DIBIARIN AJA) ... */}

              <form
                onSubmit={(e) => e.preventDefault()}
                className="space-y-5 text-left"
              >
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-4"
                    >
                      <FormField
                        control={form.control}
                        name="kegiatan"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                              1. Nama Kegiatan
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-green-600/20 text-sm font-medium"
                                placeholder="Cth: Kocor Kalinet, Semprot Abamektin..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-xs text-red-500" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tanggal"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                              Tanggal
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input
                                type="datetime-local"
                                className="h-12 rounded-xl bg-muted border-transparent pl-11 pr-4 focus-visible:ring-2 focus-visible:ring-green-600/20 font-bold text-sm w-full"
                                {...field}
                               />

                              </div>
                            </FormControl>
                            <FormMessage className="text-xs text-red-500" />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-4"
                    >
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                          2. Pilih Area Laba Rugi (Bisa Lebih dari 1)
                        </p>

                        <div className="flex flex-wrap gap-2 pt-2">
                          {dropdownOptions?.areas?.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Tidak ada data area ditemukan.
                            </p>
                          ) : (
                            dropdownOptions?.areas?.map((item) => {
                              const isSelected = form
                                .watch("labaRugiIds")
                                .includes(item.id);

                              return (
                                <Badge
                                  key={item.id}
                                  variant="outline"
                                  className={`px-4 py-2.5 text-sm cursor-pointer rounded-xl transition-all ${
                                    isSelected
                                      ? "bg-green-600 text-white border-green-600 font-bold shadow-md scale-[1.02]"
                                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                  }`}
                                  onClick={() => toggleArea(item.id)}
                                >
                                  {item.name}
                                </Badge>
                              );
                            })
                          )}
                        </div>

                        {form.formState.errors.labaRugiIds && (
                          <p className="text-xs text-red-500 mt-2 font-medium">
                            {form.formState.errors.labaRugiIds.message}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-4 max-h-[50vh] overflow-y-auto pb-2"
                    >
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                          3. Racikan Bahan (Opsional)
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-lg text-xs font-bold border-green-200 text-green-700 bg-green-50"
                          onClick={() => appendProduk({ produk: "", dosis: "" })}
                        >
                          <Plus className="h-3 w-3 mr-1" /> Tambah
                        </Button>
                      </div>

                      {produkFields.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-muted p-6 text-center">
                          <p className="text-xs text-muted-foreground font-medium mb-3">
                            Tidak ada produk dicatat.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {produkFields.map((field, index) => (
                            <div
                              key={field.id}
                              className="flex gap-2 items-start bg-muted/40 p-3 rounded-xl border border-border/40"
                            >
                              <div className="grid grid-cols-2 gap-2 flex-1">
                                <FormField
                                  control={form.control}
                                  name={`logProduk.${index}.produk`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-1">
                                      <FormLabel className="text-[10px] text-muted-foreground">
                                        Nama Produk
                                      </FormLabel>
                                      <FormControl>
                                        <Input
                                          className="h-10 text-sm bg-white dark:bg-slate-900 rounded-lg"
                                          placeholder="Cth: Calbovit"
                                          {...field}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name={`logProduk.${index}.dosis`}
                                  render={({ field }) => (
                                    <FormItem className="space-y-1">
                                      <FormLabel className="text-[10px] text-muted-foreground">
                                        Dosis
                                      </FormLabel>
                                      <FormControl>
                                        <Input
                                          className="h-10 text-sm bg-white dark:bg-slate-900 rounded-lg"
                                          placeholder="Cth: 2ml/L"
                                          {...field}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 mt-5 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                                onClick={() => removeProduk(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                                    {/* STEP 4: DETAIL PEKERJAAN */}
                  {step === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                        4. Detail Pekerjaan
                      </p>

                      <FormField
                        control={form.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[11px] font-bold text-muted-foreground">
                              Jenis Kegiatan / Tags
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-green-600/20">
                                  <SelectValue placeholder="Pilih tag..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="Pengocoran">Pengocoran</SelectItem>
                                <SelectItem value="Penyemprotan">Penyemprotan</SelectItem>
                                <SelectItem value="Pemupukan">Pemupukan Dasar</SelectItem>
                                <SelectItem value="Selingan">Selingan</SelectItem>
                                <SelectItem value="Lainnya">Lainnya</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[11px] font-bold text-muted-foreground">
                              Status Pekerjaan
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-green-600/20">
                                  <SelectValue placeholder="Pilih status..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl">
                                <SelectItem value="Rencana">Rencana</SelectItem>
                                <SelectItem value="Proses">Sedang Berlangsung (Proses)</SelectItem>
                                <SelectItem value="Selesai">Selesai</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="petugasId"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-[11px] font-bold text-muted-foreground">
                              Petugas Lapangan
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-green-600/20">
                                  <SelectValue placeholder="Pilih petugas..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="rounded-xl">
                                {dropdownOptions?.petugas?.map((item) => (
                                  <SelectItem key={item.id} value={item.id}>
                                    {item.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}

                  {/* STEP 5: CATATAN & FINALISASI */}
                  {step === 5 && (
                    <motion.div
                      key="step5"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 pb-4"
                    >
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                        5. Finalisasi & Catatan
                      </p>

                      {/* SAKELAR MODE CATATAN DETAIL */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] font-bold text-muted-foreground">
                            Mode Catatan Lapangan
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 bg-muted/50 p-1.5 rounded-xl border border-border">
                          <button
                            type="button"
                            onClick={() => form.setValue("modeCatatan", "broadcast")}
                            className={`py-2 text-xs font-bold rounded-lg transition-all ${
                              form.watch("modeCatatan") === "broadcast"
                                ? "bg-white dark:bg-slate-900 shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Sama Semua
                          </button>
                          <button
                            type="button"
                            onClick={() => form.setValue("modeCatatan", "spesifik")}
                            className={`py-2 text-xs font-bold rounded-lg transition-all ${
                              form.watch("modeCatatan") === "spesifik"
                                ? "bg-white dark:bg-slate-900 shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Isi Per Area
                          </button>
                        </div>

                        {form.watch("modeCatatan") === "broadcast" ? (
                          <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200 pt-1">
                            <Textarea
                              placeholder="Ketik catatan detail untuk diterapkan ke semua area..."
                              className="min-h-[140px] rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-green-600/20 text-sm"
                              {...form.register("catatanBroadcast")}
                            />
                          </div>
                        ) : (
                          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200 pt-1">
                            {form.watch("labaRugiIds").map((areaId) => {
                              const areaName = dropdownOptions?.areas?.find((a) => a.id === areaId)?.name || `Area`;
                              return (
                                <div key={areaId} className="space-y-1.5 p-3 rounded-xl border border-border bg-muted/20">
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold mb-1">
                                    {areaName}
                                  </Badge>
                                  <Textarea
                                    placeholder={`Catatan untuk ${areaName}...`}
                                    className="min-h-[80px] rounded-xl bg-background border-border/80 focus-visible:ring-2 focus-visible:ring-green-600/20 text-sm"
                                    value={form.watch(`catatanPerArea.${areaId}`) || ""}
                                    onChange={(e) => form.setValue(`catatanPerArea.${areaId}`, e.target.value)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-between items-center pt-4 border-t border-border">
                  {step > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 rounded-xl px-4 font-bold text-muted-foreground"
                      onClick={() => setStep((p) => p - 1)}
                      disabled={savePerawatan.isPending}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 rounded-xl px-4 font-bold text-muted-foreground"
                      onClick={() => setOpen(false)}
                    >
                      Batal
                    </Button>
                  )}

                  {step < 5 ? (
                    <Button
                      type="button"
                      className="h-11 rounded-xl px-5 font-bold bg-green-600 text-white hover:bg-green-700"
                      onClick={handleNextStep}
                    >
                      Lanjut <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="h-11 rounded-xl px-6 font-bold bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]"
                      disabled={savePerawatan.isPending}
                      onClick={form.handleSubmit(onSubmit)}
                    >
                      {savePerawatan.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Kirim ke Notion
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