import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Leaf, Plus, FileText, Loader2, TrendingUp,
  MoreHorizontal, Sprout, Wrench, ChevronRight, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { SummaryHeader } from "@/components/operasional/SummaryHeader";
import { FilterControls } from "@/components/operasional/FilterControls";
import { LiveFeedView } from "@/components/operasional/LiveFeedView";
import { ActivityDetailSheet } from "@/components/operasional/ActivityDetailSheet";
import { MasterTableView } from "@/components/operasional/MasterTableView";
import type { AgronomyItem, ModuleKey, ViewKey } from "@/types/operasional";
import { useToast } from "@/hooks/use-toast";

type FeedModeKey = "time" | "area";

export function AgronomyHubPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeView, setActiveView] = useState<ViewKey>("feed");
  const [feedMode, setFeedMode] = useState<FeedModeKey>("time");
  const [activeModule, setActiveModule] = useState<ModuleKey>("all");
  const [activeFilter, setActiveFilter] = useState("Hari ini");
  const [selectedItem, setSelectedItem] = useState<AgronomyItem | null>(null);

  // =====================================================================
  // 1. FETCH DATA (LANGSUNG DARI 3 ENDPOINT SUPABASE + MASTER PEKERJA)
  // =====================================================================
  const { data: unifiedFeedData, isLoading } = useQuery({
    queryKey: ["agronomy-feed-supabase"],
    queryFn: async () => {
      // Tarik 3 data transaksi + 1 data master pekerja sekaligus
      const [resOp, resPer, resIns, resOptions] = await Promise.all([
        fetch("/api/notion/all-operasional").then((res) => res.json()),
        fetch("/api/notion/all-perawatan").then((res) => res.json()),
        fetch("/api/notion/all-inspeksi").then((res) => res.json()),
        fetch("/api/notion/operasional-dropdown-options").then((res) => res.json()), // 💡 Ambil master pekerja
      ]);

      // Bikin kamus penerjemah ID Pekerja -> Nama Pekerja
      const workerMap: Record<string, string> = {};
      resOptions?.petugas?.forEach((p: any) => {
        workerMap[p.id] = p.name;
      });

      // --- BATAS ATAS FORMAT ITEM ---
const formatItem = (item: any, module: ModuleKey, icon: string, titleKey: string): AgronomyItem => {
  // 💡 1. Bersihkan tanda zona waktu UTC sebelum dikonversi ke objek Date
  const rawDate = item.waktuMulai || new Date().toISOString();
  const cleanDate = rawDate.replace(/(Z|\+00:00)$/, '');
  const itemDate = new Date(cleanDate);

  // 💡 2. Pengecekan hari tetap sama seperti biasa
  const isToday = itemDate.toDateString() === new Date().toDateString();
  const isYesterday = itemDate.toDateString() === new Date(Date.now() - 86400000).toDateString();

  const rawWorkerIds = Array.isArray(item.pekerjaIds) ? item.pekerjaIds : [];
  const resolvedWorkers = rawWorkerIds
    .map((id: string) => workerMap[id] || null)
    .filter(Boolean);

  // 💡 TARUH KODE DI SINI (Di luar skema return objek, di bawah baris resolvedWorkers)
  const catatanRacikan = module === "perawatan" && Array.isArray(item.logProduk) && item.logProduk.length > 0
    ? `Bahan & Dosis:\n${item.logProduk.map((p: any) => `- ${p.produk} (${p.dosis})`).join("\n")}${item.catatan ? `\n\nCatatan Tambahan:\n${item.catatan}` : ""}`
    : (item.catatan || item.keterangan || "Tidak ada catatan.");

  // Sekarang baru aman untuk mengembalikan objeknya
  return {
    id: item.id,
    module: module,
    icon: icon,
    title: item[titleKey] || "Tanpa Judul",
    time: itemDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    rawDate: item.waktuMulai || new Date().toISOString(),
    status: item.status || "Belum dikerjakan",
    areaId: item.areaId,
    area: item.areaName || "Area Master",
    workers: resolvedWorkers.length ? resolvedWorkers : ["Tim Lapangan"], 
    duration: `${item.durasiKerja || 0} jam`,
    priority: item.prioritas || "Medium",
    category: item.kategori || item.tagCategory || (module === "inspeksi" ? "Diagnosis" : "Umum"),
    
    notes: catatanRacikan, // 💡 Panggil nama variabelnya langsung di sini tanpa 'const'
    
    dateLabel: isToday ? "Hari ini" : isYesterday ? "Kemarin" : "Riwayat Lama",
    timeLabel: "Disinkronkan",
    attachments: [],
    history: [{ time: "Supabase Live", text: "Data ditarik langsung dari server lokal." }],
    metaEkstra: { ...item },
  } as unknown as AgronomyItem;
};
// --- BATAS BAWAH FORMAT ITEM ---

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
  // Meta staging dinonaktifkan karena kita udah ngga pakai sistem antrean offline
  const meta = { stagingCount: 0, lastSynced: new Date().toISOString() };

  // =====================================================================
  // 2. MUTATION: INLINE QUICK ACTIONS (Edit Status & Data Dinamis)
  // =====================================================================
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, module, ...updateData }: { id: string; module: string; [key: string]: any }) => {
      // 💡 Kita tembak ke endpoint dinamis universal yang ada di operasional.ts
      const response = await fetch(`/api/notion/edit-activity/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // 💡 Kirimkan modul dan data yang mau diubah (dalam kasus ini: { status: "Selesai" })
        body: JSON.stringify({ module, ...updateData }), 
      });
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Gagal mengubah data di database");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      // 💡 Refresh cache otomatis biar tabel/feed di layar langsung nge-update
      queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] });
      toast({ 
        title: "Perubahan Tersimpan", 
        description: `Status aktivitas telah diubah menjadi ${variables.status}.` 
      });
    },
    onError: (err) => {
      toast({ 
        variant: "destructive", 
        title: "Gagal Menyimpan", 
        description: err instanceof Error ? err.message : "Terjadi kesalahan jaringan." 
      });
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
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground shadow-sm">
            <Leaf className="h-3.5 w-3.5 text-primary" />
            Agronomy Hub
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Pusat Aktivitas</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Gabungan perawatan, inspeksi, dan operasional harian.
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
        activeView={activeView}
        setActiveView={setActiveView}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">

        <div className="space-y-6">
          {activeView === "feed" && (
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mode Tampilan:</span>
              <div className="flex gap-1">
                <Button variant={feedMode === "time" ? "secondary" : "ghost"} size="sm" className="h-8 rounded-xl text-xs font-bold" onClick={() => setFeedMode("time")}><TrendingUp className="mr-2 h-3.5 w-3.5" /> Kronologis</Button>
                <Button variant={feedMode === "area" ? "secondary" : "ghost"} size="sm" className="h-8 rounded-xl text-xs font-bold" onClick={() => setFeedMode("area")}><Layers className="mr-2 h-3.5 w-3.5" /> Pivot Area</Button>
              </div>
            </div>
          )}

          {activeView === "feed" && (
            <LiveFeedView 
              items={filteredItems} 
              onItemClick={setSelectedItem} 
              onStatusChange={(id, status) => {
                const targetItem = filteredItems.find(i => i.id === id);
                if (targetItem) updateStatusMutation.mutate({ id, status, module: targetItem.module });
              }} 
            />
          )}

          {activeView === "table" && (
            <MasterTableView 
              items={filteredItems} 
              onItemClick={setSelectedItem} 
              onStatusChange={(id, status) => {
                const targetItem = filteredItems.find(i => i.id === id);
                if (targetItem) updateStatusMutation.mutate({ id, status, module: targetItem.module });
              }} 
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
        onStatusChange={(id, status) => {
          if (selectedItem) updateStatusMutation.mutate({ id, status, module: selectedItem.module });
        }}
        // 💡 TAMBAHKAN BARIS INI: 
        onSaveEdit={(id, payload) => {
          if (selectedItem) updateStatusMutation.mutate({ id, module: selectedItem.module, ...payload });
        }}
      />
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
