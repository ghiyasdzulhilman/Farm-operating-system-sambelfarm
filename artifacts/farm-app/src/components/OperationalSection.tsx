import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
interface OperationalSectionProps {
  harvestActivities: any[];
  expenseActivities: any[];
}

export function OperationalSection({
  harvestActivities,
  expenseActivities,
}: OperationalSectionProps) {
  return (
  <div className="space-y-4">

    <Card>
      <CardHeader>
        <CardTitle>
          Aktivitas Operasional
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">

        <div className="space-y-2">
          <p className="text-sm font-semibold text-emerald-700">
            🌾 Aktivitas Panen
          </p>

          {harvestActivities.map(
            (activity: any, index: number) => (
              <div
                key={index}
                className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-3 rounded-lg border border-emerald-200 bg-emerald-50/50"
              >
                <div>
                  <p className="font-medium">
                    {activity.title}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                </div>

                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {activity.time}
                </span>
              </div>
            )
          )}
        </div>

        <div className="space-y-2 pt-4">
          <p className="text-sm font-semibold text-amber-700">
            💸 Aktivitas Pengeluaran
          </p>

          {expenseActivities.map(
            (activity: any, index: number) => (
              <div
                key={index}
                className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/50"
              >
                <div>
                  <p className="font-medium">
                    {activity.title}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                </div>

                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {activity.time}
                </span>
              </div>
            )
          )}
        </div>

      </CardContent>
    </Card>

  </div>
);
}