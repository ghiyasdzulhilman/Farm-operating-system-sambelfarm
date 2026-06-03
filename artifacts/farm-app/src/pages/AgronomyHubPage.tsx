import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Leaf,
  Plus,
  FileText,
  Loader2,
  TrendingUp,
  MoreHorizontal,
  Sprout,
  Wrench,
  ChevronRight,
  CloudUpload,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { SummaryHeader } from "@/components/operasional/SummaryHeader";
import { FilterControls } from "@/components/operasional/FilterControls";
import { LiveFeedView } from "@/components/operasional/LiveFeedView";
import { ActivityDetailSheet } from "@/components/operasional/ActivityDetailSheet";
import { MasterTableView } from "@/components/operasional/MasterTableView";
import type { AgronomyItem, ModuleKey, ViewKey } from "@/types/operasional";
import { useToast } from "@/hooks/use-toast";

// Tambahan: View Mode untuk Feed (Waktu vs Area)
type FeedModeKey = "time" | "area";

export function AgronomyHubPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeView, setActiveView] = useState<ViewKey>("feed");
  const [feedMode, setFeedMode] = useState<FeedModeKey>("time"); // 👈 State baru untuk Pivot Area
  const [activeModule, setActiveModule] = useState<ModuleKey>("all");
  const [activeFilter, setActiveFilter] = useState("Hari ini");
  const [selectedItem, setSelectedItem] = useState<AgronomyItem | null>(null);

  // 1. FETCH DATA (Backend Feed)
  const { data: response, isLoading } = useQuery({
    queryKey: ["operasional-feed"],
    queryFn: () => fetch("/api/operasional/feed").then((res) => res.json()),
    refetchInterval: 300000, // Auto refresh setiap 5 menit sesuai TTL Cache
  });

  const feedData: AgronomyItem[] = response?.feed || [];
  const meta = response?.meta || { stagingCount: 0 };

  // 2. MUTATION: INLINE QUICK ACTIONS (Ubah Status Cepat)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/operasional/feed/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Gagal mengubah status di Notion");
      }

      return response.json();
    },
    onMutate: async (variables) => {
      // Optimistic Update: Ubah UI duluan sebelum nunggu backend kelar
      await queryClient.cancelQueries({ queryKey: ["operasional-feed"] });
      const previousData = queryClient.getQueryData(["operasional-feed"]);

      queryClient.setQueryData(["operasional-feed"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          feed: old.feed.map((item: AgronomyItem) =>
            item.id === variables.id
              ? { ...item, status: variables.status }
              : item,
          ),
        };
      });
      return { previousData };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(["operasional-feed"], context?.previousData);
      toast({
        variant: "destructive",
        title: "Gagal mengubah status",
        description: "Cek koneksi internet Anda.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["operasional-feed"] });
      toast({
        title: "Status Diperbarui",
        description: "Perubahan telah disinkronkan ke Notion.",
      });
    },
  });

  // 3. FILTER LOGIC
  const filteredItems = useMemo(() => {
    return feedData.filter((item) => {
      const matchModule =
        activeModule === "all" ? true : item.module === activeModule;

      let matchFilter = true;
      if (activeFilter === "Hari ini")
        matchFilter = item.dateLabel === "Hari ini";
      else if (activeFilter === "Kemarin")
        matchFilter = item.dateLabel === "Kemarin";
      else if (activeFilter === "Selesai")
        matchFilter = item.status === "Selesai";
      else if (activeFilter === "Dalam proses")
        matchFilter = item.status === "Dalam proses";
      else if (activeFilter === "Belum dikerjakan")
        matchFilter = item.status === "Belum dikerjakan";

      return matchModule && matchFilter;
    });
  }, [feedData, activeModule, activeFilter]);

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-bold uppercase tracking-widest">
          Menyinkronkan data kebun...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 space-y-6">
      {/* HEADER SECTION */}
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

      {/* 🚀 STAGING INDICATOR BAR (Muncul hanya jika ada antrean) */}
      {meta.stagingCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-amber-700 shadow-sm dark:text-amber-400">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-amber-500/20 p-2">
              <CloudUpload className="h-5 w-5 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-bold">
                Ada {meta.stagingCount} Aktivitas di Antrean Offline
              </p>
              <p className="text-xs opacity-80">
                Data aman di lokal. Tekan sync saat sinyal kebun stabil.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="rounded-xl bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
          >
            Sync Sekarang
          </Button>
        </div>
      )}

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
          {/* CONTROL BAR EXTRA UNTUK FEED */}
          {activeView === "feed" && (
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mode Tampilan:
              </span>
              <div className="flex gap-1">
                <Button
                  variant={feedMode === "time" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 rounded-xl text-xs font-bold"
                  onClick={() => setFeedMode("time")}
                >
                  <TrendingUp className="mr-2 h-3.5 w-3.5" /> Kronologis
                </Button>
                <Button
                  variant={feedMode === "area" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 rounded-xl text-xs font-bold"
                  onClick={() => setFeedMode("area")}
                >
                  <Layers className="mr-2 h-3.5 w-3.5" /> Pivot Area
                </Button>
              </div>
            </div>
          )}

          {activeView === "feed" && (
            <LiveFeedView
              items={filteredItems}
              onItemClick={setSelectedItem}
              // feedMode={feedMode} // 👈 Nanti kita modifikasi LiveFeedView untuk menerima prop ini
              onStatusChange={(id, status) =>
                updateStatusMutation.mutate({ id, status })
              }
            />
          )}

          {activeView === "table" && (
            <MasterTableView
              items={filteredItems}
              onItemClick={setSelectedItem}
              onStatusChange={(id, status) =>
                updateStatusMutation.mutate({ id, status })
              }
            />
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Snapshot
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight">
                  Ringkasan Cepat
                </h3>
              </div>
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <InfoRow label="Total Aktivitas" value={`${feedData.length}`} />
              <InfoRow
                label="Aktivitas Tertunda"
                value={`${feedData.filter((i) => i.status === "Belum dikerjakan").length}`}
              />
              <InfoRow
                label="Data Terakhir Sync"
                value={new Date(meta.lastSynced).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Shortcut
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight">
                  Aksi Cepat
                </h3>
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

      <ActivityDetailSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onStatusChange={(id, status) =>
          updateStatusMutation.mutate({ id, status })
        }
      />
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
        <div className="rounded-2xl bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
