import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Filter,
  Leaf,
  RefreshCcw,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGetDashboardSummaryQueryKey,
  getGetNotionConnectionStatusQueryKey,
  useGetNotionConnectionStatus,
} from "@workspace/api-client-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FinancialSection } from "@/components/FinancialSection";
import { InsightSection } from "@/components/InsightSection";
import { OperationalSection } from "@/components/OperationalSection";
import { ProductionSection } from "@/components/ProductionSection";

type DashboardSection = "financial" | "production" | "operational" | "insight";

const sections: Array<{
  key: DashboardSection;
  label: string;
  icon: typeof WalletCards;
}> = [
  { key: "financial", label: "Financial", icon: WalletCards },
  { key: "production", label: "Production", icon: BarChart3 },
  { key: "operational", label: "Ops", icon: Activity },
  { key: "insight", label: "Insight", icon: BrainCircuit },
];

const emptyDisplayData = {
  modal: 0,
  pendapatan: 0,
  pengeluaran: 0,
  profit: 0,
  margin: 0,
  harvestWeight: 0,
};

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all");
  const [activeSection, setActiveSection] = useState<DashboardSection>("financial");
  const [showControls, setShowControls] = useState(false);

  const financialRef = useRef<HTMLDivElement>(null);
  const productionRef = useRef<HTMLDivElement>(null);
  const operationalRef = useRef<HTMLDivElement>(null);
  const insightRef = useRef<HTMLDivElement>(null);

  const sectionRefs = useMemo(
    () => ({
      financial: financialRef,
      production: productionRef,
      operational: operationalRef,
      insight: insightRef,
    }),
    []
  );

  useEffect(() => {
    const handleScroll = () => {
      let currentSection: DashboardSection = "financial";

      sections.forEach((section) => {
        const element = sectionRefs[section.key].current;
        if (!element) return;

        const rect = element.getBoundingClientRect();
        if (rect.top <= 280) currentSection = section.key;
      });

      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [sectionRefs]);

  const { data: connectionStatus, isLoading: isLoadingConnection } =
    useGetNotionConnectionStatus({
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

  const displayData = useMemo(() => {
    if (!summary) return emptyDisplayData;

    if (selectedAreaId === "all") {
      return {
        modal: summary.financial?.totalModal || 0,
        pendapatan: summary.financial?.totalPendapatan || 0,
        pengeluaran: summary.financial?.totalPengeluaran || 0,
        profit: summary.financial?.labaRugi || 0,
        margin: summary.financial?.marginTotal || 0,
        harvestWeight: summary.production?.totalHarvestWeight || 0,
      };
    }

    const area = areas.find((item: any) => item.id === selectedAreaId);
    if (!area) return emptyDisplayData;

    return {
      modal: area.modalAwal || 0,
      pendapatan: area.pendapatan || 0,
      pengeluaran: area.pengeluaran || 0,
      profit: area.profit || 0,
      margin: area.margin || 0,
      harvestWeight: area.harvestWeight || 0,
    };
  }, [summary, selectedAreaId, areas]);

  const selectedAreaName =
    selectedAreaId === "all"
      ? "All growing areas"
      : areas.find((area: any) => area.id === selectedAreaId)?.name ||
        "Selected area";

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Belum pernah diperbarui";
    try {
      return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: id });
    } catch {
      return dateString;
    }
  };

  const localBusinessStatus = displayData.margin > 0 ? "Profitable" : "Developing";

  const localRecommendation =
    displayData.margin < 0
      ? "Margin turun di bawah nol. Prioritaskan renegosiasi input dan cek aktivitas boros minggu ini."
      : displayData.margin < 15
        ? "Margin sehat tetapi tipis. Optimalkan HPP/kg dan dorong panen dari area produktif."
        : "Performa area kuat. Pertahankan ritme panen dan simulasikan ekspansi area terbaik.";

  const profitChartData = areas.map((area: any) => ({
    name: area.name,
    profit: area.profit,
    pendapatan: area.pendapatan,
    pengeluaran: area.pengeluaran,
  }));

  const harvestActivities =
    summary?.activities?.filter((activity: any) => activity.type === "harvest") || [];

  const expenseActivities =
    summary?.activities?.filter((activity: any) => activity.type === "expense") || [];

  const handleRefreshSummary = () => {
    queryClient.invalidateQueries({
      queryKey: getGetDashboardSummaryQueryKey(),
    });
    refetch();
  };

  const scrollToSection = (section: DashboardSection) => {
    setActiveSection(section);
    sectionRefs[section].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (isLoadingConnection) {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <Skeleton className="h-28 rounded-[2rem]" />
        <div className="grid gap-3 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-32 rounded-[1.5rem]" />
          ))}
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <Alert className="mx-auto max-w-3xl rounded-3xl border-amber-200 bg-amber-50/70 p-6 text-amber-950 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
        <AlertTitle className="flex items-center gap-2 text-lg">
          <Leaf className="h-5 w-5" /> Sambel Farm belum tersambung ke Notion
        </AlertTitle>
        <AlertDescription className="mt-2 text-sm text-amber-800 dark:text-amber-200/80">
          Hubungkan database Notion terlebih dahulu agar dashboard finansial,
          produksi, operasional, dan insight dapat membaca data terbaru.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="sambel-dashboard relative mx-[calc(50%-50vw)] -mt-4 min-h-screen overflow-x-clip px-4 pb-12 pt-4 md:-mt-6 md:px-6 md:pt-6">

      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(35,116,83,0.18),transparent_34%),radial-gradient(circle_at_86%_8%,rgba(202,138,4,0.12),transparent_30%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted))/0.45)]" />

      <div className="mx-auto max-w-6xl space-y-5 md:space-y-7">
        
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="overflow-hidden rounded-[2rem] border border-white/50 bg-white/70 p-5 shadow-[0_24px_80px_rgba(20,83,45,0.12)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.06] md:p-7"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Live Notion Database API
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 md:w-[360px]">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3 backdrop-blur-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Area scope
                </p>
                <p className="mt-1 truncate text-sm font-bold">
                  {selectedAreaName}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-3 backdrop-blur-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Updated
                </p>
                <p className="mt-1 truncate text-sm font-bold">
                  {formatDate(summary?.lastUpdated || null)}
                </p>
              </div>
            </div>
          </div>
        </motion.header>

        <div className="sticky top-2 z-30 space-y-2 md:top-3">
          <nav className="rounded-[1.65rem] border border-white/60 bg-white/65 p-1.5 shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55">
            <div className="grid grid-cols-4 gap-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.key;

                return (
                  <button
                    key={section.key}
                    onClick={() => scrollToSection(section.key)}
                    className="relative flex h-11 items-center justify-center rounded-2xl px-2 text-xs font-bold transition-colors duration-300 md:gap-2 md:text-sm"
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sambel-active-section-pill"
                        className="absolute inset-0 rounded-2xl bg-slate-950 shadow-[0_10px_26px_rgba(15,23,42,0.20)] dark:bg-white"
                        transition={{
                          type: "spring",
                          stiffness: 420,
                          damping: 34,
                        }}
                      />
                    )}
                    <Icon
                      className={`relative h-4 w-4 ${isActive ? "text-white dark:text-slate-950" : "text-muted-foreground"}`}
                    />
                    <span
                      className={`relative hidden sm:inline ${isActive ? "text-white dark:text-slate-950" : "text-muted-foreground"}`}
                    >
                      {section.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex justify-end">
            <div className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/65 p-1.5 shadow-lg backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/55">
              <div
                className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ease-out ${
                  showControls
                    ? "max-w-[260px] translate-x-0 opacity-100"
                    : "max-w-0 translate-x-4 opacity-0"
                }`}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl bg-background/70"
                  onClick={handleRefreshSummary}
                  disabled={isFetching || isLoadingSummary}
                  aria-label="Refresh dashboard summary"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                  />
                </Button>

                <Select
                  value={selectedAreaId}
                  onValueChange={setSelectedAreaId}
                >
                  <SelectTrigger className="h-9 w-[168px] rounded-xl border-0 bg-background/70 text-xs font-semibold shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Area</SelectItem>
                    {areas.map((area: any) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <button
                onClick={() => setShowControls((value) => !value)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 active:scale-95 ${
                  showControls
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                    : "bg-background/70 text-muted-foreground hover:text-foreground"
                }`}
                aria-label="Toggle contextual filters"
              >
                {showControls ? (
                  <Filter className="h-4 w-4" />
                ) : (
                  <SlidersHorizontal className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <section ref={financialRef} className="scroll-mt-36 space-y-4">
          <SectionEyebrow
            icon={WalletCards}
            label="Financial analytics"
            description="Modal, pendapatan, pengeluaran, profit, margin, HPP, dan BEP dalam bahasa operator."
          />
          <FinancialSection
            displayData={displayData}
            formatCurrency={formatCurrency}
            profitChartData={profitChartData}
          />
        </section>

        <section ref={productionRef} className="scroll-mt-36 space-y-4">
          <SectionEyebrow
            icon={BarChart3}
            label="Production intelligence"
            description="Statistik panen, produktivitas area, dan visual kg yang ringan untuk layar kecil."
          />
          <ProductionSection
            displayData={displayData}
            areas={areas}
            formatCurrency={formatCurrency}
          />
        </section>

        <section ref={operationalRef} className="scroll-mt-36 space-y-4">
          <SectionEyebrow
            icon={Activity}
            label="Operational pulse"
            description="Feed aktivitas real-time dari pencatatan panen dan pengeluaran operasional."
          />
          <OperationalSection
            harvestActivities={harvestActivities}
            expenseActivities={expenseActivities}
          />
        </section>

        <section ref={insightRef} className="scroll-mt-36 space-y-4">
          <SectionEyebrow
            icon={Sparkles}
            label="Smart recommendations"
            description="Rekomendasi seperti asisten analitik untuk keputusan harian kebun."
          />
          <InsightSection
            displayData={displayData}
            localBusinessStatus={localBusinessStatus}
            localRecommendation={localRecommendation}
            formatCurrency={formatCurrency}
          />
        </section>
      </div>
    </div>
  );
}

function SectionEyebrow({
  icon: Icon,
  label,
  description,
}: {
  icon: typeof TrendingUp;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 px-1 pt-1">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black tracking-[-0.03em] md:text-2xl">
            {label}
          </h2>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </div>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
