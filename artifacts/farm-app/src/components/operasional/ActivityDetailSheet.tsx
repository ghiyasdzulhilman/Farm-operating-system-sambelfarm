import { useState, useEffect } from "react";
import {
  CalendarDays,
  ChevronDown,
  Bug,
  Activity,
  TrendingUp,
  LeafyGreen,
  Clock3,
  Users,
  Briefcase,
  Thermometer,
  Radar,
  Edit3,
  Save,
  X
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

interface ActivityDetailSheetProps {
  item: AgronomyItem | null;
  onClose: () => void;
  onStatusChange?: (id: string, status: string) => void;
  onSaveEdit?: (id: string, payload: any) => void; // 💡 Prop baru untuk save full data
}

export function ActivityDetailSheet({
  item,
  onClose,
  onStatusChange,
  onSaveEdit,
}: ActivityDetailSheetProps) {
  // State untuk mode edit
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

    // Reset state tiap kali sheet dibuka untuk item baru
  useEffect(() => {
    if (item) {
      setIsEditing(false);
      
      // 💡 SOLUSI 1: Potong teks tempelan dari backend biar gak ikut ke-save
      const rawCatatan = item.metaEkstra.catatan || item.metaEkstra.keterangan || "";
      const cleanCatatan = rawCatatan.split("\n\n⚠️ Detail Kendala:")[0];

      setFormData({
        judul: item.title || "",
        catatan: cleanCatatan, // ⬅️ Masukkan versi bersihnya ke form
        phTanah: item.metaEkstra.phTanah || "",
        tingkatSerangan: item.metaEkstra.tingkatSerangan || "",
        radius: item.metaEkstra.radius || "",
        prioritas: item.metaEkstra.prioritas || "",
        jenisTenagaKerja: item.metaEkstra.jenisTenagaKerja || "",
        tagCategory: item.metaEkstra.tagCategory || "",
      });
    }
  }, [item]);

  if (!item) return null;

  const formatJamMendalam = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const cleanDate = dateStr.replace(/(Z|\+00:00)$/, '');
      return format(new Date(cleanDate), "HH:mm");
    } catch { return "-"; }
  };

  const handleSave = () => {
    const payload: any = {};
    
    // Mapping form data ke nama kolom Supabase yang sebenarnya
    if (item.module === "operasional") {
      payload.namaPekerjaan = formData.judul;
      payload.catatan = formData.catatan;
      payload.prioritas = formData.prioritas;
      payload.jenisTenagaKerja = formData.jenisTenagaKerja;
    } else if (item.module === "inspeksi") {
      payload.kegiatan = formData.judul;
      payload.keterangan = formData.catatan;
      payload.phTanah = formData.phTanah ? Number(formData.phTanah) : null;
      payload.tingkatSerangan = formData.tingkatSerangan ? Number(formData.tingkatSerangan) : null;
      payload.radius = formData.radius ? Number(formData.radius) : null;
    } else if (item.module === "perawatan") {
      payload.kegiatan = formData.judul;
      payload.catatan = formData.catatan;
      payload.tagCategory = formData.tagCategory;
    }

    // Kirim ke parent untuk dieksekusi mutasinya
    onSaveEdit?.(item.id, payload);
    setIsEditing(false);
  };

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full border-l border-border/60 bg-background p-0 sm:max-w-[520px] flex flex-col"
      >
        {/* HEADER */}
        <SheetHeader className="border-b border-border/60 px-5 py-4 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SheetTitle className="text-left text-lg font-black tracking-tight">
                {isEditing ? "Edit Aktivitas" : "Detail Aktivitas"}
              </SheetTitle>
              <p className="text-left text-xs text-muted-foreground">
                {isEditing ? "Mode perbaikan data lapangan" : "Sistem Terhubung ke Supabase DB"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isEditing && (
                <div className="relative inline-block">
                  <select
                    value={item.status}
                    onChange={(e) => onStatusChange?.(item.id, e.target.value)}
                    disabled={item.isPendingStaging}
                    className={cn(
                      "appearance-none rounded-full px-3 py-1.5 pr-8 text-[11px] font-bold uppercase tracking-wider outline-none cursor-pointer border transition-all shadow-sm",
                      item.status === "Selesai" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" :
                      item.status === "Dalam proses" ? "border-amber-500/20 bg-amber-500/10 text-amber-700" :
                      "border-muted-foreground/20 bg-muted/20 text-muted-foreground",
                    )}
                  >
                    <option value="Belum dikerjakan">Belum dikerjakan</option>
                    <option value="Dalam proses">Dalam proses</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-60 pointer-events-none" />
                </div>
              )}
              
              <Button 
                variant={isEditing ? "default" : "outline"} 
                size="sm" 
                className="rounded-full h-8 px-3 font-bold text-xs"
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              >
                {isEditing ? <><Save className="w-3.5 h-3.5 mr-1.5" /> Simpan</> : <><Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit</>}
              </Button>

              {isEditing && (
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* BODY - TERGANTUNG MODE */}
        <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar text-left">
          {isEditing ? (
            // ==========================================
            // TAMPILAN MODE EDIT (FORM)
            // ==========================================
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Judul Aktivitas</label>
                <input 
                  type="text" 
                  value={formData.judul} 
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>

              {item.module === "inspeksi" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">pH Tanah</label>
                    <input type="number" step="0.1" value={formData.phTanah} onChange={(e) => setFormData({ ...formData, phTanah: e.target.value })} className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm font-semibold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">% Serangan</label>
                    <input type="number" value={formData.tingkatSerangan} onChange={(e) => setFormData({ ...formData, tingkatSerangan: e.target.value })} className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm font-semibold" />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Radius (Meter)</label>
                    <input type="number" value={formData.radius} onChange={(e) => setFormData({ ...formData, radius: e.target.value })} className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm font-semibold" />
                  </div>
                </div>
              )}

              {item.module === "operasional" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Jenis Tenaga</label>
                    <input type="text" value={formData.jenisTenagaKerja} onChange={(e) => setFormData({ ...formData, jenisTenagaKerja: e.target.value })} className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm font-semibold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase text-muted-foreground">Prioritas</label>
                    <select value={formData.prioritas} onChange={(e) => setFormData({ ...formData, prioritas: e.target.value })} className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm font-semibold">
                      <option value="Tinggi">Tinggi</option>
                      <option value="Medium">Medium</option>
                      <option value="Rendah">Rendah</option>
                    </select>
                  </div>
                </div>
              )}

              {item.module === "perawatan" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Kategori Treatment</label>
                  <input type="text" value={formData.tagCategory} onChange={(e) => setFormData({ ...formData, tagCategory: e.target.value })} className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm font-semibold" />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-muted-foreground">Catatan / Detail</label>
                <textarea 
                  rows={4}
                  value={formData.catatan} 
                  onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                  className="w-full rounded-xl border border-border/60 bg-card px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
            </div>
          ) : (
            // ==========================================
            // TAMPILAN MODE BACA (READ-ONLY)
            // ==========================================
            <div className="animate-in fade-in duration-200">
              <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-transparent p-5 border border-primary/10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      <span>{item.time}</span>
                      <span>•</span>
                      <span className="text-foreground">{format(new Date(item.rawDate.replace(/(Z|\+00:00)$/, '')), "dd MMM yyyy")}</span>
                    </div>
                    <h2 className="mt-2 text-2xl font-black tracking-tight">{item.title}</h2>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">{item.area} • {item.category}</p>
                  </div>
                  <div className="rounded-3xl bg-background/80 backdrop-blur-sm p-3 shadow-sm border border-border/40">
                    <CalendarDays className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge className="rounded-full bg-primary text-primary-foreground shadow-sm">{item.priority} Priority</Badge>
                  <Badge variant="secondary" className="rounded-full shadow-sm">{item.duration}</Badge>
                  <Badge variant="secondary" className="rounded-full uppercase shadow-sm">{item.module}</Badge>
                </div>
              </div>

              {item.metaEkstra && Object.keys(item.metaEkstra).length > 0 && (
                <section className="mt-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">Spesifikasi Lapangan</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* INSPEKSI */}
                    {item.module === "inspeksi" && (
                      <>
                        <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Thermometer className="h-4 w-4 text-emerald-600" />
                            <span className="text-xs font-bold uppercase">pH Tanah</span>
                          </div>
                          <p className="text-lg font-black text-emerald-600">{item.metaEkstra.phTanah || "-"}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <TrendingUp className="h-4 w-4 text-destructive" />
                            <span className="text-xs font-bold uppercase">Serangan</span>
                          </div>
                          <p className="text-lg font-black text-destructive">{item.metaEkstra.tingkatSerangan ? `${item.metaEkstra.tingkatSerangan}%` : "0%"}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Radar className="h-4 w-4 text-sky-600" />
                            <span className="text-xs font-bold uppercase">Radius</span>
                          </div>
                          <p className="text-lg font-black text-sky-600">{item.metaEkstra.radius ? `${item.metaEkstra.radius} m` : "-"}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                          <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Clock3 className="h-4 w-4 text-amber-600" />
                            <span className="text-xs font-bold uppercase">Jam Kerja</span>
                          </div>
                          <p className="text-sm font-black text-amber-700">{formatJamMendalam(item.metaEkstra.waktuMulai)} - {formatJamMendalam(item.metaEkstra.waktuSelesai)}</p>
                        </div>
                      </>
                    )}

                    {/* OPERASIONAL */}
                    {item.module === "operasional" && (
                      <>
                        <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                          <div className="mb-1 flex items-center gap-2 text-muted-foreground"><Briefcase className="h-4 w-4" /><span className="text-xs font-bold uppercase">Jenis Tenaga</span></div>
                          <p className="text-sm font-black">{item.metaEkstra.jenisTenagaKerja || "Harian"}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                          <div className="mb-1 flex items-center gap-2 text-muted-foreground"><Clock3 className="h-4 w-4" /><span className="text-xs font-bold uppercase">Prioritas</span></div>
                          <p className="text-sm font-black uppercase tracking-wider">{item.metaEkstra.prioritas || "Medium"}</p>
                        </div>
                      </>
                    )}

                    {/* PERAWATAN */}
                    {item.module === "perawatan" && (
                      <div className="col-span-2 rounded-2xl border border-border/60 bg-card p-3 shadow-sm flex items-center gap-3">
                        <Activity className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Kategori Treatment: <strong className="font-black">{item.metaEkstra.tagCategory || "Nutrisi"}</strong></span>
                      </div>
                    )}
                  </div>
                </section>
              )}

              <section className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">Catatan / Detail</h3>
                </div>
                <div className="rounded-3xl border border-border/60 bg-muted/20 p-4 text-sm leading-6 text-foreground whitespace-pre-wrap">
                  {item.notes || "Tidak ada catatan spesifik dari lapangan."}
                </div>
              </section>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
