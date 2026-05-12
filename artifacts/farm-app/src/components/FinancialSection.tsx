import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
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
  return (
  <>
    {/* Main Cards */}
    <div
  className="
    grid
    grid-cols-2
    gap-4

    lg:grid-cols-4
  "
>
      <Card
  className="
    border-border/50
    bg-background/80
    backdrop-blur-sm
    rounded-2xl
    shadow-sm
  "
>
        <CardHeader className="pb-2 space-y-1">
          <CardTitle
  className="
    text-[11px]
    font-medium
    uppercase
    tracking-[0.12em]
    text-muted-foreground
  "
>
            Modal Awal
          </CardTitle>
        </CardHeader>

        <CardContent>

  <div
    className="
      text-[clamp(1rem,3.2vw,1.6rem)]
      font-bold
      tracking-tight
      leading-none
    "
  >
    {formatCurrency(displayData.modal)}
  </div>

</CardContent>
      </Card>

      <Card
  className="
    border-border/50
    bg-background/80
    backdrop-blur-sm
    rounded-2xl
    shadow-sm
  "
>
        <CardHeader className="pb-2 space-y-1">
          <CardTitle
  className="
    text-[11px]
    font-medium
    uppercase
    tracking-[0.12em]
    text-muted-foreground
  "
>
            Pendapatan
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div
  className="
    text-[clamp(1rem,3.2vw,1.6rem)]
    font-bold
    tracking-tight
    leading-none
    text-emerald-600
  "
>
            {formatCurrency(displayData.pendapatan)}
          </div>
        </CardContent>
      </Card>

      <Card
  className="
    border-border/50
    bg-background/80
    backdrop-blur-sm
    rounded-2xl
    shadow-sm
  "
>
        <CardHeader className="pb-2 space-y-1">
          <CardTitle
  className="
    text-[11px]
    font-medium
    uppercase
    tracking-[0.12em]
    text-muted-foreground
  "
>
            Pengeluaran
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div
  className="
    text-[clamp(1rem,3.2vw,1.6rem)]
    font-bold
    tracking-tight
    leading-none
    text-rose-600
  "
>
            {formatCurrency(displayData.pengeluaran)}
          </div>
        </CardContent>
      </Card>

      <Card
  className="
    border-border/50
    bg-background/80
    backdrop-blur-sm
    rounded-2xl
    shadow-sm
  "
>
        <CardHeader className="pb-2 space-y-1">
          <CardTitle
  className="
    text-[11px]
    font-medium
    uppercase
    tracking-[0.12em]
    text-muted-foreground
  "
>
            Net Profit
          </CardTitle>
        </CardHeader>

<CardContent>
  <div
    className={`
      text-[clamp(1rem,3.2vw,1.6rem)]
      font-bold
      tracking-tight
      leading-none

      ${
        displayData.profit >= 0
          ? ""
          : "text-rose-600"
      }
    `}
  >
    {formatCurrency(displayData.profit)}
  </div>

  <div
    className={`
      mt-2
      text-sm
      font-medium

      ${
        displayData.margin >= 0
          ? "text-emerald-600"
          : "text-rose-600"
      }
    `}
  >
    {displayData.margin >= 0 ? "+" : ""}
    {displayData.margin.toFixed(1)}%
  </div>

</CardContent>
</Card>
</div>

    {/* HPP & BEP */}
    <div className="grid gap-4 md:grid-cols-2">
      <Card
  className="
    border-border/50
    bg-background/80
    backdrop-blur-sm

    rounded-2xl

    shadow-sm

    transition-all
    duration-200

    hover:shadow-md
  "
>
        <CardHeader className="pb-2">
          <CardTitle
  className="
    text-xs
    font-medium
    uppercase
    tracking-wide
    text-muted-foreground
  "
>
            Harga Pokok Produksi (HPP)
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div
  className="
    text-3xl
    md:text-4xl
    font-bold
    tracking-tight
    leading-none
  "
>
            {formatCurrency(
              displayData.pengeluaran /
                (displayData.harvestWeight || 1)
            )}
            /kg
          </div>

          <p className="text-sm text-muted-foreground mt-2">
            Berdasarkan total panen:
            {" "}
            {displayData.harvestWeight} kg
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 space-y-1">
          <CardTitle className="text-sm font-medium flex justify-between">
            <span>
              Progres Balik Modal (BEP)
            </span>

            <span>
              {Math.min(
                (
                  displayData.pendapatan /
                  (displayData.modal || 1)
                ) * 100,
                100
              ).toFixed(1)}%
            </span>
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-1000"
              style={{
                width: `${Math.min(
                  (
                    displayData.pendapatan /
                    (displayData.modal || 1)
                  ) * 100,
                  100
                )}%`,
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            {displayData.pendapatan >= displayData.modal
              ? "Modal Balik!"
              : `Butuh ${formatCurrency(
                  displayData.modal -
                    displayData.pendapatan
                )} lagi.`}
          </p>
        </CardContent>
      </Card>
    </div>

    {/* Profit Chart */}
    <Card>
      <CardHeader>
        <CardTitle>
          Profit per Area
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <BarChart
              data={profitChartData}
              margin={{
                top: 10,
                right: 10,
                left: -20,
                bottom: 10,
              }}
            >
              <XAxis dataKey="name" />

              <YAxis
                tickFormatter={(value) =>
                  `${(value / 1000000).toFixed(0)}jt`
                }
              />

              <Tooltip />

              <Bar
                dataKey="profit"
                fill="#16a34a"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  </>
);
}