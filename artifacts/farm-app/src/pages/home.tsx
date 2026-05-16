import { ReactNode } from "react"; // Kunci anti-error TS
import { Link } from "wouter";
import { Show } from "@clerk/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Braces,
  CircleDot,
  DatabaseZap,
  GitBranch,
  Leaf,
  Orbit,
  Radar,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Terminal,
  TrendingUp,
  Workflow,
  Zap,
} from "lucide-react";

const floatTransition = (duration: number, delay = 0) => ({
  duration,
  delay,
  repeat: Infinity,
  repeatType: "mirror" as const,
  ease: "easeInOut" as const,
});

const telemetry = [
  { label: "GROSS MARGIN", value: "+42.8%", tone: "text-emerald-300" },
  { label: "YIELD VELOCITY", value: "1.8T/WK", tone: "text-lime-300" },
  { label: "RUNWAY", value: "91 DAYS", tone: "text-amber-300" },
];

const fieldNodes = [
  { label: "CAPITAL", value: "IDR 124M", x: "left-[8%]", y: "top-[18%]" },
  { label: "HARVEST", value: "864 KG", x: "right-[9%]", y: "top-[26%]" },
  { label: "HPP/KG", value: "8.2K", x: "left-[13%]", y: "bottom-[21%]" },
  { label: "SYNC", value: "LIVE", x: "right-[15%]", y: "bottom-[18%]" },
];

const bentoPanels = [
  {
    icon: DatabaseZap,
    eyebrow: "NOTION DATA PLANE",
    title: "Databases become telemetry.",
    description:
      "Financial, harvest, and expense records resolve into one operating graph without spreadsheet drag.",
    meta: "schema.align()",
    className: "md:col-span-2",
  },
  {
    icon: Radar,
    eyebrow: "FIELD SIGNALS",
    title: "Production is observed, not guessed.",
    description:
      "Every kilogram, block, cost anomaly, and margin delta becomes a live decision signal.",
    meta: "yield.scan:active",
    className: "md:row-span-2",
  },
  {
    icon: TrendingUp,
    eyebrow: "UNIT ECONOMICS",
    title: "Profit physics for modern farms.",
    description:
      "Track modal, revenue, expenses, HPP, BEP, and margin with boardroom clarity.",
    meta: "margin.vector",
    className: "",
  },
  {
    icon: Sparkles,
    eyebrow: "INTELLIGENCE LAYER",
    title: "Recommendations with operational weight.",
    description:
      "Detect costly areas, production lift, and margin compression before they compound.",
    meta: "insight.dispatch",
    className: "",
  },
];

function TerminalCta({
  href,
  children,
  primary = false,
  testId,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
  testId: string;
}) {
  return (
    <Link href={href}>
      <motion.a
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        data-testid={testId}
        className={`group relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-xl border px-5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] transition-colors sm:w-auto cursor-pointer ${
          primary
            ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100 shadow-[0_0_38px_rgba(16,185,129,0.18)]"
            : "border-white/10 bg-white/[0.025] text-white/70 hover:text-white"
        }`}
      >
        <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
        <span className="absolute inset-0 opacity-0 mix-blend-screen transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.28),transparent_55%)]" />
        <Terminal className="mr-2 h-3.5 w-3.5" />
        <span className="relative">{children}</span>
        <ArrowRight className="relative ml-2 h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        {primary && (
          <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.95)]" />
        )}
      </motion.a>
    </Link>
  );
}

