import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Filter,
  FlaskConical,
  Leaf,
  MapPinned,
  MoreHorizontal,
  Plus,
  Sprout,
  TimerReset,
  Users2,
  Waves,
  Wrench,
  Eye,
  Edit3,
  Trash2,
  FileText,
  Paperclip,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { OperasionalWorkspace } from "@/components/operasional/OperasionalWorkspace";


type ModuleKey = "all" | "perawatan" | "inspeksi" | "operasional";
type ViewKey = "feed" | "modules" | "table";

type AgronomyItem = {
  id: string;
  module: Exclude<ModuleKey, "all">;
  title: string;
  area: string;
  time: string;
  dateLabel: string;
  status: "Selesai" | "Dalam proses" | "Belum dikerjakan";
  priority: "High" | "Medium" | "Low";
  duration: string;
  category: string;
  workers: string[];
  notes: string;
  attachments: string[];
  history: Array<{ time: string; text: string }>;
  icon: "sprout" | "leaf" | "wrench";
};

const MODULES: Array<{
  key: ModuleKey;
  label: string;
  count: number;
  hint: string;
}> = [
  { key: "all", label: "Semua", count: 12, hint: "Gabungan aktivitas" },
  { key: "perawatan", label: "Perawatan", count: 5, hint: "Treatment & aplikasi" },
  { key: "inspeksi", label: "Inspeksi", count: 3, hint: "Observasi & diagnosis" },
  { key: "operasional", label: "Operasional", count: 4, hint: "Task & log kerja" },
];

const FILTERS = [
  "Hari ini",
  "Kemarin",
  "Selesai",
  "Dalam proses",
  "High Priority",
];

const MOCK_ITEMS: AgronomyItem[] = [
  {
    id: "a1",
    module: "operasional",
    title: "Sanitasi Greenhouse",
    area: "Greenhouse",
    time: "08:10",
    dateLabel: "Hari ini",
    status: "Selesai",
    priority: "High",
    duration: "2.5 jam",
    category: "Sanitasi",
    workers: ["Rudi", "Asep"],
    notes:
      "Membersihkan sisa daun, gulma kecil, dan memastikan jalur kerja tetap aman buat penyemprotan berikutnya.",
    attachments: ["Foto-1.jpg", "Foto-2.jpg"],
    history: [
      { time: "08:10", text: "Kegiatan dibuka dan tim turun ke greenhouse." },
      { time: "09:00", text: "Area utama selesai dibersihkan." },
      { time: "10:35", text: "Pekerjaan ditutup dan area diverifikasi." },
    ],
    icon: "wrench",
  },
  {
    id: "a2",
    module: "perawatan",
    title: "Kocor pupuk blok A",
    area: "Blok A",
    time: "10:30",
    dateLabel: "Hari ini",
    status: "Dalam proses",
    priority: "Medium",
    duration: "1.0 jam",
    category: "Pemupukan",
    workers: ["Budi"],
    notes:
      "Fokus ke tanaman fase vegetatif, dosis dibuat lebih ringan karena cuaca cukup panas.",
    attachments: ["Pupuk-A.pdf"],
    history: [
      { time: "10:30", text: "Pupuk disiapkan di dekat blok." },
      { time: "10:55", text: "Penyiraman tahap awal dimulai." },
    ],
    icon: "sprout",
  },
  {
    id: "a3",
    module: "inspeksi",
    title: "Inspeksi thrips blok B",
    area: "Blok B",
    time: "13:20",
    dateLabel: "Kemarin",
    status: "Selesai",
    priority: "Low",
    duration: "45 menit",
    category: "Diagnosis",
    workers: ["Ujang", "Dedi"],
    notes:
      "Gejala ringan di daun bawah. Monitoring lanjutan dijadwalkan untuk dua hari ke depan.",
    attachments: [],
    history: [
      { time: "13:20", text: "Observasi awal dilakukan di 3 titik sampling." },
      { time: "13:50", text: "Temuan dicatat dan dikonfirmasi ke tim." },
    ],
    icon: "leaf",
  },
  {
    id: "a4",
    module: "operasional",
    title: "Pengangkutan hasil panen",
    area: "Blok C",
    time: "15:05",
    dateLabel: "Hari ini",
    status: "Belum dikerjakan",
    priority: "High",
    duration: "0 jam",
    category: "Logistik",
    workers: ["Iwan", "Tono", "Ari"],
    notes: "Menunggu armada dan form panen selesai diverifikasi.",
    attachments: [],
    history: [{ time: "15:05", text: "Task dibuat dari rekap panen siang." }],
    icon: "wrench",
  },
];

