import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  RefreshCcw,
  CalendarClock,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
  useGetNotionConnectionStatus,
  getGetNotionConnectionStatusQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";

export function DashboardPage() {
  const queryClient = useQueryClient();

  const {
    data: connectionStatus,
    isLoading: isLoadingConnection,
  } = useGetNotionConnectionStatus({
    query: { queryKey: getGetNotionConnectionStatusQueryKey() },
  });

  const isConnected = connectionStatus?.connected;

  const {
    data: summary,
    isLoading: isLoadingSummary,
    refetch,
    isFetching,
  } = useGetDashboardSummary({
    query: {
      enabled: !!isConnected,
      queryKey: getGetDashboardSummaryQueryKey(),
    },
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Belum pernah diperbarui";
    try {
      return format(new Date(dateString), "dd MMMM yyyy, HH:mm", { locale: id });
    } catch {
      return dateString;
    }
  };

  const handleExpenseAdded = () => {
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
  };

  if (isLoadingConnection) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-1" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto mt-12"
      >
        <Alert variant="default" className="border-primary/50 bg-primary/5">
          <AlertCircle className="h-5 w-5 text-primary" />
          <AlertTitle className="text-lg font-semibold text-primary">
            Notion Belum Terhubung
          </AlertTitle>
          <AlertDescription className="mt-2 text-base text-muted-foreground">
            Sistem Manajemen Kebun memerlukan akses ke workspace Notion Anda
            untuk membaca database finansial. Silakan hubungkan akun Notion Anda
            terlebih dahulu.
          </AlertDescription>
          <div className="mt-6">
            <Link href="/connect">
              <Button size="lg" data-testid="button-connect-prompt">
                Hubungkan Notion Sekarang
              </Button>
            </Link>
          </div>
        </Alert>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1
            className="text-3xl font-bold tracking-tight"
            data-testid="text-dashboard-title"
          >
            Dashboard Finansial
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-dashboard-subtitle">
            Ringkasan laba rugi operasional kebun Anda dari Notion.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <AddExpenseDialog onSuccess={handleExpenseAdded} />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh-data"
          >
            <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </motion.div>
      </div>

      {/* Last updated */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground -mt-4">
        <CalendarClock className="h-3.5 w-3.5" />
        <span data-testid="text-last-updated">
          Terakhir diperbarui: {formatDate(summary?.lastUpdated ?? null)}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center dark:bg-emerald-900/50">
                <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-9 w-3/4 mt-1" />
              ) : (
                <div
                  className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400"
                  data-testid="text-total-pendapatan"
                >
                  {formatCurrency(summary?.totalPendapatan ?? 0)}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
              <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center dark:bg-rose-900/50">
                <ArrowDownCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-9 w-3/4 mt-1" />
              ) : (
                <div
                  className="text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400"
                  data-testid="text-total-pengeluaran"
                >
                  {formatCurrency(summary?.totalPengeluaran ?? 0)}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Laba / Rugi Bersih</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-9 w-3/4 mt-1" />
              ) : (
                <div
                  className={`text-3xl font-bold tracking-tight ${
                    (summary?.labaRugi ?? 0) >= 0
                      ? "text-foreground"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                  data-testid="text-laba-rugi"
                >
                  {formatCurrency(summary?.labaRugi ?? 0)}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {!isLoadingSummary && summary?.notionDatabaseId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-muted-foreground text-center"
        >
          Mengambil data dari Notion Database ID:{" "}
          <code className="font-mono bg-muted px-1 py-0.5 rounded">
            {summary.notionDatabaseId.substring(0, 8)}...
          </code>
        </motion.div>
      )}
    </div>
  );
}
