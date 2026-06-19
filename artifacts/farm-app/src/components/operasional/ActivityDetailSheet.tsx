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

interface ActivityDetailSheetProps {
  item: AgronomyItem | null;
  onClose: () => void;
  onStatusChange?: (id: string, status: string) => void;
}

export function ActivityDetailSheet({
  item,
  onClose,
  onStatusChange,
}: ActivityDetailSheetProps) {
  if (!item) return null;

  // Helper untuk memformat jam mulai & selesai agar rapi di layar HP
  const formatJamMendalam = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "HH:mm");
    } catch {
      return "-";
    }
  };

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full border-l border-border/60 bg-background p-0 sm:max-w-[520px]"
      >
        <div className="flex h-full flex-col">
          {/* HEADER DENGAN INTERAKTIF STATUS */}
          <SheetHeader className="border-b border-border/60 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <SheetTitle className="text-left text-lg font-black tracking-tight">
                  Detail Aktivitas
                </SheetTitle>
                <p className="text-left text-xs text-muted-foreground">
                  Sistem Terhubung ke Supabase DB
                </p>
              </div>

              <div className="relative inline-block">
                <select
                  value={item.status}
                  onChange={(e) => onStatusChange?.(item.id, e.target.value)}
                  disabled={item.isPendingStaging}
                  className={cn(
                    "appearance-none rounded-full px-3 py-1.5 pr-8 text-[11px] font-bold uppercase tracking-wider outline-none cursor-pointer border transition-all shadow-sm",
                    item.status === "Selesai"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
                      : item.status === "Dalam proses"
                        ? "border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
                        : "border-muted-foreground/20 bg-muted/20 text-muted-foreground hover:bg-muted/40",
                    item.isPendingStaging && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <option value="Belum dikerjakan">Belum dikerjakan</option>
                  <option value="Dalam proses">Dalam proses</option>
                  <option value="Selesai">Selesai</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none opacity-60" />
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar text-left">
            {/* KARTU IDENTITAS UTAMA */}
            <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-transparent p-5 border border-primary/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    <span>{item.time}</span>
                    <span>•</span>
                    <span>{item.dateLabel}</span>
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    {item.area} • {item.category}
                  </p>
                </div>
                <div className="rounded-3xl bg-background/80 backdrop-blur-sm p-3 shadow-sm border border-border/40">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="rounded-full bg-primary text-primary-foreground shadow-sm">
                  {item.priority} Priority
                </Badge>
                <Badge variant="secondary" className="rounded-full shadow-sm">
                  {item.duration}
                </Badge>
                <Badge variant="secondary" className="rounded-full uppercase shadow-sm">
                  {item.module}
                </Badge>
              </div>
            </div>

            {/* SEGMEN DATA KAYA (RICH METADATA) FROM SUPABASE */}
            {item.metaEkstra && Object.keys(item.metaEkstra).length > 0 && (
              <section className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Spesifikasi Lapangan
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* 1. KONDISI MODUL INSPEKSI */}
                  {item.module === "inspeksi" && (
                    <>
                      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Thermometer className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs font-bold uppercase">pH Tanah</span>
                        </div>
                        <p className="text-lg font-black text-emerald-600">
                          {item.metaEkstra.phTanah || "-"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <TrendingUp className="h-4 w-4 text-destructive" />
                          <span className="text-xs font-bold uppercase">Serangan</span>
                        </div>
                        <p className="text-lg font-black text-destructive">
                          {item.metaEkstra.tingkatSerangan ? `${item.metaEkstra.tingkatSerangan}%` : "0%"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Radar className="h-4 w-4 text-sky-600" />
                          <span className="text-xs font-bold uppercase">Radius</span>
                        </div>
                        <p className="text-lg font-black text-sky-600">
                          {item.metaEkstra.radius ? `${item.metaEkstra.radius} meter` : "-"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Clock3 className="h-4 w-4 text-amber-600" />
                          <span className="text-xs font-bold uppercase">Jam Kerja</span>
                        </div>
                        <p className="text-sm font-black text-amber-700">
                          {formatJamMendalam(item.metaEkstra.waktuMulai)} - {formatJamMendalam(item.metaEkstra.waktuSelesai)}
                        </p>
                      </div>

                      <div className="col-span-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                          <Bug className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase">Daftar Temuan Kendala</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.metaEkstra.hama?.map((h: string) => (
                            <Badge key={h} variant="destructive" className="text-[10px] rounded-sm py-0 bg-red-500/80">{h}</Badge>
                          ))}
                          {item.metaEkstra.penyakit?.map((p: string) => (
                            <Badge key={p} variant="destructive" className="text-[10px] rounded-sm py-0 bg-orange-500/80">{p}</Badge>
                          ))}
                          {!item.metaEkstra.hama?.length && !item.metaEkstra.penyakit?.length && (
                            <span className="text-xs font-medium text-emerald-600">Tanaman Aman Terkendali</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* 2. KONDISI MODUL OPERASIONAL */}
                  {item.module === "operasional" && (
                    <div className="col-span-2 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                        <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                          <Briefcase className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase">Jenis Tenaga</span>
                        </div>
                        <p className="text-sm font-black">
                          {item.metaEkstra.jenisTenagaKerja || "Harian"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                        <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                          <Clock3 className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase">Prioritas Lapangan</span>
                        </div>
                        <p className="text-sm font-black uppercase tracking-wider">
                          {item.metaEkstra.prioritas || "Medium"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm sm:col-span-2">
                        <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                          <Clock3 className="h-4 w-4 text-amber-600" />
                          <span className="text-xs font-bold uppercase">Durasi Operasional</span>
                        </div>
                        <p className="text-sm font-black text-amber-700">
                          {formatJamMendalam(item.metaEkstra.waktuMulai)} - {formatJamMendalam(item.metaEkstra.waktuSelesai)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 3. KONDISI MODUL PERAWATAN */}
                  {item.module === "perawatan" && (
                    <div className="col-span-2 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Activity className="h-4 w-4 text-primary" />
                          <span className="text-xs font-bold uppercase">Kategori</span>
                        </div>
                        <p className="text-sm font-black">{item.metaEkstra.tagCategory || "Nutrisi"}</p>
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Clock3 className="h-4 w-4 text-amber-600" />
                          <span className="text-xs font-bold uppercase">Durasi Treatment</span>
                        </div>
                        <p className="text-sm font-black text-amber-700">
                          {formatJamMendalam(item.metaEkstra.waktuMulai)} - {formatJamMendalam(item.metaEkstra.waktuSelesai)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* SEGMEN CATATAN */}
            <section className="mt-6 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
                  Catatan / Detail
                </h3>
              </div>
              <div className="rounded-3xl border border-border/60 bg-muted/20 p-4 text-sm leading-6 text-foreground whitespace-pre-wrap">
                {item.notes || "Tidak ada catatan spesifik dari lapangan."}
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
