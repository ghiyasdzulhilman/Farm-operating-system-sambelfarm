import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  LineChart,
  PieChart,
  Target,
  WalletCards,
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

import { Card, CardContent } from "@/components/ui/card";
interface FinancialSectionProps {
  displayData: any;
  formatCurrency: (amount: number) => string;
  profitChartData: any[];
}

const metricAccent = {
  modal:
    "from-slate-900 to-slate-700 text-white",

  pendapatan:
    "from-emerald-500 to-teal-600 text-white",

  pengeluaran:
    "from-amber-500 to-orange-600 text-white",

  profit:
    "from-lime-500 to-emerald-600 text-white",

  margin:
    "from-cyan-500 to-blue-600 text-white",

  hpp:
    "from-stone-700 to-zinc-900 text-white",
};

function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  accent,
  status,
}: any) {

  const StatusIcon =
    status === "down"
      ? ArrowDownRight
      : ArrowUpRight;

  return (

    <Card
      className="
        overflow-hidden
        rounded-[1.75rem]

        border-white/60

        bg-white/75

        backdrop-blur-2xl

        shadow-[0_18px_60px_rgba(15,23,42,0.07)]
      "
    >

      <CardContent
        className="
          relative
          p-4
        "
      >

        <div
          className="
            flex
            items-start
            justify-between
            gap-3
          "
        >

          <div className="space-y-2">

            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.18em]
                text-muted-foreground
              "
            >
              {label}
            </p>

            <div>

              <p
                className="
                  text-xl
                  font-black
                  tracking-[-0.05em]
                "
              >
                {value}
              </p>

              <p
                className="
                  text-xs
                  text-muted-foreground
                "
              >
                {caption}
              </p>

            </div>

          </div>

          <div
            className={`
              rounded-2xl
              bg-gradient-to-br
              p-3
              shadow-lg

              ${metricAccent[accent]}
            `}
          >

            <Icon
              className="
                h-4
                w-4
              "
            />

          </div>

        </div>

        <div
          className="
            mt-4
            inline-flex
            items-center
            gap-1

            rounded-full

            bg-muted/70

            px-2.5
            py-1

            text-[11px]
            font-bold
            text-muted-foreground
          "
        >

          <StatusIcon
            className={`
              h-3
              w-3

              ${
                status === "down"
                  ? "text-rose-500"
                  : "text-emerald-500"
              }
            `}
          />

          live indicator

        </div>

      </CardContent>

    </Card>

  );
}

export function FinancialSection({
  displayData,
  formatCurrency,
  profitChartData,
}: FinancialSectionProps) {
 return (
<div className="space-y-4">

<div
  className="
    grid
    grid-cols-2
    gap-3

    lg:grid-cols-6
  "
>

  <MetricCard
    label="Modal"
    value={formatCurrency(displayData.modal)}
    caption="capital deployed"
    icon={WalletCards}
    accent="modal"
    status="neutral"
  />

  <MetricCard
    label="Pendapatan"
    value={formatCurrency(displayData.pendapatan)}
    caption="gross revenue"
    icon={Banknote}
    accent="pendapatan"
    status="up"
  />

  <MetricCard
    label="Pengeluaran"
    value={formatCurrency(displayData.pengeluaran)}
    caption="farm opex"
    icon={ArrowDownRight}
    accent="pengeluaran"
    status="down"
  />

  <MetricCard
    label="Profit"
    value={formatCurrency(displayData.profit)}
    caption="net result"
    icon={CircleDollarSign}
    accent="profit"
    status={
      displayData.profit >= 0
        ? "up"
        : "down"
    }
  />

  <MetricCard
    label="Margin"
    value={`${displayData.margin.toFixed(1)}%`}
    caption="profitability ratio"
    icon={PieChart}
    accent="margin"
    status={
      displayData.margin >= 0
        ? "up"
        : "down"
    }
  />
<MetricCard
  label="HPP"
  value="Rp0/kg"
  caption="cost per kg"
  icon={LineChart}
  accent="hpp"
  status="neutral"
/>


</div>


</div>
);
}