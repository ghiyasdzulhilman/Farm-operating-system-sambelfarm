import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { 
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, MapPinned, 
  PackageOpen, Briefcase, ShoppingCart, Tag, PlusCircle, Calendar 
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// ==========================================
// ZOD SCHEMA
// ==========================================
const panenSchema = z.object({
  areaId: z.string().min(1, "Wajib pilih 1 area lahan"),
  kegiatan: z.string().min(1, "Nama kegiatan wajib diisi"),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  kuantitasKg: z.coerce.number().min(0.1, "Kuantitas wajib diisi (Min. 0.1 Kg)"),
  hargaJualPerKg: z.coerce.number().min(1, "Harga jual wajib diisi"),
  kualitas: z.string().optional(),
  catatan: z.string().optional(),
});

type PanenFormValues = z.infer<typeof panenSchema>;

const EMPTY_VALUES: PanenFormValues = {
  areaId: "",
  kegiatan: "Panen Rutin",
  tanggal: format(new Date(), "yyyy-MM-dd"),
  kuantitasKg: 0,
  hargaJualPerKg: 0,
  kualitas: "",
  catatan: "",
};

export function FormPanen({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [submittedRecords, setSubmittedRecords] = useState<any | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dropdownData, isLoading: isLoadingOptions } = useQuery({
    queryKey: ["harvestDropdown"],
    queryFn: async () => {
      const res = await fetch("/api/harvest/dropdown");
      if (!res.ok) throw new Error("Gagal mengambil data dropdown");
      return res.json();
    },
    enabled: open, 
  });

  const form = useForm<PanenFormValues>({
    resolver: zodResolver(panenSchema),
    defaultValues: EMPTY_VALUES,
  });

  const selectedAreaId = useWatch({ control: form.control, name: "areaId" });
  const currentKuantitas = useWatch({ control: form.control, name: "kuantitasKg" });
  const currentHarga = useWatch({ control: form.control, name: "hargaJualPerKg" });
  const totalPendapatan = (currentKuantitas || 0) * (currentHarga || 0);

  const savePanen = useMutation({
    mutationFn: async (payload: PanenFormValues) => {
      const res = await fetch("/api/harvest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan data panen");
      }
      return res.json();
    },
    onSuccess: (responseData) => {
  queryClient.invalidateQueries({ queryKey: ["harvest"] });
  queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] }); 
  
  setSubmittedRecords(responseData.data);
  form.reset(EMPTY_VALUES);
  onSuccess?.();
},
    onError: (err: any) => {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" });
    },
  });

  const handleNextStep = async () => {
  let fieldsToValidate: Array<keyof PanenFormValues> = [];
  
  if (step === 1) {
    fieldsToValidate = ["kegiatan", "areaId", "tanggal"];
    if (!form.getValues("areaId")) {
      toast({ variant: "destructive", title: "Oops!", description: "Pilih 1 Sumber Lahan terlebih dahulu." }); 
      return;
    }
  } else if (step === 2) {
    fieldsToValidate = ["kuantitasKg", "hargaJualPerKg"];
  }

  const isStepValid = await form.trigger(fieldsToValidate);
  if (isStepValid) setStep((prev) => prev + 1);
};

  const onSubmit = (values: PanenFormValues) => {
    savePanen.mutate(values);
  };

  return (
    <Sheet open={open} onOpenChange={(val) => { 
      setOpen(val); 
      if (!val) { 
        setStep(1); 
        setSubmittedRecords(null); 
        form.reset(EMPTY_VALUES); 
      } 
    }}>
      <SheetTrigger asChild>
        <Button className="h-11 rounded-xl px-5 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98] gap-2">
          <PlusCircle className="h-4 w-4" /> Panen
        </Button>
      </SheetTrigger>

      {/* 🚀 DIUBAH: Mengikuti styling addoperasionaldialog (side="top", rounded-b-[2rem], blur, padding) */}
      <SheetContent side="top" className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] pb-5">
        
        {/* HEADER */}
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shadow-sm">
              <PackageOpen className="h-5 w-5" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Input Panen</SheetTitle>
              <p className="text-[10px] font-bold text-primary tracking-wider uppercase">Step {step} dari 3</p>
            </div>
          </div>
          <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
            ))}
          </div>
        </SheetHeader>

        <div className="px-6 py-4">
          {submittedRecords ? (
            // LAYAR SUKSES
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-6 text-center space-y-5">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-1">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-foreground tracking-tight">Data Berhasil Disimpan</h3>
                <p className="text-xs text-muted-foreground">Stok gudang & keuangan telah diperbarui.</p>
              </div>
              <div className="w-full space-y-2 pt-4">
                <Button type="button" className="w-full h-11 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground hover:opacity-90 mt-1" onClick={() => { setOpen(false); setStep(1); setSubmittedRecords(null); form.reset(EMPTY_VALUES); }}>
                  Tutup Form
                </Button>
              </div>
            </motion.div>
          ) : isLoadingOptions ? (
             <Skeleton className="h-12 w-full rounded-xl" />
          ) : (
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-5 text-left">
                
                {/* 🚀 KONTEN SCROLLABLE DENGAN BATAS TINGGI AGAR RAPI */}
                <div className="max-h-[55vh] overflow-y-auto pr-1 pb-2 space-y-5">
                  <AnimatePresence mode="wait">

                    {/* ================= STEP 1: SUMBER TANAMAN ================= */}
                    {step === 1 && (
                      <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5 pt-1">
                        
                        <FormField control={form.control} name="kegiatan" render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80"><Briefcase className="inline-block h-3.5 w-3.5 mr-1" /> Nama Kegiatan</FormLabel>
                            <FormControl><Input className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium" placeholder="Cth: Panen Rutin, Panen Akhir..." {...field} /></FormControl>
                            <FormMessage className="text-xs text-red-500" />
                          </FormItem>
                        )} />

                        <div className="space-y-2">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80"><MapPinned className="inline-block h-3.5 w-3.5 mr-1" /> Pilih Sumber Lahan</p>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {dropdownData?.areas?.map((item: any) => {
                              const isSelected = selectedAreaId === item.id;
                              return (
                                <button key={item.id} type="button" 
                                  onClick={() => form.setValue("areaId", item.id, { shouldValidate: true })}
                                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-all border ${isSelected ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.01]" : "bg-card text-muted-foreground border-border hover:bg-muted/80 shadow-sm"}`}>
                                  {item.name}
                                </button>
                              );
                            })}
                          </div>
                          {form.formState.errors.areaId && <p className="text-xs text-red-500 mt-1">{form.formState.errors.areaId.message}</p>}
                        </div>

                        <FormField control={form.control} name="tanggal" render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80"><Calendar className="inline-block h-3.5 w-3.5 mr-1" />Tanggal Panen</FormLabel>
                            <FormControl><Input type="date" className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-bold appearance-none px-3 w-full" {...field} /></FormControl>
                            <FormMessage className="text-xs text-red-500" />
                          </FormItem>
                        )} />
                      </motion.div>
                    )}

                    {/* ================= STEP 2: HASIL & PENDAPATAN ================= */}
   {step === 2 && (
  <motion.div key="step2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4 pt-1">
    
    {/* KOTAK 1 SAJA YANG TERSISA DI STEP 2 */}
    <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">1. Kalkulasi Hasil</p>
      
      <div className="grid grid-cols-2 gap-3">
   <FormField control={form.control} name="kuantitasKg" render={({ field }) => (
  <FormItem className="space-y-1.5">
    <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase">Kuantitas (Kg)</FormLabel>
    <FormControl>
      {/* 👇 PERHATIKAN value dan onChange DI SINI 👇 */}
      <Input 
        type="number" 
        step="0.01" 
        className="h-11 rounded-xl bg-background border-input text-sm font-bold" 
        placeholder="0.0" 
        {...field} 
        value={field.value || ""} 
        onChange={e => field.onChange(e.target.value ? Number(e.target.value) : "")} 
      />
    </FormControl>
    <FormMessage className="text-[10px] text-red-500" />
  </FormItem>
)} />

<FormField control={form.control} name="hargaJualPerKg" render={({ field }) => (
  <FormItem className="space-y-1.5">
    <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase">Harga/Kg (Rp)</FormLabel>
    <FormControl>
      {/* 👇 PERHATIKAN value dan onChange DI SINI 👇 */}
      <Input 
        type="number" 
        className="h-11 rounded-xl bg-background border-input text-sm font-bold" 
        placeholder="0" 
        {...field} 
        value={field.value || ""} 
        onChange={e => field.onChange(e.target.value ? Number(e.target.value) : "")} 
      />
    </FormControl>
    <FormMessage className="text-[10px] text-red-500" />
  </FormItem>
)} />

      </div>

      <div className="flex flex-col items-center justify-center rounded-xl bg-primary/10 p-3 text-primary border border-primary/20">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-0.5">Total Pendapatan</span>
        <span className="text-2xl font-black tabular-nums">Rp {totalPendapatan.toLocaleString('id-ID')}</span>
      </div>
    </div>

  </motion.div>
)}
                
