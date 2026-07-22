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
import type { AgronomyItem, ModuleKey, ViewKey } from "@/types/operasional";
import { useToast } from "@/hooks/use-toast";
import { FinanceTableView } from "../components/operasional/finance/FinanceTableView";

type FeedModeKey = "time" | "area";

export function AgronomyHubPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 🚀 SUNTIKAN BARU: State untuk saklar utama (Domain)
  const [activeDomain, setActiveDomain] = useState<"agronomi" | "finance">("agronomi");

  const [activeView, setActiveView] = useState<ViewKey>("kanban");
  const [feedMode, setFeedMode] = useState<FeedModeKey>("time");
  const [activeModule, setActiveModule] = useState<ModuleKey>("all");
  
  // 🚀 FIX: State filter dipecah jadi 2
  const [activeTimeFilter, setActiveTimeFilter] = useState("Hari ini");
  const [activeStatusFilter, setActiveStatusFilter] = useState("Semua Status");
  
  // 🚀 1. TAMBAHIN STATE BARU BUAT FILTER SIKLUS (Default-nya "aktif")
  const [filterSiklus, setFilterSiklus] = useState<"aktif" | "selesai">("aktif"); 
  const [selectedItem, setSelectedItem] = useState<AgronomyItem | null>(null);

  // 🚀 OTAK AUTO-RESET: Mencegah layar nge-blank & bentrok UI
  useEffect(() => {
    // 1. Balikin semua ke default kalau ganti domain
    setActiveModule("all");
    setActiveTimeFilter("Hari ini");
    setActiveStatusFilter("Semua Status");
    
    // 2. Kalau pindah ke Finance tapi view lagi di Kanban, paksa pindah ke Table
    if (activeDomain === "finance" && activeView === "kanban") {
      setActiveView("table");
    }
  }, [activeDomain, activeView]);

  // =====================================================================
  // 1. FETCH DATA (LANGSUNG DARI 3 ENDPOINT SUPABASE + MASTER PEKERJA)
  // =====================================================================
      const { data: unifiedFeedData, isLoading } = useQuery({
    queryKey: ["agronomy-feed-supabase", filterSiklus], 
    queryFn: async () => {
      // 🚀 UPGRADE 1: Tambah colokan ke API Pengeluaran & Harvest
      const [resOp, resPer, resIns, resOptions, resPengeluaran, resPanen] = await Promise.all([
        fetch(`/api/notion/all-operasional?statusSiklus=${filterSiklus}`).then((res) => res.json()),
        fetch(`/api/notion/all-perawatan?statusSiklus=${filterSiklus}`).then((res) => res.json()),
        fetch(`/api/notion/all-inspeksi?statusSiklus=${filterSiklus}`).then((res) => res.json()),
        fetch("/api/notion/operasional-dropdown-options").then((res) => res.json()),
        fetch(`/api/pengeluaran?statusSiklus=${filterSiklus}`).then((res) => res.json()),
        fetch(`/api/harvest?statusSiklus=${filterSiklus}`).then((res) => res.json()),
      ]);

      const workerMap: Record<string, string> = {};
      resOptions?.petugas?.forEach((p: any) => {
        workerMap[p.id] = p.name;
      });

      const formatItem = (item: any, module: ModuleKey, icon: string, titleKey: string): AgronomyItem => {
        // 🚀 UPGRADE 2: Support baca kolom 'tanggal' khusus modul Finance
        const rawDate = item.tanggal || item.waktuMulai || new Date().toISOString();
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
          rawDate: rawDate, 
          // 🚀 Finance otomatis statusnya dianggap "Selesai" karena uang/barang udah lewat
          status: item.status || "Selesai", 
          areaId: item.areaId,
          area: item.areaName || "Area Master",
          siklusId: item.siklusId,
          namaSiklus: item.namaSiklus || "-", 
          workers: resolvedWorkers.length ? resolvedWorkers : ["Tim Lapangan"], 
          duration: `${item.durasiKerja || 0} jam`,
          priority: item.prioritas || "Medium",
          
          // 🚀 UPGRADE 3: Mapping dinamis buat label kategori Finance
          category: item.kategoriName || item.channelPenjualan || item.kategori || item.tagCategory || (
            module === "inspeksi" ? "Inspeksi" : 
            module === "perawatan" ? "Perawatan" : 
            module === "pengeluaran" ? "Pengeluaran" :
            module === "panen" ? "Panen" :
            "Operasional"
          ),
          
          notes: catatanRacikan,
          dateLabel: isToday ? "Hari ini" : isYesterday ? "Kemarin" : "Riwayat Lama",
          timeLabel: "Disinkronkan",
          attachments: [],
          history: [{ time: "Supabase Live", text: "Data ditarik langsung dari server lokal." }],
          
          // 🚀 PENTING: Semua data asli uang, nominal, dan qty nyangkut di sini!
          metaEkstra: { ...item }, 
        } as unknown as AgronomyItem;
      };

      const ops = (resOp.data || []).map((i: any) => formatItem(i, "operasional", "wrench", "namaPekerjaan"));
      const per = (resPer.data || []).map((i: any) => formatItem(i, "perawatan", "sprout", "kegiatan"));
      const ins = (resIns.data || []).map((i: any) => formatItem(i, "inspeksi", "leaf", "kegiatan"));
      
      // 🚀 UPGRADE 4: Eksekusi formatItem untuk array Finance
      const peng = (resPengeluaran.data || []).map((i: any) => formatItem(i, "pengeluaran", "banknote", "namaItem"));
      const pan = (resPanen.data || []).map((i: any) => formatItem(i, "panen", "shoppingBasket", "kegiatan"));

      // 🚀 UPGRADE 5: Return gabungan 5 modul
      return [...ops, ...per, ...ins, ...peng, ...pan].sort(
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
  // 2. MUTATION: UNIVERSAL DYNAMIC UPDATE + PERAWATAN FIELD ONLY DAN PRODUK
  // =====================================================================
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, module, ...updateData }: { id: string; module: string; [key: string]: any }) => {
      const isPerawatan = module === "perawatan";

      const url = isPerawatan
        ? `/api/notion/perawatan/${id}`
        : `/api/notion/edit-activity/${id}`;

      const body = isPerawatan
        ? updateData
        : { module, ...updateData };

      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || "Gagal menyimpan perubahan");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: err instanceof Error ? err.message : "Kesalahan jaringan." });
    }
  });

  const updateProdukMutation = useMutation({
    mutationFn: async ({ id, logProduk }: { id: string; logProduk: any[] }) => {
      const response = await fetch(`/api/notion/perawatan/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logProduk }),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || "Gagal menyimpan racikan produk");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Gagal Menyimpan Produk", description: err instanceof Error ? err.message : "Kesalahan jaringan." });
    }
  });

       // 🚀 SUNTIKAN BARU: Mutasi untuk menghapus baris aktivitas (Support Finance)
  const deleteActivityMutation = useMutation({
    mutationFn: async ({ id, module }: { id: string; module: string }) => {
      let targetUrl = "";
      
      // 🚀 UPGRADE: Arahkan URL tembakan Delete sesuai module-nya
      if (module === "pengeluaran") {
        targetUrl = `/api/pengeluaran/${id}`;
      } else if (module === "panen") {
        targetUrl = `/api/harvest/${id}`;
      } else if (module === "perawatan") {
        targetUrl = `/api/notion/perawatan/${id}`;
      } else {
        targetUrl = `/api/notion/activity/${module}/${id}`;
      }
        
      const response = await fetch(targetUrl, { method: 'DELETE' });
      if (!response.ok) throw new Error("Gagal menghapus data baris ini");
      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] });
      toast({ title: "Terhapus", description: "Aktivitas berhasil dihapus dari riwayat." });
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
    }
  });

  // =====================================================================
  // 3. FILTER LOGIC (DENGAN DOMAIN SEGREGATION)
  // =====================================================================
      const filteredItems = useMemo(() => {
      return feedData.filter((item) => {
      // 🚀 1. Filter level dewa: Singkirkan data yang bukan dari tab aktif
      const isItemAgronomi = ["perawatan", "inspeksi", "operasional"].includes(item.module);
      const isItemFinance = ["pengeluaran", "panen"].includes(item.module);
      
      if (activeDomain === "agronomi" && !isItemAgronomi) return false;
      if (activeDomain === "finance" && !isItemFinance) return false;

      // 🚀 2. Filter Modul (Bento Deck)
      const matchModule = activeModule === "all" ? true : item.module === activeModule;

      // 🚀 3. Filter Waktu (Time Segregation)
      let matchTime = true;
      if (activeTimeFilter === "Hari ini") matchTime = item.dateLabel === "Hari ini";
      else if (activeTimeFilter === "Kemarin") matchTime = item.dateLabel === "Kemarin";
      // Kalau "Semua Waktu", matchTime dibiarin true

      // 🚀 4. Filter Status (Status Segregation - Hanya jalan di Agronomi)
      let matchStatus = true;
      if (activeDomain === "agronomi" && activeStatusFilter !== "Semua Status") {
        if (activeStatusFilter === "Selesai") matchStatus = item.status === "Selesai" || item.status === "Sudah ditangani";
        else if (activeStatusFilter === "Dalam proses") matchStatus = item.status === "Dalam proses" || item.status === "Sedang ditangani";
        else if (activeStatusFilter === "Belum dikerjakan") matchStatus = item.status === "Belum dikerjakan" || item.status === "Baru ditemukan";
      }

      // Return kombinasi ketiganya!
      return matchModule && matchTime && matchStatus;
    });
  }, [feedData, activeModule, activeTimeFilter, activeStatusFilter, activeDomain]); // 🚀 Array dependency di-update

    if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl py-6 space-y-6 animate-in fade-in duration-500">
        {/* Skeleton Header */}
        <div className="flex justify-between items-end">
          <div className="space-y-3 w-1/3">
            <div className="h-6 w-32 animate-pulse rounded-full bg-muted/60" />
            <div className="h-10 w-3/4 animate-pulse rounded-xl bg-muted/60" />
          </div>
          <div className="h-12 w-48 animate-pulse rounded-2xl bg-muted/60 hidden md:block" />
        </div>
        
        {/* Skeleton Summary & Filter */}
        <div className="h-24 w-full animate-pulse rounded-[1.5rem] bg-muted/60" />
        <div className="h-32 w-full animate-pulse rounded-[1.5rem] bg-muted/60" />
        
        {/* Skeleton Layout Utama */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
          <div className="h-[500px] animate-pulse rounded-[1.5rem] bg-muted/60" />
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-[1.5rem] bg-muted/60" />
            <div className="h-48 animate-pulse rounded-[1.5rem] bg-muted/60" />
          </div>
        </div>
      </div>
    );
  }

    return (
    <div className="mx-auto w-full max-w-7xl py-6 space-y-6 text-left animate-in fade-in duration-300">
     <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          {/* Badge lebih soft, gaya pill modern */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-primary border border-primary/10">
            <Leaf className="h-3.5 w-3.5" />
            <span>Agronomy Hub</span>
          </div>
          {/* Typografi lebih elegan */}
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Pusat Aktivitas</h1>
        </div>
      </div>

      <SummaryHeader feedData={feedData} meta={meta} />

      <FilterControls
        feedData={feedData}
        activeView={activeView}
        setActiveView={setActiveView}
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        activeTimeFilter={activeTimeFilter}
        setActiveTimeFilter={setActiveTimeFilter}
        activeStatusFilter={activeStatusFilter}
        setActiveStatusFilter={setActiveStatusFilter}
        filterSiklus={filterSiklus}
        setFilterSiklus={setFilterSiklus}
        activeDomain={activeDomain}
        setActiveDomain={setActiveDomain}
      />

<div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
  <div className="space-y-6 min-w-0">
    {/* Konten Feed & Kanban */}
          
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
              // 🚀 SUNTIKAN BARU: Lempar fungsi hapus ke komponen LiveFeedView
              onDelete={(id, module) => {
                if (confirm("Yakin ingin menghapus aktivitas ini secara permanen?")) {
                  deleteActivityMutation.mutate({ id, module });
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
              // 🚀 SUNTIKAN BARU: Hapus dinyalakan untuk Kanban!
              onDelete={(id, module) => {
                if (confirm("Yakin ingin menghapus aktivitas ini secara permanen?")) {
                  deleteActivityMutation.mutate({ id, module });
                }
              }}
            />
          )}
      </div>
      </div>

    <ActivityDetailSheet 
  item={selectedItem} 
  onClose={() => setSelectedItem(null)} 
  isUpdating={updateStatusMutation.isPending}
  isUpdatingProduk={updateProdukMutation.isPending}
  onStatusChange={(id, payload) => {
    if (selectedItem) {
      const updateData = typeof payload === "string" ? { status: payload } : payload;
      updateStatusMutation.mutate({ id, module: selectedItem.module, ...updateData });
    }
  }}
  onProdukChange={(id, logProduk) => {
    return updateProdukMutation.mutateAsync({ id, logProduk });
  }}
/>
    </div>
  );
}



