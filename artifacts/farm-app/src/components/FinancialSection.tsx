import {
  ArrowDownRight,
  ArrowUpRight,
  BadgePercent,
  Banknote,
  Landmark,
  ReceiptText,
  Target,
  Wallet,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FinancialSectionProps {
  displayData: any;
  formatCurrency: (amount: number) => string;
  profitChartData: any[];
}

export function FinancialSection({
  displayData,
  formatCurrency,
  profitChartData,
}: FinancialSectionProps) {
  const hpp =
    displayData.pengeluaran /
    (displayData.harvestWeight || 1);

  const bepProgress = Math.min(
    (
      displayData.pendapatan /
      (displayData.modal || 1)
    ) * 100,
    100
  );

  const metrics = [
    {
      label: "Modal",
      value: formatCurrency(displayData.modal),
      helper: "Committed capital",
      icon: Landmark,
      tone:
        "from-slate-900/8 to-slate-500/5 dark:from-white/10 dark:to-white/5",
      indicator: "bg-slate-500",
    },

    {
      label: "Pendapatan",
      value: formatCurrency(displayData.pendapatan),
      helper: "+ cash-in",
      icon: ArrowUpRight,
      tone: "from-emerald-500/15 to-teal-500/5",
      indicator: "bg-emerald-500",
    },

    {
      label: "Pengeluaran",
      value: formatCurrency(displayData.pengeluaran),
      helper: "operational burn",
      icon: ArrowDownRight,
      tone: "from-rose-500/14 to-orange-500/5",
      indicator: "bg-rose-500",
    },

    {
      label: "Profit",
      value: formatCurrency(displayData.profit),
      helper: `${
        displayData.margin >= 0 ? "+" : ""
      }${displayData.margin.toFixed(1)}% margin`,
      icon: Wallet,
      tone: "from-amber-500/16 to-emerald-500/5",
      indicator:
        displayData.profit >= 0
          ? "bg-emerald-500"
          : "bg-rose-500",
    },
  ];

  return (
    <div className="space-y-4">

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;

          return (
            <Card
              key={metric.label}
              className={`
                group
                overflow-hidden
                rounded-[1.6rem]
                border-white/60
                bg-gradient-to-br
                ${metric.tone}
                shadow-[0_18px_50px_rgba(15,23,42,0.08)]
                backdrop-blur-xl
                transition-all
                duration-300
                hover:-translate-y-0.5
                hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]
                dark:border-white/10
              `}
            >
              <CardContent className="p-4 md:p-5">
                <div className="flex items-start justify-between gap-3">

                  <div className="min-w-0">
                    <p
                      className="
                        text-[10px]
                        font-bold
                        uppercase
                        tracking-[0.18em]
                        text-muted-foreground
                      "
                    >
                      {metric.label}
                    </p>

                    <p
                      className="
                        mt-3
                        truncate
                        text-[clamp(1.05rem,3.4vw,1.65rem)]
                        font-black
                        tracking-[-0.05em]
                      "
                    >
                      {metric.value}
                    </p>
                  </div>

                  <div
                    className="
                      flex
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-2xl
                      border
                      border-white/60
                      bg-white/70
                      shadow-sm
                      dark:border-white/10
                      dark:bg-white/10
                    "
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {metric.helper}
                  </span>

                  <span
                    className={`
                      h-2
                      w-2
                      rounded-full
                      ${metric.indicator}
                      shadow-[0_0_18px_currentColor]
                    `}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* HPP + CHART */}
      <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">

        {/* UNIT ECONOMICS */}
        <Card
          className="
            overflow-hidden
            rounded-[1.75rem]
            border-white/60
            bg-white/70
            shadow-[0_18px_60px_rgba(15,23,42,0.08)]
            backdrop-blur-xl
            dark:border-white/10
            dark:bg-white/[0.06]
          "
        >
          <CardHeader className="pb-3">
            <CardTitle
              className="
                flex
                items-center
                gap-2
                text-base
                font-black
                tracking-[-0.03em]
              "
            >
              <ReceiptText className="h-5 w-5 text-emerald-600" />
              Unit economics
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">

            {/* HPP */}
            <div
              className="
                rounded-3xl
                border
                border-border/60
                bg-background/70
                p-4
              "
            >
              <div className="flex items-center justify-between gap-3">

                <div>
                  <p
                    className="
                      text-[11px]
                      font-bold
                      uppercase
                      tracking-[0.16em]
                      text-muted-foreground
                    "
                  >
                    HPP / kg
                  </p>

                  <p
                    className="
                      mt-2
                      text-3xl
                      font-black
                      tracking-[-0.06em]
                      md:text-4xl
                    "
                  >
                    {formatCurrency(hpp)}
                  </p>
                </div>

                <Banknote className="h-8 w-8 text-emerald-600" />
              </div>

              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Berdasarkan {displayData.harvestWeight || 0} kg
                panen tercatat dan seluruh pengeluaran area aktif.
              </p>
            </div>

            {/* BEP */}
            <div
              className="
                rounded-3xl
                border
                border-border/60
                bg-background/70
                p-4
              "
            >
              <div className="flex items-center justify-between text-sm font-bold">

                <span className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-600" />
                  BEP progress
                </span>

                <span>
                  {bepProgress.toFixed(1)}%
                </span>
              </div>

              <div
                className="
                  mt-3
                  h-3
                  overflow-hidden
                  rounded-full
                  bg-muted
                "
              >
                <div
                  className="
                    h-full
                    rounded-full
                    bg-gradient-to-r
                    from-emerald-500
                    via-lime-500
                    to-amber-400
                    shadow-[0_0_24px_rgba(34,197,94,0.45)]
                    transition-all
                    duration-1000
                  "
                  style={{
                    width: `${bepProgress}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {displayData.pendapatan >= displayData.modal
                  ? "Modal sudah balik. Mode berikutnya: optimasi ekspansi profit."
                  : `Butuh ${formatCurrency(
                      displayData.modal -
                        displayData.pendapatan
                    )} lagi untuk balik modal.`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* PROFIT CHART */}
        <Card
          className="
            overflow-hidden
            rounded-[1.75rem]
            border-white/60
            bg-white/70
            shadow-[0_18px_60px_rgba(15,23,42,0.08)]
            backdrop-blur-xl
            dark:border-white/10
            dark:bg-white/[0.06]
          "
        >
          <CardHeader className="pb-2">

            <div className="flex items-center justify-between gap-3">
              <CardTitle
                className="
                  text-base
                  font-black
                  tracking-[-0.03em]
                "
              >
                Profit per area
              </CardTitle>

              <BadgePercent className="h-5 w-5 text-emerald-600" />
            </div>
          </CardHeader>

          <CardContent>
            <div className="h-[270px] md:h-[320px]">

              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={profitChartData}
                  margin={{
                    top: 12,
                    right: 8,
                    left: -18,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="profitGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#10b981"
                        stopOpacity={0.95}
                      />

                      <stop
                        offset="100%"
                        stopColor="#84cc16"
                        stopOpacity={0.55}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    vertical={false}
                    stroke="hsl(var(--border))"
                    strokeDasharray="4 8"
                    opacity={0.6}
                  />

                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    dy={8}
                  />

                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(value) =>
                      `${(Number(value) / 1000000).toFixed(0)}jt`
                    }
                  />

                  <Tooltip
                    cursor={{
                      fill: "hsl(var(--muted))",
                      opacity: 0.45,
                    }}
                    formatter={(value: number) =>
                      formatCurrency(value)
                    }
                    contentStyle={{
                      borderRadius: 18,
                      border: "1px solid hsl(var(--border))",
                      background:
                        "hsl(var(--background) / 0.92)",
                      backdropFilter: "blur(16px)",
                    }}
                  />

                  <Bar
                    dataKey="profit"
                    fill="url(#profitGradient)"
                    radius={[12, 12, 6, 6]}
                    maxBarSize={54}
                  />
                </BarChart>
              </ResponsiveContainer>

            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}