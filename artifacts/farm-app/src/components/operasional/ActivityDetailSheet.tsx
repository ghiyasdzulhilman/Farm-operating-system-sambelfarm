import { useState, useEffect, useMemo } from "react"; 
import {
  CalendarDays,
  ChevronDown,
  ArrowRight,
  Bug,
  Activity,
  TrendingUp,
  LeafyGreen,
  Clock3,
  Zap,
  Users,
  Briefcase,
  Thermometer,
  Lock,
  Radar,
  Plus,
  Trash2,
  Save,
  Banknote,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; 
import { cn } from "@/lib/utils";

import type { AgronomyItem } from "@/types/operasional";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface ActivityDetailSheetProps {
  item: AgronomyItem | null;
  onClose: () => void;
  onStatusChange?: (id: string, payload: any) => void;
  isUpdating?: boolean; // 🆕
}

export function ActivityDetailSheet({
  item,
  onClose,
  onStatusChange,
  isUpdating = false, // 🆕
}: ActivityDetailSheetProps) {

  // 💡 State untuk mendeteksi elemen mana yang lagi di-tap (inline edit)
 
  const [activeField, setActiveField] = useState<string | null>(null);
  const [localValue, setLocalValue] = useState<string>("");
  
  // 💡 State khusus penampung array racikan produk yang lagi diedit
  const [editedProducts, setEditedProducts] = useState<Array<{ produkId: string; kuantitasPemakaian: number; namaProduk?: string; satuanDasar?: string }>>([]);

  // 💡 Sinkronisasi otomatis: Saat sheet dibuka, salin array logProduk dari database ke state lokal
  useEffect(() => {
    if (item?.module === "perawatan" && item.metaEkstra?.logProduk) {
      setEditedProducts(item.metaEkstra.logProduk);
    } else {
      setEditedProducts([]);
    }
  }, [item]);

  // 💡 Fetch Opsi Master Produk dari backend
    const { data: produkOptions } = useQuery({
    queryKey: ["produk-master-list"],
    queryFn: async () => fetch("/api/produk").then(res => res.json()),
    enabled: !!item && item.module === "perawatan"
  });

  // 💡 Fetch Opsi Kategori langsung dari backend
  const { data: dropdownOptions } = useQuery({

    queryKey: ["operasional-options-list"],
    queryFn: async () => fetch("/api/notion/operasional-dropdown-options").then(res => res.json()),
    enabled: !!item // Hanya nge-fetch kalau sheet-nya lagi kebuka
  });

// 🚀 KALKULATOR LIVE: Total Biaya Racikan
    const totalBiayaRacikan = useMemo(() => {
    // 🔒 Belum diedit: SELALU pakai angka historis dari backend (snapshot hargaTercatatPerSatuan),
    // jangan pernah hitung ulang dari harga master sekarang — itu bisa drift dari kejadian aslinya.
    if (!isDirty) {
      return item?.metaEkstra?.totalBiayaProduk || 0;
    }

    // 🧮 Sedang diedit, belum disimpan: ini PERKIRAAN pakai harga master TERKINI,
    // karena harga final yang akan tersimpan memang ditentukan backend saat submit,
    // bukan snapshot lama yang sedang ditimpa.
    if (editedProducts.length === 0) return 0;
    if (!produkOptions?.data) return 0; // master belum ke-load, jangan tampilkan angka menyesatkan

    return editedProducts.reduce((sum, prod) => {
      const master = produkOptions.data.find((p: any) => p.id === prod.produkId);
      const harga = master?.hargaPerSatuanDasar || 0;
      return sum + (prod.kuantitasPemakaian * harga);
    }, 0);
  }, [isDirty, editedProducts, produkOptions?.data, item]);

  // 💡 Helper Format Rupiah
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);
  };

 // 💡 Helper format Tanggal & Waktu (NAIVE STRATEGY)
  const formatDateValue = (raw?: string) => {
    if (!raw) return "";
    return raw.split(/[T ]/)[0]; // Ambil YYYY-MM-DD
  };
  
  const formatTimeValue = (raw?: string) => {
    if (!raw) return "";
    const timePart = raw.split(/[T ]/)[1];
    return timePart ? timePart.substring(0, 5) : ""; // Ambil HH:mm
  };

  // 💡 Helper update Waktu & Tanggal (NAIVE STRATEGY) 🚀
  const handleDateTimeSave = (field: 'waktuMulai' | 'waktuSelesai', type: 'date' | 'time', value: string) => {
    if (!value) return;
    
    // 1. Ambil raw string, pecah jadi tanggal & jam
    const currentRaw = item.metaEkstra?.[field] || item.rawDate || new Date().toISOString().substring(0, 19).replace('T', ' ');
    const [dbDate, dbTime] = currentRaw.split(/[T ]/);

    // 2. Timpa bagian yang diedit user
    const finalDateStr = type === 'date' ? value : dbDate;
    const finalTimeStr = type === 'time' ? (value.length === 5 ? `${value}:00` : value) : (dbTime || "00:00:00");

    // 🚀 3. GABUNGKAN JADI STRING MENTAH TANPA ZONA WAKTU
    const naiveDateTimeStr = `${finalDateStr}T${finalTimeStr}`;
    const payload: any = { [field]: naiveDateTimeStr };

    // 4. Kalkulasi durasi kerja (JS Date aman dipakai cuma buat cari selisih waktu)
    const startRaw = field === 'waktuMulai' ? naiveDateTimeStr : (item.metaEkstra?.waktuMulai || currentRaw);
    const endRaw = field === 'waktuSelesai' ? naiveDateTimeStr : item.metaEkstra?.waktuSelesai;

    if (startRaw && endRaw) {
      const msDiff = new Date(endRaw).getTime() - new Date(startRaw).getTime();
      const calcHours = Math.max(0, msDiff / (1000 * 60 * 60));
      payload.durasiKerja = Math.round(calcHours); 
    }

    onStatusChange?.(item.id, payload);
  };

  if (!item) return null;

    const formatJamMendalam = (dateStr?: string) => {
    if (!dateStr) return "-";
    const timePart = dateStr.split(/[T ]/)[1];
    return timePart ? timePart.substring(0, 5) : "-";
  };

  const formatTanggalLengkap = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const datePart = dateStr.split(/[T ]/)[0]; 
      // Force set jam ke 00:00:00 agar date-fns tidak bergeser hari
      return format(new Date(`${datePart}T00:00:00`), "dd MMM yyyy");
    } catch {
      return "-";
    }
  };

  // 💡 Fungsi pintar untuk mengambil murni catatan ketikan user (Support Inspeksi & Perawatan)
  const getCleanCatatan = () => {
    const raw = item.notes || "";
    
    // Cegah duplikasi di modul perawatan
    if (item.module === "perawatan" && raw.includes("\n\nCatatan Tambahan:\n")) {
      const parts = raw.split("\n\nCatatan Tambahan:\n");
      return parts[parts.length - 1]; // Ambil yang paling akhir buat ngakalin data lu yang udah terlanjur numpuk
    }
    
    // Cegah duplikasi di modul inspeksi
    if (item.module === "inspeksi" && raw.includes("\n\n⚠️ Detail Kendala:\n")) {
      return raw.split("\n\n⚠️ Detail Kendala:\n")[0];
    }
    
    return raw;
  };

  // 💡 Ekstrak khusus detail kendala (Read-Only) untuk Inspeksi
  const getDetailKendala = () => {
    const raw = item.notes || "";
    const parts = raw.split("\n\n⚠️ Detail Kendala:\n");
    return parts.length > 1 ? parts[1] : "";
  };

  // 💡 Fungsi penembak data otomatis ala Notion (dipanggil saat klik di luar input / onBlur)
  const handleInlineSave = (field: string) => {
    setActiveField(null); // Tutup form input-nya

    const payload: any = {};
    const valStr = localValue.trim();

    if (field === "title") payload[item.module === "operasional" ? "namaPekerjaan" : "kegiatan"] = valStr;
    if (field === "phTanah") payload.phTanah = valStr !== "" ? parseFloat(valStr) : null;
    if (field === "tingkatSerangan") payload.tingkatSerangan = valStr !== "" ? parseFloat(valStr) : null;
    if (field === "radius") payload.radius = valStr !== "" ? parseFloat(valStr) : null;
    if (field === "jenisTenagaKerja") payload.jenisTenagaKerja = valStr;
    if (field === "tagCategory") payload.tagCategory = valStr;
    if (field === "catatan") payload[item.module === "inspeksi" ? "keterangan" : "catatan"] = valStr;
    if (field === "durasiKerja") payload.durasiKerja = valStr !== "" ? parseInt(valStr, 10) : 0;

        // Kirim payload ke halaman utama buat di-eksekusi mutasinya (pastikan gak kosong)
    if (Object.keys(payload).length > 0) {
      onStatusChange?.(item.id, payload);
    }
  };

  // 💡 HELPER PINTAR KALKULASI HST (Hitungan Selisih Hari Murni) 🚀
  const calculateHST = () => {
    const tglTanamStr = item.metaEkstra?.tanggalPindahTanam || (item as any).tanggalPindahTanam;
    if (!tglTanamStr) return null;

    try {
      // 1. Ambil YYYY-MM-DD murni dari tanggal tanam
      const dateOnlyTanam = tglTanamStr.split('T')[0];
      const plantDate = new Date(`${dateOnlyTanam}T00:00:00`); 

      // 2. Ambil YYYY-MM-DD dari tanggal aktivitas (Format lokal WIB)
      const dateAktivitasRaw = new Date(item.rawDate || new Date());
      const dateOnlyAktivitas = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(dateAktivitasRaw);
      const activityDate = new Date(`${dateOnlyAktivitas}T00:00:00`);

      if (isNaN(plantDate.getTime()) || isNaN(activityDate.getTime())) return null;

      // 3. Hitung selisih hari murni (Tanggal Aktivitas - Tanggal Tanam)
      const diffTime = activityDate.getTime() - plantDate.getTime();
      const hst = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // 4. Kondisi label umur tanaman
      if (hst < 0) return "Pra-tanam";
      if (hst === 0) return "0 HST (Hari Tanam)";
      
      return `${hst} HST`;
    } catch {
      return null;
    }
  };

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      
      <SheetContent
        side="right"
        className="w-full border-l border-border/60 bg-background p-0 sm:max-w-[520px] [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()} 
      >
        <div className="flex h-full flex-col">

          {/* HEADER PREMIUM DENGAN STATUS & TOMBOL KEMBALI */}
          <SheetHeader className="border-b border-border/60 px-4 py-3">
            <div className="flex items-center justify-between gap-3 w-full">
              
