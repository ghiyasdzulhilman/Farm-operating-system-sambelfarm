import { useState, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Banknote, 
  Calendar, Tag, ToggleLeft, ToggleRight, Loader2, Wallet, X, Check,
  Plus, ChevronDown, PackagePlus // 🚀 FIX: Tambah ikon buat modal bertumpuk
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
// 1. ZOD SCHEMA (VALIDASI KETAT)
// ==========================================
const pengeluaranSchema = z.object({
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  namaItem: z.string().min(1, "Nama pengeluaran wajib diisi"),
  siklusId: z.string().optional(), // Biarin aja buat jaga-jaga
  
  kategoriId: z.string().min(1, "Kategori wajib dipilih"),
  isPembelianStok: z.boolean().default(false),
  
  // Kondisi A: Jika bukan beli stok
  totalBiayaLumpsum: z.coerce.number().optional(),
  
  // Kondisi B: Jika beli stok
  produkId: z.string().optional(),
  hargaPerPcs: z.coerce.number().optional(),
  beratPerPcs: z.coerce.number().optional(),
  qtyPcs: z.coerce.number().optional(),
  
  isAutoCatatan: z.boolean().default(true),
  keteranganManual: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validasi dinamis berdasarkan posisi toggle
  if (data.isPembelianStok) {
    if (!data.produkId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Produk wajib dipilih", path: ["produkId"] });
    if (!data.hargaPerPcs || data.hargaPerPcs <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Harga wajib diisi", path: ["hargaPerPcs"] });
    if (!data.beratPerPcs || data.beratPerPcs <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Berat wajib diisi", path: ["beratPerPcs"] });
    if (!data.qtyPcs || data.qtyPcs <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Kuantitas wajib diisi", path: ["qtyPcs"] });
  } else {
    if (!data.totalBiayaLumpsum || data.totalBiayaLumpsum <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Total biaya wajib diisi", path: ["totalBiayaLumpsum"] });
  }
});

type PengeluaranFormValues = z.infer<typeof pengeluaranSchema>;

const EMPTY_VALUES: PengeluaranFormValues = {
  tanggal: format(new Date(), "yyyy-MM-dd"),
  namaItem: "",
  siklusId: "",
  kategoriId: "",
  isPembelianStok: false,
  totalBiayaLumpsum: 0,
  produkId: "",
  hargaPerPcs: 0,
  beratPerPcs: 0,
  qtyPcs: 0,
  isAutoCatatan: true,
  keteranganManual: "",
};

// ==========================================
// 2. KOMPONEN UTAMA
// ==========================================
export function PengeluaranFormModal({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

    // --- FETCH DATA MASTER ---
  const { data: rawProduk, isLoading: loadProduk } = useQuery({ queryKey: ["produk-master-list"], queryFn: () => fetch("/api/produk").then((r) => r.json()), enabled: open });
  
  // 🚀 UBAH KE ENDPOINT DROPDOWN BARU KITA
  const { data: rawDropdown, isLoading: loadDropdown } = useQuery({ 
    queryKey: ["pengeluaran-dropdown-options"], 
    queryFn: () => fetch("/api/pengeluaran-dropdown-options").then((r) => r.json()), 
    enabled: open 
  });
  
    const produkList = (rawProduk?.data || []).filter((p: any) => p.isActive === true);
  const kategoriList = rawDropdown?.kategoriKeuangan || []; 
  const areasList = rawDropdown?.areas || []; 
  const isLoadingOptions = loadProduk || loadDropdown;

  // 🚀 SUNTIKAN STATE & MUTASI TAMBAH CEPAT (KATEGORI & PRODUK)
  const [isAddingKategori, setIsAddingKategori] = useState(false);
  const [newKategoriName, setNewKategoriName] = useState("");
  const [isAddingProduk, setIsAddingProduk] = useState(false);
  const [newProdukForm, setNewProdukForm] = useState({
    nama: "", jenis: "Pupuk", bentuk: "Solid" as "Solid" | "Cair", satuanDasar: "gram", satuanTampilan: "kg"
  });

    const addKategoriMutation = useMutation({
    mutationFn: async () => {
      // 🚀 FIX: Payload disamakan 100% dengan KategoriKeuanganFormModal
      const payload = {
        nama: newKategoriName,
        tipe: "pengeluaran", // Wajib huruf KECIL semua sesuai skema database lu
        keterangan: ""       // Kirim string kosong biar aman dan nggak undefined
      };
      
      const res = await fetch("/api/finance/kategori", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal tambah kategori");
      }
      return res.json();
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["pengeluaran-dropdown-options"] });
      
      // 🚀 FIX: Nyesuaiin struktur response dari backend lu { success: true, data: { id: ... } }
      const newId = response?.data?.id; 
      if (newId) form.setValue("kategoriId", String(newId)); // Auto-pilih kategori baru
      
      setIsAddingKategori(false); 
      setNewKategoriName("");
      toast({ title: "Sukses", description: "Kategori ditambahkan." });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    }
  });

  const addProdukMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...newProdukForm, hargaPerSatuanDasar: 0, stokAwal: 0 }; // 0 karena stok & harga bakal direkam di nota ini
      const res = await fetch("/api/produk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Gagal tambah produk");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["produk-master-list"] });
      const newId = data?.id || data?.data?.id; // Nyesuaiin respon API lu
      if (newId) form.setValue("produkId", newId); // Auto-pilih produk baru
      setIsAddingProduk(false);
      setNewProdukForm({ nama: "", jenis: "Pupuk", bentuk: "Solid", satuanDasar: "gram", satuanTampilan: "kg" });
      toast({ title: "Sukses", description: "Produk Master dibuat. Silakan lanjut isi nota." });
    }
  });

  // --- INIT FORM ---
  const form = useForm<PengeluaranFormValues>({

    resolver: zodResolver(pengeluaranSchema),
    defaultValues: EMPTY_VALUES,
    shouldUnregister: false,
  });

  // --- WATCHERS UNTUK KALKULASI OTOMATIS ---
  const isPembelianStok = useWatch({ control: form.control, name: "isPembelianStok" });
  const produkId = useWatch({ control: form.control, name: "produkId" });
  const hargaPerPcs = useWatch({ control: form.control, name: "hargaPerPcs" });
  const beratPerPcs = useWatch({ control: form.control, name: "beratPerPcs" });
  const qtyPcs = useWatch({ control: form.control, name: "qtyPcs" });
  const isAutoCatatan = useWatch({ control: form.control, name: "isAutoCatatan" });

  const selectedProduk = useMemo(() => produkList.find((p: any) => p.id === produkId), [produkList, produkId]);
  const satuan = selectedProduk?.satuanDasar || "satuan";
  
  // Mesin Hitung Live
  const calcTotalUang = Number(hargaPerPcs || 0) * Number(qtyPcs || 0);
  const calcTotalVolume = Number(beratPerPcs || 0) * Number(qtyPcs || 0);

  // --- MUTASI SUBMIT ---
  const savePengeluaran = useMutation({
    mutationFn: async (payload: any) => {
      const response = await fetch("/api/pengeluaran", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errText = await response.json();
        throw new Error(errText.error || "Gagal menyimpan pengeluaran");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["pengeluaran-list"] });
      await queryClient.invalidateQueries({ queryKey: ["produk-master-list"] }); // Sinkron stok gudang
      setSubmitted(true);
      form.reset(EMPTY_VALUES);
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Gagal", description: error.message });
    },
  });

  // --- HANDLER NAVIGASI & SUBMIT ---
  const handleNextStep = async () => {
    let fieldsToValidate: Array<keyof PengeluaranFormValues> = [];
    if (step === 1) fieldsToValidate = ["tanggal", "namaItem"];
    if (step === 2) fieldsToValidate = ["kategoriId", "isPembelianStok", "totalBiayaLumpsum", "produkId", "hargaPerPcs", "beratPerPcs", "qtyPcs"];

    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) setStep((prev) => prev + 1);
  };

  function onSubmit(values: PengeluaranFormValues) {
    // Racik teks laporan
    const autoLaporanTeks = values.isPembelianStok && selectedProduk
      ? `Pembelian ${selectedProduk.nama} sebanyak ${values.qtyPcs} pcs (@${values.beratPerPcs} ${satuan}). Total volume masuk: ${calcTotalVolume} ${satuan}.`
      : `Pengeluaran ${values.namaItem} sebesar Rp${Number(values.totalBiayaLumpsum || 0).toLocaleString("id-ID")}.`;

        // Susun payload jujur untuk backend
    const payload = {
      tanggal: values.tanggal,
      namaItem: values.namaItem,
      
      kategoriId: values.kategoriId,
      isPembelianStok: values.isPembelianStok,
      totalBiaya: values.isPembelianStok ? calcTotalUang : Number(values.totalBiayaLumpsum),
      produkId: values.isPembelianStok ? values.produkId : undefined,
      kuantitas: values.isPembelianStok ? String(calcTotalVolume) : undefined,
      keterangan: values.isAutoCatatan ? autoLaporanTeks : values.keteranganManual,
    };

    savePengeluaran.mutate(payload);
  }

  return (
    <Sheet open={open} onOpenChange={(val) => { 
      setOpen(val); 
      if (!val) { setStep(1); setSubmitted(false); form.reset(EMPTY_VALUES); } 
    }}>
      <SheetTrigger asChild>
        {/* 🚀 INI TOMBOL TRIGGERNYA, BISA LU JADIIN FAB ATAU TARUH DI HEADER */}
        <Button className="h-11 rounded-xl px-5 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-[0.98] gap-2 shadow-md">
          <Wallet className="h-4 w-4" /> Catat Pengeluaran
        </Button>
      </SheetTrigger>

      {/* 🚀 MENGGUNAKAN GAYA SHEET DARI OPERASIONAL (TURUN DARI ATAS) */}
      <SheetContent side="top" className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] pb-5 z-[999]">
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            {/* 🚀 FIX: Ganti icon Receipt jadi Banknote */}
            <div className="rounded-xl bg-primary/10 p-2 text-primary shadow-sm"><Banknote className="h-5 w-5" /></div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Input Pengeluaran</SheetTitle>
              <p className="text-[10px] font-bold text-primary tracking-wider uppercase">Step {step} dari 3</p>
            </div>
          </div>
          {/* 🚀 FIX: Ganti 'step >= i' jadi 'step === i' biar titiknya sama percis kayak form Operasional */}
          <div className="flex gap-1.5">{[1, 2, 3].map((i) => (<div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />))}</div>
        </SheetHeader>

        <div className="px-6 py-4">
          {submitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-6 text-center space-y-5">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-1">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-foreground tracking-tight">Data Berhasil Disimpan</h3>
              </div>
              <div className="w-full space-y-2 pt-4">
                <Button type="button" className="w-full h-11 rounded-xl text-xs font-bold bg-secondary text-secondary-foreground hover:opacity-90 mt-1" onClick={() => { setOpen(false); onSuccess?.(); }}>
                  Tutup Form
                </Button>
              </div>
            </motion.div>
         ) : isLoadingOptions ? ( 
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Menyiapkan Form...</p>
            </div> 
          ) : (
            <Form {...form}>

              <form onSubmit={(e) => e.preventDefault()} className="space-y-5 text-left">
                <div className="max-h-[55vh] overflow-y-auto pr-1 pb-2 space-y-5 overflow-x-hidden">
                  <AnimatePresence mode="wait">

                    {/* ================= STEP 1: IDENTITAS ================= */}
                    {step === 1 && (
                      <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5 pt-1">
                       <FormField control={form.control} name="tanggal" render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80"><Calendar className="inline-block h-3.5 w-3.5 mr-1" /> Tanggal Transaksi</FormLabel>
                            {/* 🚀 FIX: Tambah 'appearance-none' (kunci utama buat Safari) dan 'px-4' biar rapi */}
                            <FormControl><Input type="date" className="appearance-none w-full px-4 h-11 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium" {...field} /></FormControl>
                            <FormMessage className="text-xs text-red-500" />
                          </FormItem>
                        )} />

                        <FormField control={form.control} name="namaItem" render={({ field }) => (
                          <FormItem className="space-y-1.5">
                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80"><Tag className="inline-block h-3.5 w-3.5 mr-1" /> Nama Pengeluaran</FormLabel>
                            <FormControl><Input placeholder="" className="h-12 rounded-xl bg-background border border-input shadow-sm text-sm font-medium" {...field} /></FormControl>
                            <FormMessage className="text-xs text-red-500" />
                          </FormItem>
                        )} />

                      </motion.div>
                    )}

                   {/* ================= STEP 2: KALKULASI & TOGGLE ================= */}
                    {step === 2 && (
                      <motion.div key="step2" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4 pt-1">
                        
                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
                          <FormField control={form.control} name="kategoriId" render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">1. Kategori Beban</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="h-11 rounded-xl bg-background border-input text-xs font-medium"><SelectValue placeholder="Pilih Kategori..." /></SelectTrigger></FormControl>
                                <SelectContent className="rounded-xl z-[9999]">
                                  {kategoriList.map((k: any) => (<SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>))}
                                </SelectContent>
                              </Select>
                              {/* 🚀 SUNTIKAN UX: Form Cepat Kategori */}
                              {isAddingKategori ? (
                                <div className="flex items-center gap-1 mt-1 bg-muted/50 rounded-lg p-1 border border-border animate-in fade-in zoom-in-95">
                                  <input autoFocus className="bg-transparent text-xs px-2 outline-none w-full font-medium h-8" placeholder="Kategori baru..." value={newKategoriName} onChange={(e) => setNewKategoriName(e.target.value)} />
                                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 rounded-md shrink-0 transition-colors" onClick={() => addKategoriMutation.mutate()} disabled={!newKategoriName.trim() || addKategoriMutation.isPending}>{addKategoriMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}</Button>
                                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-md shrink-0 transition-colors" onClick={() => setIsAddingKategori(false)}><X className="h-4 w-4"/></Button>
                                </div>
                              ) : (
                                <button type="button" onClick={() => setIsAddingKategori(true)} className="text-[10px] font-bold text-primary flex items-center hover:underline pl-1 pt-0.5 w-fit"><Plus className="h-3 w-3 mr-0.5"/> Tambah Kategori Baru</button>
                              )}
                              <FormMessage className="text-xs text-red-500" />
                            </FormItem>
                          )} />
                        </div>

                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
                          {/* SAKLAR BELI STOK */}
                          <div className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/5">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-foreground">Tambah Stok?</span>
                              <span className="text-[10px] text-muted-foreground">Aktifkan untuk menambah stok produk</span>
                            </div>
                            <button type="button" onClick={() => form.setValue("isPembelianStok", !isPembelianStok)} className="transition-all focus:outline-none">
                              {isPembelianStok ? <ToggleRight className="h-8 w-8 text-primary" /> : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                            </button>
                          </div>

                          {/* KONDISI B: BELI STOK */}
                          {isPembelianStok ? (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2">
                              <FormField control={form.control} name="produkId" render={({ field }) => (
                                <FormItem className="space-y-1">
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger className="h-11 rounded-xl bg-background border-input text-xs font-bold"><SelectValue placeholder="Pilih Produk" /></SelectTrigger></FormControl>
                                    <SelectContent className="rounded-xl z-[9999]">
                                      {produkList.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.nama}</SelectItem>))}
                                    </SelectContent>
                                  </Select>
                                  {/* 🚀 SUNTIKAN UX: Tombol pemicu Modal Bertumpuk Produk */}
                                  <button type="button" onClick={() => setIsAddingProduk(true)} className="text-[10px] font-bold text-primary flex items-center hover:underline pl-1 pt-0.5 w-fit"><Plus className="h-3 w-3 mr-0.5"/> Tambah Produk Master</button>
                                  <FormMessage className="text-xs text-red-500" />
                                </FormItem>
                              )} />

                              <div className="grid grid-cols-2 gap-3">
                                <FormField control={form.control} name="hargaPerPcs" render={({ field }) => (
                                  <FormItem className="space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-muted-foreground">Harga/pcs</FormLabel>
                                    <FormControl><Input type="number" placeholder="" className="h-10 rounded-lg text-xs font-bold" {...field} value={field.value || ""} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                  </FormItem>
                                )} />
                                <FormField control={form.control} name="beratPerPcs" render={({ field }) => (
                                  <FormItem className="space-y-1">
                                    <FormLabel className="text-[10px] font-bold text-muted-foreground">Berat/pcs({satuan})</FormLabel>
                                    <FormControl><Input type="number" placeholder="" className="h-10 rounded-lg text-xs font-bold" {...field} value={field.value || ""} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                  </FormItem>
                                )} />
                              </div>

                              <FormField control={form.control} name="qtyPcs" render={({ field }) => (
                                <FormItem className="space-y-1 pt-1">
                                  <FormLabel className="text-xs font-bold text-primary">Beli Berapa Pcs?</FormLabel>
                                  <FormControl><Input type="number" placeholder="" className="h-11 rounded-lg border-primary/50 text-base font-black text-primary" {...field} value={field.value || ""} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                </FormItem>
                              )} />

                              {/* LIVE CALCULATION */}
                              <div className="mt-2 p-3 rounded-xl bg-primary text-primary-foreground flex flex-col gap-1.5 shadow-md">
                                <div className="flex justify-between items-center text-xs font-medium opacity-90">
                                  <span>Total Biaya:</span>
                                  <span className="font-black text-sm">Rp {calcTotalUang.toLocaleString("id-ID")}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs font-medium opacity-90">
                                  <span>Total Stok:</span>
                                  <span className="font-black text-sm">{calcTotalVolume} {satuan}</span>
                                </div>
                              </div>
                            </motion.div>
                          ) : (
                            /* KONDISI A: BIAYA LUMPSUM BIASA */
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5 pt-2">
                              <FormField control={form.control} name="totalBiayaLumpsum" render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Biaya (Rp)</FormLabel>
                                  <FormControl><Input type="number" placeholder="" className="h-12 rounded-xl text-lg font-black text-foreground shadow-sm" {...field} value={field.value || ""} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
                                  <FormMessage className="text-xs text-red-500" />
                                </FormItem>
                              )} />
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* ================= STEP 3: CATATAN ================= */}
                    {step === 3 && (
                      <motion.div key="step3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4 pt-1">
                        <div className="bg-card p-4 rounded-2xl border border-border shadow-sm space-y-4">
                          
                          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-foreground">Laporan Otomatis</span>
                              <span className="text-[10px] text-muted-foreground">Sistem membuatkan struk.</span>
                            </div>
                            <button type="button" onClick={() => form.setValue("isAutoCatatan", !isAutoCatatan)} className="transition-all focus:outline-none">
                              {isAutoCatatan ? <ToggleRight className="h-8 w-8 text-primary" /> : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                            </button>
                          </div>

                          {isAutoCatatan ? (
                            <div className="p-3.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-xs font-medium text-foreground leading-relaxed">
                              {isPembelianStok && selectedProduk
                                ? `Pembelian ${selectedProduk.nama} sebanyak ${qtyPcs} pcs (@${beratPerPcs} ${satuan}). Total volume masuk: ${calcTotalVolume} ${satuan}.`
                                : `Pengeluaran ${form.getValues("namaItem")} sebesar Rp${Number(form.getValues("totalBiayaLumpsum") || 0).toLocaleString("id-ID")}.`}
                            </div>
                          ) : (
                            <FormField control={form.control} name="keteranganManual" render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-bold text-muted-foreground">Catatan Manual</FormLabel>
                                <FormControl><Textarea rows={3} placeholder="Ketik rincian di sini..." className="rounded-xl text-xs bg-background" {...field} /></FormControl>
                              </FormItem>
                            )} />
                          )}

                        {/* 🚀 FIX: Teks Alert dibikin dinamis menyesuaikan tipe pengeluaran */}
                          <div className="p-3 mt-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex gap-2 text-[11px] font-semibold leading-relaxed">
                            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                            {isPembelianStok 
                              ? "Pastikan data sudah benar. Transaksi ini akan memotong saldo kas dan menambah stok produk di gudang secara otomatis." 
                              : "Pastikan nominal sudah benar. Transaksi ini akan langsung memotong saldo kas keuangan Anda."}
                          </div>

                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>

                {/* ================= NAVIGASI BAWAH ================= */}
                <div className="flex justify-between items-center pt-4 border-t border-border mt-2">
                  {step > 1 ? (
                    <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted" onClick={() => setStep((p) => p - 1)} disabled={savePengeluaran.isPending}><ArrowLeft className="mr-2 h-4 w-4" /> Kembali</Button>
                  ) : (
                    <Button type="button" variant="ghost" className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted" onClick={() => setOpen(false)}>Batal</Button>
                  )}

                  {step < 3 ? (
                    <Button type="button" className="h-11 rounded-xl px-5 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm" onClick={handleNextStep}>Lanjut <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  ) : (
                    <Button type="button" className="h-11 rounded-xl px-6 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm" disabled={savePengeluaran.isPending} onClick={form.handleSubmit(onSubmit)}>
                      {savePengeluaran.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Proses...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Simpan Nota</>}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          )}
          </div>
         <div className="mx-auto mt-1 h-1 w-10 rounded-full bg-border" />
       </SheetContent>

       {/* 🚀 MODAL BERTUMPUK: TAMBAH PRODUK BARU */}
       <Sheet open={isAddingProduk} onOpenChange={setIsAddingProduk}>
         <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-[2rem] border-x-0 border-b-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_-16px_40px_rgba(0,0,0,0.12)] z-[1000] flex flex-col">
           {/* Drag Handle iOS */}
           <div className="mx-auto mt-3 mb-1 h-1.5 w-12 rounded-full bg-border/60 shrink-0" />
           
           <SheetHeader className="px-6 pb-4 pt-2 flex flex-row items-center justify-between border-b border-border shrink-0">
             <div className="flex items-center gap-3">
               <div className="rounded-xl bg-primary/10 p-2 text-primary shadow-sm"><PackagePlus className="h-5 w-5" /></div>
               <div className="text-left">
                 <SheetTitle className="text-base font-black tracking-tight">Produk Baru</SheetTitle>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase">Master Data Cepat</p>
               </div>
             </div>
           </SheetHeader>

           <div className="px-6 py-5 space-y-4 text-left flex-1 overflow-y-auto custom-scrollbar">
             <div className="space-y-1.5">
               <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Nama Produk</label>
               <Input placeholder="Cth: Curacron" value={newProdukForm.nama} onChange={e => setNewProdukForm(f => ({...f, nama: e.target.value}))} className="h-11 rounded-xl bg-background text-sm font-medium px-4" />
             </div>
             
             <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 relative">
                   <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Jenis</label>
                   <div className="relative">
                     <select value={newProdukForm.jenis} onChange={e => setNewProdukForm(f => ({...f, jenis: e.target.value}))} className="w-full appearance-none h-11 rounded-xl border border-input bg-background pl-4 pr-10 text-xs font-semibold outline-none focus:border-primary/50 shadow-sm cursor-pointer">
                       {["Pupuk", "Insektisida", "Herbisida", "Fungisida", "Lainnya"].map(j => <option key={j} value={j}>{j}</option>)}
                     </select>
                     <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50 pointer-events-none" />
                   </div>
                </div>
                
                <div className="space-y-1.5 relative">
                   <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">Bentuk</label>
                   <div className="relative">
                     <select value={newProdukForm.bentuk} onChange={e => {
                         const bentuk = e.target.value as "Solid" | "Cair";
                         setNewProdukForm(f => ({ ...f, bentuk, satuanDasar: bentuk === "Solid" ? "gram" : "ml", satuanTampilan: bentuk === "Solid" ? "kg" : "liter" }));
                       }} className="w-full appearance-none h-11 rounded-xl border border-input bg-background pl-4 pr-10 text-xs font-semibold outline-none focus:border-primary/50 shadow-sm cursor-pointer">
                       <option value="Solid">Solid (Padat)</option>
                       <option value="Cair">Cair</option>
                     </select>
                     <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50 pointer-events-none" />
                   </div>
                </div>
             </div>

             <div className="p-3 mt-4 rounded-xl bg-primary/5 border border-primary/20 text-primary flex items-start gap-2 text-[10px] font-semibold leading-relaxed animate-in fade-in zoom-in-95">
               <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
               <p>Harga beli dan stok awal akan otomatis tercatat setelah Anda menyimpan nota pengeluaran ini.</p>
             </div>
           </div>

           <div className="bg-white/95 dark:bg-slate-950/95 flex items-center justify-end gap-3 px-6 pt-3 pb-6 shrink-0 mt-auto border-t border-border/50">
             <Button variant="ghost" onClick={() => setIsAddingProduk(false)} className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted">Batal</Button>
             <Button onClick={() => addProdukMutation.mutate()} disabled={!newProdukForm.nama.trim() || addProdukMutation.isPending} className="h-11 rounded-xl px-6 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-colors shadow-sm gap-2">
               {addProdukMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan & Lanjut"}
             </Button>
           </div>
         </SheetContent>
       </Sheet>
     </Sheet>
   );
}

