import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Leaf, Plus, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import pecahan komponen kita (Pastikan path-nya sesuai)
import { SummaryHeader } from "@/components/operasional/SummaryHeader";
import type { AgronomyItem, ModuleKey, ViewKey } from "@/types/operasional";

// Nanti lu import 4 file ini di Tahap 2:
// import { FilterControls } from "@/components/operasional/FilterControls";
// import { LiveFeedView } from "@/components/operasional/LiveFeedView";
// import { MasterTableView } from "@/components/operasional/MasterTableView";
// import { ActivityDetailSheet } from "@/components/operasional/ActivityDetailSheet";

export function AgronomyHubPage() {
  // --- STATE LOKAL ---
  const [activeView, setActiveView] = useState<ViewKey>("feed");
  const [activeModule, setActiveModule] = useState<ModuleKey>("all");
  const [activeFilter, setActiveFilter] = useState("Hari ini");
  const [selectedItem, setSelectedItem] = useState<AgronomyItem | null>(null);

  // --- PEMANGGILAN PELAYAN BACKEND ---
  const { data: response, isLoading } = useQuery({
    queryKey: ["operasional-feed"],
    queryFn: () => fetch("/api/operasional/feed").then((res) => res.json()),
  });

  const feedData: AgronomyItem[] = response?.feed || [];
  const meta = response?.meta || { stagingCount: 0 };

  // --- LOGIKA FILTER UTAMA ---
  const filteredItems = useMemo(() => {
    return feedData.filter((item) => {
      const matchModule = activeModule === "all" ? true : item.module === activeModule;
      const matchDate = activeFilter === "Hari ini" ? item.dateLabel === "Hari ini"
                      : activeFilter === "Kemarin" ? item.dateLabel === "Kemarin" : true;
      const matchStatus = activeFilter === "Selesai" ? item.status === "Selesai"
                        : activeFilter === "Dalam proses" ? item.status === "Dalam proses" : true;
      const matchPriority = activeFilter === "High Priority" ? item.priority === "High" : true;

      return matchModule && matchDate && matchStatus && matchPriority;
    });
  }, [feedData, activeModule, activeFilter]);

  // --- EFEK LOADING ---
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
      
      {/* HEADER PAGE */}
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
            Gabungan perawatan, inspeksi, operasional harian, dan aliran cashflow.
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

      {/* COMPONENT 1: WIDGET 4 KARTU */}
      <SummaryHeader feedData={feedData} meta={meta} />

      {/* COMPONENT 2: FILTER PANEL (Nanti di Tahap 2) */}
      {/* <FilterControls ... /> */}

      {/* COMPONENT 3 & 4: RENDER KONTEN (Nanti di Tahap 2) */}
      {/* activeView === "feed" ? <LiveFeedView ... /> : <MasterTableView ... /> */}

      {/* COMPONENT 5: LACI DETAIL (Nanti di Tahap 2) */}
      {/* <ActivityDetailSheet ... /> */}

    </div>
  );
}