{/* DROPDOWN STATUS DINAMIS DI KIRI */}
  <div className="relative inline-block shrink-0">
  <select
    value={item.status}
    onChange={(e) => onStatusChange?.(item.id, e.target.value)}
    disabled={item.isPendingStaging}
    className={cn(
      "relative z-10 appearance-none rounded-full pl-3 pr-8 text-[11px] font-bold uppercase tracking-wider outline-none cursor-pointer border transition-all shadow-sm max-w-[130px] truncate",
      "h-[34px]", // Paksa tinggi sama dengan tombol kembali
      (item.status === "Selesai" || item.status === "Sudah ditangani")
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
        : (item.status === "Dalam proses" || item.status === "Sedang ditangani")
          ? "border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
          : "border-muted-foreground/20 bg-muted/20 text-muted-foreground hover:bg-muted/40",
      item.isPendingStaging && "opacity-50 cursor-not-allowed",
    )}
  >

                  {/* 💡 Fix: Opsi disesuaikan dengan jenis modul */}
                  {item.module === "inspeksi" ? (
                    <>
                      <option value="Baru ditemukan">Baru ditemukan</option>
                      <option value="Sedang ditangani">Sedang ditangani</option>
                      <option value="Sudah ditangani">Sudah ditangani</option>
                    </>
                  ) : (
                    <>
                      <option value="Belum dikerjakan">Belum dikerjakan</option>
                      <option value="Dalam proses">Dalam proses</option>
                      <option value="Selesai">Selesai</option>
                    </>
                  )}
                </select>
                {/* 💡 BUGFIX: Tambahkan 'z-10' juga pada icon panah agar tidak terkubur di bawah select */}
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none opacity-60 z-10" />
              </div>

