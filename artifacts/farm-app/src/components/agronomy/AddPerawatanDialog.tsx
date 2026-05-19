import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { PlusCircle, Loader2, CalendarIcon, ArrowRight, ArrowLeft, CheckCircle2, Sprout, Plus, Trash2 } from "lucide-react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

import { useGetDropdownOptions, getGetDropdownOptionsQueryKey } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import { PERAWATAN_SCHEMA } from "@/config/schemas/perawatan.config";

// --- SCHEMA VALIDASI ---
const perawatanSchema = z.object(
  Object.fromEntries(
    PERAWATAN_SCHEMA.fields.map((field) => {
      let validator: any = z.string().optional();

      if (field.expectedType === "title") {
        validator = z.string().min(1, `${field.label} wajib diisi`);
      }

      if (field.expectedType === "date") {
        validator = z.string().min(1, `${field.label} wajib diisi`);
      }

      return [field.key, validator];
    })
  )
);

type PerawatanFormValues = z.infer<typeof perawatanSchema>;

interface AddPerawatanDialogProps {
  onSuccess?: () => void;
}

export function AddPerawatanDialog({ onSuccess }: AddPerawatanDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Tarik data area dari database lu
  const { data: dropdownOptions, isLoading: isLoadingOptions } = useGetDropdownOptions({
    query: { enabled: open, queryKey: getGetDropdownOptionsQueryKey() },
  });
console.log("dropdownOptions", dropdownOptions);

  const form = useForm<PerawatanFormValues>({
  resolver: zodResolver(perawatanSchema),

  defaultValues: {
    kegiatan: "",
    tanggal: format(new Date(), "yyyy-MM-dd"),
    labaRugiIds: [],
    tags: "",
    detailNotes: "",
    logProduk: [],
  },
});

  // Fitur Dynamic Array untuk Bahan & Dosis
  const { fields: produkFields, append: appendProduk, remove: removeProduk } = useFieldArray({
    control: form.control,
    name: "logProduk",
  });

    // Fetch API untuk menyimpan perawatan (Standard Notion V2)
 const savePerawatan = useMutation({
  mutationFn: async (payload: PerawatanFormValues) => {

    const promises = (payload.labaRugiIds || []).map(async (areaId) => {

      const cleanData = {
        kegiatan: payload.kegiatan,
        tanggal: payload.tanggal,
        tags: payload.tags ? [payload.tags] : [],
        labaRugiId: areaId,
        logProduk: payload.logProduk,
        detailNotes: payload.detailNotes,
      };

      const response = await fetch("/api/staging/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseType: "perawatan",
          data: cleanData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Gagal menyimpan untuk area ${areaId}`);
      }

      await fetch("/api/staging/sync", {
        method: "POST",
      });

      return response.json();
    });

    return Promise.all(promises);
  },

  onSuccess: async (_, variables) => {
      toast({
        description: (
          <div className="w-full space-y-3 pt-1 text-left">
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse mt-1.5 shrink-0 shadow-[0_0_8px_var(--green-500)]" />
              <div className="space-y-0.5">
                <p className="font-black text-sm text-foreground tracking-tight">Perawatan Tersimpan</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
        Sukses disimpan untuk
<span>
  {form.getValues("labaRugiIds")?.length ?? 0} blok
</span>
                </p>
              </div>
            </div>
          </div>
        ),
      });

      await queryClient.invalidateQueries({ queryKey: ["staging", "list"] });
      form.reset();
      setStep(1);
      setOpen(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Gagal menyimpan",
        description: error instanceof Error ? error.message : "Cek kembali koneksi internet.",
      });
    },
  });

  const handleNextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ["kegiatan", "tanggal"];
    if (step === 2) fieldsToValidate = ["labaRugiIds"];
    if (step === 3) fieldsToValidate = ["logProduk"]; // Validasi semua produk di step 3

    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) setStep((prev) => prev + 1);
  };

  function onSubmit(values: PerawatanFormValues) {
    savePerawatan.mutate(values);
  }

  // Helper untuk toggle pilihan area (Multi-select ramah jempol)
  const toggleArea = (areaId: string) => {
    const currentAreas = form.getValues("labaRugiIds")
    if (currentAreas.includes(areaId)) {
      form.setValue("labaRugiIds", currentAreas.filter((id) => id !== areaId), { shouldValidate: true });
    } else {
      form.setValue("labaRugiIds", [...currentAreas, areaId], { shouldValidate: true });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (!val) setStep(1); }}>
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
              <SheetTitle className="text-base font-black tracking-tight">Input Perawatan</SheetTitle>
              <p className="text-[10px] font-bold text-green-600 tracking-wider uppercase">Step {step} dari 4</p>
            </div>
          </div>
          
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? "w-4 bg-green-600" : "w-1.5 bg-border"}`} />
            ))}
          </div>
        </SheetHeader>

        <div className="px-6 py-4">
          {isLoadingOptions ? (
            <Skeleton className="h-12 w-full rounded-xl" />
          ) : (
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-5 text-left">
                
                <AnimatePresence mode="wait">
                  {/* STEP 1: KEGIATAN & TANGGAL */}
                  {step === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4">
                      <FormField control={form.control} name="kegiatan" render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">1. Nama Kegiatan</FormLabel>
                          <FormControl>
                            <Input className="h-12 rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-green-600/20 text-sm font-medium" placeholder="Cth: Kocor Kalinet, Semprot Abamektin..." {...field} />
                          </FormControl>
                          <FormMessage className="text-xs text-red-500" />
                        </FormItem>
                      )} />
                      
                      <FormField control={form.control} name="tanggal" render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Tanggal</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                              <Input type="date" className="h-12 rounded-xl bg-muted border-transparent pl-11 pr-4 focus-visible:ring-2 focus-visible:ring-green-600/20 font-bold text-sm w-full" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs text-red-500" />
                        </FormItem>
                      )} />
                    </motion.div>
                  )}

                                    {/* STEP 2: MULTI-SELECT AREA LABA RUGI */}
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
    const isSelected = form.watch("labaRugiIds").includes(item.id);

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

                  {/* STEP 3: RACIKAN BAHAN & DOSIS */}
                  {step === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4 max-h-[50vh] overflow-y-auto pb-2">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">3. Racikan Bahan (Opsional)</p>
                        <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg text-xs font-bold border-green-200 text-green-700 bg-green-50" onClick={() => appendProduk({ produk: "", dosis: "" })}>
                          <Plus className="h-3 w-3 mr-1" /> Tambah
                        </Button>
                      </div>

                      {produkFields.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-muted p-6 text-center">
                          <p className="text-xs text-muted-foreground font-medium mb-3">Tidak ada produk dicatat.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {produkFields.map((field, index) => (
                            <div key={field.id} className="flex gap-2 items-start bg-muted/40 p-3 rounded-xl border border-border/40">
                              <div className="grid grid-cols-2 gap-2 flex-1">
                                <FormField control={form.control} name={`logProduk.${index}.produk`} render={({ field }) => (
                                  <FormItem className="space-y-1">
                                    <FormLabel className="text-[10px] text-muted-foreground">Nama Produk</FormLabel>
                                    <FormControl><Input className="h-10 text-sm bg-white dark:bg-slate-900 rounded-lg" placeholder="Cth: Calbovit" {...field} /></FormControl>
                                  </FormItem>
                                )} />
                                <FormField control={form.control} name={`logProduk.${index}.dosis`} render={({ field }) => (
                                  <FormItem className="space-y-1">
                                    <FormLabel className="text-[10px] text-muted-foreground">Dosis</FormLabel>
                                    <FormControl><Input className="h-10 text-sm bg-white dark:bg-slate-900 rounded-lg" placeholder="Cth: 2ml/L" {...field} /></FormControl>
                                  </FormItem>
                                )} />
                              </div>
                              <Button type="button" variant="ghost" size="icon" className="h-10 w-10 mt-5 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0" onClick={() => removeProduk(index)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 4: KATEGORI & PETUGAS */}
                  {step === 4 && (
                    <motion.div key="step4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">4. Finalisasi</p>
                      
                      <FormField control={form.control} name="tags" render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-[11px] font-bold text-muted-foreground">Jenis Kegiatan / Tags</FormLabel>
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
                              <SelectItem value="Sanitasi">Sanitasi / Pembersihan</SelectItem>
                              <SelectItem value="Lainnya">Lainnya</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
<FormField
  control={form.control}
  name="detailNotes"
  render={({ field }) => (
    <FormItem className="space-y-1.5 pt-2">
      <FormLabel className="text-[11px] font-bold text-muted-foreground">
        Catatan Detail Perawatan
      </FormLabel>

      <FormControl>
        <Textarea
          placeholder="Tulis observasi, kondisi tanaman, kendala, atau catatan lapangan..."
          className="min-h-[120px] rounded-xl bg-muted border-transparent focus-visible:ring-2 focus-visible:ring-green-600/20 text-sm"
          {...field}
        />
      </FormControl>

      <FormMessage />
    </FormItem>
  )}
/>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* NAVIGATION FOOTER */}
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  {step > 1 ? (
                    <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground" onClick={() => setStep((p) => p - 1)} disabled={savePerawatan.isPending}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground" onClick={() => setOpen(false)}>
                      Batal
                    </Button>
                  )}

                  {step < 4 ? (
                    <Button type="button" className="h-11 rounded-xl px-5 font-bold bg-green-600 text-white hover:bg-green-700" onClick={handleNextStep}>
                      Lanjut <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="button" className="h-11 rounded-xl px-6 font-bold bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]" disabled={savePerawatan.isPending} onClick={form.handleSubmit(onSubmit)}>
                      {savePerawatan.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</>
                      ) : (
                        <><CheckCircle2 className="mr-2 h-4 w-4" /> Kirim ke Notion</>
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
