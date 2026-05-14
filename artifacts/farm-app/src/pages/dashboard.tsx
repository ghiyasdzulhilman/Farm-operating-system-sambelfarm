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
        // Ubah angkanya jadi 112 biar sensornya pas sama landing baru
        if (rect.top <= 80) {
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

  // --- PASTE MULAI DARI SINI ---
  const scrollToSection = (section: DashboardSection) => {
    setActiveSection(section);
    sectionRefs[section].current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // 1. CEK LOADING SCREEN
  if (isLoadingConnection) {
    return (
      <div className="mt-4 space-y-5 px-4 md:px-6">
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

  // 2. HITUNGAN VARIABEL (Hanya Dideklarasikan Sekali Di Sini)
  const hpp = displayData.pengeluaran / (displayData.harvestWeight || 1);
  
  const bepProgress = Math.min(
    (displayData.pendapatan / (displayData.modal || 1)) * 100,
    100
  );

    // 3. RENDER UI UTAMA
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F9F4] pb-20 font-sans dark:bg-slate-950">
      
      <main className="relative mx-auto w-full max-w-7xl overflow-x-clip px-4 pt-4 md:px-6">
        
                        {/* --- NAVIGASI PILL & FILTER (Versi Drawer / Pull-Tab) --- */}
        <div className="sticky top-2 z-30 flex flex-col md:top-4">
          <div className="w-full overflow-hidden rounded-[1.55rem] border border-white/60 bg-white/72 p-1.5 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
            
            {/* Baris 1: Segmented Control (Tetap Clean) */}
            <div className="relative z-20 grid grid-cols-4 gap-1">
              {sectionItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => scrollToSection(item.key)}
                  className="relative min-h-11 rounded-[1.15rem] px-2 text-xs font-bold text-muted-foreground transition-colors duration-300 hover:text-foreground md:text-sm"
                >
                  {activeSection === item.key && (
                    <motion.span
                      layoutId="smart-section-pill"
                      className="absolute inset-0 rounded-[1.15rem] bg-slate-950 shadow-md dark:bg-white"
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

            {/* Baris 2: Area Filter (Tengah & Super Smooth) */}
            <AnimatePresence initial={false}>
              {showControls && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  {/* pt-2 buat ngasih jarak dari pill atas pas lagi kebuka */}
                  <div className="pt-2">
                    {/* justify-center bikin itemnya ke tengah */}
                    <div className="flex items-center justify-center gap-2 rounded-2xl bg-white/40 py-2 dark:bg-black/20">
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-white shadow-sm dark:bg-slate-900"
                        onClick={handleRefreshSummary}
                        disabled={isFetching || isLoadingSummary}
                      >
                        <RefreshCcw className={`h-4 w-4 text-emerald-600 ${isFetching ? "animate-spin" : ""}`} />
                      </Button>

                      <Select value={selectedAreaId} onValueChange={setSelectedAreaId}>
                        <SelectTrigger className="h-8 w-[130px] rounded-full border-none bg-white px-3 text-xs font-bold shadow-sm focus:ring-0 dark:bg-slate-900">
                          <Leaf className="mr-1.5 h-3 w-3 text-emerald-600" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all" className="text-xs font-semibold">Semua Area</SelectItem>
                          {areas.map((area: any) => (
                            <SelectItem key={area.id} value={area.id} className="text-xs font-semibold">
                              {area.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tombol Panah Kecil (Pull-Tab) di tengah bawah */}
          <div className="relative z-10 -mt-1 flex w-full justify-center">
            <button
              onClick={() => setShowControls(!showControls)}
              className="flex h-5 w-12 items-center justify-center rounded-b-xl border-x border-b border-white/60 bg-white/72 shadow-[0_4px_10px_rgba(0,0,0,0.05)] backdrop-blur-2xl transition-colors hover:bg-white dark:border-white/10 dark:bg-slate-950/70"
              aria-label="Toggle dashboard filters"
            >
              <ChevronDown
                className={`h-3 w-3 text-muted-foreground transition-transform duration-300 ${
                  showControls ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* --- CARD BUSINESS PULSE & BEP SLIM (Sekarang di Bawah Navigasi) --- */}
        <div className="relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl md:mt-6 md:rounded-[2.5rem] md:p-6">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-[80px]" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-xs font-bold text-white/50">Business pulse</p>
                <h2 className="text-2xl font-black md:text-3xl">{localBusinessStatus}</h2>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-md">
                <Bot className="h-6 w-6 text-emerald-400" />
              </div>
            </div>

            <div className="mt-5 md:mt-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">Margin</p>
                  <p className="text-2xl font-black">
                    <AnimatedNumber 
                      key={`margin-${selectedAreaId}-${summary?.lastUpdated}`}
                      value={displayData.margin} 
                      formatFn={(val) => `${val.toFixed(1)}%`} 
                    />
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">HPP / kg</p>
                  <p className="text-xl font-black">
                    <AnimatedNumber 
                      key={`hpp-${selectedAreaId}-${summary?.lastUpdated}`}
                      value={hpp} 
                      formatFn={(val) => formatCurrency(val)} 
                    />
                  </p>
                </div>
              </div>

              {/* BEP Runway Bar (Slim Mode) */}
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
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

                        {/* --- SECTION KONTEN --- */}
        <div className="mt-4 space-y-4 md:mt-6 md:space-y-6">
          <section ref={financialRef} className="scroll-mt-[75px]">
            <FinancialSection
              displayData={displayData}
              formatCurrency={formatCurrency}
              profitChartData={profitChartData}
            />
          </section>

          <section ref={productionRef} className="scroll-mt-[108px]">
            <ProductionSection
              displayData={displayData}
              areas={areas}
              formatCurrency={formatCurrency}
            />
          </section>

          <section ref={operationalRef} className="scroll-mt-[108px]">
            <OperationalSection
              harvestActivities={harvestActivities}
              expenseActivities={expenseActivities}
            />
          </section>

          <section ref={insightRef} className="scroll-mt-[108px]">
            <InsightSection
              displayData={displayData}
              localBusinessStatus={localBusinessStatus}
              localRecommendation={localRecommendation}
              formatCurrency={formatCurrency}
            />
          </section>
        </div>
        
      </main>
    </div>
  );
}