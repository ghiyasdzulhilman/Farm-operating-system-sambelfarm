import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Leaf, Plus, FileText, Loader2, TrendingUp,
  MoreHorizontal, Sprout, Wrench, ChevronRight, Layers,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { SummaryHeader } from "@/components/operasional/SummaryHeader";
import { FilterControls } from "@/components/operasional/FilterControls";
import { LiveFeedView } from "@/components/operasional/LiveFeedView";
import { ActivityDetailSheet } from "@/components/operasional/ActivityDetailSheet";
import { MasterTableView } from "@/components/operasional/MasterTableView";
import { KanbanView } from "@/components/operasional/KanbanView";
import { MasterHubPage } from "@/components/operasional/MasterHubPage"; 
import type { AgronomyItem, ModuleKey, ViewKey } from "@/types/operasional";
import { useToast } from "@/hooks/use-toast";

type FeedModeKey = "time" | "area";

export function AgronomyHubPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeView, setActiveView] = useState<ViewKey>("kanban");
  const [feedMode, setFeedMode] = useState<FeedModeKey>("time");
  const [activeModule, setActiveModule] = useState<ModuleKey>("all");
  const [activeFilter, setActiveFilter] = useState("Hari ini");
  const [selectedItem, setSelectedItem] = useState<AgronomyItem | null>(null);
  const [showMasterHub, setShowMasterHub] = useState(false);

  // =====================================================================
  // 1. FETCH DATA (LANGSUNG DARI 3 ENDPOINT SUPABASE + MASTER PEKERJA)
  // =====================================================================
  const { data: unifiedFeedData, isLoading } = useQuery({
    queryKey: ["agronomy-feed-supabase"],
        queryFn: async () => {
      const [resOp, resPer, resIns, resOptions] = await Promise.all([
        fetch("/api/notion/all-operasional").then((res) => res.json()),
        fetch("/api/notion/all-perawatan").then((res) => res.json()),
        fetch("/api/notion/all-inspeksi").then((res) => res.json()),
        fetch("/api/notion/operasional-dropdown-options").then((res) => res.json()),
      ]);

    // 1. MAPPING PEKERJA
      const workerMap: Record<string, string> = {};
      resOptions?.petugas?.forEach((p: any) => {
        workerMap[p.id] = p.name;
      });

     // (Mapping Area kita hapus karena backend langsung ngirim 'areaName' dan 'namaSiklus' 🚀)

      const formatItem = (item: any, module: ModuleKey, icon: string, titleKey: string): AgronomyItem => {
        const rawDate = item.waktuMulai || new Date().toISOString();
        const cleanDate = rawDate.replace(/(Z|\+00:00)$/, '');
        const itemDate = new Date(cleanDate);

        const isToday = itemDate.toDateString() === new Date().toDateString();
        const isYesterday = itemDate.toDateString() === new Date(Date.now() - 86400000).toDateString();

        const rawWorkerIds = Array.isArray(item.pekerjaIds) ? item.pekerjaIds : [];
        const resolvedWorkers = rawWorkerIds
          .map((id: string) => workerMap[id] || null)
          .filter(Boolean);

        const catatanRacikan = module === "perawatan" && Array.isArray(item.logProduk) && item.logProduk.length > 0
          ? `Bahan & Dosis:\n${item.logProduk.map((p: any) => `- ${p.produk} (${p.dosis})`).join("\n")}${item.catatan ? `\n\nCatatan Tambahan:\n${item.catatan}` : ""}`
          : (item.catatan || item.keterangan || "Tidak ada catatan.");

                 return {
          id: item.id,
          module: module,
          icon: icon,
          title: item[titleKey] || "Tanpa Judul",
          time: itemDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          rawDate: item.waktuMulai || new Date().toISOString(),
          status: item.status || "Belum dikerjakan",
          areaId: item.areaId,
          
          // 🚀 GABUNGKAN AREA DAN SIKLUS SECARA OTOMATIS
          area: item.namaSiklus && item.namaSiklus !== "-" 
            ? `${item.areaName} - ${item.namaSiklus}` 
            : (item.areaName || "Area Master"),
          
          // 🚀 SIMPAN DATA SIKLUS KE DALAM ITEM (Untuk referensi data internal jika dibutuhkan)
          siklusId: item.siklusId,
          namaSiklus: item.namaSiklus || "-", 
          
          workers: resolvedWorkers.length ? resolvedWorkers : ["Tim Lapangan"], 
          duration: `${item.durasiKerja || 0} jam`,
          priority: item.prioritas || "Medium",
          
          category: item.kategori || item.tagCategory || (
            module === "inspeksi" ? "Inspeksi" : 
            module === "perawatan" ? "Perawatan" : 
            "Operasional"
          ),
          
          notes: catatanRacikan,
          dateLabel: isToday ? "Hari ini" : isYesterday ? "Kemarin" : "Riwayat Lama",
          timeLabel: "Disinkronkan",
          attachments: [],
          history: [{ time: "Supabase Live", text: "Data ditarik langsung dari server lokal." }],
          metaEkstra: { ...item },
        } as unknown as AgronomyItem;
      };

      const ops = (resOp.data || []).map((i: any) => formatItem(i, "operasional", "wrench", "namaPekerjaan"));
      const per = (resPer.data || []).map((i: any) => formatItem(i, "perawatan", "sprout", "kegiatan"));
      const ins = (resIns.data || []).map((i: any) => formatItem(i, "inspeksi", "leaf", "kegiatan"));

      return [...ops, ...per, ...ins].sort(
        (a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime()
      );
    },

    refetchInterval: 60000,
  });

  const feedData: AgronomyItem[] = unifiedFeedData || [];
  const meta = { stagingCount: 0, lastSynced: new Date().toISOString() };

  // 💡 AUTO-REFRESH DETAIL SHEET (Penting buat efek Notion)
  // Kalau ada data berubah di background, sheet detail yang lagi kebuka langsung kedip update otomatis
  useEffect(() => {
    if (selectedItem && unifiedFeedData) {
      const freshItem = unifiedFeedData.find((i: any) => i.id === selectedItem.id);
      if (freshItem && JSON.stringify(freshItem) !== JSON.stringify(selectedItem)) {
        setSelectedItem(freshItem);
      }
    }
  }, [unifiedFeedData, selectedItem]);

  // =====================================================================
  // 2. MUTATION: UNIVERSAL DYNAMIC UPDATE (Siap nerima data apa aja)
  // =====================================================================
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, module, ...updateData }: { id: string; module: string; [key: string]: any }) => {
      // Tembak langsung ke endpoint universal yang udah lu siapin di operasional.ts
      const response = await fetch(`/api/notion/edit-activity/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, ...updateData }),
      });
      if (!response.ok) throw new Error("Gagal menyimpan perubahan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] });
      // Toast kita hilangkan sebagian biar persis Notion: save di background secara diam-diam tanpa berisik
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err instanceof Error ? err.message : "Kesalahan jaringan." });
    }
  });

  // =====================================================================
  // 3. FILTER LOGIC
  // =====================================================================
  const filteredItems = useMemo(() => {
    return feedData.filter((item) => {
      const matchModule = activeModule === "all" ? true : item.module === activeModule;

      let matchFilter = true;
      if (activeFilter === "Hari ini") matchFilter = item.dateLabel === "Hari ini";
      else if (activeFilter === "Kemarin") matchFilter = item.dateLabel === "Kemarin";
      else if (activeFilter === "Selesai") matchFilter = item.status === "Selesai";
      else if (activeFilter === "Dalam proses") matchFilter = item.status === "Dalam proses";
      else if (activeFilter === "Belum dikerjakan") matchFilter = item.status === "Belum dikerjakan";

      return matchModule && matchFilter;
    });
  }, [feedData, activeModule, activeFilter]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold uppercase tracking-widest">Memuat Database Kebun...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 space-y-6 text-left">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground shadow-sm">
            <Leaf className="h-3.5 w-3.5 text-primary" />
            Agronomy Hub
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Pusat Aktivitas</h1>
        </div>

        <div className="w-full md:w-auto pt-2 md:pt-0">
          <Button 
            className="w-full h-12 rounded-xl bg-primary px-6 font-bold text-primary-foreground shadow-md transition-all active:scale-95 md:w-auto md:hover:scale-[1.02]"
            onClick={() => setShowMasterHub(true)}
          >
            <Database className="mr-2 h-5 w-5" /> Master Control Center
          </Button>
        </div>

      </div>

      <SummaryHeader feedData={feedData} meta={meta} />

      <FilterControls
        feedData={feedData}
        activeView={activeView}
        setActiveView={setActiveView}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6 min-w-0">
          
          {activeView === "feed" && (
            <LiveFeedView 
              items={filteredItems} 
              onItemClick={setSelectedItem} 
  onStatusChange={(id, payload) => {
  const target = filteredItems.find(i => i.id === id);
  if (target) {
    const updateData = typeof payload === "string" 
      ? { status: payload } 
      : payload;
    updateStatusMutation.mutate({ id, module: target.module, ...updateData });
  }
}}
            />
          )}

          {activeView === "table" && (
            <MasterTableView 
              items={filteredItems} 
              onItemClick={setSelectedItem} 
  onStatusChange={(id, payload) => {
  const target = filteredItems.find(i => i.id === id);
  if (target) {
    const updateData = typeof payload === "string" 
      ? { status: payload } 
      : payload;
    updateStatusMutation.mutate({ id, module: target.module, ...updateData });
  }
}}

            />
          )}

          {/* BLOK KANBAN DI SINI */}
          {activeView === "kanban" && (
            <KanbanView 
              items={filteredItems} 
              onItemClick={setSelectedItem} 
  onStatusChange={(id, payload) => {
  const target = filteredItems.find(i => i.id === id);
  if (target) {
    const updateData = typeof payload === "string" 
      ? { status: payload } 
      : payload;
    updateStatusMutation.mutate({ id, module: target.module, ...updateData });
  }
}}

              // onDelete={(id, module) => handleHapus(id, module)} // Bisa diaktifkan nanti kalau fungsi hapus udah siap
            />
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
              <InfoRow label="Aktivitas Tertunda" value={`${feedData.filter((i) => i.status === "Belum dikerjakan").length}`} />
              <InfoRow label="Data Terakhir Load" value={new Date(meta.lastSynced).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} />
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

       <ActivityDetailSheet 
        item={selectedItem} 
        onClose={() => setSelectedItem(null)} 
        onStatusChange={(id, payload) => {
          if (selectedItem) {
            const updateData = typeof payload === "string" ? { status: payload } : payload;
            updateStatusMutation.mutate({ id, module: selectedItem.module, ...updateData });
          }
        }} 
      />

      {/* 💡 OVERLAY MASTER HUB (MUNCUL KALAU TOMBOL RIWAYAT DIKLIK) */}
      {showMasterHub && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm">
          <MasterHubPage onClose={() => setShowMasterHub(false)} />
        </div>
      )}

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
