import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2, CalendarIcon, Banknote, ArrowRight, ArrowLeft, CheckCircle2, ToggleLeft, ToggleRight, PackageOpen } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// 🚀 1. ZOD SCHEMA (Disesuaikan dengan Postgres)
const expenseSchema = z.object({
  kategoriId: z.string().min(1, "Kategori wajib dipilih"),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  totalBiaya: z.coerce.number().min(1, "Total biaya tidak valid"),
  keterangan: z.string().optional(),
  isPembelianStok: z.boolean().default(false),
  produkId: z.string().optional(),
  kuantitas: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
  if (data.isPembelianStok) {
    if (!data.produkId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Produk wajib dipilih", path: ["produkId"] });
    }
    if (!data.kuantitas || data.kuantitas <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Kuantitas harus lebih dari 0", path: ["kuantitas"] });
    }
  }
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

export function PengeluaranFormModal({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 🚀 2. FETCH DATA MASTER DARI POSTGRES
  const { data: kategoriRes, isLoading: loadingKat } = useQuery({
    queryKey: ["kategori-keuangan"],
    queryFn: async () => fetch("/api/finance/kategori").then(r => r.json()),
    enabled: open,
  });
  
  const { data: produkRes, isLoading: loadingProd } = useQuery({
    queryKey: ["produk-master-list"],
    queryFn: async () => fetch("/api/produk").then(r => r.json()),
    enabled: open,
  });

  const kategoriList = (kategoriRes?.data || []).filter((k: any) => k.tipe === "pengeluaran");
  const produkList = produkRes?.data || [];

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      kategoriId: "",
      tanggal: format(new Date(), "yyyy-MM-dd"),
      totalBiaya: "" as any,
      keterangan: "",
      isPembelianStok: false,
      produkId: "",
      kuantitas: "" as any,
    },
  });

    // 🚀 3. MUTASI KE BACKEND PENGELUARAN KITA
  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      // 🚀 FIX: Benerin alamat endpoint ke route yang tepat
      const res = await fetch("/api/pengeluaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan pengeluaran");
      return json;
    },
    onSuccess: (data, variables) => {
      const catName = kategoriList.find((k: any) => k.id === variables.kategoriId)?.nama || "Pengeluaran";
      
      toast({
        description: (
          <div className="w-full space-y-3 pt-1 text-left">
            <div className="flex items-start gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mt-1.5 shrink-0 shadow-[0_0_8px_#10b981]" />
              <div className="space-y-0.5">
                <p className="font-black text-sm text-foreground tracking-tight">Tersimpan ke Database</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Data pengeluaran berhasil dicatat secara <span className="text-emerald-500 font-semibold">instan</span>.
                </p>
              </div>
            </div>
            <div className="border-t border-border/40 my-1" />
            <div className="bg-muted/40 border border-border/40 rounded-xl p-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 block">Kategori</span>
              <p className="text-xs font-bold text-foreground truncate mt-0.5">{catName}</p>
            </div>
          </div>
        ),
      });

      // Refresh data di frontend
      queryClient.invalidateQueries({ queryKey: ["pengeluaran-list"] });
      queryClient.invalidateQueries({ queryKey: ["produk-master-list"] }); // Kalau beli stok, refresh produk juga
      
      form.reset();
      setStep(1);
      setOpen(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal menyimpan", description: err.message });
    },
  });

  const handleNextStep = async () => {
    let fieldsToValidate: any[] = [];
    if (step === 1) fieldsToValidate = ["kategoriId", "tanggal"];
    if (step === 2) fieldsToValidate = ["totalBiaya"];
    
    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) setStep((prev) => prev + 1);
  };

  const onSubmit = (values: ExpenseFormValues) => {
    addMutation.mutate(values);
  };

  return (
    <Sheet open={open} onOpenChange={(val) => { setOpen(val); if (!val) { form.reset(); setStep(1); } }}>
      <SheetTrigger asChild>
        <Button className="h-11 rounded-xl px-5 font-bold transition-all active:scale-[0.98] bg-rose-500 text-white hover:bg-rose-600 gap-2 shadow-md shadow-rose-500/20">
          <Banknote className="h-4 w-4" /> Tambah Pengeluaran
        </Button>
      </SheetTrigger>

      <SheetContent side="top" className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-card/95 backdrop-blur-xl pb-4 shadow-2xl z-[100]">
        
        {/* HEADER */}
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-rose-500/10 p-2 text-rose-500">
              <Banknote className="h-5 w-5" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Input Pengeluaran</SheetTitle>
              <p className="text-[10px] font-bold text-rose-500 tracking-wider uppercase">Step {step} dari 3</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className={["h-1.5 rounded-full transition-all duration-300", step === i ? "w-4 bg-rose-500" : "w-1.5 bg-border"].join(" ")} />
            ))}
          </div>
        </SheetHeader>

        <div className="px-6 py-5">
          {loadingKat || loadingProd ? (
            <Skeleton className="h-12 w-full rounded-xl" />
          ) : (
            <Form {...form}>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
                <AnimatePresence mode="wait">
                  
                {/* STEP 1: KATEGORI & TANGGAL */}
                  {step === 1 && (
                    <motion.div key="step1" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4 text-left">
                      <FormField
                        control={form.control}
                        name="kategoriId"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">1. Pilih Kategori</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-border/50 focus:ring-2 focus:ring-rose-500/20">
                                  <SelectValue placeholder="Pilih kategori pengeluaran" />
                                </SelectTrigger>
                              </FormControl>
                              {/* 🚀 FIX UX: Tambahkan z-[110] agar dropdown tampil di atas modal */}
                              <SelectContent className="rounded-xl shadow-xl z-[110]">
                                {kategoriList.map((cat: any) => (
                                  <SelectItem key={cat.id} value={cat.id} className="rounded-lg">{cat.nama}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs text-rose-500" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tanggal"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">2. Tanggal Transaksi</FormLabel>
                            <FormControl>
                              {/* 🚀 FIX UX: Tambahkan max-w-[220px] w-full agar tidak over layout */}
                              <div className="relative max-w-[220px] w-full">
                                <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                <Input type="date" className="h-12 w-full rounded-xl bg-muted/50 border-border/50 pl-11 focus-visible:ring-2 focus-visible:ring-rose-500/20 font-bold" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs text-rose-500" />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}

                  {/* STEP 2: NOMINAL & KETERANGAN */}
                  {step === 2 && (
                    <motion.div key="step2" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4 text-left">
                      <FormField
                        control={form.control}
                        name="totalBiaya"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">3. Total Biaya (Rp)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" className="h-12 rounded-xl bg-muted/50 border-border/50 focus-visible:ring-2 focus-visible:ring-rose-500/20 font-black text-lg" onFocus={e => e.target.select()} {...field} />
                            </FormControl>
                            <FormMessage className="text-xs text-rose-500" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="keterangan"
                        render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Keterangan (Opsional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Catatan tambahan..." className="h-12 rounded-xl bg-muted/50 border-border/50 focus-visible:ring-2 focus-visible:ring-rose-500/20 text-sm font-medium" {...field} />
                            </FormControl>
                            <FormMessage className="text-xs text-rose-500" />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}

                  {/* STEP 3: INTEGRASI STOK (THE 3-IN-1 COMBO) */}
                  {step === 3 && (
                    <motion.div key="step3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="space-y-4 text-left">
                      <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-4 shadow-sm">
                        
                        {/* TOGGLE SAKTI */}
                        <FormField
                          control={form.control}
                          name="isPembelianStok"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm font-bold flex items-center gap-2">
                                  <PackageOpen className="h-4 w-4 text-primary" /> Beli Stok Produk?
                                </FormLabel>
                                <p className="text-[10px] text-muted-foreground">Aktifkan untuk tambah stok ke gudang</p>
                              </div>
                              <FormControl>
                                <button type="button" onClick={() => field.onChange(!field.value)} className="outline-none">
                                  {field.value ? <ToggleRight className="h-8 w-8 text-primary" /> : <ToggleLeft className="h-8 w-8 text-muted-foreground/50" />}
                                </button>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {/* INPUT STOK (MUNCUL KALAU TOGGLE AKTIF) */}
                        <AnimatePresence>
                          {form.watch("isPembelianStok") && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-3 pt-3 border-t border-border/40">
                              <FormField
                                control={form.control}
                                name="produkId"
                                render={({ field }) => (
                                  <FormItem className="space-y-1">
                                    <FormLabel className="text-[11px] font-bold text-muted-foreground">Pilih Produk Master</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/50">
                                          <SelectValue placeholder="Pilih produk" />
                                        </SelectTrigger>
                                      </FormControl>
                                  {/* 🚀 FIX UX: Tambahkan z-[110] di sini juga */}
                                      <SelectContent className="rounded-xl shadow-xl z-[110]">
                                        {produkList.map((p: any) => (
                                          <SelectItem key={p.id} value={p.id} className="rounded-lg">{p.nama} ({p.satuanDasar})</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage className="text-[10px] text-rose-500" />
                                  </FormItem>
                                )}
                              />
                            <FormField
                                control={form.control}
                                name="kuantitas"
                                render={({ field }) => {
                                  // 🚀 Hitung live kalkulasi untuk tampilan Newbie-Friendly
                                  const totalBiayaInput = form.watch("totalBiaya") || 0;
                                  const qtyInput = form.watch("kuantitas") || 0;
                                  const estimasiHargaSatuan = qtyInput > 0 ? Math.round(totalBiayaInput / qtyInput) : 0;

                                  return (
                                    <FormItem className="space-y-3">
                                      <div className="space-y-1">
                                        <FormLabel className="text-[11px] font-bold text-muted-foreground">Volume / Kuantitas Masuk</FormLabel>
                                        <FormControl>
                                          <Input type="number" placeholder="Contoh: 7500" className="h-11 rounded-xl bg-muted/30 border-border/50 font-bold" onFocus={e => e.target.select()} {...field} />
                                        </FormControl>
                                        <FormMessage className="text-[10px] text-rose-500" />
                                      </div>

                                      {/* 🚀 LIVE CALCULATION INFOBAR FOR NEWBIE */}
                                      {qtyInput > 0 && (
                                        <div className="rounded-xl bg-muted/50 p-3 text-xs border border-border/40 space-y-1">
                                          <div className="flex justify-between text-muted-foreground font-medium">
                                            <span>Total Nota:</span>
                                            <span className="font-bold text-foreground">Rp{Number(totalBiayaInput).toLocaleString("id-ID")}</span>
                                          </div>
                                          <div className="flex justify-between text-muted-foreground font-medium">
                                            <span>Volume Barang:</span>
                                            <span className="font-bold text-foreground">{qtyInput} unit/gram</span>
                                          </div>
                                          <div className="border-t border-border/40 my-1" />
                                          <div className="flex justify-between text-primary font-bold">
                                            <span>Harga Konversi Master:</span>
                                            <span>Rp{estimasiHargaSatuan.toLocaleString("id-ID")} / unit</span>
                                          </div>
                                          <p className="text-[9px] text-muted-foreground/80 italic mt-1 text-right">
                                            *Sistem akan otomatis memperbarui harga master ke nilai ini.
                                          </p>
                                        </div>
                                      )}
                                    </FormItem>
                                  );
                                }}
                              />

                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* NAVIGATION FOOTER */}
                <div className="flex justify-between items-center pt-2 border-t border-border/50">
                  {step > 1 ? (
                    <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted/50" onClick={() => setStep((p) => p - 1)} disabled={addMutation.isPending}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                    </Button>
                  ) : (
                    <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted/50" onClick={() => setOpen(false)}>
                      Batal
                    </Button>
                  )}

                  {step < 3 ? (
                    <Button type="button" className="h-11 rounded-xl px-5 font-bold bg-foreground text-background hover:bg-foreground/90 transition-all shadow-md" onClick={handleNextStep}>
                      Lanjut <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="button" className="h-11 rounded-xl px-6 font-bold bg-rose-500 text-white hover:bg-rose-600 transition-all shadow-md" disabled={addMutation.isPending} onClick={form.handleSubmit(onSubmit)}>
                      {addMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menyimpan...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Simpan Transaksi</>}
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
