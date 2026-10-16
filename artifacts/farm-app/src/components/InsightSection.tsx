import {
  AlertTriangle,
  Banknote,
  Bug,
  CheckCircle2,
  CircleGauge,
  Sprout,
  Wrench,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { DashboardDerivedSummary, DashboardInsightDomain, DashboardInsightTone } from "@/types/dashboard";

interface InsightSectionProps {
  insight: DashboardDerivedSummary["insight"];
}

const domainMeta: Record<DashboardInsightDomain, { label: string; icon: typeof Banknote }> = {
  financial: { label: "Financial", icon: Banknote },
  production: { label: "Production", icon: Sprout },
  operational: { label: "Operational", icon: Wrench },
  agronomy: { label: "Agronomy", icon: Bug },
};

const toneClass: Record<DashboardInsightTone, string> = {
  attention: "border-destructive/20 bg-destructive/10 text-destructive",
  positive: "border-primary/20 bg-primary/10 text-primary",
  neutral: "border-border/50 bg-muted/30 text-foreground",
};

const toneIcon: Record<DashboardInsightTone, typeof AlertTriangle> = {
  attention: AlertTriangle,
  positive: CheckCircle2,
  neutral: CircleGauge,
};

export function InsightSection({ insight }: InsightSectionProps) {
  return (
    <div className="space-y-4 md:space-y-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">Smart Insight</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Rule-based dari data pada scope yang sedang dipilih. Setiap insight menyertakan bukti angkanya.
        </p>
      </div>

      {insight.items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {insight.items.map((item) => {
            const DomainIcon = domainMeta[item.domain].icon;
            const ToneIcon = toneIcon[item.tone];

            return (
              <Card
                key={item.id}
                className="rounded-[1.5rem] border-border/50 bg-card/70 text-card-foreground shadow-sm backdrop-blur-md"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`inline-flex rounded-xl border p-2.5 ${toneClass[item.tone]}`}>
                      <ToneIcon className="h-4 w-4" />
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/20 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                      <DomainIcon className="h-3 w-3" />
                      {domainMeta[item.domain].label}
                    </span>
                  </div>

                  <h3 className="mt-3 text-sm font-black tracking-[-0.03em]">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{item.description}</p>

                  <div className="mt-3 space-y-1.5 border-t border-border/30 pt-3">
                    {item.evidence.map((evidence) => (
                      <div key={evidence} className="flex items-start gap-2 text-[10px] font-semibold text-muted-foreground">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                        <span>{evidence}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[1.5rem] border border-dashed border-border/50 bg-card/50 px-5 py-10 text-center">
          <p className="text-sm font-black">Belum cukup data untuk membuat insight</p>
          <p className="mt-1 text-xs text-muted-foreground">Tambahkan aktivitas, panen, pengeluaran, atau inspeksi pada scope ini.</p>
        </div>
      )}
    </div>
  );
}
