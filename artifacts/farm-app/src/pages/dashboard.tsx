import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { animate, motion } from "framer-motion";
import { Bot, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { FinancialSection } from "@/components/FinancialSection";
import { InsightSection } from "@/components/InsightSection";
import { OperationalSection } from "@/components/OperationalSection";
import { ProductionSection } from "@/components/ProductionSection";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DashboardDateRange,
  DashboardSiklusFilter,
  DashboardSummary,
  DashboardTimeFilter,
} from "@/types/dashboard";

type DashboardSection = "financial" | "production" | "operational" | "insight";

type DisplayData = {
  modal: number;
  pendapatan: number;
  pengeluaran: number;
  profit: number;
  margin: number;
  harvestWeight: number;
};

const scrollReveal = {
  hidden: { opacity: 0, y: 40, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.8,
      ease: [0.21, 1.11, 0.81, 0.99],
    },
  },
};

const sectionItems: Array<{ key: DashboardSection; label: string }> = [
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

const formatYmd = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().split("T")[0];
};

function AnimatedNumber({
  value,
  formatFn,
}: {
  value: number;
  formatFn: (val: number) => string;
}) {
  const [displayValue, setDisplayValue] = useState(formatFn(0));
  const formatRef = useRef(formatFn);

  useEffect(() => {
    formatRef.current = formatFn;
  }, [formatFn]);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate: (latest) => setDisplayValue(formatRef.current(latest)),
    });

    return () => controls.stop();
  }, [value]);

  return <span>{displayValue}</span>;
}

const getMarginBg = (margin: number) => {
  if (margin >= 15) return "border-primary/20 bg-primary/10";
  if (margin > 0) return "border-accent/20 bg-accent/10";
  return "border-destructive/20 bg-destructive/10";
};

