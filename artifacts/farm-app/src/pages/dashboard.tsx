import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { motion, AnimatePresence, animate } from "framer-motion";
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  Filter,
  Leaf,
  RefreshCcw,
  Satellite,
  Sparkles,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGetDashboardSummaryQueryKey,
  getGetNotionConnectionStatusQueryKey,
  useGetNotionConnectionStatus,
} from "@workspace/api-client-react";

import { FinancialSection } from "@/components/FinancialSection";
import { InsightSection } from "@/components/InsightSection";
import { OperationalSection } from "@/components/OperationalSection";
import { ProductionSection } from "@/components/ProductionSection";
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
import { Link } from "wouter";

type DashboardSection = "financial" | "production" | "operational" | "insight";

type DisplayData = {
  modal: number;
  pendapatan: number;
  pengeluaran: number;
  profit: number;
  margin: number;
  harvestWeight: number;
};

const sectionItems: Array<{
  key: DashboardSection;
  label: string;
}> = [
  { key: "financial", label: "Financial" },
  { key: "production", label: "Production" },
  { key: "operational", label: "Operational" },
  { key: "insight", label: "Insight" },
];

const emptyDisplayData: DisplayData = {
  modal: 0,
  pendapatan: 0,
  pengeluaran: 0,
  profit: 0,
  margin: 0,
  harvestWeight: 0,
};

function AnimatedNumber({ 
  value, 
  formatFn 
}: { 
  value: number; 
  formatFn: (val: number) => string 
}) {
  const [displayValue, setDisplayValue] = useState(formatFn(0));

  // Trik biar animasi ga ke-trigger cuma gara-gara buka/tutup menu filter
  const formatRef = useRef(formatFn);
  useEffect(() => {
    formatRef.current = formatFn;
  }, [formatFn]);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (latest) => {
        setDisplayValue(formatRef.current(latest));
      },
    });

    return () => controls.stop();
  }, [value]); // Kunci utama: Animasi cuma ngulang kalo 'value' nya berubah

  return <span>{displayValue}</span>;
}



