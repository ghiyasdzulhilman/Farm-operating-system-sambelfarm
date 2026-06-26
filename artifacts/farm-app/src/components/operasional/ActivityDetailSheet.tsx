import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ArrowRight,
  Bug,
  Activity,
  TrendingUp,
  LeafyGreen,
  Clock3,
  Users,
  Briefcase,
  Thermometer,
  Radar,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface ActivityDetailSheetProps {
  item: AgronomyItem | null;
  onClose: () => void;
  // 💡 Tipe diubah agar bisa menerima string (untuk status) atau object (untuk data lain)
  onStatusChange?: (id: string, payload: any) => void; 
}

export function ActivityDetailSheet({
  item,
  onClose,
  onStatusChange,
}: ActivityDetailSheetProps) {
  // 💡 State untuk mendeteksi elemen mana yang lagi di-tap (inline edit)
  const [activeField, setActiveField] = useState<string | null>(null);
  const [localValue, setLocalValue] = useState<string>("");

    // 💡 Fetch Opsi Kategori langsung dari backend
  const { data: dropdownOptions } = useQuery({
    queryKey: ["operasional-options-list"],
    queryFn: async () => fetch("/api/notion/operasional-dropdown-options").then(res => res.json()),
    enabled: !!item // Hanya nge-fetch kalau sheet-nya lagi kebuka
  });

  // 💡 KODE BARU 1: Ambil data siklus aktif untuk digabungin ke nama Area
  const { data: listSiklus } = useQuery({
    queryKey: ["siklus-tanam-list"],
    queryFn: async () => fetch("/api/notion/siklus-tanam").then(res => res.json()),
    enabled: !!item 
  });

  // 💡 KODE BARU 2: Helper cerdas buat "ngawinin" Area + Tanaman
  const getAreaDisplayName = (areaId: string, originalName: string) => {
    if (!listSiklus?.data) return originalName; // Kalau data belum load, balikin nama asli
    
    // Cari siklus yang areaId-nya cocok dan statusnya Aktif
    const activeSiklus = listSiklus.data.find((s: any) => s.areaId === areaId && s.status === "Aktif");
    
    // Kalau ketemu, gabungin! Kalau nggak, tampilkan nama area aslinya.
    return activeSiklus ? `${originalName} - ${activeSiklus.namaSiklus}` : originalName;
  };

  // 💡 Helper format Tanggal & Waktu dari DB
  const formatDateValue = (iso?: string) => {
    if (!iso) return "";
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(iso)); } catch { return ""; }
  };
  
  const formatTimeValue = (iso?: string) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }); } catch { return ""; }
  };

  // 💡 Helper update Waktu & Tanggal
  const handleDateTimeSave = (field: 'waktuMulai' | 'waktuSelesai', type: 'date' | 'time', value: string) => {
    if (!value) return;
    const currentIso = item.metaEkstra?.[field] || new Date().toISOString();
    const tempDate = new Date(currentIso);
    
    const wibDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(tempDate);
    const wibTimeStr = tempDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });

    const finalDateStr = type === 'date' ? value : wibDateStr;
    const finalTimeStr = type === 'time' ? `${value}:00` : wibTimeStr;

    const isoStringWithWIB = `${finalDateStr}T${finalTimeStr}+07:00`;
    onStatusChange?.(item.id, { [field]: new Date(isoStringWithWIB).toISOString() });
  };

  if (!item) return null;

  const formatJamMendalam = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const cleanDate = dateStr.replace(/(Z|\+00:00)$/, '');
      return format(new Date(cleanDate), "HH:mm");
    } catch {
      return "-";
    }
  };

  const formatTanggalLengkap = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const cleanDate = dateStr.replace(/(Z|\+00:00)$/, '');
      return format(new Date(cleanDate), "dd MMM yyyy");
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

  // 💡 Ekstrak khusus Bahan & Dosis (Read-Only) untuk Perawatan
  const getDetailPerawatan = () => {
    const raw = item.notes || "";
    if (item.module === "perawatan" && raw.includes("\n\nCatatan Tambahan:\n")) {
      return raw.split("\n\nCatatan Tambahan:\n")[0]; // Ambil bagian atasnya saja
    }
    return "";
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

    // 💡 HELPER PINTAR KALKULASI HST 🚀
  const calculateHST = () => {
    // Cari tanggal tanam, baik itu di dalam metaEkstra maupun di luar object
    const tglTanamStr = item.metaEkstra?.tanggalPindahTanam || (item as any).tanggalPindahTanam;
    
    // Kalau benar-benar tidak ada data tanggal tanam, jangan tampilkan apa-apa
    if (!tglTanamStr) return null;

    try {
      const tglTanam = new Date(tglTanamStr);
      // Gunakan tanggal aktivitas asli. Jika tidak ada, gunakan waktu sekarang.
      const tglAktivitas = new Date(item.rawDate || new Date());
      
      // Validasi kalau tanggalnya nggak valid (misal "Invalid Date" di JS)
      if (isNaN(tglTanam.getTime()) || isNaN(tglAktivitas.getTime())) return null;

      // Hitung selisih waktu dalam milidetik, lalu ubah ke hari
      const diffTime = tglAktivitas.getTime() - tglTanam.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Jika hasil minus (belum waktunya ditanam), beri label pra-tanam
      if (diffDays < 0) return "Pra-tanam";
      
      return `${diffDays} HST`;
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
                    // 💡 BUGFIX: Tambahkan 'relative z-10' di sini agar elemen terangkat dari tumpukan layer transparan
                    "relative z-10 appearance-none rounded-full pl-4 pr-10 py-2.5 text-[11px] font-bold uppercase tracking-wider outline-none cursor-pointer border transition-all shadow-sm",
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
                className="flex items-center gap-2 py-1.5 pl-4 pr-1.5 rounded-full bg-secondary/50 hover:bg-secondary border border-border/50 transition-all group"
              >
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                  Kembali
                </span>
                <div className="bg-background rounded-full p-1.5 shadow-sm group-hover:scale-105 transition-transform border border-border/50 text-foreground">
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

                   {/* 💡 HST PINDAH KE SINI, HANYA MUNCUL JIKA ADA DATANYA */}
                    {calculateHST() && (
                      <>
                        <span className="text-border/40 font-light">|</span>
                        <span className="text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold tracking-normal">
                          🌱 {calculateHST()}
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
                
              {/* 1. Badge Area (Editable) */}
                <div className="relative inline-flex shadow-sm max-w-full">
                  <select
                    value={item.areaId || ""}
                    onChange={(e) => onStatusChange?.(item.id, { areaId: e.target.value })}
                    className="appearance-none max-w-[130px] sm:max-w-[160px] truncate bg-primary text-primary-foreground border border-primary hover:bg-primary/90 rounded-full pl-3 pr-7 py-1 text-[11px] font-bold uppercase tracking-wider outline-none cursor-pointer transition-colors z-10"
                  >
                    <option value="" disabled>PILIH AREA</option>
                    {/* 💡 Gunakan Helper di sini untuk ngubah nama yang tampil */}
                    {dropdownOptions?.areas?.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {getAreaDisplayName(a.id, a.name)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-primary-foreground pointer-events-none z-10" />
                </div>

              {/* 2. Badge Kategori (Sembunyikan khusus untuk Inspeksi karena tidak ada di schema DB) */}
                {item.module !== "inspeksi" && (
                  <div className="relative inline-flex shadow-sm max-w-full">
                    <select
                      value={item.module === "perawatan" ? (item.tagCategoryId || item.metaEkstra?.tagCategoryId || "") : (item.kategoriId || item.metaEkstra?.kategoriId || "")}
                      onChange={(e) => {

                      const field = item.module === "perawatan" ? "tagCategoryId" : "kategoriId";
                      onStatusChange?.(item.id, { [field]: e.target.value });
                    }}
                    // 👇 SEKARANG SAMA-SAMA PAKAI BG-PRIMARY 🚀 👇
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
            {item.metaEkstra && Object.keys(item.metaEkstra).length > 0 && (item.module === "inspeksi" || item.module === "operasional") && (
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

                      {/* 💡 KOTAK KE-4: Durasi Kerja (Inline Edit Angka Jam) */}
                      <div 
                        onClick={() => { if(activeField !== "durasiKerja") { setActiveField("durasiKerja"); setLocalValue(String(item.metaEkstra.durasiKerja || "0")); } }}
                        className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Clock3 className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase">Durasi Kerja</span>
                        </div>
                        {activeField === "durasiKerja" ? (
                          <input autoFocus type="number" value={localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={() => handleInlineSave("durasiKerja")} onKeyDown={(e) => e.key === "Enter" && handleInlineSave("durasiKerja")} className="w-full bg-transparent text-lg font-black text-foreground outline-none border-b border-primary/30 p-0" />
                        ) : (
                          <p className="text-lg font-black text-foreground">{item.metaEkstra.durasiKerja ? `${item.metaEkstra.durasiKerja} Jam` : "0 Jam"}</p>
                        )}
                      </div>
                    </>
                  )}

                  {/* 2. KOTAK-KOTAK UNTUK MODUL OPERASIONAL */}
                  {item.module === "operasional" && (
                    <>
                      <div 
                        onClick={() => { if(activeField !== "jenisTenagaKerja") { setActiveField("jenisTenagaKerja"); setLocalValue(item.metaEkstra.jenisTenagaKerja || ""); } }}
                        className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <div className="mb-1 flex items-center gap-2 text-muted-foreground"><Briefcase className="h-4 w-4" /><span className="text-xs font-bold uppercase">Jenis Tenaga</span></div>
                        {activeField === "jenisTenagaKerja" ? (
                          <input autoFocus type="text" value={localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={() => handleInlineSave("jenisTenagaKerja")} onKeyDown={(e) => e.key === "Enter" && handleInlineSave("jenisTenagaKerja")} className="w-full bg-transparent text-sm font-black outline-none border-b border-primary/30 p-0" />
                        ) : (
                          <p className="text-sm font-black">{item.metaEkstra.jenisTenagaKerja || "Harian"}</p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                        <div className="mb-1 flex items-center gap-2 text-muted-foreground"><Clock3 className="h-4 w-4" /><span className="text-xs font-bold uppercase">Prioritas</span></div>
                        <select 
                          value={item.metaEkstra.prioritas || "Medium"}
                          onChange={(e) => onStatusChange?.(item.id, { prioritas: e.target.value })}
                          className="w-full bg-transparent text-sm font-black uppercase tracking-wider outline-none cursor-pointer appearance-none"
                        >
                          <option value="Tinggi">TINGGI</option>
                          <option value="Medium">MEDIUM</option>
                          <option value="Rendah">RENDAH</option>
                        </select>
                      </div>

                      <div 
                        onClick={() => { if(activeField !== "durasiKerja") { setActiveField("durasiKerja"); setLocalValue(String(item.metaEkstra.durasiKerja || "0")); } }}
                        className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm cursor-pointer hover:bg-muted/40 transition-colors col-span-2"
                      >
                        <div className="mb-1 flex items-center gap-2 text-muted-foreground"><Clock3 className="h-4 w-4" /><span className="text-xs font-bold uppercase">Durasi Kerja</span></div>
                        {activeField === "durasiKerja" ? (
                          <input autoFocus type="number" value={localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={() => handleInlineSave("durasiKerja")} onKeyDown={(e) => e.key === "Enter" && handleInlineSave("durasiKerja")} className="w-full bg-transparent text-sm font-black outline-none border-b border-primary/30 p-0" />
                        ) : (
                          <p className="text-sm font-black">{item.metaEkstra.durasiKerja ? `${item.metaEkstra.durasiKerja} Jam` : "0 Jam"}</p>
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
                  
                  {/* Bagian Detail Text (Thrips: xxx, dsb) */}
                  <div className="text-sm text-destructive whitespace-pre-wrap leading-relaxed font-medium">
                    {getDetailKendala() || "Tidak ada rincian spesifik."}
                  </div>
                </div>
              </section>
            )}

            {/* SEGMEN CATATAN UMUM (INLINE EDIT) */}
            <section className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Catatan / Detail
                </h3>
              </div>

              {/* Kotak Read-Only Khusus Rincian Bahan & Dosis (PERAWATAN) */}
              {getDetailPerawatan() && (
                <div className="mb-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary shadow-sm">
                  <div className="whitespace-pre-wrap font-medium leading-relaxed">{getDetailPerawatan()}</div>
                </div>
              )}
              
              {/* Kotak Catatan Utama (Bisa Di-edit untuk semua modul) */}
              <div 
                onClick={() => { if(activeField !== "catatan") { setActiveField("catatan"); setLocalValue(getCleanCatatan()); } }}
                className="rounded-3xl border border-border/60 bg-muted/20 p-4 text-sm leading-6 text-foreground min-h-[80px] cursor-pointer hover:bg-muted/40 transition-colors"
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