export function DashboardPage() {
  const [selectedAreaId, setSelectedAreaId] = useState("all");
  const [siklusFilter, setSiklusFilter] = useState<DashboardSiklusFilter>("aktif");
  const [timeFilter, setTimeFilter] = useState<DashboardTimeFilter>("Semua Waktu");
  const [customDateRange, setCustomDateRange] = useState<DashboardDateRange | null>(null);
  const [activeSection, setActiveSection] = useState<DashboardSection>("financial");

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
        if (element.getBoundingClientRect().top <= 92) currentSection = section.key;
      });

      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sectionRefs]);

  const resolvedDateRange = useMemo<DashboardDateRange | null>(() => {
    if (timeFilter === "Kustom") return customDateRange;
    if (timeFilter === "Semua Waktu") return null;

    const days = timeFilter === "7 Hari" ? 7 : timeFilter === "30 Hari" ? 30 : 90;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));

    return { start: formatYmd(start), end: formatYmd(end) };
  }, [timeFilter, customDateRange]);

  const { data: summary, isLoading: isLoadingSummary } = useQuery<DashboardSummary>({
    queryKey: [
      "dashboard-summary-v2",
      selectedAreaId,
      siklusFilter,
      resolvedDateRange?.start ?? null,
      resolvedDateRange?.end ?? null,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("siklus", siklusFilter);
      if (selectedAreaId !== "all") params.set("areaId", selectedAreaId);
      if (resolvedDateRange) {
        params.set("startDate", resolvedDateRange.start);
        params.set("endDate", resolvedDateRange.end);
      }

      const res = await fetch(`/api/dashboard/summary?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal mengambil data dashboard");
      }
      return res.json();
    },
  });

  const displayData = useMemo<DisplayData>(() => {
    if (!summary) return emptyDisplayData;
    return {
      modal: summary.financial.totalModal,
      pendapatan: summary.financial.totalPendapatan,
      pengeluaran: summary.financial.totalPengeluaran,
      profit: summary.financial.labaRugi,
      margin: summary.financial.marginTotal,
      harvestWeight: summary.production.totalHarvestWeight,
    };
  }, [summary]);

  const areas = summary?.areas ?? [];
  const areaOptions = summary?.filterOptions.areas ?? [];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Baru saja";
    try {
      return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: id });
    } catch {
      return dateString;
    }
  };

  const profitChartData = areas.map((area) => ({
    name: area.name,
    profit: area.profit || 0,
    produksi: area.harvestWeight || 0,
  }));

  const harvestActivities = summary?.activities.filter((activity) => activity.type === "harvest") ?? [];
  const expenseActivities = summary?.activities.filter((activity) => activity.type === "expense") ?? [];

  const localBusinessStatus = summary?.insight.businessStatus ?? "Developing";
  const localRecommendation = summary?.insight.recommendation ?? "Belum ada insight untuk scope ini.";

  const scrollToSection = (section: DashboardSection) => {
    setActiveSection(section);
    sectionRefs[section].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoadingSummary && !summary) {
    return (
      <div className="mt-4 space-y-5 px-4 md:px-6">
        <Skeleton className="h-16 rounded-[1.25rem]" />
        <Skeleton className="h-40 rounded-[1.25rem]" />
        <Skeleton className="h-44 rounded-[1.5rem]" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-36 rounded-[1.25rem]" />
          ))}
        </div>
      </div>
    );
  }

  const hpp = summary?.production.hpp ?? 0;
  const bepProgress = Math.min(summary?.financial.bepProgress ?? 0, 100);

  return (
    <div className="flex min-h-screen flex-col pb-20 font-sans">
      <main className="relative mx-auto w-full max-w-7xl overflow-x-clip px-4 pt-4 md:px-6">
        <div className="sticky top-2 z-30 md:top-4">
          <div className="w-full overflow-hidden rounded-[1.25rem] border border-border/50 bg-card/70 p-1.5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] backdrop-blur-md">
            <div className="relative z-20 grid grid-cols-4 gap-1">
              {sectionItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => scrollToSection(item.key)}
                  className="relative min-h-11 rounded-xl px-2 text-xs font-bold text-muted-foreground transition-colors duration-300 hover:text-foreground md:text-sm"
                >
                  {activeSection === item.key && (
                    <motion.span
                      layoutId="smart-section-pill"
                      className="absolute inset-0 rounded-xl bg-primary shadow-[0_4px_15px_-4px_rgba(0,0,0,0.16)]"
                      transition={{ type: "spring", bounce: 0.18, duration: 0.55 }}
                    />
                  )}
                  <span className={activeSection === item.key ? "relative z-10 text-primary-foreground" : "relative z-10"}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DashboardFilters
          areas={areaOptions}
          areaId={selectedAreaId}
          setAreaId={setSelectedAreaId}
          siklus={siklusFilter}
          setSiklus={setSiklusFilter}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          customDateRange={customDateRange}
          setCustomDateRange={setCustomDateRange}
        />

        <div className="relative mt-4 overflow-hidden rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl md:mt-6 md:rounded-[2.5rem] md:p-6 [transform:translateZ(0)]">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-[80px]" />

          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <p className="mb-1 text-xs font-bold text-white/60">Business pulse</p>
                <h2 className="text-2xl font-black text-white transition-colors duration-500 md:text-3xl">
                  {localBusinessStatus}
                </h2>
              </div>
              <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-md">
                <Bot className="h-6 w-6 text-white" />
              </div>
            </div>

            <div className="mt-5 md:mt-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className={`rounded-2xl border p-4 transition-colors duration-500 ${getMarginBg(displayData.margin)}`}>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">Margin</p>
                  <p className="text-2xl font-black text-white">
                    <AnimatedNumber
                      key={`margin-${selectedAreaId}-${siklusFilter}-${summary?.lastUpdated}`}
                      value={displayData.margin}
                      formatFn={(val) => `${val.toFixed(1)}%`}
                    />
                  </p>
                </div>

                <div className={`rounded-2xl border p-4 transition-colors duration-500 ${getMarginBg(displayData.margin)}`}>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">HPP / kg</p>
                  <p className="text-xl font-black text-white">
                    <AnimatedNumber
                      key={`hpp-${selectedAreaId}-${siklusFilter}-${summary?.lastUpdated}`}
                      value={hpp}
                      formatFn={formatCurrency}
                    />
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3.5">
                <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.15em]">
                  <span className="text-white/60">BEP Runway</span>
                  <span className="font-bold text-white">
                    <AnimatedNumber
                      key={`bep-${selectedAreaId}-${siklusFilter}-${summary?.lastUpdated}`}
                      value={bepProgress}
                      formatFn={(val) => `${val.toFixed(1)}%`}
                    />
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    key={`bep-bar-${selectedAreaId}-${siklusFilter}-${summary?.lastUpdated}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${bepProgress}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full rounded-full bg-primary"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-start gap-2">
              <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-[10px] font-medium text-white/80 sm:text-xs">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">Data Terkini: {formatDate(summary?.lastUpdated)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-8 md:mt-6 md:space-y-12">
          <section ref={financialRef} className="scroll-mt-[83px]">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={scrollReveal}>
              <FinancialSection displayData={displayData} formatCurrency={formatCurrency} profitChartData={profitChartData} />
            </motion.div>
          </section>

          <section ref={productionRef} className="scroll-mt-[74px]">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={scrollReveal}>
              <ProductionSection displayData={displayData} areas={areas} formatCurrency={formatCurrency} />
            </motion.div>
          </section>

          <section ref={operationalRef} className="scroll-mt-[74px]">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={scrollReveal}>
              <OperationalSection harvestActivities={harvestActivities} expenseActivities={expenseActivities} />
            </motion.div>
          </section>

          <section ref={insightRef} className="scroll-mt-[74px]">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={scrollReveal}>
              <InsightSection
                displayData={displayData}
                localBusinessStatus={localBusinessStatus}
                localRecommendation={localRecommendation}
                formatCurrency={formatCurrency}
              />
            </motion.div>
          </section>
        </div>
      </main>
    </div>
  );
}
