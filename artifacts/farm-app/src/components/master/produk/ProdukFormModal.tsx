import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Loader2, CheckCircle2, PackagePlus, Tag, Layers, 
  Coins, Box, FlaskConical, AlertCircle 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
  hargaPerSatuanDasar: string;
  stokAwal: string;
  n: string; p: string; k: string; ca: string; mg: string;
};

const EMPTY_PRODUK_FORM: ProdukForm = {
  nama: "", jenis: "Pupuk", bentuk: "Solid",
  satuanDasar: "gram", satuanTampilan: "kg",
  hargaPerSatuanDasar: "", stokAwal: "0",
  n: "", p: "", k: "", ca: "", mg: "",
};

export function ProdukFormModal({ isOpen, onClose, defaultType }: ProdukFormModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState<ProdukForm>(EMPTY_PRODUK_FORM);
  const [isHaraOpen, setIsHaraOpen] = useState(false);

  // Reset form dan ikuti tab kategori yang lagi aktif pas modal dibuka
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
      const payload = {
        nama: form.nama,
        jenis: form.jenis,
        bentuk: form.bentuk,
        satuanDasar: form.satuanDasar,
        satuanTampilan: form.satuanTampilan,
        hargaPerSatuanDasar: Number(form.hargaPerSatuanDasar) || 0,
        stokAwal: Number(form.stokAwal) || 0,
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

  const hargaKosong = form.hargaPerSatuanDasar === "" || Number(form.hargaPerSatuanDasar) === 0;

  return (
    <Sheet open={isOpen} onOpenChange={(val) => { if (!val) onClose(); }}>
      <SheetContent 
       side="top" 
       className="mx-auto max-w-md rounded-b-[2rem] border-x-0 border-t-0 p-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] z-[100] max-h-[90vh] flex flex-col pb-10"
       >

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

        {/* Area ini yang akan scrollable, aman dari keyboard */}
    <div className="px-6 py-5 space-y-5 text-left flex-1 overflow-y-auto custom-scrollbar">
          
          {/* 1. INPUT NAMA PRODUK */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
              <Tag className="h-3.5 w-3.5" /> Nama Produk
            </label>
            <Input 
              placeholder="Misal: NPK Mutiara 16-16-16" 
              value={form.nama} 
              onChange={e => setForm({ ...form, nama: e.target.value })}
              className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium px-4"
              autoFocus
            />
          </div>

          {/* 2. GRID JENIS & BENTUK */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                <Layers className="h-3.5 w-3.5" /> Jenis
              </label>
              <select 
                value={form.jenis} 
                onChange={e => setForm({ ...form, jenis: e.target.value })}
                className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm font-semibold outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm cursor-pointer"
              >
                {JENIS_PRODUK_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                <FlaskConical className="h-3.5 w-3.5" /> Bentuk
              </label>
              <select 
                value={form.bentuk} 
                onChange={e => handleBentukChange(e.target.value as "Solid" | "Cair")}
                className="w-full h-12 rounded-xl border border-input bg-background px-4 text-sm font-semibold outline-none focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm cursor-pointer"
              >
                <option value="Solid">Solid (gram/kg)</option>
                <option value="Cair">Cair (ml/liter)</option>
              </select>
            </div>
          </div>

          {/* 3. GRID HARGA & STOK */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80 truncate">
                <Coins className="h-3.5 w-3.5" /> Harga / {form.satuanDasar}
              </label>
              <Input 
                type="number" placeholder="Rp 0" 
                value={form.hargaPerSatuanDasar} 
                onChange={e => setForm({ ...form, hargaPerSatuanDasar: e.target.value })}
                className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium px-4"
              />
            </div>
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/80 truncate">
                <Box className="h-3.5 w-3.5" /> Stok Awal
              </label>
              <Input 
                type="number" placeholder={`0 ${form.satuanDasar}`} 
                value={form.stokAwal} 
                onChange={e => setForm({ ...form, stokAwal: e.target.value })}
                className="h-12 rounded-xl bg-background border border-input focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm text-sm font-medium px-4"
              />
            </div>
          </div>

          {/* WARNING HARGA KOSONG */}
          {hargaKosong && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 animate-in fade-in zoom-in-95">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-[10px] font-bold leading-relaxed">
                Tanpa harga, produk ini tidak bisa digunakan di form perawatan sampai Anda mengisi harganya nanti.
              </p>
            </div>
          )}

          {/* 4. KANDUNGAN HARA (COLLAPSIBLE) */}
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
                      type="number" placeholder="0"
                      value={form[key]} 
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="h-10 rounded-lg text-center px-1 text-xs font-bold"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS (Shrink-0 biar ukurannya ga kegencet) */}
      <div className="flex items-center justify-end gap-3 px-6 pt-4 pb-2 shrink-0">

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

        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-border/60" />
      </SheetContent>
    </Sheet>
  );
}
