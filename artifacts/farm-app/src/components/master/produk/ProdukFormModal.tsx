import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, CheckCircle2, PackagePlus, Tag, Layers, 
  Coins, Box, FlaskConical, AlertCircle, ChevronDown 
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils"; 

interface ProdukFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType: string;
}

const JENIS_PRODUK_OPTIONS = ["Pupuk", "Insektisida", "Herbisida", "Fungisida", "Lainnya"];

const SATUAN_PRESET: Record<string, { dasar: string; tampilan: string }> = {
  Solid: { dasar: "gram", tampilan: "kg" },
  Cair: { dasar: "ml", tampilan: "liter" },
};

type ProdukForm = {
  nama: string;
  jenis: string;
  bentuk: "Solid" | "Cair";
  satuanDasar: string;
  satuanTampilan: string;
  hargaInput: string; // 🚀 FIX: Ganti jadi universal (bisa harga per kg, bisa harga total botol)
  stokInput: string;  // 🚀 FIX: Ganti jadi universal (bisa stok kg, bisa isi ml botol)
  n: string; p: string; k: string; ca: string; mg: string;
};

const EMPTY_PRODUK_FORM: ProdukForm = {
  nama: "", jenis: "Pupuk", bentuk: "Solid",
  satuanDasar: "gram", satuanTampilan: "kg",
  hargaInput: "", stokInput: "", // 🚀 Disesuaikan
  n: "", p: "", k: "", ca: "", mg: "",
};