function CommandConsole() {
  return (
    <motion.div
      initial={{ opacity: 0, rotateX: 18, rotateY: -18, y: 40 }}
      animate={{ opacity: 1, rotateX: 0, rotateY: 0, y: [0, -12, 0] }}
      transition={{ opacity: { duration: 0.8 }, y: floatTransition(7.5, 0.2) }}
      className="relative mx-auto w-full max-w-[760px] [transform-style:preserve-3d]"
    >
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-emerald-400/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-white/[0.035] shadow-[0_28px_120px_rgba(0,0,0,0.7),0_0_90px_rgba(16,185,129,0.08)] backdrop-blur-2xl">
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_85%_10%,rgba(163,230,53,0.10),transparent_28%)]" />

        <div className="relative border-b border-white/5 px-4 py-3 md:px-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.95)]" />
              sambel.os/mission-control
            </div>
            <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/35 sm:flex">
              <CircleDot className="h-3 w-3 text-lime-300" /> 14:32 UTC · LIVE
            </div>
          </div>
        </div>

        <div className="relative grid gap-4 p-4 md:grid-cols-[1.1fr_0.9fr] md:p-5">
          <div className="rounded-[1.4rem] border border-white/5 bg-black/35 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-300/70">
                  Operational Gravity
                </p>
                <h3 className="mt-2 text-3xl font-black tracking-[-0.06em] text-white md:text-5xl">
                  ZERO.
                </h3>
              </div>
              <Orbit className="h-8 w-8 text-emerald-300/80" />
            </div>

            <div className="mt-8 h-28 rounded-[1.15rem] border border-white/5 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(255,255,255,0.015))] p-3">
              <div className="flex h-full items-end gap-2">
                {[44, 68, 52, 82, 61, 93, 74, 88, 64, 96, 78, 90].map(
                  (height, index) => (
                    <motion.div
                      key={index}
                      initial={{ height: 12 }}
                      animate={{ height: `${height}%` }}
                      transition={{ duration: 0.8, delay: index * 0.04 }}
                      className="flex-1 rounded-t-sm bg-gradient-to-t from-emerald-500/35 to-lime-300 shadow-[0_0_18px_rgba(16,185,129,0.22)]"
                    />
                  ),
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            {telemetry.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + index * 0.08 }}
                className="rounded-[1.15rem] border border-white/5 bg-white/[0.035] p-4"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
                  {item.label}
                </p>
                <p
                  className={`mt-2 text-2xl font-black tracking-[-0.05em] ${item.tone}`}
                >
                  {item.value}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative grid grid-cols-3 border-t border-white/5">
          {[
            ["NOTION", "SYNCED"],
            ["FIELD", "MAPPED"],
            ["ANOMALY", "WATCH"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border-r border-white/5 p-4 last:border-r-0"
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
                {label}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_at_top,black_0%,black_45%,transparent_78%)]" />
      <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_20px_20px,rgba(16,185,129,0.36)_1px,transparent_1.5px)] [background-size:80px_80px] opacity-20 [mask-image:radial-gradient(ellipse_at_top,black_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-12rem] top-40 h-[420px] w-[420px] rounded-full bg-lime-300/5 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[-16rem] left-[-10rem] h-[420px] w-[420px] rounded-full bg-amber-500/5 blur-[120px]" />

      {fieldNodes.map((node, index) => (
        <motion.div
          key={node.label}
          animate={{ y: [0, index % 2 ? -18 : -12, 0] }}
          transition={floatTransition(5.8 + index * 0.7, index * 0.18)}
          className={`pointer-events-none absolute hidden rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/35 backdrop-blur-xl md:block ${node.x} ${node.y}`}
        >
          <span className="mr-2 text-emerald-300/80">{node.value}</span>
          {node.label}
        </motion.div>
      ))}

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between border-b border-white/5 pb-5">
          <Link href="/">
            <a className="group flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.035] shadow-[0_0_32px_rgba(16,185,129,0.12)] backdrop-blur-xl">
                <Leaf className="h-4 w-4 text-emerald-300" />
              </span>
              <span>
                <span className="block text-sm font-black tracking-[-0.02em] text-white">
                  Sambel Farm
                </span>
                <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-white/35">
                  Boutique Agritech OS
                </span>
              </span>
            </a>
          </Link>

          <div className="hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.95)]" />
            Premium Data Plane
          </div>
        </header>

        <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[0.92fr_1.08fr] lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/45 backdrop-blur-xl">
              <ScanLine className="h-3.5 w-3.5 text-emerald-300" />
              Premium Boutique Agritech OS
            </div>

            <h1
              data-testid="text-hero-title"
              className="mt-7 max-w-5xl text-6xl font-black uppercase leading-[0.82] tracking-[-0.08em] text-white sm:text-7xl md:text-8xl xl:text-9xl"
            >
              DIRT
              <br />
              INTO
              <span className="block bg-gradient-to-r from-emerald-300 via-lime-200 to-white bg-clip-text text-transparent">
                DATA.
              </span>
            </h1>

            <p
              data-testid="text-hero-subtitle"
              className="mt-7 max-w-2xl text-base leading-7 text-white/55 md:text-lg"
            >
              Sambel Farm turns Notion-backed financial, production, and
              operational records into a mission-control interface for modern
              farms. Zero dashboard clutter. Pure operating signal.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Show when="signed-out">
                <TerminalCta
                  href="/sign-up"
                  primary
                  testId="button-hero-signup"
                >
                  Initialize OS
                </TerminalCta>
                <TerminalCta href="/sign-in" testId="button-hero-signin">
                  Authenticate
                </TerminalCta>
              </Show>

              <Show when="signed-in">
                <TerminalCta
                  href="/dashboard"
                  primary
                  testId="button-hero-dashboard"
                >
                  Open Mission Control
                </TerminalCta>
              </Show>
            </div>

            <div className="mt-9 grid max-w-xl grid-cols-3 gap-2 border-t border-white/5 pt-5">
              {[
                ["MODE", "DARK VOID"],
                ["SYNC", "NOTION API"],
                ["STATE", "LIVE OPS"],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/25">
                    {label}
                  </p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-white/70">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="relative [perspective:1200px]">
            <motion.div
              animate={{ y: [0, -15, 0], rotateZ: [0, 0.35, 0] }}
              transition={floatTransition(8.5)}
              className="absolute -right-3 top-2 z-10 hidden rounded-2xl border border-white/5 bg-white/[0.035] p-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 backdrop-blur-2xl lg:block"
            >
              <GitBranch className="mb-2 h-4 w-4 text-lime-300" />
              Schema Graph
            </motion.div>
            <motion.div
              animate={{ y: [0, -22, 0], rotateZ: [0, -0.45, 0] }}
              transition={floatTransition(7.2, 0.4)}
              className="absolute -left-4 bottom-14 z-10 hidden rounded-2xl border border-white/5 bg-white/[0.035] p-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 backdrop-blur-2xl lg:block"
            >
              <Braces className="mb-2 h-4 w-4 text-emerald-300" />
              Unit Economics
            </motion.div>
            <CommandConsole />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="grid gap-3 pb-10 md:grid-cols-4"
        >
          {bentoPanels.map((panel) => {
            const Icon = panel.icon;
            return (
              <div
                key={panel.title}
                className={`group relative overflow-hidden rounded-[1.5rem] border border-white/5 bg-white/[0.025] p-5 backdrop-blur-2xl transition-all duration-300 hover:border-emerald-300/20 hover:bg-white/[0.04] ${panel.className}`}
              >
                <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute inset-0 opacity-0 mix-blend-screen transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.18),transparent_58%)]" />
                <div className="relative">
                  <Icon className="h-5 w-5 text-emerald-300" />
                  <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">
                    {panel.eyebrow}
                  </p>
                  <h3 className="mt-2 text-xl font-black tracking-[-0.04em] text-white">
                    {panel.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/[0.55]">
                    {panel.description}
                  </p>
                  <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.18em] text-lime-300/60">
                    {panel.meta}
                  </p>
                </div>
              </div>
            );
          })}

          <div className="group relative overflow-hidden rounded-[1.5rem] border border-white/5 bg-white/[0.025] p-5 backdrop-blur-2xl transition-all duration-300 hover:border-amber-300/20 hover:bg-white/[0.04] md:col-span-4">
            <div className="grid gap-4 md:grid-cols-[0.6fr_1.4fr] md:items-center">
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-300/55">
                  Operational Gravity: Zero.
                </p>
                <h3 className="mt-2 text-3xl font-black uppercase leading-none tracking-[-0.06em] text-white md:text-5xl">
                  Farm ops without friction.
                </h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { icon: ShieldCheck, label: "Secure auth", value: "CLERK" },
                  { icon: Workflow, label: "Mapping", value: "DYNAMIC" },
                  { icon: Zap, label: "Signals", value: "REALTIME" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/5 bg-black/30 p-4"
                    >
                      <Icon className="h-4 w-4 text-emerald-300" />
                      <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">
                        {item.label}
                      </p>
                      <p className="mt-1 font-mono text-xs font-bold uppercase tracking-[0.18em] text-white/70">
                        {item.value}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
    </main>
  );
}