{/* ================= STEP 3: DETAIL OPSIONAL ================= */}
{step === 3 && (
  <motion.div key="step3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4 pt-1">
    
    <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Detail Opsional</p>
      
      <div className="grid grid-cols-2 gap-3">
        <FormField control={form.control} name="kualitas" render={({ field }) => (
          <FormItem className="space-y-1.5">
            <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase"><Tag className="inline-block h-3 w-3 mr-1" />Grade</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ""}>
              <FormControl><SelectTrigger className="h-11 rounded-xl bg-background border-input text-xs font-medium"><SelectValue placeholder="Pilih..." /></SelectTrigger></FormControl>
              <SelectContent className="rounded-xl">
                <SelectItem value="Grade A">Grade A</SelectItem>
                <SelectItem value="Grade B">Grade B</SelectItem>
                <SelectItem value="Sortiran">Sortiran</SelectItem>
              </SelectContent>
            </Select>
          </FormItem>
        )} />
      </div>

      <FormField control={form.control} name="catatan" render={({ field }) => (
        <FormItem className="space-y-1.5 pt-1">
          <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase">Catatan Lapangan</FormLabel>
          <FormControl><Textarea className="min-h-[70px] rounded-xl bg-background border-input text-xs p-3" placeholder="Kondisi cuaca atau info tambahan..." {...field} /></FormControl>
        </FormItem>
      )} />
    </div>

  </motion.div>
)}
</AnimatePresence>
</div>

                {/* ================= NAVIGASI BAWAH ================= */}
                <div className="flex justify-between items-center pt-4 border-t border-border mt-2">
                  {step > 1 ? (
                    <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted" onClick={() => setStep(1)} disabled={savePanen.isPending}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted" onClick={() => setOpen(false)}>
                      Batal
                    </Button>
                  )}

                  {step < 3 ? (
  <Button type="button" className="h-11 rounded-xl px-5 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm" onClick={handleNextStep}>
    Lanjut <ArrowRight className="ml-2 h-4 w-4" />
  </Button>
) : (
  <Button type="button" className="h-11 rounded-xl px-6 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm" disabled={savePanen.isPending} onClick={form.handleSubmit(onSubmit)}>
    {savePanen.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Simpan Data</>}
  </Button>
)}

                </div>

              </form>
            </Form>
          )}
        </div>
        
        {/* 🚀 INDIKATOR GRABBER DI BAWAH SHEET */}
        <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-border" />
      </SheetContent>
    </Sheet>
  );
}
