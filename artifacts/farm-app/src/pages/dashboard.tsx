import { useEffect, useMemo, useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
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
  DashboardCycleStatusFilter,
  DashboardDataset,
  DashboardDateRange,
  DashboardDerivedSummary,
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
    transition: { duration: 0.8, ease: [0.21, 1.11, 0.81, 0.99] },
  },
};

const sectionItems: Array<{ key: DashboardSection; label: string }> = [
  { key: "financial", label: "Financial" },
  { key: "production", label: "Production" },
  { key: "operational", label: "Operational" },
  { key: "insight", label: "Insight" },
];

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

function deriveSummary(
  dataset: DashboardDataset,
  contextId: string,
  dateRange: DashboardDateRange | null
): DashboardDerivedSummary {
  const selectedContexts =
    contextId === "all"
      ? dataset.contexts
      : dataset.contexts.filter((context) => context.siklusId === contextId);

  const selectedCycleIds = new Set(selectedContexts.map((context) => context.siklusId));
  const isFarmWide = contextId === "all";

  const inDateRange = (date: string) => !dateRange || (date >= dateRange.start && date <= dateRange.end);

  const facts = dataset.facts.filter((fact) => {
    if (!isFarmWide && (!fact.siklusId || !selectedCycleIds.has(fact.siklusId))) return false;
    return inDateRange(fact.date);
  });

  const costFacts = (dataset.costFacts ?? []).filter((fact) => {
    if (!isFarmWide && (!fact.siklusId || !selectedCycleIds.has(fact.siklusId))) return false;
    return inDateRange(fact.date);
  });

  const totalModal = selectedContexts.reduce((sum, context) => sum + context.modalAwal, 0);
  const totalPendapatan = facts.reduce((sum, fact) => sum + fact.pendapatan, 0);
  const totalPengeluaran = facts.reduce((sum, fact) => sum + fact.pengeluaran, 0);
  const totalHarvestWeight = facts.reduce((sum, fact) => sum + fact.harvestWeight, 0);
  const labaRugi = totalPendapatan - totalPengeluaran;
  const marginTotal =
    totalPendapatan > 0 ? (labaRugi / totalPendapatan) * 100 : totalPengeluaran > 0 ? -100 : 0;
  const cashCostPerKg = totalHarvestWeight > 0 ? totalPengeluaran / totalHarvestWeight : 0;
  const averageRevenuePerKg = totalHarvestWeight > 0 ? totalPendapatan / totalHarvestWeight : 0;
  const bepProgress = totalModal > 0 ? (totalPendapatan / totalModal) * 100 : 0;

  const categoryMap = new Map<string, { kategoriId: string | null; name: string; amount: number }>();
  for (const fact of costFacts) {
    const key = fact.kategoriId ?? `name:${fact.kategoriName}`;
    const current = categoryMap.get(key) ?? {
      kategoriId: fact.kategoriId,
      name: fact.kategoriName,
      amount: 0,
    };
    current.amount += fact.totalBiaya;
    categoryMap.set(key, current);
  }

  const costBreakdown = Array.from(categoryMap.values())
    .map((item) => ({
      ...item,
      percentage: totalPengeluaran > 0 ? (item.amount / totalPengeluaran) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const areasMap = new Map<
    string,
    { id: string; name: string; modalAwal: number; pendapatan: number; pengeluaran: number; harvestWeight: number }
  >();

  for (const context of selectedContexts) {
    const current = areasMap.get(context.areaId) ?? {
      id: context.areaId,
      name: context.areaName,
      modalAwal: 0,
      pendapatan: 0,
      pengeluaran: 0,
      harvestWeight: 0,
    };
    current.modalAwal += context.modalAwal;
    areasMap.set(context.areaId, current);
  }

  for (const fact of facts) {
    if (!fact.areaId || !fact.siklusId) continue;
    if (!selectedCycleIds.has(fact.siklusId)) continue;
    const context = dataset.contexts.find((item) => item.areaId === fact.areaId && item.siklusId === fact.siklusId);
    const current = areasMap.get(fact.areaId) ?? {
      id: fact.areaId,
      name: context?.areaName ?? "Area",
      modalAwal: 0,
      pendapatan: 0,
      pengeluaran: 0,
      harvestWeight: 0,
    };
    current.pendapatan += fact.pendapatan;
    current.pengeluaran += fact.pengeluaran;
    current.harvestWeight += fact.harvestWeight;
    areasMap.set(fact.areaId, current);
  }

  const areas = Array.from(areasMap.values()).map((area) => {
    const profit = area.pendapatan - area.pengeluaran;
    const margin = area.pendapatan > 0 ? (profit / area.pendapatan) * 100 : area.pengeluaran > 0 ? -100 : 0;
    return { ...area, profit, margin };
  });

  const activities = dataset.activities
    .filter((activity) => {
      if (!isFarmWide && (!activity.siklusId || !selectedCycleIds.has(activity.siklusId))) return false;
      const activityDate = formatYmd(new Date(activity.occurredAt));
      return inDateRange(activityDate);
    })
    .slice(0, 8);

  return {
    financial: {
      totalModal,
      totalPendapatan,
      totalPengeluaran,
      labaRugi,
      marginTotal,
      bepProgress,
      cashCostPerKg,
      costBreakdown,
    },
    production: {
      totalHarvestWeight,
      hpp: cashCostPerKg,
      averageRevenuePerKg,
    },
    operational: {
      totalAreas: new Set(selectedContexts.map((context) => context.areaId)).size,
      activeAreas:
        dataset.cycleStatus === "aktif"
          ? new Set(selectedContexts.map((context) => context.areaId)).size
          : 0,
    },
    insight: {
      businessStatus: marginTotal > 0 ? "Profitable" : "Developing",
      recommendation:
        marginTotal < 0
          ? "Cash position masih negatif pada scope ini. Cek kategori biaya terbesar dan progres pendapatan panen."
          : marginTotal < 15
            ? "Cash margin masih tipis. Prioritaskan efisiensi kategori biaya terbesar."
            : "Cash performance pada scope ini berada dalam kondisi baik.",
    },
    areas,
    activities,
  };
}

export function DashboardPage() {
  const [cycleStatus, setCycleStatus] = useState<DashboardCycleStatusFilter>("aktif");
  const [selectedContextId, setSelectedContextId] = useState("all");
  const [timeFilter, setTimeFilter] = useState<DashboardTimeFilter>("Semua Waktu");
  const [customDateRange, setCustomDateRange] = useState<DashboardDateRange | null>(null);
  const [activeSection, setActiveSection] = useState<DashboardSection>("financial");

  const financialRef = useRef<HTMLDivElement>(null);
  const productionRef = useRef<HTMLDivElement>(null);
  const operationalRef = useRef<HTMLDivElement>(null);
  const insightRef = useRef<HTMLDivElement>(null);

  const sectionRefs = useMemo(
    () => ({ financial: financialRef, production: productionRef, operational: operationalRef, insight: insightRef }),
    []
  );

  useEffect(() => {
    const handleScroll = () => {
      let currentSection: DashboardSection = "financial";
      sectionItems.forEach((section) => {
        const element = sectionRefs[section.key].current;
        if (element && element.getBoundingClientRect().top <= 92) currentSection = section.key;
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

  const {
    data: dataset,
    isLoading,
    isFetching,
  } = useQuery<DashboardDataset>({
    queryKey: ["dashboard-dataset-v2", cycleStatus],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/summary?status=${cycleStatus}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal mengambil data dashboard");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const summary = useMemo(
    () => (dataset ? deriveSummary(dataset, selectedContextId, resolvedDateRange) : null),
    [dataset, selectedContextId, resolvedDateRange]
  );

  const displayData: DisplayData = summary
    ? {
        modal: summary.financial.totalModal,
        pendapatan: summary.financial.totalPendapatan,
        pengeluaran: summary.financial.totalPengeluaran,
        profit: summary.financial.labaRugi,
        margin: summary.financial.marginTotal,
        harvestWeight: summary.production.totalHarvestWeight,
      }
    : { modal: 0, pendapatan: 0, pengeluaran: 0, profit: 0, margin: 0, harvestWeight: 0 };

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

  const visibleActivities = (summary?.activities ?? []).map((activity) => ({
    ...activity,
    time: formatDistanceToNow(new Date(activity.occurredAt), { addSuffix: true, locale: id }),
  }));

  const harvestActivities = visibleActivities.filter((activity) => activity.type === "harvest");
  const expenseActivities = visibleActivities.filter((activity) => activity.type === "expense");

  const scrollToSection = (section: DashboardSection) => {
    setActiveSection(section);
    sectionRefs[section].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isLoading && !dataset) {
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

  const cashCostPerKg = summary?.financial.cashCostPerKg ?? 0;
  const recoveryProgress = Math.min(summary?.financial.bepProgress ?? 0, 100);
  const contextKey = selectedContextId === "all" ? cycleStatus : selectedContextId;

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
          contexts={dataset?.contexts ?? []}
          contextId={selectedContextId}
          setContextId={setSelectedContextId}
          cycleStatus={cycleStatus}
          setCycleStatus={setCycleStatus}
          timeFilter={timeFilter}
          setTimeFilter={setTimeFilter}
          customDateRange={customDateRange}
          setCustomDateRange={setCustomDateRange}
        />

        {isFetching && (
          <div className="mt-2 text-center text-[10px] font-semibold text-muted-foreground">
            Memuat data siklus {cycleStatus === "aktif" ? "aktif" : "selesai"}…
          </div>
        )}

        <div className="relative mt-4 overflow-hidden rounded-[1.5rem] border border-border/40 bg-card/70 p-4 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] backdrop-blur-md md:mt-6 md:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Business pulse</p>
              <h2 className="mt-0.5 text-2xl font-black tracking-[-0.05em] text-foreground">
                {summary?.insight.businessStatus ?? "Developing"}
              </h2>
              <p className="mt-1 max-w-xl text-[11px] font-medium leading-relaxed text-muted-foreground">
                {summary?.insight.recommendation ?? "Belum ada insight untuk scope ini."}
              </p>
            </div>
            <div className="rounded-xl border border-border/30 bg-background/70 p-2.5">
              <Bot className="h-5 w-5 text-primary" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className={`rounded-xl border p-3 ${getMarginBg(displayData.margin)}`}>
              <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Margin</p>
              <p className="mt-1 text-xl font-black tracking-[-0.04em] text-foreground">
                <AnimatedNumber key={`margin-${contextKey}-${resolvedDateRange?.start ?? "all"}`} value={displayData.margin} formatFn={(val) => `${val.toFixed(1)}%`} />
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-background/50 p-3">
              <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-muted-foreground">Cash cost / kg</p>
              <p className="mt-1 text-lg font-black tracking-[-0.04em] text-foreground">
                <AnimatedNumber key={`cash-cost-${contextKey}-${resolvedDateRange?.start ?? "all"}`} value={cashCostPerKg} formatFn={formatCurrency} />
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-border/30 bg-muted/20 p-3">
            <div className="mb-2 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.13em]">
              <span className="text-muted-foreground">Pemulihan modal awal</span>
              <span className="text-foreground">
                <AnimatedNumber key={`recovery-${contextKey}-${resolvedDateRange?.start ?? "all"}`} value={recoveryProgress} formatFn={(val) => `${val.toFixed(1)}%`} />
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                key={`recovery-bar-${contextKey}-${resolvedDateRange?.start ?? "all"}`}
                initial={{ width: 0 }}
                animate={{ width: `${recoveryProgress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-primary"
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">Data dataset: {formatDate(dataset?.meta.generatedAt)}</span>
          </div>
        </div>

        <div className="mt-4 space-y-8 md:mt-6 md:space-y-12">
          <section ref={financialRef} className="scroll-mt-[83px]">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={scrollReveal}>
              <FinancialSection
                financial={summary?.financial ?? {
                  totalModal: 0,
                  totalPendapatan: 0,
                  totalPengeluaran: 0,
                  labaRugi: 0,
                  marginTotal: 0,
                  bepProgress: 0,
                  cashCostPerKg: 0,
                  costBreakdown: [],
                }}
                areas={summary?.areas ?? []}
                formatCurrency={formatCurrency}
                isFarmWide={selectedContextId === "all"}
              />
            </motion.div>
          </section>

          <section ref={productionRef} className="scroll-mt-[74px]">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={scrollReveal}>
              <ProductionSection displayData={displayData} areas={summary?.areas ?? []} formatCurrency={formatCurrency} />
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
                localBusinessStatus={summary?.insight.businessStatus ?? "Developing"}
                localRecommendation={summary?.insight.recommendation ?? "Belum ada insight untuk scope ini."}
                formatCurrency={formatCurrency}
              />
            </motion.div>
          </section>
        </div>
      </main>
    </div>
  );
}
