import { Bug, FlaskConical, MapPinned, Search, ShieldAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardDerivedSummary } from "@/types/dashboard";

interface AgronomyHealthProps {
  agronomy: DashboardDerivedSummary["agronomy"];
}

const formatShortDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const kindLabel = (kind: string) => {
  const normalized = kind.trim().toLowerCase();
  if (normalized === "hama") return "Hama";
  if (normalized === "penyakit") return "Penyakit";
  return kind || "Kendala";
};

export function AgronomyHealth({ agronomy }: AgronomyHealthProps) {
  const stats = [
    {
      label: "Inspeksi",
      value: agronomy.inspectionCount,
      helper: "pada scope ini",
      icon: Search,
    },
    {
      label: "Temuan",
      value: agronomy.findingCount,
      helper: "kendala tercatat",
      icon: Bug,
    },
    {
      label: "Inspeksi Bermasalah",
      value: agronomy.affectedInspectionCount,
      helper: "punya temuan",
      icon: ShieldAlert,
    },
    {
      label: "Area Terdampak",
      value: agronomy.affectedAreaCount,
      helper: "punya temuan",
      icon: MapPinned,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 px-1">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">Agronomy health</p>
          <h3 className="mt-0.5 text-base font-black tracking-[-0.03em]">Kondisi inspeksi lapangan</h3>
        </div>
        {agronomy.latestPh && (
          <div className="rounded-xl border border-border/40 bg-card/70 px-3 py-2 text-right shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-end gap-1.5 text-primary">
              <FlaskConical className="h-3.5 w-3.5" />
              <span className="text-[9px] font-black uppercase tracking-[0.12em]">pH terbaru</span>
            </div>
            <p className="mt-0.5 text-lg font-black tracking-[-0.04em]">{agronomy.latestPh.value.toFixed(1)}</p>
            <p className="text-[9px] text-muted-foreground">{formatShortDate(agronomy.latestPh.occurredAt)}</p>
          </div>
        )}
      </div>

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
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-2xl font-black tracking-[-0.05em]">{stat.value}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{stat.helper}</p>
                  </div>
                  <div className="shrink-0 rounded-xl border border-border/30 bg-primary/10 p-2 text-primary">
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-black tracking-[-0.03em]">Kendala paling sering ditemukan</CardTitle>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Berdasarkan temuan inspeksi pada scope dan periode terpilih.</p>
            </div>
            {agronomy.findingCount > 0 && (
              <span className="rounded-full border border-primary/15 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                {agronomy.findingCount} temuan
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-2.5">
          {agronomy.topIssues.length > 0 ? (
            agronomy.topIssues.map((issue, index) => {
              const percentage = agronomy.findingCount > 0 ? (issue.count / agronomy.findingCount) * 100 : 0;
              return (
                <div key={`${issue.kind}-${issue.name}`} className="rounded-xl border border-border/30 bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-black text-primary">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold">{issue.name}</p>
                          <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                            {kindLabel(issue.kind)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black">{issue.count}×</p>
                      <p className="text-[9px] text-muted-foreground">{percentage.toFixed(0)}% temuan</p>
                    </div>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(percentage, 100)}%` }} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-border/50 px-4 py-8 text-center">
              <p className="text-sm font-bold">Belum ada temuan pada scope ini</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Data akan muncul ketika inspeksi memiliki hama, penyakit, atau kendala tercatat.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
