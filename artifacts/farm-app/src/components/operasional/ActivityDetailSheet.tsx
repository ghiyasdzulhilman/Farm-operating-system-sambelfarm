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
  MapPin,
  Edit3,
  Banknote,
  X,
  Calendar,
  Timer,
  Inbox
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
import { useQuery, useQueryClient } from "@tanstack/react-query"; // 🚀 Tambah useQueryClient

import { InspeksiFields } from "./sheet-parts/InspeksiFields";
import { OperasionalFields } from "./sheet-parts/OperasionalFields";
import { JadwalPelaksanaan } from "./sheet-parts/JadwalPelaksanaan";
import { CatatanTemuan } from "./sheet-parts/CatatanTemuan";
import { TimKebun } from "./sheet-parts/TimKebun";

interface ActivityDetailSheetProps {
  item: AgronomyItem | null;
  onClose: () => void;
  onStatusChange?: (id: string, payload: any) => void | Promise<any>;
  onProdukChange?: (id: string, logProduk: any[]) => Promise<any>;
  isUpdating?: boolean;
  isUpdatingProduk?: boolean;
}

export function ActivityDetailSheet({
  item: incomingItem, // ✨ 1. Ubah nama parameter jadi 'incomingItem'
  onClose,
  onStatusChange,
  onProdukChange,
  isUpdating = false,
  isUpdatingProduk = false,
}: ActivityDetailSheetProps) {

  const queryClient = useQueryClient(); // 🚀 FIX BUG 2: Panggil queryClient buat invalidate cache

  // ✨ 2. JURUS CACHE: Simpan "arwah" data terakhir biar nggak langsung hilang pas ditutup
  const [cachedItem, setCachedItem] = useState<AgronomyItem | null>(null);

  useEffect(() => {
    if (incomingItem) {
      setCachedItem(incomingItem);
    }
  }, [incomingItem]);

  // ✨ 3. Tentukan data yang dipakai: Kalau data asli hilang (lagi proses nutup), pakai data cache!
  const item = incomingItem || cachedItem;

  // 💡 State untuk mendeteksi elemen mana yang lagi di-tap (inline edit)
  const [activeField, setActiveField] = useState<string | null>(null);
  const [localValue, setLocalValue] = useState<string>("");
  
  // 💡 State khusus penampung array racikan produk yang lagi diedit
  const [editedProducts, setEditedProducts] = useState<Array<{ produkId: string; kuantitasPemakaian: number; namaProduk?: string; satuanDasar?: string }>>([]);
  const [isDirty, setIsDirty] = useState(false);

// 💡 Sinkronisasi otomatis: Saat sheet dibuka, salin array logProduk dari database ke state lokal
// 🚀 FIX BUG: dependency diganti ke `incomingItem` (bukan `item` turunan).
// `item` = incomingItem || cachedItem, dan cachedItem bikin nilainya tetap "ada" selama transisi tutup,
// jadi kalau item yang sama dibuka lagi, referensinya IDENTIK dengan sebelum ditutup —
// React skip effect ini karena dependency dianggap tidak berubah, padahal editedProducts
// sudah kadung dikosongkan manual saat sheet ditutup. `incomingItem` selalu null saat tertutup,
// jadi transisi null -> objek SELALU dianggap perubahan, effect pasti jalan ulang.
useEffect(() => {
  if (incomingItem?.module === "perawatan" && incomingItem.metaEkstra?.logProduk) {
    setEditedProducts(incomingItem.metaEkstra.logProduk.map((p: any) => ({ ...p }))); // clone tiap objek
  } else {
    setEditedProducts([]);
  }
}, [incomingItem]);

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

      // 🚀 KALKULATOR LIVE: Total Biaya Racikan (SINKRON DENGAN DELTA ALGORITHM BACKEND)
  const costCalculation = useMemo(() => {
    // 🔒 Belum diedit: kembalikan angka total murni dari database
    if (!isDirty) {
      return {
        total: item?.metaEkstra?.totalBiayaProduk || 0,
        label: "Total Biaya",
        subtext: null
      };
    }

    // 🧮 Sedang diedit, tapi dikosongkan semua
    if (editedProducts.length === 0) {
      return { total: 0, label: "Estimasi Biaya", subtext: "(tidak ada produk)" };
    }
    
    // Tunggu master data load biar nggak ngaco
    if (!produkOptions?.data) {
      return { total: item?.metaEkstra?.totalBiayaProduk || 0, label: "Estimasi Biaya", subtext: "Menghitung..." };
    }

    let hasHistoricalDiff = false;
    let hasRealNewProduct = false;
    let calculatedTotal = 0;

    const historyLog = item?.metaEkstra?.logProduk || [];

    editedProducts.forEach((prod) => {
      const historyProd = historyLog.find((p: any) => p.produkId === prod.produkId);
      const master = produkOptions.data.find((p: any) => p.id === prod.produkId);
      const hargaMaster = master?.hargaPerSatuanDasar || 0;

      if (historyProd) {
        // ⏳ PRODUK LAMA (Ember C): Selalu pakai harga historis
        const hargaHistoris = historyProd.hargaTercatatPerSatuan || 0;
        calculatedTotal += (prod.kuantitasPemakaian * hargaHistoris);

        // Cuma naikin bendera kalau ada selisih harga
        if (hargaHistoris !== hargaMaster) {
          hasHistoricalDiff = true;
        }
        // 💡 KUNCI FIX: Jika harga belum berubah, ABAIKAN. 
        // Jangan pernah set bendera "saat ini" untuk produk riwayat.
      } else {
        // 🆕 PRODUK BARU (Ember B): Gunakan harga master terkini
        hasRealNewProduct = true; // Ini yang beneran berhak dapet bendera "saat ini"
        calculatedTotal += (prod.kuantitasPemakaian * hargaMaster);
      }
    });

    // 🏷️ Tentukan label indikator harga yang lebih presisi
    let subtext = "";
    if (hasHistoricalDiff && hasRealNewProduct) {
      subtext = "(harga lama & saat ini)"; // Murni gabungan: ada barang baru + barang lama yg harganya udah naik/turun
    } else if (hasHistoricalDiff) {
      subtext = "(harga lama)"; // Semua produk dari riwayat lama, dan ada yg harganya udah beda
    } else {
      subtext = "(harga saat ini)"; // Kondisi sisa: Murni barang baru semua, ATAU produk lama yg harganya emang belum ada yg berubah sama sekali di master
    }

    return { 
      total: calculatedTotal, 
      label: "Estimasi Biaya", 
      subtext 
    };
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

  // ✨ 1. FROSTED GLASS CONTAINER: Latar transparan dengan blur tinggi & soft shadow ala Apple
  return (
    /* 🚀 Ganti open={!!item} jadi open={!!incomingItem}. Ini kunci utama biar animasinya gak kedip! */
    <Sheet open={!!incomingItem} onOpenChange={(open) => {
      if (!open) {
        setIsDirty(false);
        setEditedProducts([]);
        onClose();
      }
    }}>
      
      <SheetContent
        side="top"
        /* 🚀 MODE PERFORMA: */
        className="w-full sm:max-w-[540px] mx-auto rounded-b-[2.5rem] !border-x-0 !border-t-0 !border-b border-border/40 bg-white dark:bg-zinc-950 p-0 shadow-lg !duration-200 [&>button]:hidden will-change-transform [transform:translateZ(0)]"
        onOpenAutoFocus={(e) => e.preventDefault()} 
      >

        {/* ✨ FIX TINGGI: max-h-[88vh] memastikan mentok di 88% layar, sisa 12% di bawah murni buat klik area kosong (nutup) */}
        <div className="flex flex-col max-h-[88vh]">

          {/* ✨ 4. BODY WRAPPER: Padding horizontal diperlebar ke px-6 biar konten di dalam tidak sumpek */}
          <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar text-left">

          {/* ✨ 1. NOTION-STYLE PAGE TITLE (Besar, bersih, nyatu dengan background) */}
            <div className="mb-6 mt-2 group relative">
              
              {/* ✨ "Hari ini" / "Kemarin" dipindah ke atas sebagai Eyebrow Meta */}
              {item.dateLabel !== "Riwayat Lama" && (
                <div className="mb-2">
                  <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold tracking-widest uppercase shadow-sm", item.dateLabel === "Hari ini" ? "border-primary/40 text-primary bg-primary/5" : "text-muted-foreground border-border/50 bg-muted/20")}>
                    {item.dateLabel}
                  </Badge>
                </div>
              )}

              {activeField === "title" ? (

                <input
                  autoFocus
                  type="text"
                  value={localValue}
                  onChange={(e) => setLocalValue(e.target.value)}
                  onBlur={() => handleInlineSave("title")}
                  onKeyDown={(e) => e.key === "Enter" && handleInlineSave("title")}
                  className="w-full bg-transparent text-3xl sm:text-4xl font-black tracking-tight text-foreground border-b-2 border-primary/50 outline-none pb-1 placeholder:text-muted-foreground/30"
                  placeholder="Ketik judul aktivitas..."
                />
              ) : (
                <div 
                  onClick={() => { setActiveField("title"); setLocalValue(item.title); }}
                  className="flex items-center gap-3 cursor-pointer group-hover:bg-muted/40 rounded-xl p-1 -ml-1 transition-colors w-fit border-b border-dashed border-transparent hover:border-primary/30"
                >
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
                    {item.title}
                  </h1>
                  <span className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 transition-opacity">
                    <Edit3 className="h-5 w-5" />
                  </span>
                </div>
              )}
            </div>

         {/* ✨ 2. NOTION-STYLE PROPERTIES (Metadata vertikal yang rapi) */}
            <div className="flex flex-col gap-2.5 mb-10 border-b border-border/40 pb-6">
              
           {/* Property: Waktu & HST */}
              <div className="flex items-center min-h-[34px] group">
                {/* 🚀 Selaraskan: gap-2.5, opacity-50, text-muted-foreground/80 */}
                <div className="w-[140px] shrink-0 text-[13px] font-medium text-muted-foreground/80 flex items-center gap-2.5">
                  <CalendarDays className="h-4 w-4 opacity-50" /> Waktu
                </div>
                {/* 🚀 Selaraskan: text-foreground/90 */}
                <div className="flex-1 flex flex-wrap items-center gap-2 text-[13px] font-medium text-foreground/90 hover:bg-muted/50 rounded-lg px-2 py-1 -ml-2 transition-all w-fit cursor-default">
                  <span>{formatTanggalLengkap(item.rawDate)}</span>
                  <span className="text-muted-foreground/30 text-[10px]">●</span>
                  <span>{item.time}</span>
                  
                  {/* ✨ BADGE HST : Tetap dipertahankan dengan warna tema */}
                  {calculateHST() && (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 px-1.5 py-0 rounded-sm font-bold shrink-0 ml-1 shadow-sm">
                      {calculateHST()}
                    </Badge>
                  )}
                </div>
              </div>

            {/* Property: Area */}
              <div className="flex items-center min-h-[34px] group">
                <div className="w-[140px] shrink-0 text-[13px] font-medium text-muted-foreground/80 flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 opacity-50" /> Area
                </div>
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  {item.module === "perawatan" ? (
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground/90">
                      <Lock className="h-3 w-3 opacity-40" />
                      {item.metaEkstra?.namaSiklus ? `${item.area} - ${item.metaEkstra.namaSiklus}` : item.area}
                    </span>
                  ) : (
                    <div className="relative inline-flex max-w-full group/select">
                      <select
                        value={item.areaId || ""}
                        onChange={(e) => onStatusChange?.(item.id, { areaId: e.target.value })}
                        // 🚀 Notion Style: Transparan, tanpa background mencolok, text rapi
                        className="appearance-none bg-transparent hover:bg-muted/50 rounded-lg pr-7 pl-2 py-1 -ml-2 text-[13px] font-medium text-foreground/90 outline-none cursor-pointer transition-all z-10 truncate max-w-[250px]"
                      >
                        <option value="" disabled>Pilih Area...</option>
                        {dropdownOptions?.areas?.map((a: any) => {
                          const isCurrentArea = a.id === item.areaId;
                          const displayLabel = (isCurrentArea && item.metaEkstra?.namaSiklus) 
                            ? `${item.area} - ${item.metaEkstra.namaSiklus}` : a.name;
                          return <option key={a.id} value={a.id}>{displayLabel}</option>;
                        })}
                      </select>
                      <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30 pointer-events-none z-10 transition-all group-hover/select:text-foreground/70" />
                    </div>
                  )}
                </div>
              </div>

              {/* Property: Kategori */}
              {item.module !== "inspeksi" && (
                <div className="flex items-center min-h-[34px] group mt-1">
                  <div className="w-[140px] shrink-0 text-[13px] font-medium text-muted-foreground/80 flex items-center gap-2.5">
                    <Briefcase className="h-4 w-4 opacity-50" /> Kategori
                  </div>
                  <div className="flex-1">
                    <div className="relative inline-flex max-w-full group/select">
                      <select
                        value={item.module === "perawatan" ? (item.tagCategoryId || item.metaEkstra?.tagCategoryId || "") : (item.kategoriId || item.metaEkstra?.kategoriId || "")}
                        onChange={(e) => {
                          const field = item.module === "perawatan" ? "tagCategoryId" : "kategoriId";
                          onStatusChange?.(item.id, { [field]: e.target.value });
                        }}
                        className="appearance-none bg-transparent hover:bg-muted/50 rounded-lg pr-7 pl-2 py-1 -ml-2 text-[13px] font-medium text-foreground/90 outline-none cursor-pointer transition-all z-10 truncate max-w-[250px]"
                      >
                        <option value="" disabled>Pilih Kategori...</option>
                        {dropdownOptions?.kategori?.filter((k: any) => k.module === item.module).map((k: any) => (
                          <option key={k.id} value={k.id}>{k.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30 pointer-events-none z-10 transition-all group-hover/select:text-foreground/70" />
                    </div>
                  </div>
                </div>
              )}

            </div>

           {/* SEGMEN SPESIFIKASI LAPANGAN (GRID 2x2 YANG PRESISI) */}
            {item.metaEkstra && Object.keys(item.metaEkstra).length > 0 && (item.module === "inspeksi" || item.module === "operasional" || item.module === "perawatan") && (
              <section className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">
                    Detail Aktivitas
                  </h3>
                </div>

              <div className="grid grid-cols-2 gap-3">
                  
                  {/* 1. KOTAK-KOTAK UNTUK MODUL INSPEKSI */}
                  <InspeksiFields 
                    item={item} 
                    activeField={activeField} 
                    setActiveField={setActiveField} 
                    localValue={localValue} 
                    setLocalValue={setLocalValue} 
                    handleInlineSave={handleInlineSave} 
                  />

                  {/* 2. WIDGET MODUL OPERASIONAL (Spatial UI Style) */}
                  <OperasionalFields 
                    item={item} 
                    onStatusChange={onStatusChange} 
                  />

{/* 3. KOTAK UNTUK MODUL PERAWATAN — Durasi & Total Biaya */}
      {item.module === "perawatan" && (
  <>
    {/* 🔒 Durasi Kerja — read-only, pola locked identik dengan Inspeksi & Operasional */}
    <div className="rounded-3xl border border-border/30 bg-muted/30 p-3.5 shadow-[inset_0_1px_4px_rgba(255,255,255,0.2)] select-none">
      <div className="flex items-center gap-2 text-muted-foreground/70 mb-1">
        <Clock3 className="h-4 w-4 opacity-70" />
        <span className="text-[11px] font-bold uppercase tracking-widest">Durasi Kerja</span>
      </div>
      <p className="text-lg font-black text-muted-foreground">
        {item.metaEkstra.durasiKerja ? `${item.metaEkstra.durasiKerja} Jam` : "0 Jam"}
      </p>
    </div>

   {/* 💰 Total Biaya — card netral, pola sama dengan box editable Inspeksi (bukan emerald lagi) */}
    <div className="rounded-3xl border border-border/40 bg-card p-3.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.04)] select-none">
      <div className="flex items-center gap-2 text-muted-foreground/80 mb-1">
        <Banknote className="h-4 w-4 opacity-70" />
        <span className="text-[11px] font-bold uppercase tracking-widest">
          {costCalculation.label}
        </span>
      </div>
      <p className="text-lg font-black text-foreground truncate">
        {formatRupiah(costCalculation.total)}
      </p>
      {costCalculation.subtext && (
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          {costCalculation.subtext}
        </p>
      )}
    </div>
  </>
      )}
      </div>
      </section>
      )}

           {/* 💡 SEGMEN JADWAL PELAKSANAAN (SPATIAL UI STYLE - FIXED MOBILE OVERFLOW) */}
          <JadwalPelaksanaan 
            item={item} 
            formatDateValue={formatDateValue} 
            formatTimeValue={formatTimeValue} 
            handleDateTimeSave={handleDateTimeSave} 
          />

          {/* 💡 CATATAN TEMUAN (KHUSUS INSPEKSI) */}
          <CatatanTemuan 
            item={item} 
            getDetailKendala={getDetailKendala} 
          />
                          
{/* 💡 SEGMEN BAHAN & DOSIS (KHUSUS PERAWATAN) */}
{item.module === "perawatan" && (
  <section className="mt-6 space-y-3">
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
      <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">
        Bahan & Dosis
      </h3>
    </div>

    <div className="rounded-3xl border border-border/40 bg-card p-4 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.04)] flex flex-col">
      {editedProducts.length === 0 ? (
        <div className="text-sm text-muted-foreground italic text-center py-2">Belum ada produk yang digunakan.</div>
      ) : (
        <div className="flex flex-col divide-y divide-border/30">
          {editedProducts.map((prod, index) => (
            <div key={index} className="flex gap-2 items-center py-3 first:pt-0 last:pb-0">
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
                  className="w-full appearance-none rounded-xl bg-background border border-border/50 px-3 py-2 text-[13px] font-semibold outline-none"
                >
                  <option value="" disabled>Pilih Produk...</option>
                  {produkOptions?.data
                    ?.filter((p: any) => p.isActive !== false || p.id === prod.produkId)
                    .map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.nama} {p.isActive === false ? "(Nonaktif)" : ""}
                      </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50 pointer-events-none" />
              </div>

              {/* Input Gram/Dosis dengan Preview Sisa Stok (Placeholder) */}
              {(() => {
                const selectedMaster = produkOptions?.data?.find((p: any) => p.id === prod.produkId);
                const stokTerkini = selectedMaster?.stokSaatIni ?? null;
                
                // 🚀 FIX BUG 3: Cari histori dosis berdasarkan ID Produk, BUKAN posisi baris (index)!
                const historyProd = item?.metaEkstra?.logProduk?.find((p: any) => p.produkId === prod.produkId);
                
                // Pastikan dikonversi ke Number (jaga-jaga kalau backend ngirim string numeric)
                const dosisTersimpan = historyProd ? parseFloat(String(historyProd.kuantitasPemakaian)) : 0;
                
                const maxAllowed = stokTerkini !== null ? stokTerkini + dosisTersimpan : null;
                const isOverStock = maxAllowed !== null && prod.kuantitasPemakaian > maxAllowed;

                return (
                  <div className={cn(
                    "flex items-center bg-background border rounded-xl px-2.5 w-[120px] transition-colors shrink-0",
                    isOverStock ? "border-destructive bg-destructive/5 text-destructive shadow-sm" : "border-border/50"
                  )}>
                    <input
                      type="number"
                      min="0"
                      value={prod.kuantitasPemakaian || ""}
                      onChange={(e) => {
                        const newProds = [...editedProducts];
                        newProds[index] = { ...newProds[index], kuantitasPemakaian: parseFloat(e.target.value) || 0 };
                        setEditedProducts(newProds);
                        setIsDirty(true);
                      }}
                      className={cn(
                        "w-full bg-transparent text-[13px] font-semibold outline-none py-2 text-right",
                        "placeholder:text-muted-foreground/60 placeholder:font-normal placeholder:text-[11px]",
                        isOverStock && "text-destructive font-black"
                      )}
                      placeholder={stokTerkini !== null ? `Sisa ${stokTerkini}` : "0"}
                    />
                    <span className={cn(
                      "text-[10px] font-bold ml-1.5 shrink-0 select-none",
                      isOverStock ? "text-destructive font-black" : "text-muted-foreground"
                    )}>
                      {prod.satuanDasar || selectedMaster?.satuanDasar || "gram"}
                    </span>
                  </div>
                );
              })()}

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
          ))}
        </div>
      )}

         {/* Tombol Tambah Baris (Minimalist Action Column di Kanan) */}
      <div className="flex justify-end mt-1 pt-2 border-t border-border/30">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 rounded-full transition-all"
          onClick={() => { setEditedProducts([...editedProducts, { produkId: "", kuantitasPemakaian: 0 }]); setIsDirty(true); }}
          title="Tambah Produk"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </Button>
      </div>

    {/* Tombol Simpan (Pintar & Glowing) - Hanya Muncul Jika Ada Perubahan */}
      {isDirty && (
        <div className="mt-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300">
          <Button 
            disabled={isUpdatingProduk}
            className="w-full rounded-full h-11 text-[13px] font-bold shadow-[0_4px_14px_rgba(var(--primary),0.3)] transition-all hover:shadow-[0_6px_20px_rgba(var(--primary),0.4)] hover:-translate-y-0.5 active:scale-95"
            onClick={async () => {
              try {
                await onProdukChange?.(item.id, editedProducts);
                
                // 🚀 FIX BUG 2: Paksa aplikasi menarik ulang data stok & produk dari server!
                await queryClient.invalidateQueries({ queryKey: ["produk-master-list"] });
                await queryClient.invalidateQueries({ queryKey: ["operasional-options-list"] }); 
                
                setIsDirty(false);
              } catch {}
            }}
          >
            {isUpdatingProduk ? (
              <>
                <div className="h-4 w-4 mr-2 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" strokeWidth={2.5} /> 
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  </section>
)}

            {/* SEGMEN CATATAN UMUM (INLINE EDIT) */}
            <section className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
                <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">
                  {item.module === "inspeksi" ? "Catatan Kegiatan" : "Catatan"}
                </h3>
              </div>

              
          {/* Kotak Catatan Utama (Borderless ala Notion) */}
              <div 
                onClick={() => { if(activeField !== "catatan") { setActiveField("catatan"); setLocalValue(getCleanCatatan()); } }}
                // 🚀 Hapus border dan bg tebal. Ganti dengan hover:bg-muted/30 yang sangat halus
                className="group/notes w-full text-[14px] leading-relaxed text-foreground/90 min-h-[120px] cursor-pointer transition-all hover:bg-muted/30 rounded-2xl p-3 -mx-3"
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
          <TimKebun item={item} dropdownOptions={dropdownOptions} />
            
          </div> {/* penutup div flex-1 overflow-y-auto px-6 py-6 ... */}
          
          {/* ✨ BOTTOM ACTION BAR: Status (Kiri), Garis (Tengah), X (Kanan) */}
          <div className="shrink-0 px-6 pb-5 pt-3 flex items-center justify-between relative border-t border-white/10 dark:border-white/5">
            
            {/* KIRI: IKON STATUS MURNI (Tanpa Teks) */}
            {(() => {
              let StatusIcon = Calendar;
              let statusColor = "text-slate-500 bg-slate-500/10 border-slate-500/20";
              
              if (item.status === "Selesai" || item.status === "Sudah ditangani") {
                StatusIcon = Inbox;
                statusColor = "text-emerald-600 bg-emerald-500/15 border-emerald-500/30 dark:text-emerald-400";
              } else if (item.status === "Dalam proses" || item.status === "Sedang ditangani") {
                StatusIcon = Timer;
                statusColor = "text-amber-600 bg-amber-500/15 border-amber-500/30 dark:text-amber-400";
              }

              return (
                <div 
                  className={cn(
                    "relative flex items-center justify-center h-10 w-10 rounded-full border shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md",
                    statusColor,
                    item.isPendingStaging && "opacity-50 cursor-not-allowed"
                  )}
                  title="Ubah Status"
                >
                  <StatusIcon className="h-5 w-5" strokeWidth={2.5} />
                  <select
                    value={item.status}
                    onChange={(e) => onStatusChange?.(item.id, e.target.value)}
                    disabled={item.isPendingStaging}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none z-10"
                  >
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
                </div>
              );
            })()}

            {/* TENGAH: GARIS INDIKATOR DRAG/TUTUP (Ngambang di tengah absolut) */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-3 h-1.5 w-12 rounded-full bg-border/50" />

            {/* KANAN: IKON X (CLOSE) */}
            <button 
              onClick={() => {
                setIsDirty(false);
                setEditedProducts([]);
                onClose();
              }}
              className="flex items-center justify-center h-10 w-10 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40 transition-all duration-200 shadow-sm hover:scale-105 active:scale-95 backdrop-blur-md"
              title="Tutup"
            >
              <X className="h-5 w-5" strokeWidth={2.5} />
            </button>
            
          </div>

        </div>   {/* penutup div flex flex-col max-h-[88vh] ... */}
      </SheetContent>
    </Sheet>
  );
}
