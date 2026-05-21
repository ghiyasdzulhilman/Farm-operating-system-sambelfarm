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
};

/* AUDIT WARNA: Mengubah semua badge warna statis ke Semantic Tokens */
const TYPE_COLORS: Record<string, string> = {
  panen: "bg-primary/10 text-primary border-primary/20",
  expenses: "bg-secondary/10 text-secondary border-secondary/20",
  laba_rugi: "bg-accent/10 text-accent border-accent/20",
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
    const res = await fetch("/api/staging/list", {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Gagal mengambil data staging");
    return res.json();
  },
  enabled: open,
  staleTime: 0,
  refetchOnMount: "always",
  refetchOnWindowFocus: true,
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

      if (result.synced > 0) {
        toast({
          title: `${result.synced} data berhasil disinkron`,
          description: result.failed > 0
            ? `${result.failed} data gagal — cek detail pesan error merah di bawah.`
            : "Semua data telah mendarat di Notion.",
        });
        
        // --- AUTO CLOSE LACI JIKA SUKSES SEMUA ---
        if (result.failed === 0) {
          setOpen(false); 
        }
      } else if (result.failed > 0) {
        toast({
          title: "Sinkronisasi Gagal",
          description: `${result.failed} data gagal dikirim. Cek pesan error merah di tiap baris.`,
          variant: "destructive",
        });
      } else if (result.message) {
        toast({ title: result.message });
      }

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
          /* AUDIT WARNA: Mengubah Amber Trigger menjadi token Accent */
          hasData
            ? "border-accent/40 bg-accent text-white shadow-sm hover:bg-accent/90 active:scale-95"
            : "border-border bg-muted/50 text-muted-foreground hover:bg-muted dark:bg-muted/30 dark:hover:bg-muted/50",
        ].join(" ")}
        aria-label="Buka staging queue"
      >
        {hasData && (
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            {/* AUDIT WARNA: Titik notifikasi menggunakan Accent */}
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-white bg-accent dark:border-slate-950" />
          </span>
        )}

        <CloudUpload className="h-4 w-4" />
      </button>

      {/* ── Sheet drawer ────────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          /* AUDIT WARNA: Latar sheet diubah agar menyatu seperti input form */
          className="mx-auto flex max-h-[85dvh] max-w-lg flex-col rounded-t-[2rem] border-t-0 p-0 bg-background dark:bg-slate-950/95 backdrop-blur-xl"
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="h-1 w-10 rounded-full bg-border" />
          </div>

          {/* Header */}
          <SheetHeader className="px-5 pt-2 pb-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={[
                    "rounded-xl p-2",
                    /* AUDIT WARNA: Aksen background header icon disesuaikan */
                    hasData ? "bg-accent/10" : "bg-muted",
                  ].join(" ")}
                >
                  <CloudUpload
                    className={[
                      "h-5 w-5",
                      hasData ? "text-accent" : "text-muted-foreground",
                    ].join(" ")}
                  />
                </div>
                <div>
                  <SheetTitle className="text-base text-left font-black tracking-tight">Pending Room</SheetTitle>
                  <p className="text-[11px] text-left font-medium text-muted-foreground">
                    {hasData
                      ? `${pendingCount} antrean menunggu sinkronisasi`
                      : "Semua data sudah tersinkron"}
                  </p>
                </div>
              </div>

              {/* Stats pills */}
              {hasData && (
                <div className="flex flex-col items-end gap-1 text-right">
                  {(stagingStats?.pendingFinanceAmount ?? 0) > 0 && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
                      {formatCurrency(stagingStats!.pendingFinanceAmount)} pending
                    </span>
                  )}
                  {(stagingStats?.pendingWeight ?? 0) > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {stagingStats!.pendingWeight} kg pending
                    </span>
                  )}
                </div>
              )}
            </div>
          </SheetHeader>

          {/* Divider */}
          <div className="h-px bg-border shrink-0" />

          {/* List Content */}
          <div className="overflow-y-auto px-5 py-3" style={{ maxHeight: "calc(85dvh - 200px)" }}>

            {isLoadingList ? (
              <div className="flex flex-col gap-2.5 py-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-2xl bg-muted"
                  />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-primary/60" />
                <p className="text-sm font-bold">Tidak ada antrean data</p>
                <p className="text-xs font-medium">Semuanya sudah masuk Notion dengan aman</p>
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
                      /* AUDIT WARNA: Background kartunya kini menggunakan background Muted kalem ala iOS Form */
                      record.status === "failed"
                        ? "border-destructive/20 bg-destructive/5"
                        : "border-border/50 bg-muted/60 dark:bg-muted/40",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "rounded-lg border px-2 py-0.5 text-[10px] font-bold",
                            TYPE_COLORS[record.databaseType] ??
                              "bg-muted text-muted-foreground border-border",
                          ].join(" ")}
                        >
                          {TYPE_LABELS[record.databaseType] ?? record.databaseType}
                        </span>
                        {record.status === "failed" && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-destructive">
                            <AlertCircle className="h-3 w-3" />
                            Gagal
                          </span>
                        )}
                        {record.status === "pending" && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-accent">
                            <Clock className="h-3 w-3" />
                            Tertunda
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="mt-1.5 text-xs font-bold text-foreground">
                      {getRecordSummary(record)}
                    </p>

                    {/* Error message */}
                    {record.status === "failed" && record.errorMessage && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-destructive/10 px-2.5 py-2">
                        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                        <p className="text-[10px] leading-relaxed text-destructive font-medium">
                          {record.errorMessage}
                        </p>
                      </div>
                    )}

                    <p className="mt-1.5 text-[10px] font-medium text-muted-foreground/70">
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
          <div className="border-t border-border px-5 py-4 shrink-0">
            <Button
  className={[
    "h-11 w-full rounded-xl text-sm font-bold transition-all",
    hasData || records.length > 0
      ? "bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] shadow-sm"
      : "bg-muted text-muted-foreground cursor-not-allowed",
  ].join(" ")}
  disabled={isSyncing || isLoadingList || records.length === 0}
  onClick={handleSync}
>
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyinkron ke Notion...
                </>
              ) : (
                <>
                  <CloudUpload className="mr-2 h-4 w-4" />
                  Kirim Data ke Notion
                  {records.length > 0 && (
                    <Badge className="ml-2 bg-white/20 text-white border-none rounded-lg px-2 text-[10px]">
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
