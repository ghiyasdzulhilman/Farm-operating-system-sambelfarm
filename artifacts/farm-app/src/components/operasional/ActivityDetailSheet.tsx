import {
  CalendarDays,
  ChevronDown,
  Bug,
  Activity,
  TrendingUp,
  LeafyGreen,
  ShieldAlert,
  Clock3,
  Users,
  Briefcase,
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
                  Sistem tersinkronisasi dengan Notion
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

          <div className="flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
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
                <Badge
                  variant="secondary"
                  className="rounded-full uppercase shadow-sm"
                >
                  {item.module}
                </Badge>
              </div>
            </div>

            {/* SEGMEN DATA KAYA (RICH METADATA) */}
            {item.metaEkstra && Object.keys(item.metaEkstra).length > 0 && (
              <section className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Spesifikasi Lapangan
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Ekstraksi Modul Inspeksi */}
                  {item.module === "inspeksi" && (
                    <>
                      <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <LeafyGreen className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase">
                            Umur Tanaman
                          </span>
                        </div>
                        <p className="text-lg font-black">
                          {item.metaEkstra.hst || 0}{" "}
                          <span className="text-sm font-medium text-muted-foreground">
                            HST
                          </span>
                        </p>
                      </div>

                      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-3 shadow-sm">
                        <div className="flex items-center gap-2 text-red-600 mb-2">
                          <Bug className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase">
                            Hama / Penyakit
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.metaEkstra.hama?.map((h: string) => (
                            <Badge
                              key={h}
                              variant="destructive"
                              className="text-[10px] rounded-sm py-0 bg-red-500/80"
                            >
                              {h}
                            </Badge>
                          ))}
                          {item.metaEkstra.penyakit?.map((p: string) => (
                            <Badge
                              key={p}
                              variant="destructive"
                              className="text-[10px] rounded-sm py-0 bg-orange-500/80"
                            >
                              {p}
                            </Badge>
                          ))}
                          {!item.metaEkstra.hama?.length &&
                            !item.metaEkstra.penyakit?.length && (
                              <span className="text-xs font-medium text-emerald-600">
                                Aman Terkendali
                              </span>
                            )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Ekstraksi Modul Finance */}
                  {item.module === "finance" &&
                    item.metaEkstra.nominal !== undefined && (
                      <div className="col-span-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600">
                            <TrendingUp className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase text-emerald-700/70">
                              Estimasi Nilai Transaksi
                            </p>
                            <p className="text-xl font-black text-emerald-700">
                              Rp{" "}
                              {item.metaEkstra.nominal.toLocaleString("id-ID")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Ekstraksi Modul Operasional dari payload form input */}
                  {item.module === "operasional" &&
                    item.metaEkstra.formInput && (
                      <div className="col-span-2 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                            <Briefcase className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">
                              Jenis Tenaga
                            </span>
                          </div>
                          <p className="text-sm font-black">
                            {item.metaEkstra.formInput.jenisTenagaKerja ||
                              "Belum diisi"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
                          <div className="mb-1 flex items-center gap-2 text-muted-foreground">
                            <Clock3 className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">
                              Jadwal
                            </span>
                          </div>
                          <p className="text-xs font-bold text-foreground">
                            {item.metaEkstra.formInput.waktuMulai || "-"}
                            {item.metaEkstra.formInput.waktuSelesai
                              ? ` → ${item.metaEkstra.formInput.waktuSelesai}`
                              : ""}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm sm:col-span-2">
                          <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase">
                              Payload Form Operasional
                            </span>
                          </div>
                          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                            <span>
                              Kategori:{" "}
                              <strong className="text-foreground">
                                {item.metaEkstra.formInput.kategori ||
                                  item.category}
                              </strong>
                            </span>
                            <span>
                              Status asli:{" "}
                              <strong className="text-foreground">
                                {item.metaEkstra.formInput.status ||
                                  item.status}
                              </strong>
                            </span>
                            <span>
                              Prioritas:{" "}
                              <strong className="text-foreground">
                                {item.metaEkstra.formInput.prioritas ||
                                  item.priority}
                              </strong>
                            </span>
                            <span>
                              Durasi:{" "}
                              <strong className="text-foreground">
                                {item.metaEkstra.formInput.durasiKerja ?? 0} jam
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Ringkasan properti Notion mentah untuk audit data */}
                  {item.metaEkstra.notion?.properties && (
                    <div className="col-span-2 rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3 shadow-sm">
                      <div className="mb-2 flex items-center gap-2 text-sky-700 dark:text-sky-400">
                        <ShieldAlert className="h-4 w-4" />
                        <span className="text-xs font-bold uppercase">
                          Audit Properti Notion
                        </span>
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">
                        {Object.keys(item.metaEkstra.notion.properties).length}{" "}
                        properti Notion ikut dibawa di{" "}
                        <code>metaEkstra.notion.properties</code> agar Agronomy
                        Hub bisa mengolah data tambahan tanpa menunggu perubahan
                        endpoint baru.
                      </p>
                    </div>
                  )}

                  {/* Ekstraksi Modul Perawatan / Tag Tambahan */}
                  {item.module === "perawatan" && item.metaEkstra.tags && (
                    <div className="col-span-2 rounded-2xl border border-border/60 bg-card p-3 shadow-sm flex items-center gap-3">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        Kategori Treatment:{" "}
                        <strong className="font-black">
                          {item.metaEkstra.tags}
                        </strong>
                      </span>
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
                  <Badge
                    key={worker}
                    variant="outline"
                    className="rounded-full px-3 py-1 shadow-sm"
                  >
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
