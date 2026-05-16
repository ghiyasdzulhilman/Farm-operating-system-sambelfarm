import {
  ArrowDownCircle,
  Clock3,
  Sprout,
} from "lucide-react";

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

const feed = [
  ...harvestActivities.map((activity) => ({
    ...activity,
    tone: "emerald",
    icon: Sprout,
    label: "Harvest",
  })),

  ...expenseActivities.map((activity) => ({
    ...activity,
    tone: "amber",
    icon: ArrowDownCircle,
    label: "Expense",
  })),
].slice(0, 8);

const fallbackFeed = [
  {
    title: "20kg berhasil dicatat • Blok A",
    description:
      "Panen masuk ke database Notion dan siap dianalisis.",
    time: "baru saja",
    tone: "emerald",
    icon: Sprout,
    label: "Harvest",
  },

  {
    title: "Pupuk Rp120rb • Greenhouse",
    description:
      "Biaya operasional masuk ke perhitungan HPP/kg.",
    time: "sinkron",
    tone: "amber",
    icon: ArrowDownCircle,
    label: "Expense",
  },
];

const visibleFeed =
  feed.length > 0
    ? feed
    : fallbackFeed;

return (
  <Card
    className="
      overflow-hidden
      rounded-[1.75rem]

      border-white/60

      bg-white/70

      backdrop-blur-xl

      shadow-[0_18px_60px_rgba(15,23,42,0.08)]
    "
  >

    <CardHeader className="pb-2">

      <div
        className="
          flex
          items-center
          justify-between
          gap-3
        "
      >

        <CardTitle
          className="
            text-base
            font-black
            tracking-[-0.03em]
          "
        >
          Real-time activity feed
        </CardTitle>

        <span
          className="
            flex
            items-center
            gap-1.5

            rounded-full

            border
            border-primary/15

            bg-primary/10

            px-3
            py-1

            text-xs
            font-bold
            text-emerald-700
          "
        >

          <span
            className="
              h-1.5
              w-1.5
              rounded-full
              bg-primary
            "
          />

          live

        </span>

      </div>

    </CardHeader>

    <CardContent className="space-y-3">

      {visibleFeed.map(
        (activity: any, index: number) => {

          const Icon = activity.icon;

          const isEmerald =
            activity.tone === "emerald";

          return (

            <div
              key={`${activity.title}-${index}`}
              className="
                relative
                pl-6
              "
            >

              {index !==
                visibleFeed.length - 1 && (

                <span
                  className="
                    absolute
                    left-[0.68rem]
                    top-10

                    h-[calc(100%-1rem)]
                    w-px

                    bg-border
                  "
                />

              )}

              <span
                className={`
                  absolute
                  left-0
                  top-4

                  flex
                  h-5
                  w-5
                  items-center
                  justify-center

                  rounded-full
                  border-4
                  border-background

                  ${
                    isEmerald
                      ? "bg-primary"
                      : "bg-amber-500"
                  }
                `}
              />

              <div
                className="
                  rounded-3xl

                  border
                  border-border/60

                  bg-background/70

                  p-4

                  transition-all
                  duration-300

                  hover:-translate-y-0.5
                  hover:shadow-lg
                "
              >

                <div
                  className="
                    flex
                    items-start
                    justify-between
                    gap-3
                  "
                >

                  <div
                    className="
                      flex
                      min-w-0
                      gap-3
                    "
                  >

                    <div
                      className={`
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center

                        rounded-2xl

                        ${
                          isEmerald
                            ? `
                              bg-primary/10
                              text-emerald-700
                            `
                            : `
                              bg-amber-500/10
                              text-amber-700
                            `
                        }
                      `}
                    >

                      <Icon className="h-5 w-5" />

                    </div>

                    <div className="min-w-0">

                      <p
                        className="
                          font-bold
                          tracking-[-0.02em]
                        "
                      >
                        {activity.title}
                      </p>

                      <p
                        className="
                          mt-1
                          text-sm
                          leading-5
                          text-muted-foreground
                        "
                      >
                        {activity.description}
                      </p>

                    </div>

                  </div>

                  <span
                    className="
                      flex
                      shrink-0
                      items-center
                      gap-1

                      whitespace-nowrap

                      text-[11px]
                      font-semibold
                      text-muted-foreground
                    "
                  >

                    <Clock3 className="h-3 w-3" />

                    {activity.time}

                  </span>

                </div>

              </div>

            </div>

          );

        }
      )}

    </CardContent>

  </Card>
);
}