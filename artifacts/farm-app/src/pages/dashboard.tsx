import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  CalendarClock,
  RefreshCcw,
  Filter,
  Calendar,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all");
  
  // State Filter Waktu
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "M"));
  const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), "yyyy"));

  const { data: connectionStatus } = useGetNotionConnectionStatus({
    query: { queryKey: getGetNotionConnectionStatusQueryKey() },
  });

  const {
    data: summary,
    isLoading: isLoadingSummary,
    refetch,
    isFetching,
  } = useQuery({
    // Tambahin month & year ke queryKey biar auto-refetch pas ganti filter
    queryKey: [...getGetDashboardSummaryQueryKey(), selectedMonth, selectedYear],
    enabled: !!connectionStatus?.connected,
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/summary?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error("Gagal mengambil data dashboard");
      return res.json();
    },
  });

  const areas = summary?.areas || [];

  const displayData = useMemo(() => {
    if (!summary) return { modal: 0, pendapatan: 0, pengeluaran: 0, profit: 0, margin: 0, harvestWeight: 0 };
    if (selectedAreaId === "all") {
      return {
        modal: summary.totalModal,
        pendapatan: summary.totalPendapatan,
        pengeluaran: summary.totalPengeluaran,
        profit: summary.labaRugi,
        margin: summary.totalModal > 0 ? (summary.labaRugi / summary.totalModal) * 100 : 0,
        harvestWeight: summary.totalHarvestWeight
      };
    }
    const area = areas.find((a: any) => a.id === selectedAreaId);
    return area || { modal: 0, pendapatan: 0, pengeluaran: 0, profit: 0, margin: 0, harvestWeight: 0 };
  }, [summary, selectedAreaId, areas]);

  const formatCurrency = (val: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

  const months = [
    { v: "1", l: "Januari" }, { v: "2", l: "Februari" }, { v: "3", l: "Maret" },
    { v: "4", l: "April" }, { v: "5", l: "Mei" }, { v: "6", l: "Juni" },
    { v: "7", l: "Juli" }, { v: "8", l: "Agustus" }, { v: "9", l: "September" },
    { v: "10", l: "Oktober" }, { v: "11", l: "November" }, { v: "12", l: "Desember" }
  ];

  return (
    <div className="space-y-6 pb-10">
      <h1 className="text-3xl font-bold">Dashboard Finansial</h1>

      {/* FILTER BAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[130px] h-9 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map(m => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px] h-9 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["2024", "2025", "2026"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
            <SelectTrigger className="w-[160px] h-9 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Area</SelectItem>
              {areas.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* MAIN CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2 text-xs font-medium">Modal Awal</CardHeader><CardContent className="text-xl font-bold">{formatCurrency(displayData.modal)}</CardContent></Card>
        <Card><CardHeader className="pb-2 text-xs font-medium text-emerald-600">Pendapatan</CardHeader><CardContent className="text-xl font-bold text-emerald-600">{formatCurrency(displayData.pendapatan)}</CardContent></Card>
        <Card><CardHeader className="pb-2 text-xs font-medium text-rose-600">Pengeluaran</CardHeader><CardContent className="text-xl font-bold text-rose-600">{formatCurrency(displayData.pengeluaran)}</CardContent></Card>
        <Card><CardHeader className="pb-2 text-xs font-medium">Laba/Rugi</CardHeader><CardContent className={`text-xl font-bold ${displayData.profit >= 0 ? "text-primary" : "text-rose-600"}`}>{formatCurrency(displayData.profit)}</CardContent></Card>
      </div>

      {/* HPP & BEP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2 text-sm font-semibold">HPP (Harga Pokok Produksi)</CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(displayData.pengeluaran / (displayData.harvestWeight || 1))}/kg</div>
            <p className="text-xs text-muted-foreground mt-1">Berdasarkan {displayData.harvestWeight} kg panen bulan ini.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 text-sm font-semibold flex justify-between">
            <span>Progres BEP</span>
            <span className="text-primary">{Math.min(displayData.margin, 100).toFixed(1)}%</span>
          </CardHeader>
          <CardContent>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(displayData.margin, 100)}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
