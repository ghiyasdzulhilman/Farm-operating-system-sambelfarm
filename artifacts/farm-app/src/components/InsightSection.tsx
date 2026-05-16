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
        className="
          text-xs
          font-black
          uppercase
          tracking-[0.22em]

          text-violet-700
        "
      >
        Smart Insight
      </p>

      <h2
        className="
          mt-1
          text-2xl
          font-black
          tracking-[-0.05em]
        "
      >
        AI-like recommendation layer
      </h2>

    </div>

    <div
      className="
        grid
        gap-4

        lg:grid-cols-[0.9fr_1.1fr]
      "
    >

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

              h-44
              w-44

              rounded-full

              bg-violet-400/30

              blur-3xl
            "
          />

          <div
            className="
              absolute
              -bottom-16
              left-8

              h-36
              w-36

              rounded-full

              bg-emerald-400/20

              blur-3xl
            "
          />

          <div
            className="
              relative
              flex
              items-center
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
                Sambel Copilot
              </p>

              <h3
                className="
                  mt-2
                  text-2xl
                  font-black
                  tracking-[-0.05em]
                "
              >
                Recommendation brief
              </h3>

            </div>

            <div
              className="
                rounded-2xl
                bg-white/10
                p-3
              "
            >

              <Bot
                className="
                  h-5
                  w-5

                  text-violet-200
                "
              />

            </div>

          </div>

          <p
            className="
              relative
              text-sm
              leading-6

              text-white/65
            "
          >
            {localRecommendation}
          </p>

          <div
            className="
              relative
              rounded-[1.4rem]

              border
              border-white/10

              bg-white/10

              p-4
            "
          >

            <div
              className="
                mb-3
                flex
                items-center
                gap-2

                text-sm
                font-bold
              "
            >

              <Lightbulb
                className="
                  h-4
                  w-4

                  text-amber-200
                "
              />

              Next best action

            </div>

            <p
              className="
                text-sm
                leading-6

                text-white/64
              "
            >
              Gunakan filter area untuk menemukan
              blok dengan HPP tertinggi,
              lalu evaluasi pengeluaran terhadap
              kg panen.
            </p>

          </div>

        </CardContent>

      </Card>

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

              className="
                rounded-[1.75rem]

                border-white/60

                bg-white/75

                backdrop-blur-2xl

                shadow-[0_18px_60px_rgba(15,23,42,0.07)]
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