import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  LineChart,
  PieChart as PieChartIcon,
  Target,
  WalletCards,
} from "lucide-react";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
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
  const StatusIcon = status === "down" ? ArrowDownRight : ArrowUpRight;

  return (
    <Card
      className="
        relative
        overflow-hidden
        rounded-[1.5rem]

        border-white/60

        bg-white/75

        backdrop-blur-2xl

        shadow-[0_18px_60px_rgba(15,23,42,0.07)]
      "
    >
      <CardContent
        className="
          flex
          min-h-[120px]
          flex-col
          justify-between
          p-3
        "
      >
        {/* IKON: Dikecilin dan dipepetin ke pojok kanan atas */}
        <div
          className={`
            absolute
            right-2.5
            top-2.5
            rounded-xl
            bg-gradient-to-br
            p-2
            shadow-sm

            ${metricAccent[accent]}
          `}
        >
          <Icon
            className="
              h-3.5
              w-3.5
            "
          />
        </div>

        {/* LABEL */}
        <div className="pr-8">
          <p
            className="
              text-[9px]
              font-black
              uppercase
              tracking-[0.15em]
              text-muted-foreground
            "
          >
            {label}
          </p>
        </div>

        {/* ANGKA: Rata kiri, tracking di-rapatkan biar muat banyak */}
        <div className="flex flex-1 items-center justify-start py-1.5 mt-1">
          <p
            className="
              w-full
              truncate
              text-left
              text-[17px]
              font-black
              tracking-tighter
              sm:text-lg
            "
            title={value}
          >
            {value}
          </p>
        </div>

        {/* LIVE INDICATOR */}
        <div>
          <div
            className="
              inline-flex
              items-center
              gap-1

              rounded-full

              bg-muted/70

              px-2
              py-1

              text-[10px]
              font-bold
              text-muted-foreground
            "
          >
            <StatusIcon
              className={`
                h-3
                w-3

                ${status === "down" ? "text-rose-500" : "text-emerald-500"}
              `}
            />
            live indicator
          </div>
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
  const hpp = displayData.pengeluaran / (displayData.harvestWeight || 1);

  const bepProgress = Math.min(
    (displayData.pendapatan / (displayData.modal || 1)) * 100,
    100
  );

  const donutData = profitChartData.map((item, index) => ({
    ...item,
    value: Math.abs(item.profit),
    color: ["#10b981", "#84cc16", "#14b8a6", "#22c55e"][index % 4],
  }));

  const totalProfit = profitChartData.reduce((acc, item) => acc + item.profit, 0);

  return (
    <div className="space-y-4 md:space-y-5">
      
      {/* HEADER: Teks Fintech-grade dihapus, margin dirapihkan */}
      <div
        className="
          flex
          items-center
          justify-between
          gap-4
          mb-1
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

      {/* GRID: Gap dikecilin dari gap-3 jadi gap-2 biar kartu melar ke samping */}
      <div
        className="
          grid
          grid-cols-2
          gap-2

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
          status={displayData.profit >= 0 ? "up" : "down"}
        />

        <MetricCard
          label="Margin"
          value={`${displayData.margin.toFixed(1)}%`}
          caption="profitability ratio"
          icon={PieChartIcon}
          accent="margin"
          status={displayData.margin >= 0 ? "up" : "down"}
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

      {/* SISA KODE DI BAWAHNYA (BEP Runway & Pie Chart) BISA LU BIARIN SAMA KAYAK SEBELUMNYA */}


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

<Card
  className="
    rounded-[1.75rem]

    border-white/60

    bg-white/75

    backdrop-blur-2xl

    shadow-[0_18px_60px_rgba(15,23,42,0.07)]
  "
>

  <CardContent
    className="
      p-4
      md:p-6
    "
  >

    <div
      className="
        mb-4

        flex
        items-center
        justify-between
      "
    >

      <div>

        <p
          className="
            text-xs
            font-black
            uppercase
            tracking-[0.18em]

            text-muted-foreground
          "
        >
          Area Profitability
        </p>

        <h3
          className="
            text-xl
            font-black
            tracking-[-0.04em]
          "
        >
          Profit per area
        </h3>

      </div>

    </div>

    <div
  className="
    relative
    h-[270px]
    md:h-[320px]
  "
>

      <ResponsiveContainer
        width="100%"
        height="100%"
      >

      <PieChart>

  <Pie
    data={donutData}
    dataKey="value"
    nameKey="name"
    innerRadius={70}
    outerRadius={100}
    paddingAngle={4}
    strokeWidth={0}
  >
    {donutData.map((entry, index) => (
      <Cell
        key={`cell-${index}`}
        fill={entry.color}
      />
    ))}
  </Pie>

  <Tooltip
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

</PieChart>

      </ResponsiveContainer>

<div
  className="
    pointer-events-none
    absolute
    inset-0
    flex
    flex-col
    items-center
    justify-center
  "
>
  <p
    className="
      text-xs
      font-bold
      uppercase
      tracking-[0.18em]
      text-muted-foreground
    "
  >
    Total Profit
  </p>

  <p
    className="
      mt-2
      text-2xl
      font-black
      tracking-[-0.05em]
    "
  >
    {formatCurrency(totalProfit)}
  </p>
</div>

    </div>

  </CardContent>

</Card>

</div>
);
}