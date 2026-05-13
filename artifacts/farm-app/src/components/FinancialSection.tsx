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

const hpp =
  displayData.pengeluaran /
  (displayData.harvestWeight || 1);

const bepProgress =
  Math.min(
    (
      displayData.pendapatan /
      (displayData.modal || 1)
    ) * 100,
    100
  );

 return (
  <div className="space-y-4 md:space-y-5">

    <div
      className="
        flex
        items-end
        justify-between
        gap-4
      "
    >

      <div>

        <p
          className="
            text-xs
            font-black
            uppercase
            tracking-[0.22em]

            text-emerald-700
          "
        >
          Financial Analytics
        </p>

        <h2
          className="
            mt-1
            text-2xl
            font-black
            tracking-[-0.05em]
          "
        >
          Fintech-grade farm economics
        </h2>

      </div>

      <span
        className="
          hidden
          md:inline-flex

          rounded-full

          border
          border-emerald-500/20

          bg-emerald-500/10

          px-3
          py-1

          text-xs
          font-bold

          text-emerald-700
        "
      >

        Margin {displayData.margin.toFixed(1)}%

      </span>

    </div>

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
  value={`${formatCurrency(hpp)}/kg`}
  caption="cost per kg"
  icon={LineChart}
  accent="hpp"
  status="neutral"
/>


</div>

<Card
  className="
    overflow-hidden

    rounded-[1.75rem]

    border-white/60

    bg-slate-950

    text-white

    shadow-2xl
  "
>

  <CardContent
    className="
      relative
      space-y-5
      p-5
    "
  >

    <div
      className="
        absolute
        -right-12
        -top-12

        h-40
        w-40

        rounded-full

        bg-emerald-400/30

        blur-3xl
      "
    />

    <div
      className="
        relative

        flex
        items-start
        justify-between
      "
    >

      <div>

        <p
          className="
            text-xs
            font-bold
            uppercase
            tracking-[0.18em]

            text-white/45
          "
        >
          BEP runway
        </p>

        <h3
          className="
            mt-2
            text-3xl
            font-black
            tracking-[-0.06em]
          "
        >
          {bepProgress.toFixed(1)}%
        </h3>

      </div>

      <div
        className="
          rounded-2xl
          bg-white/10
          p-3
        "
      >

        <Target
          className="
            h-5
            w-5
            text-emerald-300
          "
        />

      </div>

    </div>

    <div
      className="
        relative
        h-3

        overflow-hidden

        rounded-full

        bg-white/10
      "
    >

      <div
        className="
          h-full
          rounded-full

          bg-gradient-to-r
          from-emerald-300
          via-lime-300
          to-amber-200

          transition-all
          duration-1000
        "
        style={{
          width: `${bepProgress}%`
        }}
      />

    </div>

    <p
      className="
        relative
        text-sm
        leading-6
        text-white/62
      "
    >

      {
        displayData.pendapatan >=
        displayData.modal

          ? "Modal sudah balik. Sistem merekomendasikan ekspansi area."

          : `Butuh ${formatCurrency(
              displayData.modal -
              displayData.pendapatan
            )} lagi untuk mencapai BEP.`
      }

    </p>

  </CardContent>

</Card>

</div>
);
}