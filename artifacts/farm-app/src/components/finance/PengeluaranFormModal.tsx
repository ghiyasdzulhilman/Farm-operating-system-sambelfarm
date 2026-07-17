import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Tag, ChevronRight, ChevronLeft, Save, Box, Receipt, ToggleLeft, ToggleRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FormPengeluaranProps {
  onSuccessClose?: () => void;
}

export function FormPengeluaran({ onSuccessClose }: FormPengeluaranProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- FETCH DATA MASTER ---
  const { data: rawProduk } = useQuery({
    queryKey: ["produk-master-list"],
    queryFn: () => fetch("/api/produk").then((r) => r.json()),
  });
  const produkList = rawProduk?.data || [];

  // Asumsi: Endpoint kategori keuangan sudah ada
  const { data: rawKategori } = useQuery({
    queryKey: ["kategori-keuangan"],
    queryFn: () => fetch("/api/kategori-keuangan").then((r) => r.json()),
  });
  const kategoriList = rawKategori?.data || [];

  // --- STATE FORM (3 STEP) ---
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1
    tanggal: new Date().toISOString().split("T")[0],
    namaItem: "",
    siklusId: "", // Opsional
    
    // Step 2
    kategoriId: "",
    isPembelianStok: false,
    totalBiayaLumpsum: "", // Jika toggle OFF
    
    // Step 2 (Jika toggle ON)
    produkId: "",
    hargaPerPcs: "",
    beratPerPcs: "",
    qtyPcs: "",
    
    // Step 3
    isAutoCatatan: true,
    keteranganManual: "",
  });

  // --- KALKULASI OTOMATIS (LIVE) ---
  const selectedProduk = useMemo(() => 
    produkList.find((p: any) => p.id === formData.produkId), 
  [produkList, formData.produkId]);

  const calcTotalUang = Number(formData.hargaPerPcs) * Number(formData.qtyPcs);
  const calcTotalVolume = Number(formData.beratPerPcs) * Number(formData.qtyPcs);
  const satuan = selectedProduk?.satuanDasar || "satuan";

  // Generate Teks Laporan Otomatis
  const autoLaporanTeks = formData.isPembelianStok && selectedProduk
    ? `Pembelian ${selectedProduk.nama} sebanyak ${formData.qtyPcs} pcs (@${formData.beratPerPcs} ${satuan}). Total volume masuk: ${calcTotalVolume} ${satuan}.`
    : `Pengeluaran ${formData.namaItem} sebesar Rp${Number(formData.totalBiayaLumpsum || 0).toLocaleString("id-ID")}.`;

  // --- MUTASI SUBMIT KE BACKEND ---
  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/pengeluaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menyimpan pengeluaran.");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pengeluaran-list"] });
      queryClient.invalidateQueries({ queryKey: ["produk-master-list"] }); // Update stok
      toast({ title: "Berhasil", description: "Pengeluaran berhasil dicatat." });
      if (onSuccessClose) onSuccessClose();
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal", description: err.message });
    }
  });

  // --- HANDLER VALIDASI & NAVIGASI STEP ---
  const handleNext = () => {
    if (step === 1) {
      if (!formData.tanggal || !formData.namaItem) {
        return toast({ variant: "destructive", title: "Oops!", description: "Tanggal dan Nama Pengeluaran wajib diisi." });
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.kategoriId) {
        return toast({ variant: "destructive", title: "Oops!", description: "Pilih kategori terlebih dahulu." });
      }
      if (formData.isPembelianStok) {
        if (!formData.produkId || !formData.hargaPerPcs || !formData.beratPerPcs || !formData.qtyPcs) {
          return toast({ variant: "destructive", title: "Oops!", description: "Lengkapi semua detail pembelian produk." });
        }
      } else {
        if (!formData.totalBiayaLumpsum) {
          return toast({ variant: "destructive", title: "Oops!", description: "Total pengeluaran wajib diisi." });
        }
      }
      setStep(3);
    }
  };

  const handleSubmit = () => {
    // Susun payload sesuai dengan ekspektasi backend kita yang jujur
    const finalTotalBiaya = formData.isPembelianStok ? calcTotalUang : Number(formData.totalBiayaLumpsum);
    const finalKuantitas = formData.isPembelianStok ? String(calcTotalVolume) : undefined;
    const finalKeterangan = formData.isAutoCatatan ? autoLaporanTeks : formData.keteranganManual;

    const payload = {
      tanggal: formData.tanggal,
      namaItem: formData.namaItem, // Akan di-override fallback otomatis oleh backend jika beli stok, tapi aman dikirim
      kategoriId: formData.kategoriId,
      siklusId: formData.siklusId || undefined,
      isPembelianStok: formData.isPembelianStok,
      totalBiaya: finalTotalBiaya,
      produkId: formData.isPembelianStok ? formData.produkId : undefined,
      kuantitas: finalKuantitas,
      keterangan: finalKeterangan,
    };

    submitMutation.mutate(payload);
  };

  // --- RENDER COMPONENT ---
  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-300">
      
      {/* 🟢 HEADER WIZARD */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex flex-col">
          <span className="text-xs font-black uppercase tracking-widest text-primary">Langkah {step} dari 3</span>
          <span className="text-sm font-bold text-muted-foreground">
            {step === 1 ? "Identitas Transaksi" : step === 2 ? "Detail & Kalkulasi" : "Konfirmasi & Catatan"}
          </span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className={cn("h-2 w-8 rounded-full transition-all duration-300", step >= i ? "bg-primary" : "bg-muted")} />
          ))}
        </div>
      </div>

      {/* 🟢 STEP 1: IDENTITAS */}
      {step === 1 && (
        <div className="flex flex-col gap-4 animate-in slide-in-from-right-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5"/> Tanggal Transaksi</label>
            <input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary font-bold shadow-sm" />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Tag className="h-3.5 w-3.5"/> Nama Pengeluaran</label>
            <input type="text" placeholder="Cth: Bayar Kuli Panggul, Beli Solar..." value={formData.namaItem} onChange={(e) => setFormData({ ...formData, namaItem: e.target.value })} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary font-bold shadow-sm" />
          </div>
        </div>
      )}

      {/* 🟢 STEP 2: KALKULASI & TOGGLE */}
      {step === 2 && (
        <div className="flex flex-col gap-4 animate-in slide-in-from-right-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5"><Receipt className="h-3.5 w-3.5"/> Kategori Beban</label>
            <select value={formData.kategoriId} onChange={(e) => setFormData({ ...formData, kategoriId: e.target.value })} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary font-bold shadow-sm">
              <option value="">-- Pilih Kategori --</option>
              {kategoriList.map((k: any) => (
                <option key={k.id} value={k.id}>{k.nama}</option>
              ))}
            </select>
          </div>

          {/* TOGGLE PEMBELIAN STOK */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-primary/20 bg-primary/5">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">Masuk Gudang / Beli Stok?</span>
              <span className="text-[10px] text-muted-foreground">Aktifkan jika belanja pupuk/obat.</span>
            </div>
            <button onClick={() => setFormData({ ...formData, isPembelianStok: !formData.isPembelianStok })} className="transition-all">
              {formData.isPembelianStok ? <ToggleRight className="h-8 w-8 text-primary" /> : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
            </button>
          </div>

          {/* 🔴 KONDISI B: JIKA BELI STOK AKTIF */}
          {formData.isPembelianStok ? (
            <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-border bg-muted/10 animate-in zoom-in-95">
              <select value={formData.produkId} onChange={(e) => setFormData({ ...formData, produkId: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-bold shadow-sm">
                <option value="">-- Pilih Produk Master --</option>
                {produkList.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.nama} (Stok: {p.stokSaatIni} {p.satuanDasar})</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground">Harga 1 Pcs (Rp)</label>
                  <input type="number" placeholder="Cth: 20000" value={formData.hargaPerPcs} onChange={(e) => setFormData({ ...formData, hargaPerPcs: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-bold shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground">Berat 1 Pcs ({satuan})</label>
                  <input type="number" placeholder={`Cth: 1000`} value={formData.beratPerPcs} onChange={(e) => setFormData({ ...formData, beratPerPcs: e.target.value })} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-bold shadow-sm" />
                </div>
              </div>

              <div className="space-y-1 mt-1">
                <label className="text-xs font-bold text-primary">Beli Berapa Pcs?</label>
                <input type="number" placeholder="Kuantitas (pcs)" value={formData.qtyPcs} onChange={(e) => setFormData({ ...formData, qtyPcs: e.target.value })} className="w-full rounded-lg border border-primary/50 bg-background px-3 py-2.5 text-base font-black text-primary shadow-sm" />
              </div>

              {/* LIVE CALCULATION BOX */}
              <div className="mt-2 p-3 rounded-lg bg-primary text-primary-foreground flex flex-col gap-1 shadow-md">
                <div className="flex justify-between items-center text-xs font-medium opacity-90">
                  <span>Total Tagihan Uang:</span>
                  <span className="font-black text-sm">Rp {calcTotalUang.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-medium opacity-90">
                  <span>Total Masuk Gudang:</span>
                  <span className="font-black text-sm">{calcTotalVolume} {satuan}</span>
                </div>
              </div>
            </div>
          ) : (
            /* 🔴 KONDISI A: JIKA BELI STOK NONAKTIF */
            <div className="space-y-1.5 animate-in zoom-in-95">
              <label className="text-xs font-bold text-muted-foreground">Total Pengeluaran (Rp)</label>
              <input type="number" placeholder="Masukkan total biaya..." value={formData.totalBiayaLumpsum} onChange={(e) => setFormData({ ...formData, totalBiayaLumpsum: e.target.value })} className="w-full rounded-xl border border-input bg-background px-3 py-3 text-lg font-black text-foreground shadow-sm" />
            </div>
          )}
        </div>
      )}

      {/* 🟢 STEP 3: CATATAN & KONFIRMASI */}
      {step === 3 && (
        <div className="flex flex-col gap-4 animate-in slide-in-from-right-4">
          
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">Laporan Otomatis</span>
              <span className="text-[10px] text-muted-foreground">Sistem membuatkan struk catatan.</span>
            </div>
            <button onClick={() => setFormData({ ...formData, isAutoCatatan: !formData.isAutoCatatan })} className="transition-all">
              {formData.isAutoCatatan ? <ToggleRight className="h-8 w-8 text-primary" /> : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
            </button>
          </div>

          {formData.isAutoCatatan ? (
            <div className="p-3.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 text-sm font-medium text-foreground leading-relaxed">
              {autoLaporanTeks}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">Catatan Manual</label>
              <textarea rows={3} placeholder="Ketik rincian atau keterangan tambahan di sini..." value={formData.keteranganManual} onChange={(e) => setFormData({ ...formData, keteranganManual: e.target.value })} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary font-medium shadow-sm" />
            </div>
          )}

          <div className="p-3 mt-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex gap-2 text-xs font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Pastikan data sudah benar sebelum menyimpan. Data akan langsung mempengaruhi laporan keuangan dan stok.
          </div>
        </div>
      )}

      {/* 🟢 BOTTOM NAVIGATION BUTTONS */}
      <div className="flex gap-3 mt-4 pt-4 border-t border-border/40">
        {step > 1 && (
          <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="flex-1 rounded-xl font-bold gap-1.5">
            <ChevronLeft className="h-4 w-4" /> Kembali
          </Button>
        )}
        
        {step < 3 ? (
          <Button type="button" onClick={handleNext} className="flex-[2] rounded-xl font-bold bg-primary text-primary-foreground gap-1.5">
            Lanjut <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={submitMutation.isPending} className="flex-[2] rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-md">
            {submitMutation.isPending ? "Menyimpan..." : <><Save className="h-4 w-4" /> Simpan Pengeluaran</>}
          </Button>
        )}
      </div>

    </div>
  );
}
