import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
interface ProductionSectionProps {
  displayData: any;
  areas: any[];
}

export function ProductionSection({
  displayData,
  areas,
}: ProductionSectionProps) {
  return (
  <div className="space-y-4">

    <div className="grid gap-4 md:grid-cols-3">

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Total Panen
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-2xl font-bold">
            {displayData.harvestWeight} Kg
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            Total hasil panen
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Harga jual rata rata
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {displayData.harvestWeight > 0
              ? (
                  displayData.pendapatan /
                  displayData.harvestWeight
                ).toFixed(0)
              : 0}
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            Rupiah / Kg
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Area Aktif
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-2xl font-bold">
            {areas.length}
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            Total blok produksi
          </p>
        </CardContent>
      </Card>

    </div>

  </div>
);
}