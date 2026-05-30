import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Leaf, Plus, FileText, Loader2, TrendingUp, MoreHorizontal, Sprout, Wrench, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

import { SummaryHeader } from "@/components/operasional/SummaryHeader";
import { FilterControls } from "@/components/operasional/FilterControls";
import { LiveFeedView } from "@/components/operasional/LiveFeedView";
import { ActivityDetailSheet } from "@/components/operasional/ActivityDetailSheet";
import type { AgronomyItem, ModuleKey, ViewKey } from "@/types/operasional";

export function AgronomyHubPage() {
  const [activeView, setActiveView] = useState<ViewKey>("feed");
  const [activeModule, setActiveModule] = useState<ModuleKey>("all");
  const [activeFilter, setActiveFilter] = useState("Hari ini");
  const [selectedItem, setSelectedItem] = useState<AgronomyItem | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ["operasional-feed"],
    queryFn: () => fetch("/api/operasional/feed").then((res) => res.json()),
  });

  const feedData: AgronomyItem[] = response?.feed || [];
  const meta = response?.meta || { stagingCount: 0 };

    const filteredItems = useMemo(() => {
    return feedData.filter((item) => {
      // 1. Filter Modul (Tab Atas)
      const matchModule = activeModule === "all" ? true : item.module === activeModule;
      
      // 2. Filter Waktu & Status (Pil Bawah)
      let matchFilter = true;
      if (activeFilter === "Hari ini") {
        matchFilter = item.dateLabel === "Hari ini";
      } else if (activeFilter === "Kemarin") {
        matchFilter = item.dateLabel === "Kemarin";
      } else if (activeFilter === "Selesai") {
        matchFilter = item.status === "Selesai";
      } else if (activeFilter === "Dalam proses") {
        matchFilter = item.status === "Dalam proses";
      } else if (activeFilter === "Belum dikerjakan") { // 👈 High priority diganti ini
        matchFilter = item.status === "Belum dikerjakan";
      }

      return matchModule && matchFilter;
    });
  }, [feedData, activeModule, activeFilter]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold uppercase tracking-widest">Menyinkronkan data kebun...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 space-y-6">
      
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground shadow-sm">
            <Leaf className="h-3.5 w-3.5 text-primary" />
            Agronomy Hub
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">
            Pusat Aktivitas Agronomy
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Gabungan perawatan, inspeksi, operasional harian, dan cashflow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button className="h-11 rounded-xl bg-primary px-4 font-bold text-primary-foreground shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Log Aktivitas
          </Button>
          <Button variant="outline" className="h-11 rounded-xl px-4 font-bold">
            <FileText className="mr-2 h-4 w-4" /> Riwayat
          </Button>
        </div>
      </div>

      <SummaryHeader feedData={feedData} meta={meta} />

      <FilterControls 
        feedData={feedData}
        activeView={activeView} setActiveView={setActiveView}
        activeModule={activeModule} setActiveModule={setActiveModule}
        activeFilter={activeFilter} setActiveFilter={setActiveFilter}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6">
          {activeView === "feed" && (
            <LiveFeedView items={filteredItems} onItemClick={setSelectedItem} />
          )}
          {activeView === "table" && (
            <div className="text-center py-10 font-bold text-muted-foreground border rounded-3xl">Fitur Tabel Segera Hadir</div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Snapshot</p>
                <h3 className="mt-1 text-lg font-black tracking-tight">Ringkasan Cepat</h3>
              </div>
              <div className="rounded-2xl bg-primary/10 p-3 text-primary"><TrendingUp className="h-5 w-5" /></div>
            </div>
            <div className="mt-4 space-y-3">
              <InfoRow label="Total Aktivitas" value={`${feedData.length}`} />
              <InfoRow label="Aktivitas Tertunda" value={`${feedData.filter(i => i.status === "Belum dikerjakan").length}`} />
              <InfoRow label="Data Terakhir Sync" value={new Date(meta.lastSynced).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} />
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Shortcut</p>
                <h3 className="mt-1 text-lg font-black tracking-tight">Aksi Cepat</h3>
              </div>
              <div className="rounded-2xl bg-muted p-3 text-muted-foreground"><MoreHorizontal className="h-5 w-5" /></div>
            </div>
            <div className="mt-4 grid gap-2">
              <ShortcutButton icon={Sprout} label="Tambah Perawatan" />
              <ShortcutButton icon={Leaf} label="Tambah Inspeksi" />
              <ShortcutButton icon={Wrench} label="Tambah Operasional" />
            </div>
          </div>
        </aside>
      </div>

      <ActivityDetailSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  );
}

// Mini komponen buat Sidebar Kanan
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted/30 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function ShortcutButton({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <button className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3 text-left shadow-sm transition-all hover:bg-muted/20 w-full">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4" /></div>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
