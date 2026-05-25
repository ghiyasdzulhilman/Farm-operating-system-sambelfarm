import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  Gauge,
  Loader2,
  MapPinned,
  Paperclip,
  PlusCircle,
  Users,
} from "lucide-react";

import { getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";

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

const operasionalSchema = z.object({
  namaPekerjaan: z.string().min(1, "Nama pekerjaan wajib diisi"),
  kategori: z.string().min(1, "Kategori wajib dipilih"),
  status: z.string().optional(),
  areaIds: z.array(z.string()).min(1, "Minimal pilih 1 area"),
  ditugaskanKeId: z.array(z.string()).min(1, "Minimal pilih 1 pekerja"),
  prioritas: z.string().min(1, "Prioritas wajib dipilih"),
  waktuMulai: z.string().min(1, "Waktu mulai wajib diisi"),
  waktuSelesai: z.string().optional(),
  durasiKerja: z.coerce.number().min(0).default(0),
  modeCatatan: z.enum(["broadcast", "spesifik"]).default("broadcast"),
  catatanBroadcast: z.string().optional(),
  catatanPerArea: z.record(z.string()).optional(),
});

type OperasionalFormValues = z.infer<typeof operasionalSchema>;

interface DropdownOptions {
  areas: Array<{ id: string; name: string }>;
  petugas: Array<{ id: string; name: string }>;
}

interface AddOperasionalDialogProps {
  onSuccess?: () => void;
}

const EMPTY_VALUES: OperasionalFormValues = {
  namaPekerjaan: "",
  kategori: "",
  status: "",
  areaIds: [],
  ditugaskanKeId: [],
  prioritas: "Medium",
  waktuMulai: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  waktuSelesai: "",
  durasiKerja: 0,
  modeCatatan: "broadcast",
  catatanBroadcast: "",
  catatanPerArea: {},
};


export function AddOperasionalDialog({ onSuccess }: AddOperasionalDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [successUrls, setSuccessUrls] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dropdownOptions, isLoading: isLoadingOptions } = useQuery<
    DropdownOptions
  >({
    queryKey: ["operasional-dropdown-options"],
    queryFn: async () => {
      const res = await fetch("/api/notion/operasional-dropdown-options");
      if (!res.ok) {
        throw new Error("Gagal mengambil data dropdown operasional");
      }
      return res.json();
    },
    enabled: open,
  });

    const form = useForm<OperasionalFormValues>({
    resolver: zodResolver(operasionalSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Fungsi khusus untuk me-reset form dan menutup dialog layarnya
  const closeAndReset = () => {
    form.reset(EMPTY_VALUES);
    setStep(1);
    setSuccessUrls([]);
    setOpen(false);
    onSuccess?.();
  };

  // --- AUTO CALCULATE DURATION ---
  const watchWaktuMulai = form.watch("waktuMulai");
  const watchWaktuSelesai = form.watch("waktuSelesai");

  useEffect(() => {
    if (watchWaktuMulai && watchWaktuSelesai) {
      const start = new Date(watchWaktuMulai).getTime();
      const end = new Date(watchWaktuSelesai).getTime();
      
      if (end > start) {
        // Hitung selisih dalam milidetik, ubah ke jam
        const diffInHours = (end - start) / (1000 * 60 * 60);
        // Bulatkan ke 1 angka di belakang koma (contoh: 2.5 jam)
        const roundedHours = Math.round(diffInHours * 10) / 10;
        
        // Update kolom durasi otomatis
        form.setValue("durasiKerja", roundedHours, { shouldValidate: true });
      }
    }
  }, [watchWaktuMulai, watchWaktuSelesai, form]);
  // -------------------------------

  const saveOperasional = useMutation({
    mutationFn: async (payload: OperasionalFormValues) => {
      
      const cleanData = {
        namaPekerjaan: payload.namaPekerjaan,
        kategori: payload.kategori,
        status: payload.status || "Selesai",
        ditugaskanKeId: payload.ditugaskanKeId,
        areaIds: payload.areaIds, // <--- INI OBATNYA! Kita kirim array utuh
        prioritas: payload.prioritas,
        waktuMulai: payload.waktuMulai,
        waktuSelesai: payload.waktuSelesai || undefined,
        durasiKerja: payload.durasiKerja,
  // Logika pintar: ubah format sesuai mode sakelar
    catatan: payload.modeCatatan === "broadcast"
    ? payload.areaIds.reduce((acc, id) => ({ ...acc, [id]: payload.catatanBroadcast || "" }), {})
    : payload.catatanPerArea || {},
      };

      const response = await fetch("/api/notion/add-operasional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanData),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Gagal menyimpan operasional");
      }

      return response.json();
    },
    
        onSuccess: async (responseData) => {
      // Refresh data agar dashboard update otomatis
      await queryClient.invalidateQueries({
        queryKey: getGetDashboardSummaryQueryKey(),
        refetchType: "all",
      });

      // Backend sekarang ngirim: { data: [{ pageId: "...", notionUrl: "..." }, ...] }
      // Kita ambil array-nya di sini:
      const results = responseData?.data || [];
      
      // Kita ambil URL-nya saja untuk layar sukses
      const urls = results.map((d: any) => d.notionUrl).filter(Boolean);

      if (urls.length > 0) {
        // Ini bakal mentrigger layar sukses centang hijau & tombol Notion
        setSuccessUrls(urls);
      } else {
        toast({ title: "Berhasil", description: "Data tersimpan di Notion." });
        closeAndReset();
      }
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

  const toggleArea = (areaId: string) => {
    const currentAreas = form.getValues("areaIds");

    if (currentAreas.includes(areaId)) {
      form.setValue(
        "areaIds",
        currentAreas.filter((id) => id !== areaId),
        { shouldValidate: true },
      );
    } else {
      form.setValue("areaIds", [...currentAreas, areaId], {
        shouldValidate: true,
      });
    }
  };


  const toggleWorker = (workerId: string) => {
  const currentWorkers = form.getValues("ditugaskanKeId");

  if (currentWorkers.includes(workerId)) {
    form.setValue(
      "ditugaskanKeId",
      currentWorkers.filter((id) => id !== workerId),
      { shouldValidate: true },
    );
  } else {
    form.setValue(
      "ditugaskanKeId",
      [...currentWorkers, workerId],
      { shouldValidate: true },
    );
  }
};

  const handleNextStep = async () => {
    let fieldsToValidate: Array<keyof OperasionalFormValues> = [];

    if (step === 1) fieldsToValidate = ["namaPekerjaan", "kategori"];
    if (step === 2) fieldsToValidate = ["areaIds", "ditugaskanKeId", "prioritas"];
    if (step === 3) fieldsToValidate = ["waktuMulai"];

    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) setStep((prev) => prev + 1);
  };

  function onSubmit(values: OperasionalFormValues) {
    saveOperasional.mutate(values);
  }

  const selectedWorkers = form.watch("ditugaskanKeId");

  return (
    <Sheet
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) setStep(1);
      }}
    >
      <SheetTrigger asChild>
        <Button className="h-11 rounded-xl px-5 font-bold bg-green-600 text-white hover:bg-green-700 transition-all active:scale-[0.98] gap-2">
          <PlusCircle className="h-4 w-4" />
          Operasional
        </Button>
      </SheetTrigger>

      <SheetContent
        side="top"
        className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl pb-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)]"
      >

        {successUrls.length > 0 ? (
          // UI LAYAR SUKSES (TOMBOL NOTION)
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="flex flex-col items-center justify-center px-6 py-12 text-center space-y-6"
          >
            <div className="h-20 w-20 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-xl font-black text-foreground">Sukses Terkirim!</h3>
              <p className="text-sm text-muted-foreground mt-2 font-medium">
                Data operasional sudah mendarat di Notion. Mau langsung lampirkan foto/file bukti lapangan sekarang?
              </p>
            </div>
            <div className="w-full space-y-3 pt-4">
              {successUrls.map((url, i) => (
                <Button 
                  key={i} 
                  onClick={() => {
                    window.open(url, "_blank");
                    if (i === successUrls.length - 1) closeAndReset();
                  }} 
                  className="w-full h-12 rounded-xl bg-[#2b2b2b] hover:bg-black text-white font-bold text-sm shadow-md"
                >
                  <ExternalLink className="mr-2 h-4 w-4" /> 
                  Buka Aplikasi Notion {successUrls.length > 1 ? `(Area ${i + 1})` : ''}
                </Button>
              ))}
              <Button 
                variant="ghost" 
                onClick={closeAndReset} 
                className="w-full h-12 rounded-xl font-bold text-muted-foreground hover:bg-muted mt-2"
              >
                Nanti Saja (Lewati)
              </Button>
            </div>
          </motion.div>
        ) : (
          // UI FORM ASLI
          <>
            <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-green-500/10 p-2 text-green-600">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <SheetTitle className="text-base font-black tracking-tight">
                    Input Operasional
                  </SheetTitle>
                  <p className="text-[10px] font-bold text-green-600 tracking-wider uppercase">
                    Step {step} dari 4
                  </p>
                </div>
              </div>

              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((i) => (
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
              {isLoadingOptions && step >= 2 ? (
                <Skeleton className="h-12 w-full rounded-xl" />
              ) : (
                <Form {...form}>
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
                            name="namaPekerjaan"
                            render={({ field }) => (
                              <FormItem className="space-y-1.5">
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                                  1. Nama Pekerjaan
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-green-600/20 text-sm font-medium"
                                    placeholder="Cth: Sanitasi blok A, Perbaikan pompa..."
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs text-red-500" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="kategori"
                            render={({ field }) => (
                              <FormItem className="space-y-1.5">
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                                  Kategori
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-green-600/20">
                                      <SelectValue placeholder="Pilih kategori..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-xl">
                                    <SelectItem value="Penyemprotan">Penyemprotan</SelectItem>
                                    <SelectItem value="Panen">Panen</SelectItem>
                                    <SelectItem value="Sanitasi">Sanitasi</SelectItem>
                                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                                    <SelectItem value="Pengairan">Pengairan</SelectItem>
                                    <SelectItem value="Pengangkutan">Pengangkutan</SelectItem>
                                    <SelectItem value="Monitoring">Monitoring</SelectItem>
                                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage className="text-xs text-red-500" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem className="space-y-1.5">
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                                  Status Dokumentasi
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-green-600/20">
                                      <SelectValue placeholder="Pilih status..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-xl">
                                    <SelectItem value="Belum dikerjakan">Belum dikerjakan</SelectItem>
                                    <SelectItem value="Dalam proses">Dalam proses</SelectItem>
                                    <SelectItem value="Selesai">Selesai</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground">
                                  Opsional, tidak mempengaruhi validasi tanggal.
                                </p>
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
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                                <MapPinned className="inline-block h-3.5 w-3.5 mr-1" />
                                Area Laba Rugi
                              </p>
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                {form.watch("areaIds").length} area terpilih
                              </span>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-muted/20 p-2.5">
                              <div className="flex flex-wrap gap-2">
                                {dropdownOptions?.areas?.length === 0 ? (
                                  <p className="text-sm text-muted-foreground px-1 py-2">
                                    Tidak ada data area ditemukan.
                                  </p>
                                ) : (
                                  dropdownOptions?.areas?.map((item) => {
                                    const isSelected = form.watch("areaIds").includes(item.id);
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => toggleArea(item.id)}
                                        className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border ${
                                          isSelected
                                            ? "bg-green-600 text-white border-green-600 shadow-sm scale-[1.02]"
                                            : "bg-background text-muted-foreground border-border/50 hover:bg-muted"
                                        }`}
                                      >
                                        {item.name}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                            {form.formState.errors.areaIds && (
                              <p className="text-xs text-red-500 mt-2 font-medium">
                                {form.formState.errors.areaIds.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                                <Users className="inline-block h-3.5 w-3.5 mr-1" />
                                Ditugaskan ke
                              </p>
                              <span className="text-[10px] font-semibold text-muted-foreground">
                                {selectedWorkers.length} terpilih
                              </span>
                            </div>
                            <div className="rounded-2xl border border-border/60 bg-muted/20 p-2.5">
                              <div className="flex flex-wrap gap-2">
                                {dropdownOptions?.petugas?.length === 0 ? (
                                  <p className="text-sm text-muted-foreground px-1 py-2">
                                    Tidak ada data pekerja ditemukan.
                                  </p>
                                ) : (
                                  dropdownOptions?.petugas?.map((item) => {
                                    const isSelected = selectedWorkers.includes(item.id);
                                    return (
                                      <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => toggleWorker(item.id)}
                                        className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all border ${
                                          isSelected
                                            ? "bg-green-600 text-white border-green-600 shadow-sm scale-[1.02]"
                                            : "bg-background text-muted-foreground border-border/50 hover:bg-muted"
                                        }`}
                                      >
                                        {item.name}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                            {form.formState.errors.ditugaskanKeId && (
                              <p className="text-xs text-red-500 mt-2 font-medium">
                                {form.formState.errors.ditugaskanKeId.message}
                              </p>
                            )}
                          </div>

                          <FormField
                            control={form.control}
                            name="prioritas"
                            render={({ field }) => (
                              <FormItem className="space-y-1.5">
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                                  <Gauge className="inline-block h-3.5 w-3.5 mr-1" />
                                  Prioritas
                                </FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 rounded-xl bg-muted border-transparent focus:ring-2 focus:ring-green-600/20">
                                      <SelectValue placeholder="Pilih prioritas..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="rounded-xl">
                                    <SelectItem value="Low">Low</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="High">High</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage className="text-xs text-red-500" />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

                      {step === 3 && (
                        <motion.div
                          key="step3"
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="space-y-4"
                        >
                          <FormField
                            control={form.control}
                            name="waktuMulai"
                            render={({ field }) => (
                              <FormItem className="space-y-1.5">
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                                  <CalendarClock className="inline-block h-3.5 w-3.5 mr-1" />
                                  Waktu Mulai
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="datetime-local"
                                    className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-green-600/20 text-sm font-medium"
                                    {...field}
                                  />
                                </FormControl>
                                <p className="text-[10px] text-muted-foreground">
                                  Bisa diisi untuk aktivitas yang terjadi kemarin atau sebelumnya.
                                </p>
                                <FormMessage className="text-xs text-red-500" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="waktuSelesai"
                            render={({ field }) => (
                              <FormItem className="space-y-1.5">
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                                  Waktu Selesai (opsional)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="datetime-local"
                                    className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-green-600/20 text-sm font-medium"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs text-red-500" />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="durasiKerja"
                            render={({ field }) => (
                              <FormItem className="space-y-1.5">
                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                                  Durasi Kerja (jam)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-green-600/20 text-sm font-medium"
                                    placeholder="Cth: 2.5"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs text-red-500" />
                              </FormItem>
                            )}
                          />
                        </motion.div>
                      )}

  {step === 4 && (
  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 pb-4">
  <div className="flex items-center justify-between mb-2">
    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
      <FileText className="inline-block h-3.5 w-3.5 mr-1" />
      Mode Catatan Lapangan
    </p>
  </div>

  {/* SAKELAR MODE */}
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

  {/* KONDISI A: MODE BROADCAST */}
  {form.watch("modeCatatan") === "broadcast" ? (
    <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold">
        Broadcast ke {form.watch("areaIds").length} Area
      </Badge>
      <Textarea
        placeholder="Ketik satu catatan untuk diterapkan ke semua area yang dipilih..."
        className="min-h-[140px] rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-green-600/20 text-sm"
        {...form.register("catatanBroadcast")}
      />
    </div>
  ) : (
    /* KONDISI B: MODE SPESIFIK (PER AREA) */
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {form.watch("areaIds").map((areaId) => {
        const areaName = dropdownOptions?.areas?.find((a) => a.id === areaId)?.name || `Area`;
        return (
          <div key={areaId} className="space-y-1.5 p-3 rounded-xl border border-border bg-muted/20">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 font-bold mb-1">
              {areaName}
            </Badge>
            <Textarea
              placeholder={`Catatan khusus untuk ${areaName}...`}
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
                          disabled={saveOperasional.isPending}
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

                      {step < 4 ? (
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
                          disabled={saveOperasional.isPending}
                          onClick={form.handleSubmit(onSubmit)}
                        >
                          {saveOperasional.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Kirim Data
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
          </>
        )}

      </SheetContent>
    </Sheet>
  );
}