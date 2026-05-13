import {
  useState,
  useMemo,
  useRef,
  useEffect,
} from "react";
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
SlidersHorizontal,
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
import { OperationalSection } from "@/components/OperationalSection";
import { FinancialSection } from "@/components/FinancialSection";
import { ProductionSection } from "@/components/ProductionSection";
import { InsightSection } from "@/components/InsightSection";

export function DashboardPage() {

  const queryClient = useQueryClient();

  const [selectedAreaId, setSelectedAreaId] =
    useState<string>("all");

const [isHeaderHidden, setIsHeaderHidden] =
  useState(false);

const [activeSection, setActiveSection] =
  useState<
    "financial" |
    "production" |
    "operational" |
    "insight"
  >("financial");

const [showControls, setShowControls] =
  useState(false);

  const financialRef =
    useRef<HTMLDivElement>(null);

  const productionRef =
    useRef<HTMLDivElement>(null);

  const operationalRef =
    useRef<HTMLDivElement>(null);

  const insightRef =
    useRef<HTMLDivElement>(null);

useEffect(() => {

  const handleScroll = () => {
setIsHeaderHidden(window.scrollY > 40);
    const sections = [
      {
        key: "financial",
        ref: financialRef,
      },
      {
        key: "production",
        ref: productionRef,
      },
      {
        key: "operational",
        ref: operationalRef,
      },
      {
        key: "insight",
        ref: insightRef,
      },
    ];

    let currentSection = "financial";

    sections.forEach((section) => {

      const element =
        section.ref.current;

      if (!element) return;

      const rect =
        element.getBoundingClientRect();

      if (rect.top <= 140) {

        currentSection =
          section.key;

      }

    });

    setActiveSection(
      currentSection as any
    );

  };

  window.addEventListener(
    "scroll",
    handleScroll
  );

  handleScroll();

  return () => {

    window.removeEventListener(
      "scroll",
      handleScroll
    );

  };

}, []);

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
    <div className="space-y-3 pb-24">
      {/* HEADER: Efek Fade-in & Slide dari samping */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ 
          opacity: isHeaderHidden ? 0 : 1, 
          x: isHeaderHidden ? -20 : 0,
          display: isHeaderHidden ? "none" : "block"
        }}
        transition={{ duration: 0.3 }}
        className="pt-2"
      >
        <h1 className="text-2xl font-bold tracking-tight px-1">
          Dashboard
        </h1>
      </motion.div>

      <div className="sticky top-1 z-20 mb-2 pt-0">
        {/* NAV TABS: Animasi muncul dari bawah */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex gap-2 overflow-x-auto scrollbar-hide rounded-2xl border border-border/50 bg-background/70 backdrop-blur-xl p-2 shadow-sm"
        >
          {[
            { key: "financial", label: "Finansial" },
            { key: "production", label: "Produksi" },
            { key: "operational", label: "Operasional" },
            { key: "insight", label: "Insight" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveSection(tab.key as any);
                const sectionMap = {
                  financial: financialRef,
                  production: productionRef,
                  operational: operationalRef,
                  insight: insightRef,
                };
                sectionMap[tab.key as keyof typeof sectionMap]?.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeSection === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* TOOLBAR: Horizontal Slide */}
        <div className="mt-2 flex items-center justify-end gap-2 px-1">
          <div
            className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out ${
              showControls ? "max-w-[200px] opacity-100 translate-x-0" : "max-w-0 opacity-0 translate-x-4 pointer-events-none"
            }`}
          >
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-background shrink-0"
              onClick={handleRefreshSummary}
              disabled={isFetching}
            >
              <RefreshCcw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            </Button>

            <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
              <SelectTrigger className="h-7 w-[130px] bg-background text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Area</SelectItem>
                {areas.map((area: any) => (
                  <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={() => setShowControls(!showControls)}
            className="h-7 w-7 flex items-center justify-center shrink-0 rounded-lg border border-border/50 bg-background/80 text-muted-foreground hover:text-foreground transition-all duration-200 hover:bg-muted/50"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* SECTIONS: Efek Staggered Entry */}
      <div className="space-y-6">
        <motion.section
          ref={financialRef}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="scroll-mt-32"
        >
          <FinancialSection
            displayData={displayData}
            formatCurrency={formatCurrency}
            profitChartData={profitChartData}
          />
        </motion.section>

        <motion.section
          ref={productionRef}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="scroll-mt-32"
        >
          <ProductionSection
            displayData={displayData}
            areas={areas}
          />
        </motion.section>

        <motion.section
          ref={operationalRef}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="scroll-mt-32"
        >
          <OperationalSection
            harvestActivities={harvestActivities}
            expenseActivities={expenseActivities}
          />
        </motion.section>

        <motion.section
          ref={insightRef}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 }}
          className="scroll-mt-32"
        >
          <InsightSection
            displayData={displayData}
            localBusinessStatus={localBusinessStatus}
            localRecommendation={localRecommendation}
            formatCurrency={formatCurrency}
          />
        </motion.section>
      </div>
    </div>
  );

}
