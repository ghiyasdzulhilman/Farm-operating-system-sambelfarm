import {
  Banknote,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Leaf,
  LoaderCircle,
  Search,
  Sprout,
  Wrench,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardActivity, DashboardDerivedSummary } from "@/types/dashboard";

type VisibleActivity = DashboardActivity & { time: string };

interface OperationalSectionProps {
  operational: DashboardDerivedSummary["operational"];
  activities: VisibleActivity[];
}

const moduleMeta = {
  perawatan: { label: "Perawatan", icon: Sprout },
  inspeksi: { label: "Inspeksi", icon: Search },
  operasional: { label: "Operasional", icon: Wrench },
} as const;

const activityMeta = {
  perawatan: { label: "Perawatan", icon: Sprout },
  inspeksi: { label: "Inspeksi", icon: Leaf },
  operasional: { label: "Operasional", icon: Wrench },
  harvest: { label: "Panen", icon: Sprout },
  expense: { label: "Pengeluaran", icon: Banknote },
} as const;

export function OperationalSection({ operational, activities }: OperationalSectionProps) {
  const stats = [
    {
      label: "Aktivitas",
      value: operational.total,
      helper: "pada scope ini",
      icon: CircleDashed,
    },
    {
      label: "Belum",
      value: operational.pending,
      helper: "belum ditangani",
      icon: Clock3,
    },
    {
      label: "Proses",
      value: operational.inProgress,
      helper: "sedang berjalan",
      icon: LoaderCircle,
    },
    {
      label: "Selesai",
      value: operational.completed,
      helper: "sudah ditutup",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className="rounded-[1.25rem] border-border/50 bg-card/70 text-card-foreground shadow-sm backdrop-blur-md"
            >
              <CardContent className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl font-black tracking-[-0.05em]">{stat.value}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{stat.helper}</p>
                  </div>
                  <div className="rounded-xl border border-border/30 bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-[1.5rem] border-border/50 bg-card/70 shadow-sm backdrop-blur-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-black tracking-[-0.03em]">Komposisi aktivitas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {operational.byModule.map((item) => {
            const meta = moduleMeta[item.module];
            const Icon = meta.icon;
            const percentage = operational.total > 0 ? (item.count / operational.total) * 100 : 0;

            return (
              <div key={item.module} className="rounded-xl border border-border/30 bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{meta.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.count} aktivitas</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-foreground">{percentage.toFixed(0)}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(percentage, 100)}%` }} />
                </div>
              </div>
            );
          })}

          {operational.total === 0 && (
            <div className="rounded-xl border border-dashed border-border/50 px-4 py-7 text-center">
              <p className="text-sm font-bold">Belum ada aktivitas agronomi</p>
              <p className="mt-1 text-xs text-muted-foreground">Tidak ada perawatan, inspeksi, atau operasional pada scope ini.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-[1.5rem] border-border/50 bg-card/70 shadow-sm backdrop-blur-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-black tracking-[-0.03em]">Aktivitas terbaru</CardTitle>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Perawatan, inspeksi, operasional, panen, dan pengeluaran.</p>
            </div>
            <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
              {activities.length} terbaru
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-2.5">
          {activities.length > 0 ? (
            activities.map((activity) => {
              const meta = activityMeta[activity.type];
              const Icon = meta.icon;

              return (
                <div
                  key={`${activity.type}-${activity.id}`}
                  className="rounded-[1.15rem] border border-border/40 bg-muted/20 p-3.5"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 rounded-xl bg-primary/10 p-2.5 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-[0.13em] text-muted-foreground">
                            {meta.label}
                          </p>
                          <p className="mt-0.5 truncate text-sm font-bold tracking-[-0.02em]">{activity.title}</p>
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-muted-foreground">
                          <Clock3 className="h-3 w-3" />
                          {activity.time}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{activity.description}</p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-border/50 px-4 py-8 text-center">
              <p className="text-sm font-bold">Belum ada aktivitas pada periode ini</p>
              <p className="mt-1 text-xs text-muted-foreground">Ubah scope atau periode untuk melihat riwayat lainnya.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
