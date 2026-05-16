import { BarChart3, Boxes, Gauge, Sprout } from "lucide-react";

import {
  Area,
  AreaChart,
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

interface ProductionSectionProps {
  displayData: any;
  areas: any[];
  formatCurrency: (amount: number) => string;
}

export function ProductionSection({
  displayData,
  areas,
  formatCurrency,
}: ProductionSectionProps){

const averagePrice =
  displayData.harvestWeight > 0
    ? displayData.pendapatan / displayData.harvestWeight
    : 0;

const chartData = areas.map((area) => ({
  name: area.name,
  kg: area.harvestWeight || 0,
}));

const stats = [
  {
    label: "Total Panen",
    value: `${displayData.harvestWeight || 0} kg`,
    helper: "harvest recorded",
    icon: Sprout,
  },
  {
    label: "Harga/kg",
    value: formatCurrency(averagePrice),
    helper: "average selling price",
    icon: Gauge,
  },
  {
    label: "Area Aktif",
    value: areas.length,
    helper: "production blocks",
    icon: Boxes,
  },
];

  return (
  <div className="space-y-4">

    <div className="grid gap-3 md:grid-cols-3">

      {stats.map((stat) => {

        const Icon = stat.icon;

        return (
          <Card
            key={stat.label}
            className="
              rounded-[1.6rem]
              border-white/60
              bg-white/70
              backdrop-blur-xl
              shadow-[0_16px_48px_rgba(15,23,42,0.07)]
            "
          >
            <CardContent className="p-4 md:p-5">

              <div className="flex items-center justify-between">

                <p
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.18em]
                    text-muted-foreground
                  "
                >
                  {stat.label}
                </p>

                <div
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-2xl
                    bg-emerald-500/10
                    text-emerald-700
                  "
                >
                  <Icon className="h-4 w-4" />
                </div>

              </div>

              <p
                className="
                  mt-3
                  text-2xl
                  font-black
                  tracking-[-0.05em]
                "
              >
                {stat.value}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {stat.helper}
              </p>

            </CardContent>
          </Card>
        );

      })}

    </div>

    <Card
      className="
        overflow-hidden
        rounded-[1.75rem]
        border-white/60
        bg-white/70
        backdrop-blur-xl
        shadow-[0_18px_60px_rgba(15,23,42,0.08)]
      "
    >

      <CardHeader className="pb-2">

        <div className="flex items-center justify-between">

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
            <BarChart3 className="h-5 w-5 text-primary" />
            Productivity Curve
          </CardTitle>

          <span
            className="
              rounded-full
              bg-emerald-500/10
              px-3
              py-1
              text-xs
              font-bold
              text-emerald-700
            "
          >
            kg analytics
          </span>

        </div>

      </CardHeader>

      <CardContent>

        <div className="h-[280px]">

          <ResponsiveContainer width="100%" height="100%">

            <AreaChart
              data={chartData}
              margin={{
                top: 16,
                right: 8,
                left: -18,
                bottom: 0,
              }}
            >

              <defs>

                <linearGradient
                  id="productionGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#059669"
                    stopOpacity={0.45}
                  />

                  <stop
                    offset="100%"
                    stopColor="#059669"
                    stopOpacity={0.02}
                  />
                </linearGradient>

              </defs>

              <CartesianGrid
                vertical={false}
                strokeDasharray="4 8"
                opacity={0.4}
              />

              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                fontSize={11}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickFormatter={(value) => `${value}kg`}
              />

              <Tooltip
                formatter={(value: number) => [
                  `${value} kg`,
                  "Panen",
                ]}
              />

              <Area
                type="monotone"
                dataKey="kg"
                stroke="#059669"
                strokeWidth={3}
                fill="url(#productionGradient)"
              />

            </AreaChart>

          </ResponsiveContainer>

        </div>

      </CardContent>

    </Card>

  </div>
);
}