export function ProdukFormModal({ isOpen, onClose, defaultType }: ProdukFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState<ProdukForm>(EMPTY_PRODUK_FORM);
  const [isHaraOpen, setIsHaraOpen] = useState(false);
  const [inputMode, setInputMode] = useState<"besar" | "kecil">("besar"); // 🚀 TAMBAHAN: State Saklar Mode

  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY_PRODUK_FORM, jenis: defaultType === "Semua" ? "Pupuk" : defaultType });
      setIsHaraOpen(false);
    }
  }, [isOpen, defaultType]);

  const handleBentukChange = (bentuk: "Solid" | "Cair") => {
    const preset = SATUAN_PRESET[bentuk];
    setForm((f) => ({ ...f, bentuk, satuanDasar: preset.dasar, satuanTampilan: preset.tampilan }));
  };

    const addMutation = useMutation({
    mutationFn: async () => {
      // 🚀 LOGIKA KONVERSI BARU (Mengerti Nota Petani)
      const hargaNum = Number(form.hargaInput) || 0;
      const stokNum = Number(form.stokInput) || 0;
      let hargaDasar = 0;
      let stokDasar = 0;

      if (inputMode === "besar") {
        hargaDasar = hargaNum / 1000; // Harga per Kg dibagi 1000 = HPP per Gram
        stokDasar = stokNum * 1000;   // Stok Kg dikali 1000 = Stok murni Gram
      } else {
        // Mode Kecil: hargaInput = HARGA TOTAL BOTOL, stokInput = ISI ML/GRAM
        hargaDasar = stokNum > 0 ? hargaNum / stokNum : 0; 
        stokDasar = stokNum; // Langsung masukin Gram/Ml murni tanpa dikali 1000
      }

      const payload = {
        nama: form.nama,
        jenis: form.jenis,
        bentuk: form.bentuk,
        satuanDasar: form.satuanDasar,
        satuanTampilan: form.satuanTampilan,
        hargaPerSatuanDasar: hargaDasar, // 👈 Masuk ke DB akurat!
        stokAwal: stokDasar, // 👈 Masuk ke DB akurat!

        n: form.n ? Number(form.n) : undefined,
        p: form.p ? Number(form.p) : undefined,
        k: form.k ? Number(form.k) : undefined,
        ca: form.ca ? Number(form.ca) : undefined,
        mg: form.mg ? Number(form.mg) : undefined,
      };
      
      const res = await fetch("/api/produk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menambah produk.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["produk-master-list"] });
      toast({ title: "Sukses", description: "Produk baru berhasil ditambahkan." });
      onClose();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err.message });
    },
  });

  const handleSubmit = () => {
    if (!form.nama.trim()) {
      toast({ variant: "destructive", title: "Data Belum Lengkap", description: "Nama produk wajib diisi." });
      return;
    }
    addMutation.mutate();
  };

    const hargaKosong = form.hargaInput === "" || Number(form.hargaInput) === 0; // 🚀 Disesuaikan dengan penamaan form baru

  return (
    <Sheet open={isOpen} onOpenChange={(val) => { if (!val) onClose(); }}>
      {/* 🚀 FIX UX: Balikin membal dari atas, rounded di bawah, shadow ke bawah */}
      <SheetContent 
       side="top" 
       className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] z-[100] max-h-[90vh] flex flex-col pb-6"
       >

        {/* 🚀 FIX UX: Header disesuaikan paddingnya tanpa handle atas */}
        <SheetHeader className="px-6 py-4 flex flex-row items-center justify-between border-b border-border pr-12 shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary shadow-sm">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div className="text-left">
              <SheetTitle className="text-base font-black tracking-tight">Tambah Produk</SheetTitle>
              <p className="text-[10px] font-bold text-primary tracking-wider uppercase">Master Data</p>
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-5 space-y-5 text-left flex-1 overflow-y-auto custom-scrollbar">
          
        <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
              <Tag className="h-3.5 w-3.5" /> Nama Produk
            </label>
            <Input 
              placeholder="Misal: NPK Mutiara 16-16-16" 
              value={form.nama} 
              onChange={e => setForm({ ...form, nama: e.target.value })}
              className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium px-4"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 🚀 FIX UX: Dropdown dengan Ikon Chevron */}
            <div className="space-y-1.5 relative group">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                <Layers className="h-3.5 w-3.5" /> Jenis
              </label>
              <div className="relative">
                <select 
                  value={form.jenis} 
                  onChange={e => setForm({ ...form, jenis: e.target.value })}
                  className="w-full appearance-none h-12 rounded-xl border border-input bg-background pl-4 pr-10 text-sm font-semibold outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm cursor-pointer"
                >
                  {JENIS_PRODUK_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5 relative group">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                <FlaskConical className="h-3.5 w-3.5" /> Bentuk
              </label>
              <div className="relative">
                <select 
                  value={form.bentuk} 
                  onChange={e => handleBentukChange(e.target.value as "Solid" | "Cair")}
                  className="w-full appearance-none h-12 rounded-xl border border-input bg-background pl-4 pr-10 text-sm font-semibold outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm cursor-pointer"
                >
                  <option value="Solid">Solid (gram/kg)</option>
                  <option value="Cair">Cair (ml/liter)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50 pointer-events-none" />
              </div>
            </div>
          </div>

                    {/* 🚀 TAMBAHAN UX: Saklar Mode Satuan (Pill Switch) */}
          <div className="flex items-center justify-between p-1 bg-muted/40 rounded-xl border border-border/50">
            <button
              onClick={() => {
                setInputMode("besar");
                setForm(f => ({ ...f, hargaInput: "", stokInput: "" })); // Reset isian biar aman
              }}
              className={cn("flex-1 text-[11px] font-bold py-2 rounded-lg transition-all", inputMode === "besar" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Mode {form.satuanTampilan} (Karung/Grosir)
            </button>
            <button
              onClick={() => {
                setInputMode("kecil");
                setForm(f => ({ ...f, hargaInput: "", stokInput: "" })); // Reset isian biar aman
              }}
              className={cn("flex-1 text-[11px] font-bold py-2 rounded-lg transition-all", inputMode === "kecil" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              Mode {form.satuanDasar} (Botol/Obat)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-2">
            {/* 🚀 FIX UX: Input Harga Bunglon */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80 truncate">
                <Coins className="h-3.5 w-3.5" /> 
                {inputMode === "besar" ? `Harga / ${form.satuanTampilan}` : `Harga Total 1 Botol`}
              </label>
              <div className="space-y-1.5">
                <Input 
                  type="number" inputMode="decimal" step="any"
                  placeholder="Rp 0" 
                  value={form.hargaInput} 
                  onChange={e => setForm({ ...form, hargaInput: e.target.value })}
                  className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium px-4"
                />
                
                {/* Hitungan Bantuan Hijau - Harga */}
                {inputMode === "besar" && Number(form.hargaInput) > 0 && (
                  <p className="text-[10px] font-bold text-emerald-600 pl-1 animate-in fade-in">
                    = Rp {(Number(form.hargaInput) / 1000).toLocaleString("id-ID")} / {form.satuanDasar}
                  </p>
                )}
                {/* 🚀 Fitur Andalan Lu: Cek Silang HPP Pestisida Otomatis */}
                {inputMode === "kecil" && Number(form.hargaInput) > 0 && Number(form.stokInput) > 0 && (
                  <p className="text-[10px] font-bold text-emerald-600 pl-1 animate-in fade-in">
                    = Rp {(Number(form.hargaInput) / Number(form.stokInput)).toLocaleString("id-ID", { maximumFractionDigits: 2 })} / {form.satuanDasar}
                  </p>
                )}
              </div>
            </div>

            {/* 🚀 FIX UX: Input Stok Bunglon */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80 truncate">
                <Box className="h-3.5 w-3.5" /> 
                {inputMode === "besar" ? `Stok Awal (${form.satuanTampilan})` : `Isi Kemasan (${form.satuanDasar})`}
              </label>
              <div className="space-y-1.5">
                <Input 
                  type="number" inputMode="decimal" step="any"
                  placeholder={`0 ${inputMode === "besar" ? form.satuanTampilan : form.satuanDasar}`} 
                  value={form.stokInput} 
                  onChange={e => setForm({ ...form, stokInput: e.target.value })}
                  className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium px-4"
                />
                
                {/* Hitungan Bantuan Hijau - Stok (Cuma tayang buat mode besar) */}
                {inputMode === "besar" && Number(form.stokInput) > 0 && (
                  <p className="text-[10px] font-bold text-emerald-600 pl-1 animate-in fade-in">
                    = {(Number(form.stokInput) * 1000).toLocaleString("id-ID")} {form.satuanDasar}
                  </p>
                )}
              </div>
            </div>
          </div>

          {hargaKosong && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 animate-in fade-in zoom-in-95">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold leading-relaxed">
                Tanpa harga, produk ini tidak bisa digunakan di form perawatan sampai Anda mengisi harganya nanti.
              </p>
            </div>
          )}

          <div className="pt-2">
            <button 
              onClick={() => setIsHaraOpen(!isHaraOpen)}
              className="flex items-center justify-between w-full p-3 rounded-xl border border-input bg-muted/30 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4" /> Kandungan Hara (Opsional)
              </span>
            </button>
            
            {isHaraOpen && (
              <div className="grid grid-cols-5 gap-2 mt-3 p-3 rounded-xl bg-muted/20 border border-border/50 animate-in slide-in-from-top-2 fade-in">
                {(["n", "p", "k", "ca", "mg"] as const).map((key) => (
                  <div key={key} className="space-y-1 text-center">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">{key}</label>
                    <Input 
                      type="number" inputMode="decimal" step="any"
                      placeholder="0"
                      value={form[key]} 
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="h-10 rounded-lg text-center px-1 text-xs font-bold bg-background shadow-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 🚀 FIX UX: Tombol simpan tetep nempel rapi */}
        <div className="bg-white/95 dark:bg-slate-950/95 flex items-center justify-end gap-3 px-6 pt-4 pb-2 shrink-0 mt-auto">
          <Button 
            variant="ghost" 
            onClick={onClose} 
            disabled={addMutation.isPending} 
            className="h-11 rounded-xl px-4 font-bold text-muted-foreground hover:bg-muted"
          >
            Batal
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={addMutation.isPending || !form.nama.trim()} 
            className="h-11 rounded-xl px-6 font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm gap-2"
          >
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <><CheckCircle2 className="h-4 w-4" /> Simpan Produk</>
            )}
          </Button>
        </div>

        {/* 🚀 FIX UX: Garis handle ditaruh paling bawah modal */}
        <div className="mx-auto mt-2 mb-2 h-1.5 w-12 rounded-full bg-border/60 shrink-0" />

      </SheetContent>
    </Sheet>
  );
}
