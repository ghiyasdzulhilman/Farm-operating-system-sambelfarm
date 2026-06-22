import {
  AlertTriangle,
  Bot,
  BrainCircuit,
  CircleGauge,
  Lightbulb,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

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

const hpp =
  displayData.pengeluaran /
  (displayData.harvestWeight || 1);

const insights = [
  {
    title:
      displayData.margin < 15
        ? "Margin perlu perhatian"
        : "Margin stabil",

    description:
      `Margin saat ini ${displayData.margin.toFixed(1)}%.
      Sistem membaca performa sebagai
      ${localBusinessStatus.toLowerCase()}.`,

    icon: CircleGauge,

    tone:
      displayData.margin < 15
        ? "amber"
        : "emerald",
  },

  {
    title: "HPP terpantau otomatis",

    description:
      `Harga pokok produksi sekitar
      ${formatCurrency(hpp)}/kg
      berdasarkan data panen dan pengeluaran.`,

    icon: BrainCircuit,

    tone: "cyan",
  },

  {
    title:
      "Produksi meningkat jika bottleneck ditekan",

    description:
      "Prioritaskan area dengan output tinggi dan biaya input rendah untuk siklus berikutnya.",

    icon: TrendingUp,

    tone: "emerald",
  },

  {
    title:
      "Area paling boros perlu audit",

    description:
      "Bandingkan biaya pupuk, tenaga kerja, dan perlakuan per blok sebelum scale-up.",

    icon: AlertTriangle,

    tone: "rose",
  },
];

const toneClass: Record<string, string> = {
  amber:
    "border-amber-500/20 bg-amber-500/10 text-amber-600",

  emerald:
    "border-primary/20 bg-primary/10 text-primary",

  cyan:
    "border-cyan-500/20 bg-cyan-500/10 text-cyan-600",

  rose:
    "border-rose-500/20 bg-rose-500/10 text-rose-600",
};

  return (
  <div className="space-y-4 md:space-y-5">

    <div>

      <p
        /* AUDIT WARNA: Teks statis violet diubah ke warna accent dinamis */
        className="
          text-xs
          font-black
          uppercase
          tracking-[0.22em]
          text-accent
        "
      >
        Smart Insight
      </p>

    </div>

    <div
      className="
        grid
        gap-4
      "
    >

      <div
        className="
          grid
          gap-3
          sm:grid-cols-2
        "
      >

        {insights.map((insight) => {

          const Icon = insight.icon;

          return (

            <Card
              key={insight.title}
              /* AUDIT WARNA: Mengganti kaca statis putih dengan semantic bg-card agar plong & responsif */
              className="
                rounded-[1.75rem]
                border-border/50
                bg-card
                text-card-foreground
                shadow-sm
              "
            >

              <CardContent className="p-5">

                <div
                  className={`
                    mb-4
                    inline-flex
                    rounded-2xl
                    border
                    p-3
                    ${toneClass[insight.tone]}
                  `}
                >

                  <Icon
                    className="
                      h-4
                      w-4
                    "
                  />

                </div>

                <h3
                  className="
                    text-base
                    font-black
                    tracking-[-0.03em]
                  "
                >
                  {insight.title}
                </h3>

                <p
                  className="
                    mt-2
                    text-sm
                    leading-6
                    text-muted-foreground
                  "
                >
                  {insight.description}
                </p>

              </CardContent>

            </Card>

          );
        })}

      </div>

    </div>

  </div>
);
}