const SUMMARY = {
  today: 12,
  done: 8,
  progress: 3,
  pending: 1,
};

const VIEW_OPTIONS: Array<{ key: ViewKey; label: string }> = [
  { key: "feed", label: "Feed" },
  { key: "modules", label: "Modul" },
  { key: "table", label: "Tabel" },
];

export function AgronomyHubPage() {
  const [activeView, setActiveView] = useState<ViewKey>("feed");
  const [activeModule, setActiveModule] = useState<ModuleKey>("all");
  const [activeFilter, setActiveFilter] = useState("Hari ini");
  const [selectedItem, setSelectedItem] = useState<AgronomyItem | null>(null);

  const filteredItems = useMemo(() => {
    return MOCK_ITEMS.filter((item) => {
      const matchModule = activeModule === "all" ? true : item.module === activeModule;
      const matchDate =
        activeFilter === "Hari ini"
          ? item.dateLabel === "Hari ini"
          : activeFilter === "Kemarin"
            ? item.dateLabel === "Kemarin"
            : true;
      const matchStatus =
        activeFilter === "Selesai"
          ? item.status === "Selesai"
          : activeFilter === "Dalam proses"
            ? item.status === "Dalam proses"
            : true;
      const matchPriority =
        activeFilter === "High Priority"
          ? item.priority === "High"
          : true;

      return matchModule && matchDate && matchStatus && matchPriority;
    });
  }, [activeModule, activeFilter]);

  const groupedFeed = useMemo(() => {
    const buckets = [
      {
        label: "Hari ini",
        items: filteredItems.filter((item) => item.dateLabel === "Hari ini"),
      },
      {
        label: "Kemarin",
        items: filteredItems.filter((item) => item.dateLabel === "Kemarin"),
      },
    ];
    return buckets.filter((bucket) => bucket.items.length > 0);
  }, [filteredItems]);

  const moduleCards = [
    {
      key: "perawatan",
      title: "Perawatan",
      desc: "Treatment, aplikasi, dan intervensi tanaman.",
      icon: Sprout,
      accent: "from-emerald-500/15 to-emerald-500/5",
      count: MOCK_ITEMS.filter((i) => i.module === "perawatan").length,
    },
    {
      key: "inspeksi",
      title: "Inspeksi",
      desc: "Observasi hama, penyakit, dan kondisi lapangan.",
      icon: Leaf,
      accent: "from-lime-500/15 to-lime-500/5",
      count: MOCK_ITEMS.filter((i) => i.module === "inspeksi").length,
    },
    {
      key: "operasional",
      title: "Operasional",
      desc: "Log kerja, maintenance, dan aktivitas umum.",
      icon: Wrench,
      accent: "from-sky-500/15 to-sky-500/5",
      count: MOCK_ITEMS.filter((i) => i.module === "operasional").length,
    },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground shadow-sm">
            <Leaf className="h-3.5 w-3.5 text-primary" />
            Agronomy Hub
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">
            Pusat Aktivitas Agronomy
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Gabungan perawatan, inspeksi, dan operasional harian. Dibuat buat quick
            capture di mobile, tapi tetap punya detail, history, dan kontrol data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button className="h-11 rounded-xl bg-primary px-4 font-bold text-primary-foreground shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Log Aktivitas
          </Button>
          <Button variant="outline" className="h-11 rounded-xl px-4 font-bold">
            <FileText className="mr-2 h-4 w-4" />
            Riwayat
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          title="Aktivitas"
          value={SUMMARY.today}
          detail="hari ini"
          icon={CalendarDays}
          tint="bg-emerald-500/10 text-emerald-600"
        />
        <SummaryCard
          title="Selesai"
          value={SUMMARY.done}
          detail="sudah ditutup"
          icon={CheckCircle2}
          tint="bg-sky-500/10 text-sky-600"
        />
        <SummaryCard
          title="Proses"
          value={SUMMARY.progress}
          detail="sedang jalan"
          icon={Clock3}
          tint="bg-amber-500/10 text-amber-600"
        />
        <SummaryCard
          title="Pending"
          value={SUMMARY.pending}
          detail="menunggu"
          icon={TimerReset}
          tint="bg-fuchsia-500/10 text-fuchsia-600"
        />
      </div>

      <div className="mt-5 rounded-3xl border border-border/60 bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <Filter className="h-4 w-4 text-primary" />
            Tampilan
          </div>
          <div className="rounded-full bg-muted/50 p-1">
            {VIEW_OPTIONS.map((opt) => {
              const active = activeView === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setActiveView(opt.key)}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-bold transition-all",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {MODULES.map((module) => {
            const active = activeModule === module.key;
            return (
              <button
                key={module.key}
                onClick={() => setActiveModule(module.key)}
                className={cn(
                  "min-w-[122px] rounded-2xl border px-4 py-3 text-left transition-all",
                  active
                    ? "border-primary/30 bg-primary/10 shadow-sm"
                    : "border-border/60 bg-muted/20 hover:bg-muted/40",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black tracking-tight">{module.label}</p>
                  <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {module.count}
                  </span>
                </div>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                  {module.hint}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((item) => {
            const active = activeFilter === item;
            return (
              <button
                key={item}
                onClick={() => setActiveFilter(item)}
                className={cn(
                  "whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted",
                )}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6">
          {activeView === "feed" && (
            <div className="space-y-6">
              {groupedFeed.map((group) => (
                <div key={group.label} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">
                      {group.label}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {group.items.length} aktivitas
                    </span>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="group w-full rounded-3xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            {item.icon === "sprout" ? (
                              <Sprout className="h-5 w-5" />
                            ) : item.icon === "leaf" ? (
                              <Leaf className="h-5 w-5" />
                            ) : (
                              <Wrench className="h-5 w-5" />
                            )}
                            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-muted-foreground">
                                {item.time}
                              </span>
                              <Badge
                                variant="secondary"
                                className="rounded-full bg-muted/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                              >
                                {item.category}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                  item.status === "Selesai"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                                    : item.status === "Dalam proses"
                                      ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
                                      : "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
                                )}
                              >
                                {item.status}
                              </Badge>
                            </div>

                            <h3 className="mt-2 text-base font-black tracking-tight">
                              {item.title}
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">{item.area}</p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.workers.map((worker) => (
                                <span
                                  key={worker}
                                  className="rounded-full bg-muted/50 px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                                >
                                  {worker}
                                </span>
                              ))}
                              <span className="rounded-full bg-muted/50 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                                {item.duration}
                              </span>
                              <span className="rounded-full bg-muted/50 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                                {item.priority}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeView === "modules" && (
            <div className="grid gap-4 md:grid-cols-3">
              {moduleCards.map((module) => {
                const Icon = module.icon;
                return (
                  <button
                    key={module.key}
                    onClick={() => setActiveModule(module.key)}
                    className={cn(
                      "rounded-3xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                    )}
                  >
                    <div className={cn("rounded-3xl bg-gradient-to-br p-4", module.accent)}>
                      <div className="flex items-center justify-between">
                        <Icon className="h-6 w-6 text-primary" />
                        <span className="rounded-full bg-background px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          {module.count} log
                        </span>
                      </div>
                      <h3 className="mt-6 text-xl font-black tracking-tight">{module.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{module.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeView === "table" && (
            <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
              <div className="border-b border-border/60 px-4 py-3">
                <p className="text-sm font-black tracking-tight">Tabel Riwayat Agronomy</p>
                <p className="text-xs text-muted-foreground">
                  View cepat untuk audit, edit, dan cek histori.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-muted/30 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Waktu</th>
                      <th className="px-4 py-3">Aktivitas</th>
                      <th className="px-4 py-3">Area</th>
                      <th className="px-4 py-3">Pekerja</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_ITEMS.map((item) => (
                      <tr key={item.id} className="border-t border-border/60">
                        <td className="px-4 py-4 text-sm font-semibold">{item.time}</td>
                        <td className="px-4 py-4">
                          <div className="font-black tracking-tight">{item.title}</div>
                          <div className="text-xs text-muted-foreground">{item.category}</div>
                        </td>
                        <td className="px-4 py-4 text-sm">{item.area}</td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          {item.workers.join(", ")}
                        </td>
                        <td className="px-4 py-4">
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                              item.status === "Selesai"
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                                : item.status === "Dalam proses"
                                  ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
                                  : "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
                            )}
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedItem(item)}
                              className="inline-flex h-9 items-center gap-1 rounded-xl border border-border/60 bg-background px-3 text-xs font-bold"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Detail
                            </button>
                            <button className="inline-flex h-9 items-center gap-1 rounded-xl border border-border/60 bg-background px-3 text-xs font-bold">
                              <Edit3 className="h-3.5 w-3.5" />
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Snapshot
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight">Ringkasan Cepat</h3>
              </div>
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <InfoRow label="Aktivitas hari ini" value="12" />
              <InfoRow label="Pekerja aktif" value="8" />
              <InfoRow label="Tertinggi priority" value="3 task" />
              <InfoRow label="Area paling sibuk" value="Blok A" />
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Shortcut
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight">Aksi Cepat</h3>
              </div>
              <div className="rounded-2xl bg-muted p-3 text-muted-foreground">
                <MoreHorizontal className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <ShortcutButton icon={Sprout} label="Tambah Perawatan" />
              <ShortcutButton icon={Leaf} label="Tambah Inspeksi" />
              <ShortcutButton icon={Wrench} label="Tambah Operasional" />
            </div>
          </div>
        </aside>
      </div>

      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent
          side="right"
          className="w-full border-l border-border/60 bg-background p-0 sm:max-w-[520px]"
        >
          {selectedItem && (
            <div className="flex h-full flex-col">
              <SheetHeader className="border-b border-border/60 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <SheetTitle className="text-left text-lg font-black tracking-tight">
                      Detail Aktivitas
                    </SheetTitle>
                    <p className="text-left text-xs text-muted-foreground">
                      Rincian, history, dan kontrol data.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      selectedItem.status === "Selesai"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                        : selectedItem.status === "Dalam proses"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
                          : "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {selectedItem.status}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="rounded-3xl bg-gradient-to-br from-primary/10 to-transparent p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                        <span>{selectedItem.time}</span>
                        <span>•</span>
                        <span>{selectedItem.dateLabel}</span>
                      </div>
                      <h2 className="mt-2 text-2xl font-black tracking-tight">
                        {selectedItem.title}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedItem.area} • {selectedItem.category}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-background p-3 shadow-sm">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className="rounded-full bg-primary text-primary-foreground">
                      {selectedItem.priority} Priority
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      {selectedItem.duration}
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      {selectedItem.module}
                    </Badge>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <MiniStat label="Pekerja" value={`${selectedItem.workers.length}`} />
                  <MiniStat label="Lampiran" value={`${selectedItem.attachments.length}`} />
                  <MiniStat label="History" value={`${selectedItem.history.length}`} />
                  <MiniStat label="Area" value={selectedItem.area} />
                </div>

                <section className="mt-6 space-y-3">
                  <SectionTitle title="Pekerja Terkait" />
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.workers.map((worker) => (
                      <Badge key={worker} variant="outline" className="rounded-full px-3 py-1">
                        {worker}
                      </Badge>
                    ))}
                  </div>
                </section>

                <section className="mt-6 space-y-3">
                  <SectionTitle title="Catatan" />
                  <div className="rounded-3xl border border-border/60 bg-muted/20 p-4 text-sm leading-6 text-foreground">
                    {selectedItem.notes}
                  </div>
                </section>

                <section className="mt-6 space-y-3">
                  <SectionTitle title="Riwayat Perubahan" />
                  <div className="space-y-3">
                    {selectedItem.history.map((entry, idx) => (
                      <div
                        key={`${entry.time}-${idx}`}
                        className="flex gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
                      >
                        <div className="mt-0.5 h-2.5 w-2.5 rounded-full bg-primary" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                            {entry.time}
                          </p>
                          <p className="mt-1 text-sm text-foreground">{entry.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mt-6 space-y-3">
                  <SectionTitle title="Lampiran" />
                  <div className="grid gap-2">
                    {selectedItem.attachments.length > 0 ? (
                      selectedItem.attachments.map((file) => (
                        <div
                          key={file}
                          className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">{file}</span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
                        Tidak ada lampiran.
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="border-t border-border/60 p-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" className="rounded-2xl">
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button variant="outline" className="rounded-2xl">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Hapus
                  </Button>
                  <Button className="rounded-2xl bg-primary text-primary-foreground">
                    <Eye className="mr-2 h-4 w-4" />
                    Buka
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  detail,
  icon: Icon,
  tint,
}: {
  title: string;
  value: number;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className={cn("rounded-2xl p-3", tint)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted/30 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function ShortcutButton({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3 text-left shadow-sm transition-all hover:bg-muted/20">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-black tracking-tight">{value}</p>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 rounded-full bg-primary" />
      <h3 className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h3>
    </div>
  );
}