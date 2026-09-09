import { motion } from "framer-motion";
import {
  ArrowDownRight,
  Banknote,
  CircleDollarSign,
  Gauge,
  Percent,
  WalletCards,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { DashboardAreaSummary, DashboardDerivedSummary } from "@/types/dashboard";

interface FinancialSectionProps {
  financial: DashboardDerivedSummary["financial"];
  areas: DashboardAreaSummary[];
  formatCurrency: (amount: number) => string;
  isFarmWide: boolean;
}

type MetricTone = "default" | "positive" | "negative";

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const fadeSlideItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 26 },
  },
};

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof WalletCards;
  tone?: MetricTone;
}) {
  const toneClass =
    tone === "negative"
      ? "border-destructive/20 bg-destructive/5"
      : tone === "positive"
        ? "border-primary/20 bg-primary/5"
        : "border-border/40 bg-card/60";

  const iconClass = tone === "negative" ? "text-destructive" : "text-primary";

  return (
    <Card className={`shrink-0 snap-start overflow-hidden rounded-[1.25rem] shadow-none backdrop-blur-md ${toneClass}`}>
      <CardContent className="flex min-h-[118px] w-[158px] flex-col justify-between p-3.5 sm:w-auto">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <div className="rounded-xl border border-border/30 bg-background/70 p-2">
            <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
          </div>
        </div>
        <div>
          <p className="truncate text-[17px] font-black tracking-[-0.04em] text-foreground" title={value}>
            {value}
          </p>
          <p className="mt-1 text-[10px] font-medium leading-snug text-muted-foreground">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CostBreakdown({
  items,
  total,
  formatCurrency,
}: {
  items: DashboardDerivedSummary["financial"]["costBreakdown"];
  total: number;
  formatCurrency: (amount: number) => string;
}) {
  const visible = items.slice(0, 6);

  return (
    <Card className="rounded-[1.5rem] border-border/40 bg-card/60 shadow-none backdrop-blur-md">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Komposisi biaya</p>
            <h3 className="mt-0.5 text-lg font-black tracking-[-0.04em]">Pengeluaran per kategori</h3>
          </div>
          <p className="text-right text-xs font-bold text-muted-foreground">{formatCurrency(total)}</p>
        </div>

        {visible.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border/50 bg-muted/20 px-4 py-8 text-center text-xs font-medium text-muted-foreground">
            Belum ada pengeluaran pada scope ini.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {visible.map((item) => (
              <div key={item.kategoriId ?? item.name}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-foreground">{item.name}</p>
                    <p className="text-[10px] font-medium text-muted-foreground">{item.percentage.toFixed(1)}% dari pengeluaran</p>
                  </div>
                  <p className="shrink-0 text-xs font-black text-foreground">{formatCurrency(item.amount)}</p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                  <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.min(item.percentage, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AreaProfitability({
  areas,
  formatCurrency,
  isFarmWide,
}: {
  areas: DashboardAreaSummary[];
  formatCurrency: (amount: number) => string;
  isFarmWide: boolean;
}) {
  const ranked = [...areas].sort((a, b) => b.profit - a.profit);
  const maxMagnitude = Math.max(...ranked.map((area) => Math.abs(area.profit)), 1);

  return (
    <Card className="rounded-[1.5rem] border-border/40 bg-card/60 shadow-none backdrop-blur-md">
      <CardContent className="p-4 md:p-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {isFarmWide ? "Perbandingan context" : "Posisi context"}
          </p>
          <h3 className="mt-0.5 text-lg font-black tracking-[-0.04em]">
            {isFarmWide ? "Cash profit per area" : "Cash position siklus"}
          </h3>
          {isFarmWide && (
            <p className="mt-1 text-[10px] font-medium text-muted-foreground">
              Biaya umum farm tidak dialokasikan paksa ke area, jadi total per-area dapat berbeda dari profit farm-wide.
            </p>
          )}
        </div>

        {ranked.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border/50 bg-muted/20 px-4 py-8 text-center text-xs font-medium text-muted-foreground">
            Belum ada context untuk dibandingkan.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {ranked.map((area) => {
              const width = Math.max((Math.abs(area.profit) / maxMagnitude) * 100, area.profit === 0 ? 0 : 4);
              const negative = area.profit < 0;
              return (
                <div key={area.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">{area.name}</p>
                      <p className="text-[10px] font-medium text-muted-foreground">Margin {area.margin.toFixed(1)}%</p>
                    </div>
                    <p className={`shrink-0 text-xs font-black ${negative ? "text-destructive" : "text-foreground"}`}>
                      {formatCurrency(area.profit)}
                    </p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted/60">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${negative ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FinancialSection({ financial, areas, formatCurrency, isFarmWide }: FinancialSectionProps) {
  const profitTone: MetricTone = financial.labaRugi < 0 ? "negative" : financial.labaRugi > 0 ? "positive" : "default";
  const marginTone: MetricTone = financial.marginTotal < 0 ? "negative" : financial.marginTotal >= 15 ? "positive" : "default";

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4 md:space-y-5">
      <motion.div variants={fadeSlideItem} className="flex snap-x gap-2.5 overflow-x-auto pb-1 custom-scrollbar lg:grid lg:grid-cols-6 lg:overflow-visible">
        <MetricCard label="Modal awal" value={formatCurrency(financial.totalModal)} helper="Baseline modal dari siklus" icon={WalletCards} />
        <MetricCard label="Pendapatan" value={formatCurrency(financial.totalPendapatan)} helper="Pendapatan panen pada periode" icon={Banknote} tone={financial.totalPendapatan > 0 ? "positive" : "default"} />
        <MetricCard label="Pengeluaran" value={formatCurrency(financial.totalPengeluaran)} helper="Cash out tercatat" icon={ArrowDownRight} tone={financial.totalPengeluaran > 0 ? "negative" : "default"} />
        <MetricCard label="Cash profit" value={formatCurrency(financial.labaRugi)} helper="Pendapatan dikurangi pengeluaran" icon={CircleDollarSign} tone={profitTone} />
        <MetricCard label="Margin" value={`${financial.marginTotal.toFixed(1)}%`} helper="Cash profit / pendapatan" icon={Percent} tone={marginTone} />
        <MetricCard label="Cash cost / kg" value={`${formatCurrency(financial.cashCostPerKg)}/kg`} helper="Pengeluaran / kg panen, bukan HPP stok" icon={Gauge} />
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div variants={fadeSlideItem}>
          <CostBreakdown items={financial.costBreakdown} total={financial.totalPengeluaran} formatCurrency={formatCurrency} />
        </motion.div>
        <motion.div variants={fadeSlideItem}>
          <AreaProfitability areas={areas} formatCurrency={formatCurrency} isFarmWide={isFarmWide} />
        </motion.div>
      </div>
    </motion.div>
  );
}
