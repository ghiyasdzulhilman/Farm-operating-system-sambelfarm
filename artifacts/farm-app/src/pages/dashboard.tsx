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
  Calendar,
  PieChart,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useGetNotionConnectionStatus,
  getGetNotionConnectionStatusQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Palet warna dinamis untuk Progress Bar Breakdown Pengeluaran
const BREAKDOWN_COLORS = [
  "bg-rose-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-cyan-500",
];

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all");
  
  // State Filter Waktu (Default ke bulan & tahun sekarang)
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "M"));
  const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), "yyyy"));

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
    queryKey: [...getGetDashboardSummaryQueryKey(), selectedMonth, selectedYear], 
    enabled: !!isConnected,
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/summary?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error("Gagal mengambil data dashboard");
      return res.json();
    },
  });

  const areas = summary?.areas || [];
  const expenseBreakdown = summary?.expenseBreakdown || [];

  // Hitung total pengeluaran di breakdown buat ngitung persentase
  const totalBreakdownAmount = expenseBreakdown.reduce((acc: number, curr: any) => acc + curr.amount, 0);

  // LOGIC FILTER AREA
  const displayData = useMemo(() => {
    if (!summary) return { modal: 0, pendapatan: 0, pengeluaran: 0, profit: 0, margin: 0, harvestWeight: 0 };

    if (selectedAreaId === "all") {
      return {
        modal: summary.totalModal || 0,
        pendapatan: summary.totalPendapatan || 0,
        pengeluaran: summary.totalPengeluaran || 0,
        profit: summary.labaRugi || 0,
        margin: summary.marginTotal || 0,
        harvestWeight: summary.totalHarvestWeight || 0,
      };
    }

    const area = areas.find((a: any) => a.id === selectedAreaId);
    if (!area) return { modal: 0, pendapatan: 0, pengeluaran: 0, profit: 0, margin: 0, harvestWeight: 0 };

    return {
      modal: area.modalAwal,
      pendapatan: area.pendapatan,
      pengeluaran: area.pengeluaran,
      profit: area.profit,
      margin: area.margin,
      harvestWeight: area.harvestWeight || 0,
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
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    refetch();
  };

  const months = [
    { value: "1", label: "Januari" }, { value: "2", label: "Februari" }, { value: "3", label: "Maret" },
    { value: "4", label: "April" }, { value: "5", label: "Mei" }, { value: "6", label: "Juni" },
    { value: "7", label: "Juli" }, { value: "8", label: "Agustus" }, { value: "9", label: "September" },
    { value: "10", label: "Oktober" }, { value: "11", label: "November" }, { value: "12", label: "Desember" }
  ];

  if (isLoadingConnection) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-9 w-48 mb-2" /><Skeleton className="h-5 w-64" /></div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-5 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-32" /></CardContent></Card>
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
      </div>

      {/* FILTER BAR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] h-9 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] h-9 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["2024", "2025", "2026", "2027"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center lg:justify-end gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
            <SelectTrigger className="w-full lg:w-[180px] h-9 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Area (Global)</SelectItem>
              {areas.map((area: any) => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 px-3 bg-background shrink-0" onClick={handleRefreshSummary} disabled={isFetching}>
            <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Main Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-border shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Modal Awal</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center dark:bg-blue-900/50">
                <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-9 w-3/4 mt-1" /> : (
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{formatCurrency(displayData.modal)}</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-border shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Pendapatan</CardTitle>
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center dark:bg-emerald-900/50">
                <ArrowUpCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-9 w-3/4 mt-1" /> : (
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(displayData.pendapatan)}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border shadow-sm h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Total Pengeluaran</CardTitle>
              <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center dark:bg-rose-900/50">
                <ArrowDownCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-9 w-3/4 mt-1" /> : (
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
                  {formatCurrency(displayData.pengeluaran)}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="border-border shadow-sm h-full relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Laba / Rugi Bersih</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-9 w-3/4 mt-1" /> : (
                <>
                  <div className={`text-xl sm:text-2xl font-bold tracking-tight ${displayData.profit >= 0 ? "text-foreground" : "text-rose-600 dark:text-rose-400"}`}>
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

      {/* ROW BAWAH: HPP, BEP & BREAKDOWN PENGELUARAN */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        
        {/* Kolom Kiri: HPP & BEP */}
        <div className="space-y-4 lg:col-span-1">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Harga Pokok Produksi (HPP)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSummary ? <Skeleton className="h-9 w-full" /> : (
                  <>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(displayData.pengeluaran / (displayData.harvestWeight || 1))}/kg
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Berdasarkan {displayData.harvestWeight} kg panen.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex justify-between">
                  <span>Progres Balik Modal</span>
                  <span className="text-primary">{Math.min((displayData.pendapatan / (displayData.modal || 1)) * 100, 100).toFixed(1)}%</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSummary ? <Skeleton className="h-4 w-full mt-2" /> : (
                  <div className="space-y-3">
                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-1000" 
                        style={{ width: `${Math.min((displayData.pendapatan / (displayData.modal || 1)) * 100, 100)}%` }} 
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {displayData.pendapatan >= displayData.modal 
                        ? "🚀 Modal awal sudah balik!" 
                        : `Kekurangan: ${formatCurrency(Math.max((displayData.modal || 0) - (displayData.pendapatan || 0), 0))}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Kolom Kanan: Breakdown Pengeluaran */}
        <div className="lg:col-span-2">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="h-full">
            <Card className="h-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-rose-500" />
                  Rincian Pengeluaran
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSummary ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" />
                  </div>
                ) : expenseBreakdown.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed rounded-lg border-muted">
                    <p className="text-sm text-muted-foreground">Belum ada pengeluaran tercatat dengan filter ini.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {expenseBreakdown.map((item: any, index: number) => {
                      const percentage = totalBreakdownAmount > 0 ? (item.amount / totalBreakdownAmount) * 100 : 0;
                      // Pilih warna dari array secara bergantian
                      const colorClass = BREAKDOWN_COLORS[index % BREAKDOWN_COLORS.length];
                      
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-foreground">{item.name}</span>
                            <div className="flex gap-3 text-muted-foreground">
                              <span>{formatCurrency(item.amount)}</span>
                              <span className="w-10 text-right font-semibold text-foreground">{percentage.toFixed(0)}%</span>
                            </div>
                          </div>
                          {/* Progress bar dengan warna dinamis */}
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${colorClass}`} 
                              style={{ width: `${percentage}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
