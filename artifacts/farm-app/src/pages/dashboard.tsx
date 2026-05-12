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
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
export function DashboardPage() {
  const queryClient = useQueryClient();
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all");
const [activeSection, setActiveSection] = useState<
  "overview" |
  "financial" |
  "production" |
  "operational" |
  "insight"
>("overview");
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
    queryKey: getGetDashboardSummaryQueryKey(), 
    enabled: !!isConnected,
    queryFn: async () => {
      const res = await fetch("/api/dashboard/summary");
      if (!res.ok) throw new Error("Gagal mengambil data dashboard");
      return res.json();
    },
  });

  const areas = summary?.areas || [];

  // LOGIC FILTER: Sekarang sudah include harvestWeight per area
  const displayData = useMemo(() => {
    if (!summary) return { modal: 0, pendapatan: 0, pengeluaran: 0, profit: 0, margin: 0, harvestWeight: 0 };

    if (selectedAreaId === "all") {
  return {
    modal: summary.financial?.totalModal || 0,

    pendapatan:
      summary.financial?.totalPendapatan || 0,

    pengeluaran:
      summary.financial?.totalPengeluaran || 0,

    profit:
      summary.financial?.labaRugi || 0,

    margin:
      summary.financial?.marginTotal || 0,

    harvestWeight:
      summary.production?.totalHarvestWeight || 0,
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
      harvestWeight: area.harvestWeight || 0, // Gunakan 75 kg (untuk Blok B)
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
const localBusinessStatus =
  displayData.margin > 0
    ? "Profitable"
    : "Developing";

const localRecommendation =
  displayData.margin < 0
    ? "Usaha area ini masih merugi. Fokus efisiensi biaya operasional."
    : displayData.margin < 15
      ? "Margin area ini rendah. Perlu optimasi produksi."
      : "Performa area dalam kondisi baik.";
const profitChartData = areas.map((area: any) => ({
  name: area.name,
  profit: area.profit,
}));
  const handleRefreshSummary = () => {
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    refetch();
  };

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
const harvestActivities =
  summary?.activities?.filter(
    (a: any) => a.type === "harvest"
  ) || [];

const expenseActivities =
  summary?.activities?.filter(
    (a: any) => a.type === "expense"
  ) || [];
  return (
    <div className="space-y-8 pb-10">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard Finansial</h1>
<div className="sticky top-14 z-20 bg-background/95 backdrop-blur border-b mb-6">
  <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">

    {[
      { key: "overview", label: "Overview" },
      { key: "financial", label: "Finansial" },
      { key: "production", label: "Produksi" },
      { key: "operational", label: "Operasional" },
      { key: "insight", label: "Insight" },
    ].map((tab) => (
      <button
        key={tab.key}
        onClick={() => setActiveSection(tab.key as any)}
        className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
          activeSection === tab.key
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {tab.label}
      </button>
    ))}

  </div>
</div>
      {/* Baris Filter & Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/30 p-3 rounded-lg border border-border/50">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          <span>Update: {formatDate(summary?.lastUpdated ?? null)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 px-2 bg-background" onClick={handleRefreshSummary} disabled={isFetching}>
            <RefreshCcw className={`h-3 w-3 mr-1 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
            <SelectTrigger className="w-[180px] h-8 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Area (Global)</SelectItem>
              {areas.map((area: any) => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
{(activeSection === "overview" ||
  activeSection === "financial") && (
  <>
      {/* Main Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Modal Awal</CardTitle></CardHeader>
        <CardContent><div className="text-2xl font-bold">{formatCurrency(displayData.modal)}</div></CardContent></Card>
        
        <Card><CardHeader className="pb-2 text-emerald-600"><CardTitle className="text-sm font-medium">Pendapatan</CardTitle></CardHeader>
        <CardContent><div className="text-2xl font-bold text-emerald-600">{formatCurrency(displayData.pendapatan)}</div></CardContent></Card>

        <Card><CardHeader className="pb-2 text-rose-600"><CardTitle className="text-sm font-medium">Pengeluaran</CardTitle></CardHeader>
        <CardContent><div className="text-2xl font-bold text-rose-600">{formatCurrency(displayData.pengeluaran)}</div></CardContent></Card>

        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Laba/Rugi Bersih</CardTitle></CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${displayData.profit >= 0 ? "" : "text-rose-600"}`}>{formatCurrency(displayData.profit)}</div>
          <div className="text-xs text-muted-foreground">Margin: {displayData.margin.toFixed(1)}%</div>
        </CardContent></Card>
      </div>

      {/* SECTION INTELLIGENCE: HPP & BEP */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Harga Pokok Produksi (HPP)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {/* RUMUS FIX: Menggunakan harvestWeight yang sudah ter-filter */}
              {formatCurrency(displayData.pengeluaran / (displayData.harvestWeight || 1))}/kg
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Berdasarkan total panen: {displayData.harvestWeight} kg
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex justify-between">
            <span>Progres Balik Modal (BEP)</span>
            <span>{Math.min((displayData.pendapatan / (displayData.modal || 1)) * 100, 100).toFixed(1)}%</span>
          </CardTitle></CardHeader>
          <CardContent>
            <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${Math.min((displayData.pendapatan / (displayData.modal || 1)) * 100, 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {displayData.pendapatan >= displayData.modal ? "Modal Balik!" : `Butuh ${formatCurrency(displayData.modal - displayData.pendapatan)} lagi.`}
            </p>
          </CardContent>
        </Card>
      </div>
<Card>
  <CardHeader>
    <CardTitle>
      Profit per Area
    </CardTitle>
  </CardHeader>

  <CardContent>
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
  data={profitChartData}
  margin={{
    top: 10,
    right: 10,
    left: -20,
    bottom: 10,
  }}
>
          <XAxis dataKey="name" />

          <YAxis
  tickFormatter={(value) =>
    `${(value / 1000000).toFixed(0)}jt`
  }
/>

          <Tooltip />

          <Bar
  dataKey="profit"
  fill="#16a34a"
  radius={[6, 6, 0, 0]}
/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>
  </>
)}
{(activeSection === "overview" ||
  activeSection === "production") && (
  <div className="space-y-4">

    <div className="grid gap-4 md:grid-cols-3">

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Total Panen
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-2xl font-bold">
            {displayData.harvestWeight} Kg
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            Total hasil panen
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Harga jual rata rata
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {displayData.harvestWeight > 0
              ? (
                  displayData.pendapatan /
                  displayData.harvestWeight
                ).toFixed(0)
              : 0}
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            Rupiah / Kg
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Area Aktif
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-2xl font-bold">
            {areas.length}
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            Total blok produksi
          </p>
        </CardContent>
      </Card>

    </div>

  </div>
)}
{(activeSection === "overview" ||
  activeSection === "operational") && (
  <div className="space-y-4">

    <Card>
      <CardHeader>
        <CardTitle>
          Aktivitas Operasional
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">

        <div className="space-y-2">
  <p className="text-sm font-semibold text-emerald-700">
    🌾 Aktivitas Panen
  </p>

  {harvestActivities.map(
    (activity: any, index: number) => (
      <div
        key={index}
        className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50/50"
      >
        <div>
          <p className="font-medium">
            {activity.title}
          </p>

          <p className="text-sm text-muted-foreground">
            {activity.description}
          </p>
        </div>

        <span className="text-xs text-muted-foreground whitespace-nowrap">
  {activity.time}
</span>
      </div>
    )
  )}
</div>

<div className="space-y-2 pt-4">
  <p className="text-sm font-semibold text-amber-700">
    💸 Aktivitas Pengeluaran
  </p>

  {expenseActivities.map(
    (activity: any, index: number) => (
      <div
        key={index}
        className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/50"
      >
        <div>
          <p className="font-medium">
            {activity.title}
          </p>

          <p className="text-sm text-muted-foreground">
            {activity.description}
          </p>
        </div>

        <span className="text-xs text-muted-foreground whitespace-nowrap">
  {activity.time}
</span>
      </div>
    )
  )}
</div>
      </CardContent>
    </Card>

  </div>
)}

{(activeSection === "overview" ||
  activeSection === "insight") && (
  <div className="space-y-4">

    <Card className="border-emerald-200 bg-emerald-50/50">
      <CardHeader>
        <CardTitle className="text-emerald-700">
          Smart Insight
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">

        <div className="p-3 rounded-lg border bg-background">
          <p className="font-medium">
            📈 Margin Area
          </p>

          <p className="text-sm text-muted-foreground mt-1">
            Margin keuntungan saat ini berada di{" "}
            <span className="font-semibold text-emerald-600">
              {displayData.margin.toFixed(1)}%
            </span>
          </p>
        </div>

        <div className="p-3 rounded-lg border bg-background">
          <p className="font-medium">
            💰 Efisiensi Produksi
          </p>

          <p className="text-sm text-muted-foreground mt-1">
            HPP saat ini sekitar{" "}
            <span className="font-semibold">
              {formatCurrency(
                displayData.pengeluaran /
                  (displayData.harvestWeight || 1)
              )}
            </span>
            /kg
          </p>
        </div>

        <div className="p-3 rounded-lg border bg-background">
          <p className="font-medium">
            📊 Status Area
          </p>

          <p className="text-sm text-muted-foreground mt-1">
            {localBusinessStatus === "Profitable"
  ? "Area sedang menghasilkan profit positif."
  : "Area masih dalam fase merugi / pengembangan."}
          </p>
        </div>
<div className="p-3 rounded-lg border bg-background">
  <p className="font-medium">
    🎧 Rekomendasi Sistem
  </p>

  <p className="text-sm text-muted-foreground mt-1">
    {localRecommendation}
  </p>
</div>
      </CardContent>
    </Card>

  </div>
)}
    </div>
  );
}
