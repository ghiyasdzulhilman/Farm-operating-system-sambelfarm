import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
interface InsightSectionProps {
  displayData: any;
  localBusinessStatus: string;
  localRecommendation: string;
  formatCurrency: (amount: number) => string;
}

export function InsightSection({
  displayData,
  localBusinessStatus,
  localRecommendation,
  formatCurrency,
}: InsightSectionProps) {
  return (
  <div className="space-y-4">

    <Card className="border-emerald-200 bg-emerald-50/50">
      <CardHeader>
        <CardTitle className="text-emerald-700">
          Smart Insight
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">

        <div className="p-3 rounded-lg border bg-background">
          <p className="font-medium">
            📈 Margin Area
          </p>

          <p className="text-sm text-muted-foreground mt-1">
            Margin keuntungan saat ini berada di{" "}
            <span className="font-semibold text-emerald-600">
              {displayData.margin.toFixed(1)}%
            </span>
          </p>
        </div>

        <div className="p-3 rounded-lg border bg-background">
          <p className="font-medium">
            💰 Efisiensi Produksi
          </p>

          <p className="text-sm text-muted-foreground mt-1">
            HPP saat ini sekitar{" "}
            <span className="font-semibold">
              {formatCurrency(
                displayData.pengeluaran /
                  (displayData.harvestWeight || 1)
              )}
            </span>
            /kg
          </p>
        </div>

        <div className="p-3 rounded-lg border bg-background">
          <p className="font-medium">
            📊 Status Area
          </p>

          <p className="text-sm text-muted-foreground mt-1">
            {localBusinessStatus === "Profitable"
              ? "Area sedang menghasilkan profit positif."
              : "Area masih dalam fase merugi / pengembangan."}
          </p>
        </div>

        <div className="p-3 rounded-lg border bg-background">
          <p className="font-medium">
            🎧 Rekomendasi Sistem
          </p>

          <p className="text-sm text-muted-foreground mt-1">
            {localRecommendation}
          </p>
        </div>

      </CardContent>
    </Card>

  </div>
);
}