export function DashboardPage() {
  const queryClient = useQueryClient();
  const [selectedAreaId, setSelectedAreaId] = useState("all");
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

      sectionItems.forEach((section) => {
        const element = sectionRefs[section.key].current;
        if (!element) return;

        const rect = element.getBoundingClientRect();
        // Cek posisi biar tab otomatis ganti
        if (rect.top <= 156) {
          currentSection = section.key;
        }
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
  const isTokenInvalid = isConnected && connectionStatus?.tokenStatus === "invalid";

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

  const displayData = useMemo<DisplayData>(() => {
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Belum tersinkron";
    try {
      return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: id });
    } catch {
      return dateString;
    }
  };

  const profitChartData = areas.map((area: any) => ({
    name: area.name,
    profit: area.profit || 0,
    produksi: area.harvestWeight || 0,
  }));

  const harvestActivities =
    summary?.activities?.filter((activity: any) => activity.type === "harvest") || [];

  const expenseActivities =
    summary?.activities?.filter((activity: any) => activity.type === "expense") || [];

    // HPP
  const hpp = displayData.pengeluaran / (displayData.harvestWeight || 1);
  
  // HITUNG BEP
  const bepProgress = Math.min(
    (displayData.pendapatan / (displayData.modal || 1)) * 100,
    100
  );

  const localBusinessStatus = displayData.margin > 0 ? "Profitable" : "Developing";
  
  const localRecommendation =
    displayData.margin < 0
      ? "Margin turun. Kurangi biaya variabel dan audit input area prioritas."
      : displayData.margin < 15
        ? "Margin tipis. Optimalkan HPP per kg dan jadwal panen bernilai tinggi."
        : "Unit farming sehat. Scale area paling produktif sambil menjaga HPP.";

  const handleRefreshSummary = () => {
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    refetch();
  };

  const scrollToSection = (section: DashboardSection) => {
    setActiveSection(section);
    sectionRefs[section].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

return (
  

  if (isLoadingConnection) {
    return (
      <div className="space-y-5 px-4 md:px-6 mt-4">
        <Skeleton className="h-44 rounded-[2rem]" />
        <Skeleton className="h-16 rounded-3xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-36 rounded-[1.75rem]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-7xl pb-10 overflow-x-clip px-4 md:px-6">
      {/* Background Gradient Effect */}
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_20%_10%,rgba(34,197,94,0.18),transparent_34%),radial-gradient(circle_at_85%_5%,rgba(245,158,11,0.18),transparent_30%)]" />

      {/* Banner: Token Invalid */}
      {isTokenInvalid && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <Alert variant="destructive" className="rounded-2xl border-destructive/40 bg-destructive/5">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Koneksi Notion Terputus</AlertTitle>
            <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>Token akses Notion Anda tidak valid. Data kebun tidak dapat dimuat.</span>
              <Link href="/connect">
                <button className="mt-2 sm:mt-0 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-destructive px-4 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  Hubungkan Ulang
                </button>
              </Link>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

              {/* Business pulse Card */}
        <div className="relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl md:mt-6 md:p-6 md:rounded-[2.5rem]">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-[80px]" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-white/50 mb-1">Business pulse</p>
                <h2 className="text-2xl font-black md:text-3xl">Profitable</h2>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-md">
                <Bot className="h-6 w-6 text-emerald-400" />
              </div>
            </div>

            <div className="mt-5 md:mt-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                  <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1">Margin</p>
                  <p className="text-2xl font-black">
                    <AnimatedNumber 
                      key={`margin-${selectedAreaId}-${summary?.lastUpdated}`}
                      value={displayData.margin} 
                      formatFn={(val) => `${val.toFixed(1)}%`} 
                    />
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 p-4 border border-white/10">
                  <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.15em] mb-1">HPP / kg</p>
                  <p className="text-xl font-black">
                    <AnimatedNumber 
                      key={`hpp-${selectedAreaId}-${summary?.lastUpdated}`}
                      value={hpp} 
                      formatFn={(val) => formatCurrency(val)} 
                    />
                  </p>
                </div>
              </div>

              {/* --- INI DIA BEP SLIM BAR YANG BARU --- */}
              <div className="mt-3 rounded-2xl bg-white/5 p-3.5 border border-white/10">
                <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.15em]">
                  <span className="text-white/50">BEP Runway</span>
                  <span className="text-emerald-300">
                    <AnimatedNumber 
                      key={`bep-${selectedAreaId}-${summary?.lastUpdated}`}
                      value={bepProgress} 
                      formatFn={(val) => `${val.toFixed(1)}%`} 
                    />
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    key={`bep-bar-${selectedAreaId}-${summary?.lastUpdated}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${bepProgress}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-lime-400 to-amber-300"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-white/55">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" />
              <span>Sync terakhir: {formatDate(summary?.lastUpdated)}</span>
            </div>
          </div>
        </div>



            
            <div className="flex items-center gap-2 text-xs text-white/55">
              <Sparkles className="h-3.5 w-3.5 text-amber-200" />
              Sync terakhir: {formatDate(summary?.lastUpdated || null)}
            </div>
          </CardContent>
        </Card>
      </div>

                        {/* Navigasi Pill Segmented & Filter (Super Rapat) */}
      <div className="sticky top-2 z-30 mt-3 flex flex-col gap-1.5 md:top-4 md:mt-4">
        
        {/* Segmented Pill (Lebar Full) */}
        <div className="w-full rounded-[1.55rem] border border-white/60 bg-white/72 p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
          <div className="grid grid-cols-4 gap-1">
            {sectionItems.map((item) => (
              <button
                key={item.key}
                onClick={() => scrollToSection(item.key)}
                className="relative min-h-11 rounded-[1.15rem] px-2 text-xs font-bold text-muted-foreground transition-colors duration-300 hover:text-foreground md:text-sm"
              >
                {activeSection === item.key && (
                  <motion.span
                    layoutId="smart-section-pill"
                    className="absolute inset-0 rounded-[1.15rem] bg-slate-950 shadow-lg dark:bg-white"
                    transition={{ type: "spring", bounce: 0.18, duration: 0.55 }}
                  />
                )}
                <span
                  className={
                    activeSection === item.key
                      ? "relative z-10 text-white dark:text-slate-950"
                      : "relative z-10"
                  }
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar Filter Micro-UI (Murni Filter Rata Kanan) */}
        <div className="flex w-full justify-end px-1">
          <div className="flex items-center gap-1 rounded-full border border-white/60 bg-white/72 p-0.5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
            <div
              className={`flex items-center gap-1 overflow-hidden transition-all duration-500 ease-out ${
                showControls
                  ? "max-w-[180px] translate-x-0 opacity-100"
                  : "max-w-0 translate-x-4 opacity-0"
              }`}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 rounded-full bg-muted/60"
                onClick={handleRefreshSummary}
                disabled={isFetching || isLoadingSummary}
              >
                <RefreshCcw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
              </Button>

              <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                <SelectTrigger className="h-6 w-[110px] rounded-full border-none bg-background/60 px-2.5 text-[10px] font-bold shadow-none focus:ring-0 dark:bg-white/5">
                  <Leaf className="mr-1.5 h-3 w-3 text-emerald-600" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[10px] font-semibold">Semua Area</SelectItem>
                  {areas.map((area: any) => (
                    <SelectItem key={area.id} value={area.id} className="text-[10px] font-semibold">
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              onClick={() => setShowControls((value) => !value)}
              className="flex h-6 min-w-[24px] items-center justify-center gap-1 rounded-full bg-slate-950 px-2 text-white shadow-sm transition-all duration-300 active:scale-95 dark:bg-white dark:text-slate-950"
              aria-label="Toggle dashboard filters"
            >
              <Filter className="h-3 w-3" />
              <ChevronDown
                className={`h-2.5 w-2.5 transition-transform duration-300 ${
                  showControls ? "rotate-180" : "hidden" 
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Konten Utama (Jarak super rapet) */}
      <div className="mt-1.5 space-y-4 md:mt-1.5 md:space-y-6">

        <section ref={financialRef} className="scroll-mt-32">


          <FinancialSection
            displayData={displayData}
            formatCurrency={formatCurrency}
            profitChartData={profitChartData}
          />
        </section>

        <section ref={productionRef} className="scroll-mt-36">
          <ProductionSection
            displayData={displayData}
            areas={areas}
            formatCurrency={formatCurrency}
          />
        </section>

        <section ref={operationalRef} className="scroll-mt-36">
          <OperationalSection
            harvestActivities={harvestActivities}
            expenseActivities={expenseActivities}
          />
        </section>

        <section ref={insightRef} className="scroll-mt-36">
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
