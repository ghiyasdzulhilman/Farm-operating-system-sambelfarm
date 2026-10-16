import { Activity, BarChart3, Gauge, Scale, Sprout } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardDerivedSummary } from "@/types/dashboard";

interface ProductionSectionProps {
  production: DashboardDerivedSummary["production"];
  formatCurrency: (amount: number) => string;
  isFarmWide: boolean;
}

const formatKg = (value: number) =>
  `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value || 0)} kg`;

const formatShortDate = (value: string) => {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
};

export function ProductionSection({
  production,
  formatCurrency,
  isFarmWide,
}: ProductionSectionProps) {
  const stats = [
    {
      label: "Total Panen",
      value: formatKg(production.totalHarvestWeight),
      helper: `${production.harvestCount} pencatatan panen`,
      icon: Sprout,
    },
    {
      label: "Rata-rata / Panen",
      value: formatKg(production.averageKgPerHarvest),
      helper: "rata-rata kuantitas tiap pencatatan",
      icon: Scale,
    },
    {
      label: "Harga Jual / kg",
      value: formatCurrency(production.averageRevenuePerKg),
      helper: "rata-rata tertimbang dari hasil panen",
      icon: Gauge,
    },
    {
      label: "Frekuensi Panen",
      value: `${production.harvestCount}x`,
      helper: "dalam scope dan periode terpilih",
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="rounded-[1.35rem] border-border/40 bg-card/70 text-card-foreground shadow-sm backdrop-blur-md"
            >
              <CardContent className="flex min-h-[118px] flex-col justify-between p-3.5 md:p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                    {stat.label}
                  </p>
                  <div className="rounded-xl border border-border/30 bg-primary/10 p-2 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                </div>

                <div>
                  <p className="text-[18px] font-black tracking-[-0.04em] text-foreground md:text-xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[10px] font-medium leading-snug text-muted-foreground">
                    {stat.helper}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden rounded-[1.5rem] border-border/40 bg-card/70 text-card-foreground shadow-sm backdrop-blur-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base font-black tracking-[-0.03em]">
                <BarChart3 className="h-4.5 w-4.5 text-primary" />
                Tren Panen
              </CardTitle>
              <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                Kuantitas panen berdasarkan tanggal pencatatan.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[9px] font-bold text-primary">
              kg / hari
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {production.trend.length === 0 ? (
            <div className="flex h-[230px] items-center justify-center rounded-[1.25rem] border border-dashed border-border/40 bg-muted/15 px-6 text-center">
              <div>
                <Sprout className="mx-auto h-6 w-6 text-muted-foreground/60" />
                <p className="mt-2 text-xs font-bold text-foreground">Belum ada panen</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Tidak ada data panen pada scope dan periode ini.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={production.trend}
                  margin={{ top: 16, right: 8, left: -18, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="productionTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid vertical={false} strokeDasharray="4 8" opacity={0.35} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    minTickGap={20}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={10}
                    tickFormatter={(value) => `${value}kg`}
                  />
                  <Tooltip
                    labelFormatter={(value) => `Tanggal ${formatShortDate(String(value))}`}
                    formatter={(value: number, name: string) => {
                      if (name === "harvestWeight") return [formatKg(value), "Panen"];
                      return [value, name];
                    }}
                    contentStyle={{
                      borderRadius: "1rem",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                      color: "hsl(var(--card-foreground))",
                      fontSize: "11px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="harvestWeight"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#productionTrendGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {isFarmWide && (
        <Card className="overflow-hidden rounded-[1.5rem] border-border/40 bg-card/70 text-card-foreground shadow-sm backdrop-blur-md">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-base font-black tracking-[-0.03em]">Produksi per Area</CardTitle>
              <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                Ranking berdasarkan total kilogram panen pada siklus yang sedang ditampilkan.
              </p>
            </div>
          </CardHeader>

          <CardContent>
            {production.areaRanking.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-border/40 bg-muted/15 p-6 text-center text-[11px] text-muted-foreground">
                Belum ada area dengan data panen pada periode ini.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={production.areaRanking}
                      layout="vertical"
                      margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
                    >
                      <CartesianGrid horizontal={false} strokeDasharray="4 8" opacity={0.3} />
                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        fontSize={10}
                        tickFormatter={(value) => `${value}kg`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        width={86}
                        fontSize={10}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === "harvestWeight") return [formatKg(value), "Produksi"];
                          return [value, name];
                        }}
                        contentStyle={{
                          borderRadius: "1rem",
                          border: "1px solid hsl(var(--border))",
                          background: "hsl(var(--card))",
                          color: "hsl(var(--card-foreground))",
                          fontSize: "11px",
                        }}
                      />
                      <Bar dataKey="harvestWeight" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {production.areaRanking.slice(0, 5).map((area, index) => (
                    <div
                      key={area.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border/30 bg-background/50 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">
                          {index + 1}. {area.name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          Revenue/kg {formatCurrency(area.revenuePerKg)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-black text-foreground">{formatKg(area.harvestWeight)}</p>
                        <p className="mt-0.5 text-[9px] font-semibold text-muted-foreground">
                          {formatCurrency(area.revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