{/* TOMBOL KEMBALI BESAR & NYAMAN DI KANAN (JEMPOL KANAN) */}
  <button 
  onClick={onClose}
  className="flex items-center gap-2 h-[34px] pl-4 pr-1.5 rounded-full bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all group"
>

  <span className="text-[11px] font-bold uppercase tracking-widest text-primary transition-colors">
    Kembali
  </span>
  <div className="bg-primary rounded-full p-1.5 shadow-sm group-hover:scale-105 transition-transform text-primary-foreground">
    <ArrowRight className="h-4 w-4" />
  </div>
</button>

            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar text-left">
            {/* KARTU IDENTITAS UTAMA (JUDUL INLINE EDIT) */}
            <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-transparent p-5 border border-primary/10">
              <div className="flex items-start justify-between gap-4">
                <div className="w-full">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    <span>{item.time}</span>
                    <span>•</span>
                    <span className="text-foreground">{formatTanggalLengkap(item.rawDate)}</span>
                    {item.dateLabel !== "Riwayat Lama" && (
                      <>
                        <span>•</span>
                        <span className={item.dateLabel === "Hari ini" ? "text-primary" : ""}>
                          {item.dateLabel}
                        </span>
                      </>
                    )}

                  {/* 💡 TAMPILKAN NAMA TANAMAN HISTORIS DARI SIKLUS ID */}
                    {item.metaEkstra?.namaSiklus && (
                      <>
                        <span className="text-border/40 font-light">|</span>
                        <span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold tracking-normal">
                           {item.metaEkstra.namaSiklus}
                        </span>
                      </>
                    )}

                   {/* 💡 HST PINDAH KE SINI, HANYA MUNCUL JIKA ADA DATANYA */}
                    {calculateHST() && (
                      <>
                        <span className="text-border/40 font-light">|</span>
                        <span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold tracking-normal">
                        {calculateHST()}
                        </span>
                      </>
                    )}

                  </div>
                  
                  {/* 💡 JUDUL: Tap untuk Edit */}

                  {activeField === "title" ? (
                    <input
                      autoFocus
                      type="text"
                      value={localValue}
                      onChange={(e) => setLocalValue(e.target.value)}
                      onBlur={() => handleInlineSave("title")}
                      onKeyDown={(e) => e.key === "Enter" && handleInlineSave("title")}
                      className="mt-2 w-full bg-transparent text-2xl font-black tracking-tight text-foreground border-b border-primary/50 outline-none pb-1"
                    />
                  ) : (
                    <h2 
                      onClick={() => { setActiveField("title"); setLocalValue(item.title); }}
                      className="mt-2 text-2xl font-black tracking-tight cursor-pointer hover:bg-muted/40 rounded transition-colors w-full"
                    >
                      {item.title}
                    </h2>
                  )}

                </div>
                <div className="rounded-3xl bg-background/80 backdrop-blur-sm p-3 shadow-sm border border-border/40 shrink-0">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
              </div>
              
             {/* 💡 JAJARAN BADGE INTERAKTIF BARU (FIX LEBAR DINAMIS) */}
              <div className="mt-4 flex flex-wrap gap-2 items-center">
                
 {/* 1. Badge Area (perawatan dikunci) & Tanaman Historis */}
{item.module === "perawatan" ? (
  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-[11px] font-bold uppercase tracking-wider max-w-[160px] truncate">
    <Lock className="h-3 w-3 shrink-0" />
    <span className="truncate">
      {item.metaEkstra?.namaSiklus ? `${item.area} - ${item.metaEkstra.namaSiklus}` : item.area}
    </span>
  </div>
) : (
  <div className="relative inline-flex shadow-sm max-w-full">
    <select
      value={item.areaId || ""}
      onChange={(e) => onStatusChange?.(item.id, { areaId: e.target.value })}
      className="appearance-none max-w-[130px] sm:max-w-[160px] truncate bg-primary text-primary-foreground border border-primary hover:bg-primary/90 rounded-full pl-3 pr-7 py-1 text-[11px] font-bold uppercase tracking-wider outline-none cursor-pointer transition-colors z-10"
    >
      <option value="" disabled>PILIH AREA</option>
      {dropdownOptions?.areas?.map((a: any) => {
        const isCurrentArea = a.id === item.areaId;
        const displayLabel = (isCurrentArea && item.metaEkstra?.namaSiklus) 
          ? `${item.area} - ${item.metaEkstra.namaSiklus}` 
          : a.name;
        return (
          <option key={a.id} value={a.id}>
            {displayLabel}
          </option>
        );
      })}
    </select>
    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-primary-foreground pointer-events-none z-10" />
  </div>
)}


              {/* 2. Badge Kategori (Sembunyikan khusus untuk Inspeksi karena tidak ada di schema DB) */}
                {item.module !== "inspeksi" && (
                  <div className="relative inline-flex shadow-sm max-w-full">
                    <select
                      value={item.module === "perawatan" ? (item.tagCategoryId || item.metaEkstra?.tagCategoryId || "") : (item.kategoriId || item.metaEkstra?.kategoriId || "")}
                      onChange={(e) => {

                      const field = item.module === "perawatan" ? "tagCategoryId" : "kategoriId";
                      onStatusChange?.(item.id, { [field]: e.target.value });
                    }}
                    className="appearance-none max-w-[140px] sm:max-w-[170px] truncate bg-primary text-primary-foreground border border-primary hover:bg-primary/90 rounded-full pl-3 pr-7 py-1 text-[11px] font-bold uppercase tracking-wider outline-none cursor-pointer transition-colors z-10"
                  >

                    <option value="" disabled>PILIH KATEGORI</option>
                    {dropdownOptions?.kategori?.filter((k: any) => k.module === item.module).map((k: any) => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-primary-foreground pointer-events-none z-10" />
                </div>
                )}
              </div>

            </div>

           {/* SEGMEN SPESIFIKASI LAPANGAN (GRID 2x2 YANG PRESISI) */}
            {item.metaEkstra && Object.keys(item.metaEkstra).length > 0 && (item.module === "inspeksi" || item.module === "operasional" || item.module === "perawatan") && (
              <section className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Spesifikasi Lahan
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* 1. KOTAK-KOTAK UNTUK MODUL INSPEKSI */}
                  {item.module === "inspeksi" && (
                    <>
                      {/* pH Tanah */}
                      <div 
                        onClick={() => { if(activeField !== "phTanah") { setActiveField("phTanah"); setLocalValue(String(item.metaEkstra.phTanah || "")); } }}
                        className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Thermometer className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase">pH Tanah</span>
                        </div>
                        {activeField === "phTanah" ? (
                          <input autoFocus type="number" step="0.1" value={localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={() => handleInlineSave("phTanah")} onKeyDown={(e) => e.key === "Enter" && handleInlineSave("phTanah")} className="w-full bg-transparent text-lg font-black text-foreground outline-none border-b border-primary/30 p-0" />
                        ) : (
                          <p className="text-lg font-black text-foreground">{item.metaEkstra.phTanah || "-"}</p>
                        )}
                      </div>

                      {/* Tingkat Serangan */}
                      <div 
                        onClick={() => { if(activeField !== "tingkatSerangan") { setActiveField("tingkatSerangan"); setLocalValue(String(item.metaEkstra.tingkatSerangan || "")); } }}
                        className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase">Serangan</span>
                        </div>
                        {activeField === "tingkatSerangan" ? (
                          <input autoFocus type="number" value={localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={() => handleInlineSave("tingkatSerangan")} onKeyDown={(e) => e.key === "Enter" && handleInlineSave("tingkatSerangan")} className="w-full bg-transparent text-lg font-black text-foreground outline-none border-b border-primary/30 p-0" />
                        ) : (
                          <p className="text-lg font-black text-foreground">{item.metaEkstra.tingkatSerangan ? `${item.metaEkstra.tingkatSerangan}%` : "0%"}</p>
                        )}
                      </div>

                      {/* Radius Terpapar */}
                      <div 
                        onClick={() => { if(activeField !== "radius") { setActiveField("radius"); setLocalValue(String(item.metaEkstra.radius || "")); } }}
                        className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Radar className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase">Radius</span>
                        </div>
                        {activeField === "radius" ? (
                          <input autoFocus type="number" value={localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={() => handleInlineSave("radius")} onKeyDown={(e) => e.key === "Enter" && handleInlineSave("radius")} className="w-full bg-transparent text-lg font-black text-foreground outline-none border-b border-primary/30 p-0" />
                        ) : (
                          <p className="text-lg font-black text-foreground">{item.metaEkstra.radius ? `${item.metaEkstra.radius} m` : "-"}</p>
                        )}
                      </div>

                    {/* 🔒 KOTAK KE-4: Durasi Kerja (Kunci Menjadi Read-Only) */}
                      <div className="rounded-2xl border border-border/40 bg-muted/40 p-3 shadow-sm select-none">
                        <div className="flex items-center gap-2 text-muted-foreground/70 mb-1">
                          <Clock3 className="h-4 w-4 opacity-70" />
                          <span className="text-xs font-bold uppercase tracking-wider">Durasi Kerja</span>
                        </div>
                        <p className="text-lg font-black text-muted-foreground">
                          {item.metaEkstra.durasiKerja ? `${item.metaEkstra.durasiKerja} Jam` : "0 Jam"}
                        </p>
                      </div>
                    </>
                  )}

               {/* 2. KOTAK-KOTAK UNTUK MODUL OPERASIONAL */}
                  {item.module === "operasional" && (
                    <>
                      {/* CARD 1: Prioritas (Value disamakan dengan Form Input: Low, Medium, High) */}
                      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm relative">
                        <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                          <Zap className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase">Prioritas</span>
                        </div>
                        <select 
                          value={
                            ["Low", "Medium", "High"].find(
                              (p) => p.toLowerCase() === (item.metaEkstra.prioritas || "Medium").toLowerCase()
                            ) || "Medium"
                          }
                          onChange={(e) => onStatusChange?.(item.id, { prioritas: e.target.value })}
                          className="w-full bg-transparent text-sm font-black uppercase tracking-wider outline-none cursor-pointer appearance-none relative z-10"
                        >
                          <option value="High">HIGH</option>
                          <option value="Medium">MEDIUM</option>
                          <option value="Low">LOW</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 mt-2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50 pointer-events-none" />
                      </div>

{/* CARD 2: Durasi Kerja (Read-Only) */}
<div className="rounded-2xl border border-border/40 bg-muted/40 p-3 shadow-sm select-none">
  <div className="mb-1 flex items-center gap-2 text-muted-foreground/70">
    <Clock3 className="h-4 w-4 opacity-70" />
    <span className="text-xs font-bold uppercase tracking-wider">Durasi Kerja</span>
  </div>
  <p className="text-sm font-black text-muted-foreground">
    {item.metaEkstra.durasiKerja ? `${item.metaEkstra.durasiKerja} Jam` : "0 Jam"}
  </p>
</div>
 </>
)}

{/* 3. KOTAK UNTUK MODUL PERAWATAN — Durasi & Total Biaya */}
      {item.module === "perawatan" && (
        <>
          <div className="rounded-2xl border border-border/40 bg-muted/40 p-3 shadow-sm select-none">
            <div className="flex items-center gap-2 text-muted-foreground/70 mb-1">
              <Clock3 className="h-4 w-4 opacity-70" />
              <span className="text-xs font-bold uppercase tracking-wider">Durasi Kerja</span>
            </div>
            <p className="text-lg font-black text-muted-foreground">
              {item.metaEkstra.durasiKerja ? `${item.metaEkstra.durasiKerja} Jam` : "0 Jam"}
            </p>
          </div>

          {/* 💡 KOTAK BARU: Total Biaya (Live Calculator) */}
           <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 shadow-sm select-none transition-colors">
            <div className="flex items-center gap-2 text-emerald-600/80 mb-1">
              <Banknote className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {isDirty ? "Perkiraan Biaya*" : "Total Biaya"}
              </span>
            </div>
            <p className="text-lg font-black text-emerald-700 truncate">
              {formatRupiah(totalBiayaRacikan)}
            </p>
            {isDirty && (
              <p className="text-[9px] text-emerald-600/70 mt-1">*Pakai harga saat ini, belum tersimpan</p>
            )}
          </div>

        </>
      )}

                </div>
              </section>
            )}

            {/* 💡 SEGMEN JADWAL PELAKSANAAN (MEMANJANG FULL-WIDTH DI BAWAH GRID UNTUK SEMUA MODUL) */}
            {item.metaEkstra && Object.keys(item.metaEkstra).length > 0 && (
              <section className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Jadwal Pelaksanaan
                  </h3>
                </div>

                <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm flex flex-col gap-3">
                  {/* Baris Tanggal Range */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black tracking-wider text-muted-foreground w-12">TANGGAL</span>
                    <div className="flex items-center gap-2 flex-1 bg-muted/30 p-1.5 rounded-xl border border-border/50">
                      <input type="date" value={formatDateValue(item.metaEkstra?.waktuMulai)} onChange={(e) => handleDateTimeSave('waktuMulai', 'date', e.target.value)} className="w-full bg-transparent text-xs font-bold outline-none cursor-pointer text-center" />
                      <span className="text-muted-foreground/40 font-black">/</span>
                      <input type="date" value={formatDateValue(item.metaEkstra?.waktuSelesai)} onChange={(e) => handleDateTimeSave('waktuSelesai', 'date', e.target.value)} className="w-full bg-transparent text-xs font-bold outline-none cursor-pointer text-center" />
                    </div>
                  </div>
                  
                  <div className="h-px w-full bg-border/40" />
                  
                  {/* Baris Waktu/Jam Range */}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] font-black tracking-wider text-muted-foreground w-12">WAKTU</span>
                    <div className="flex items-center gap-2 flex-1 bg-muted/30 p-1.5 rounded-xl border border-border/50">
                      <input type="time" value={formatTimeValue(item.metaEkstra?.waktuMulai)} onChange={(e) => handleDateTimeSave('waktuMulai', 'time', e.target.value)} className="w-full bg-transparent text-xs font-bold outline-none cursor-pointer text-center" />
                      <span className="text-muted-foreground/40 font-black">-</span>
                      <input type="time" value={formatTimeValue(item.metaEkstra?.waktuSelesai)} onChange={(e) => handleDateTimeSave('waktuSelesai', 'time', e.target.value)} className="w-full bg-transparent text-xs font-bold outline-none cursor-pointer text-center" />
                    </div>
                  </div>
                </div>
              </section>
            )}
 
          {/* 💡 SEGMEN BARU: CATATAN TEMUAN (KHUSUS INSPEKSI) */}
            {item.module === "inspeksi" && (
              <section className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-destructive" />
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Catatan Temuan
                  </h3>
                </div>

                <div className="rounded-3xl border border-destructive/20 bg-destructive/5 p-4 shadow-sm">
                  {/* Bagian Badge Hama & Penyakit */}
                  <div className="flex flex-wrap gap-1.5 mb-4 pb-4 border-b border-destructive/10">
                    {(Array.isArray(item.metaEkstra.hama) ? item.metaEkstra.hama : []).map((h: string) => (
                      <Badge key={h} variant="destructive" className="text-[10px] rounded-md px-2 py-0.5 bg-red-500/80">{h}</Badge>
                    ))}
                    {(Array.isArray(item.metaEkstra.penyakit) ? item.metaEkstra.penyakit : []).map((p: string) => (
                      <Badge key={p} variant="destructive" className="text-[10px] rounded-md px-2 py-0.5 bg-orange-500/80">{p}</Badge>
                    ))}
                    {(!item.metaEkstra.hama?.length && !item.metaEkstra.penyakit?.length) && (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md">Tanaman Aman Terkendali</span>
                    )}
                  </div>
                  
{/* Bagian Detail Text — hanya tampil kalau ada isinya */}
{getDetailKendala() && (
  <div className="text-sm text-destructive whitespace-pre-wrap leading-relaxed font-medium">
    {getDetailKendala()}
  </div>
)}
</div>
</section>
)}

            {/* 💡 SEGMEN BARU: RINCIAN BAHAN & DOSIS (KHUSUS PERAWATAN) */}
            {item.module === "perawatan" && (
              <section className="mt-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
                      Bahan & Dosis
                    </h3>
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm flex flex-col gap-3">
                  {editedProducts.length === 0 ? (
                    <div className="text-sm text-muted-foreground italic text-center py-2">Belum ada produk yang digunakan.</div>
                  ) : (
                    editedProducts.map((prod, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        {/* Dropdown Pilih Produk */}
                        <div className="relative flex-1">
             <select
                            value={prod.produkId || ""}
                            onChange={(e) => {
                              const newProds = [...editedProducts];
                              const selectedMaster = produkOptions?.data?.find((p: any) => p.id === e.target.value);
                              newProds[index] = { 
                                ...newProds[index], 
                                produkId: e.target.value,
                                namaProduk: selectedMaster?.nama,
                                satuanDasar: selectedMaster?.satuanDasar
                              };
                              setEditedProducts(newProds);
                              setIsDirty(true);
                            }}

                            className="w-full appearance-none rounded-xl bg-background border border-border/50 px-3 py-2 text-xs font-bold outline-none"
                          >
                            <option value="" disabled>Pilih Produk...</option>
                            {produkOptions?.data?.map((p: any) => (
                              <option key={p.id} value={p.id}>{p.nama}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50 pointer-events-none" />
                        </div>

                        {/* Input Gram/Dosis */}
                        <div className="flex items-center bg-background border border-border/50 rounded-xl px-2 w-[100px]">
                          <input
                            type="number"
                            min="0"
                            value={prod.kuantitasPemakaian || ""}
           onChange={(e) => {
                              const newProds = [...editedProducts];
                              newProds[index].kuantitasPemakaian = parseFloat(e.target.value) || 0;
                              setEditedProducts(newProds);
                              setIsDirty(true);
                            }}

                            className="w-full bg-transparent text-xs font-bold outline-none py-2 text-right"
                            placeholder="0"
                          />
                          <span className="text-[10px] font-bold text-muted-foreground ml-1">{prod.satuanDasar || "gram"}</span>
                        </div>

                        {/* Tombol Hapus Baris */}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
                          onClick={() => { setEditedProducts(editedProducts.filter((_, i) => i !== index)); setIsDirty(true); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}

                  {/* Tombol Tambah Baris */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-1 border-dashed border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
   onClick={() => { setEditedProducts([...editedProducts, { produkId: "", kuantitasPemakaian: 0 }]); setIsDirty(true); }}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Tambah Produk
                  </Button>

                  {/* Tombol Simpan (Trigger Transaksi Reverse & Reapply) */}
                  <Button 
                    variant="default" 
                    size="sm" 
                    disabled={isUpdating}
                    className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold tracking-wider disabled:opacity-50"
                    onClick={() => {
                      onStatusChange?.(item.id, { logProduk: editedProducts });
                    }}
                  >
                    {isUpdating ? "Menyimpan..." : <><Save className="h-4 w-4 mr-2" /> Simpan Racikan Produk</>}
                  </Button>

                </div>
              </section>
            )}

            {/* SEGMEN CATATAN UMUM (INLINE EDIT) */}
            <section className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />

                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
                {item.module === "inspeksi" ? "Catatan Kegiatan" : "Catatan / Detail"}
               </h3>
              </div>
              
              {/* Kotak Catatan Utama (Bisa Di-edit untuk semua modul) */}
              <div 
                onClick={() => { if(activeField !== "catatan") { setActiveField("catatan"); setLocalValue(getCleanCatatan()); } }}
                className="rounded-3xl border border-border/60 bg-muted/20 p-4 text-sm leading-6 text-foreground min-h-[120px] cursor-pointer hover:bg-muted/40 transition-colors"
              >
                {activeField === "catatan" ? (
                  <textarea 
                    autoFocus 
                    rows={4} 
                    value={localValue} 
                    onChange={(e) => setLocalValue(e.target.value)} 
                    onBlur={() => handleInlineSave("catatan")} 
                    className="w-full bg-transparent outline-none resize-none p-0" 
                  />
                ) : (
                  <div className="whitespace-pre-wrap">{getCleanCatatan() || "Ketik catatan disini..."}</div>
                )}
              </div>
            </section>

            {/* SEGMEN PEKERJA */}
            <section className="mt-6 space-y-3 pb-8">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Pekerja / Tim
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.workers.map((worker) => (
                  <Badge key={worker} variant="outline" className="rounded-full px-3 py-1 shadow-sm">
                    {worker}
                  </Badge>
                ))}
              </div>
            </section>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
