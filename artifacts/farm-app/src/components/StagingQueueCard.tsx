import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  CloudUpload,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";

import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StagingStats {
  pendingCount: number;
  pendingFinanceAmount: number;
  pendingWeight: number;
  pendingInspeksiCount?: number;
  pendingPerawatanCount?: number;
}

interface StagingRecord {
  id: string;
  databaseType: string;
  data: Record<string, unknown>;
  status: "pending" | "synced" | "failed";
  errorMessage?: string | null;
  createdAt: string;
}

interface StagingQueueCardProps {
  stagingStats?: StagingStats;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  panen: "Panen",
  expenses: "Pengeluaran",
  laba_rugi: "Laba Rugi",
  inspeksi: "Inspeksi",
  perawatan: "Perawatan",
};

const TYPE_COLORS: Record<string, string> = {
  panen: "bg-emerald-100 text-emerald-700 border-emerald-200",
  expenses: "bg-red-100 text-red-700 border-red-200",
  laba_rugi: "bg-blue-100 text-blue-700 border-blue-200",
  inspeksi: "bg-violet-100 text-violet-700 border-violet-200",
  perawatan: "bg-orange-100 text-orange-700 border-orange-200",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getRecordSummary(record: StagingRecord): string {
  const d = record.data;
  switch (record.databaseType) {
    case "panen":
      return [d.kegiatan, d.berat != null ? `${d.berat} kg` : null]
        .filter(Boolean)
        .join(" · ") || "Data panen";
    case "expenses":
    case "laba_rugi":
      return [
        d.pengeluaran ?? d.nama,
        d.nominal != null
          ? formatCurrency(Number(d.nominal))
          : d.qty != null && d.hargaPerPcs != null
            ? formatCurrency(Number(d.qty) * Number(d.hargaPerPcs))
            : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Data pengeluaran";
    case "inspeksi":
      return String(d.judul ?? d.catatan ?? "Data inspeksi");
    case "perawatan":
      return String(d.kegiatan ?? d.catatan ?? "Data perawatan");
    default:
      return `Data ${record.databaseType}`;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StagingQueueCard({ stagingStats }: StagingQueueCardProps) {
  const [open, setOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const pendingCount = stagingStats?.pendingCount ?? 0;
  const hasData = pendingCount > 0;

  // Only fetch list when sheet is open
  const {
    data: listData,
    isLoading: isLoadingList,
    refetch: refetchList,
  } = useQuery<{ records: StagingRecord[] }>({
    queryKey: ["staging", "list"],
    queryFn: async () => {
      const res = await fetch("/api/staging/list");
      if (!res.ok) throw new Error("Gagal mengambil data staging");
      return res.json();
    },
    enabled: open,
    staleTime: 0,
  });

  const records = listData?.records ?? [];
  const failedCount = records.filter((r) => r.status === "failed").length;

  async function handleSync() {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/staging/sync", { method: "POST" });
      const result = await res.json() as {
        success: boolean;
        synced: number;
        failed: number;
        message?: string;
        errors?: Array<{ stagingId: string; error: string }>;
      };

      // 1. Tampilkan Notifikasi dengan lebih jelas
      if (result.synced > 0) {
        toast({
          title: `${result.synced} data berhasil disinkron`,
          description: result.failed > 0
            ? `${result.failed} data gagal — cek detail pesan error merah di bawah.`
            : "Semua data telah mendarat di Notion.",
        });
      } else if (result.failed > 0) {
        toast({
          title: "Sinkronisasi Gagal",
          description: `${result.failed} data gagal dikirim. Cek pesan error merah di tiap baris.`,
          variant: "destructive",
        });
      } else if (result.message) {
        toast({ title: result.message });
      }

      // 2. KUNCI UTAMA: Paksa Refresh Semua Lini
      await queryClient.invalidateQueries({
        queryKey: getGetDashboardSummaryQueryKey(),
        refetchType: 'all'
      });
      
      await refetchList();

    } catch {
      toast({
        title: "Sinkronisasi terputus",
        description: "Terjadi kesalahan jaringan. Coba lagi.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <>
                  {/* ── Minimalist Trigger Button (HIDDEN) ─────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className={[
          "hidden relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all",

          hasData
            ? "border-amber-300/60 bg-amber-500 text-white shadow-sm hover:bg-amber-600 active:scale-95"
            : "border-slate-200/40 bg-slate-100/50 text-slate-500 hover:bg-slate-200/50 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800",
        ].join(" ")}
        aria-label="Buka staging queue"
      >
        {/* Titik kuning berkedip kalau ada antrean */}
        {hasData && (
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-amber-500 dark:border-slate-950" />
          </span>
        )}

        <CloudUpload className="h-4 w-4" />
      </button>

            {/* ── Sheet drawer ────────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto flex h-[80dvh] max-w-lg flex-col rounded-t-[2rem] border-t-0 p-0 bg-white dark:bg-slate-900"
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Header */}
          <SheetHeader className="px-5 pt-2 pb-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={[
                    "rounded-xl p-2",
                    hasData ? "bg-amber-100 dark:bg-amber-950" : "bg-slate-100 dark:bg-slate-800",
                  ].join(" ")}
                >
                  <CloudUpload
                    className={[
                      "h-5 w-5",
                      hasData ? "text-amber-600" : "text-slate-400",
                    ].join(" ")}
                  />
                </div>
                <div>
                  <SheetTitle className="text-base">Staging Queue</SheetTitle>
                  <p className="text-[11px] text-muted-foreground">
                    {hasData
                      ? `${pendingCount} data menunggu sinkronisasi ke Notion`
                      : "Semua data sudah tersinkron"}
                  </p>
                </div>
              </div>

              {/* Stats pills */}
              {hasData && (
                <div className="flex flex-col items-end gap-1 text-right">
                  {(stagingStats?.pendingFinanceAmount ?? 0) > 0 && (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950 dark:text-red-400">
                      {formatCurrency(stagingStats!.pendingFinanceAmount)} pending
                    </span>
                  )}
                  {(stagingStats?.pendingWeight ?? 0) > 0 && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      {stagingStats!.pendingWeight} kg pending
                    </span>
                  )}
                </div>
              )}
            </div>
          </SheetHeader>

          {/* Divider */}
          <div className="h-px bg-slate-100 dark:bg-slate-800 shrink-0" />

          {/* List (Kunci Utama: flex-1 dan overflow-y-auto biar nge-scroll di dalam sini aja) */}
          <div className="flex-1 overflow-y-auto px-5 py-3">
            {isLoadingList ? (
              <div className="flex flex-col gap-2.5 py-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
                  />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                <p className="text-sm font-semibold">Tidak ada data pending</p>
                <p className="text-xs">Semua sudah tersinkron ke Notion</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {records.map((record) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={[
                      "rounded-2xl border p-3.5",
                      record.status === "failed"
                        ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                        : "border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "rounded-lg border px-2 py-0.5 text-[10px] font-bold",
                            TYPE_COLORS[record.databaseType] ??
                              "bg-slate-100 text-slate-600 border-slate-200",
                          ].join(" ")}
                        >
                          {TYPE_LABELS[record.databaseType] ?? record.databaseType}
                        </span>
                        {record.status === "failed" && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600">
                            <AlertCircle className="h-3 w-3" />
                            Gagal
                          </span>
                        )}
                        {record.status === "pending" && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="mt-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {getRecordSummary(record)}
                    </p>

                    {/* Error message */}
                    {record.status === "failed" && record.errorMessage && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-red-100 px-2.5 py-2 dark:bg-red-900/30">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-red-500" />
                        <p className="text-[10px] leading-relaxed text-red-700 dark:text-red-400">
                          {record.errorMessage}
                        </p>
                      </div>
                    )}

                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {new Date(record.createdAt).toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer action */}
          <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800 shrink-0">
            <Button
              className={[
                "h-11 w-full rounded-xl text-sm font-bold transition-all",
                hasData || records.length > 0
                  ? "bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.98]"
                  : "bg-slate-100 text-slate-400",
              ].join(" ")}
              disabled={isSyncing || isLoadingList || records.length === 0}
              onClick={handleSync}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyinkron...
                </>
              ) : (
                <>
                  <CloudUpload className="mr-2 h-4 w-4" />
                  Sync ke Notion Sekarang
                  {records.length > 0 && (
                    <Badge className="ml-2 bg-white/30 text-white border-none">
                      {records.length}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

    </>
  );
}
