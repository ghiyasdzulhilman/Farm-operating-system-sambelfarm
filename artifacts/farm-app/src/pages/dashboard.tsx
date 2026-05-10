import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  RefreshCcw,
  CalendarClock,
  Wallet,
  Map,
  TrendingUp,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useGetNotionConnectionStatus,
  getGetNotionConnectionStatusQueryKey,
} from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { AddHarvestDialog } from "@/components/harvest/add-harvest-dialog";

// Import komponen Select untuk Dropdown Filter
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DashboardPage() {
  const queryClient = useQueryClient();
  
  // State untuk menyimpan filter area yang dipilih
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all");

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
  } = useQuery({
    queryKey: ["dashboardSummaryRaw"],
    enabled: !!isConnected,
    queryFn: async () => {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) throw new Error("Gagal mengambil data dashboard");
      return res.json();
    },
  });

  const areas = summary?.areas || [];

  // Logic untuk mengubah data Card berdasarkan Filter yang dipilih
  const displayData = useMemo(() => {
    if (!summary) return { modal: 0, pendapatan: 0, pengeluaran: 0, profit: 0, margin: 0 };

    if (selectedAreaId === "all") {
      // Tampilkan Akumulasi Global
      return {
        modal: summary.totalModal || 0,
        pendapatan: summary.totalPendapatan || 0,
        pengeluaran: summary.totalPengeluaran || 0,
        profit: summary.labaRugi || 0,
        margin: summary.marginTotal || 0,
      };
    }

    // Tampilkan data spesifik per Area
    const area = areas.find((a: any) => a.id === selectedAreaId);
    if (!area) return { modal: 0, pendapatan: 0, pengeluaran: 0, profit: 0, margin: 0 };

    return {
      modal: area.modalAwal,
      pendapatan: area.pendapatan,
      pengeluaran: area.pengeluaran,
      profit: area.profit,
      margin: area.margin,
    };
  }, [summary, selectedAreaId, areas]);

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

  const handleRefreshSummary = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboardSummaryRaw"] });
  };

  if (isLoadingConnection) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto mt-12">
        <Alert variant="default" className="border-primary/50 bg-primary/5">
          <AlertCircle className="h-5 w-5 text-primary" />
          <AlertTitle className="text-lg font-semibold text-primary">Notion Belum Terhubung</AlertTitle>
          <AlertDescription className="mt-2 text-base text-muted-foreground">
            Sistem Manajemen Kebun memerlukan akses ke workspace Notion Anda untuk membaca database finansial.
          </AlertDescription>
          <div className="mt-6">
            <Link href="/settings">
              <Button size="lg">Buka Pengaturan</Button>
            </Link>
          </div>
        </Alert>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Finansial</h1>
          <p className="text-muted-foreground mt-1">Pantau arus kas dan efisiensi panen di setiap blok.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
          <AddHarvestDialog onSuccess={handleRefreshSummary} />
          <AddExpenseDialog onSuccess={handleRefreshSummary} />
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </motion.div>
      </div>

      {/* Baris Filter & Waktu Update */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 -mt-2 bg-muted/30 p-3 rounded-lg border border-border/50">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          <span>Update Data Notion: {formatDate(summary?.lastUpdated ?? null)}</span>
        </div>

        {/* Dropdown Filter Area */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filter Data:</span>
          <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
            <SelectTrigger className="w-[180px] h-8 text-sm bg-background">
              <SelectValue placeholder="Pilih Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-medium">Semua Area (Global)</SelectItem>
              {areas.map((area: any) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modal Awal</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center dark:bg-blue-900/50">
                <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-9 w-3/4 mt-1" /> : (
                <div className="text-2xl font-bold tracking-tight text-foreground">{formatCurrency(displayData.modal)}</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-border shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center dark:bg-emerald-900/50">
                <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-9 w-3/4 mt-1" /> : (
                <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(displayData.pendapatan)}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
              <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center dark:bg-rose-900/50">
                <ArrowDownCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-9 w-3/4 mt-1" /> : (
                <div className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                  {formatCurrency(displayData.pengeluaran)}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className={`border-border shadow-sm h-full relative overflow-hidden ${selectedAreaId !== 'all' ? 'border-primary/20 bg-primary/5' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Laba / Rugi Bersih</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-9 w-3/4 mt-1" /> : (
                <>
                  <div className={`text-2xl font-bold tracking-tight ${displayData.profit >= 0 ? "text-foreground" : "text-rose-600 dark:text-rose-400"}`}>
                    {formatCurrency(displayData.profit)}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs font-medium">
                    <TrendingUp className="h-3 w-3" />
                    <span className={displayData.margin >= 0 ? "text-emerald-600" : "text-rose-600"}>
                      Margin: {displayData.margin.toFixed(1)}%
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Rincian Performa per Area */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Map className="h-5 w-5 text-primary" />
              Rincian Performa per Area
            </CardTitle>
            <AlertDescription className="text-sm text-muted-foreground">
              Evaluasi kinerja keuntungan dari setiap blok tanaman.
            </AlertDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : areas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg border-dashed">
                Belum ada data area yang ditarik dari Notion.
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Blok / Area</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Modal</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pendapatan</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pengeluaran</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Profit</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {areas.map((area: any) => (
                      <tr 
                        key={area.id} 
                        className={`transition-colors hover:bg-muted/30 ${selectedAreaId === area.id ? 'bg-primary/5' : ''}`}
                      >
                        <td className="px-4 py-3 font-medium flex items-center gap-2">
                          {area.name}
                          {selectedAreaId === area.id && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(area.modalAwal)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(area.pendapatan)}</td>
                        <td className="px-4 py-3 text-right text-rose-600">{formatCurrency(area.pengeluaran)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${area.profit >= 0 ? "text-foreground" : "text-rose-600"}`}>
                          {formatCurrency(area.profit)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            area.margin >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          }`}>
                            {area.margin.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
