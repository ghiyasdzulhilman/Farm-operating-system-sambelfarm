import { Link } from "wouter";
import { Show } from "@clerk/react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { 
  ArrowRight, 
  Leaf, 
  Cpu, 
  LineChart, 
  Workflow, 
  ShieldCheck, 
  Zap, 
  Orbit, 
  ScanLine,
  BarChart3,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function HomePage() {
  // Inisialisasi Ref dan Scroll Tracker untuk Efek Parallax Mockup
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Efek transisi halus mockup kanan pas layar di-scroll ke bawah
  const mockupY = useTransform(scrollYProgress, [0, 1], [0, -100]);

  return (
    <div ref={containerRef} className="relative overflow-hidden bg-[#FAFBF9] text-slate-900 dark:bg-slate-950 dark:text-white min-h-screen w-full font-sans">
      
      {/* ──────────────────────────────────────────────────────────────── */}
      {/* ORGANIC GLOBAL BACKGROUND */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        <div className="absolute left-[-10%] top-[-5%] h-[520px] w-[520px] rounded-full bg-primary/[0.10] blur-3xl dark:bg-primary/[0.14]" />
        <div className="absolute right-[-5%] top-[15%] h-[420px] w-[420px] rounded-full bg-amber-400/[0.08] blur-3xl dark:bg-amber-400/[0.10]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[520px] w-[520px] rounded-full bg-emerald-300/[0.08] blur-3xl dark:bg-emerald-400/[0.10]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.05),transparent_25%),radial-gradient(circle_at_85%_20%,rgba(245,158,11,0.05),transparent_25%),radial-gradient(circle_at_50%_80%,rgba(16,185,129,0.04),transparent_28%)]" />
      </div>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* HERO SECTION */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-6 pb-28 pt-24 md:px-8 lg:px-12 z-10">
        <div className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
          
          {/* HERO LEFT: TEXT & CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/[0.18] bg-white/[0.65] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 shadow-[0_12px_32px_rgba(0,0,0,0.03)] backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.05] dark:text-emerald-300">
              <div className="h-2 w-2 rounded-full bg-primary" />
              Executive Farm Operating System
            </div>

            <div className="mt-8 space-y-7">
              <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-[-0.06em] text-slate-950 dark:text-white md:text-7xl">
                Jalankan kebun seperti{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  perusahaan teknologi
                </span>
              </h1>

              <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300 md:text-xl">
                Dari biaya produksi, margin panen cabai, sampai kesehatan operasional — semua terhubung dalam satu sistem presisi untuk grower modern yang menolak bekerja berdasarkan tebakan.
              </p>

              <div className="flex flex-wrap gap-4 pt-3">
                <Show when="signed-out">
                  <Link href="/sign-up">
                    <Button
                      className="h-14 rounded-2xl bg-slate-950 px-7 text-sm font-semibold tracking-wide text-white shadow-[0_20px_40px_rgba(15,23,42,0.16)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_56px_rgba(15,23,42,0.22)] dark:bg-white dark:text-slate-950"
                    >
                      Mulai Sekarang
                    </Button>
                  </Link>
                </Show>

                <Show when="signed-in">
                  <Link href="/dashboard">
                    <Button
                      className="h-14 rounded-2xl bg-primary px-7 text-sm font-semibold tracking-wide text-white shadow-[0_20px_40px_rgba(16,185,129,0.2)] transition-all duration-300 hover:-translate-y-1 dark:bg-primary"
                    >
                      Buka Dashboard Utama
                    </Button>
                  </Link>
                </Show>

                <Link href="/sign-in">
                  <Button
                    variant="outline"
                    className="h-14 rounded-2xl border-white/[0.45] bg-white/[0.55] px-7 text-sm font-semibold backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.75] dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
                  >
                    Masuk ke Akun
                  </Button>
                </Link>
              </div>

              {/* MICRO STATS COUNTER */}
              <div className="grid max-w-2xl grid-cols-3 gap-4 pt-8">
                {[
                  { label: "Net Margin", value: "+45.8%" },
                  { label: "Operational Sync", value: "99.2%" },
                  { label: "Harvest Accuracy", value: "Realtime" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-3xl border border-white/[0.45] bg-white/[0.55] p-5 shadow-[0_24px_48px_rgba(0,0,0,0.03)] backdrop-blur-xl dark:border-white/[0.05] dark:bg-white/[0.04]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-3 text-2xl font-black tracking-[-0.04em]">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* HERO RIGHT: PERSPECTIVE MOCKUPS */}
          <motion.div style={{ y: mockupY }} className="relative">
            
            {/* FLOATING CARD 1: ACTUAL HPP */}
            <motion.div
              whileHover={{ y: -6 }}
              className="absolute -left-10 top-8 z-20 w-[240px] rounded-[28px] border border-white/[0.40] bg-white/[0.62] p-5 shadow-[0_32px_64px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/[0.05] dark:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Actual HPP
                  </p>
                  <h3 className="mt-2 text-3xl font-black tracking-[-0.05em]">
                    Rp 18.2K
                  </h3>
                </div>
                <div className="rounded-2xl bg-primary/[0.12] p-3 text-primary">
                  <Leaf className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-slate-500">turun 12% bulan ini</span>
                <span className="font-semibold text-primary">Efficient</span>
              </div>
            </motion.div>

            {/* MAIN DASHBOARD EXECUTIVE OVERVIEW */}
            <motion.div
              whileHover={{ y: -4 }}
              className="relative overflow-hidden rounded-[36px] border border-white/[0.40] bg-white/[0.68] p-6 shadow-[0_32px_64px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/[0.05] dark:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between border-b border-slate-200/[0.6] pb-5 dark:border-white/[0.05]">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Sambel Farm OS
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.04em]">
                    Executive Overview
                  </h3>
                </div>
                <div className="rounded-2xl border border-primary/[0.18] bg-primary/[0.10] px-4 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  Live Sync
                </div>
              </div>

              {/* CHART SIMULATION */}
              <div className="mt-8 space-y-5">
                <div className="rounded-[28px] bg-slate-100/[0.7] p-5 dark:bg-white/[0.03]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">Gross Margin</p>
                      <h4 className="mt-1 text-4xl font-black tracking-[-0.05em]">32.8%</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Revenue / Week</p>
                      <p className="mt-1 text-lg font-bold text-primary">Rp 48.4JT</p>
                    </div>
                  </div>

                  <div className="mt-6 flex h-32 items-end gap-2">
                    {[28, 44, 36, 62, 58, 72, 90].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-full bg-gradient-to-t from-primary to-lime-400 opacity-90"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* BOTTOM PREVIEW GRID */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[24px] bg-slate-100/[0.7] p-4 dark:bg-white/[0.03]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Staging Queue</p>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-amber-400" />
                      <span className="font-semibold text-xs sm:text-sm">2 batch waiting</span>
                    </div>
                  </div>

                  <div className="rounded-[24px] bg-slate-100/[0.7] p-4 dark:bg-white/[0.03]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Field Health</p>
                    <div className="mt-4 flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      <span className="font-semibold text-xs sm:text-sm">Stable condition</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* FLOATING CARD 2: AUTOMATION WORKLOAD */}
            <motion.div
              whileHover={{ y: -6 }}
              className="absolute -bottom-10 right-0 z-20 w-[260px] rounded-[28px] border border-white/[0.40] bg-white/[0.62] p-5 shadow-[0_32px_64px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/[0.05] dark:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Automation Engine
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-[-0.05em]">
                    Active Sync
                  </h3>
                </div>
                <div className="rounded-2xl bg-amber-400/[0.14] p-3 text-amber-600">
                  <Cpu className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.05]">
                <div className="h-full w-[74%] rounded-full bg-gradient-to-r from-primary to-lime-400" />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-500">system status</span>
                <span className="font-semibold text-primary">Secure</span>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* EMPATHY / STORYTELLING NARRATIVE */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-6xl px-6 py-24 md:px-8">
        <div className="overflow-hidden rounded-[40px] border border-white/[0.40] bg-white/[0.62] p-10 shadow-[0_32px_64px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/[0.05] dark:bg-white/[0.04] md:p-16">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/[0.18] bg-amber-400/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
              Operational Clarity
            </div>

            <h2 className="mt-8 text-4xl font-black leading-tight tracking-[-0.05em] md:text-6xl">
              BERHENTI MENEBAK-NEBAK PROFIT ANDA
            </h2>

            <div className="mt-8 space-y-6 text-base sm:text-lg leading-8 text-slate-600 dark:text-slate-300">
              <p>
                Grower modern tidak lagi mengandalkan intuisi semata. Mereka membangun disiplin data, membaca pergerakan margin secara rutin, dan mengelola operasional kebun dengan presisi mutlak.
              </p>
              <p>
                Sambel Farm OS membantu Anda memantau kebenaran data langsung di lapangan — mulai dari kalkulasi biaya HPP per kilogram, audit titik kebocoran pengeluaran harian, hingga pelacakan grafik tonase hasil panen.
              </p>
              <p>
                Tidak ada lagi spreadsheet berantakan atau nota fisik yang hilang tercecer. Hanya ada satu pusat kendali yang tenang, solid, dan dirancang khusus bagi agropreneur untuk berekspansi secara sehat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────── */}
      {/* BENTO GRID CAPABILITIES */}
      {/* ──────────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-6 pb-32 md:px-8">
        <div className="mb-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Platform Capabilities
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] md:text-5xl">
            Arsitektur Fitur Kelas Premium
          </h2>
        </div>

        <div className="grid auto-rows-auto gap-6 md:grid-cols-6">
          
          {/* BENTO 1: FINANCIAL INTEL (LARGE CARD) */}
          <motion.div
            whileHover={{ y: -5 }}
            className="group relative col-span-6 overflow-hidden rounded-[36px] border border-white/[0.40] bg-white/[0.62] p-8 shadow-[0_32px_64px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/[0.05] dark:bg-white/[0.04] md:col-span-4"
          >
            <div className="max-w-xl">
              <div className="mb-4 h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <LineChart className="h-5 w-5" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Financial Intelligence
              </p>
              <h3 className="mt-4 text-2xl sm:text-3xl font-black tracking-[-0.04em]">
                Monitor HPP, Laba Rugi, dan Arus Modal Secara Otomatis
              </h3>
              <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Setiap rupiah biaya untuk input pertanian seperti Trichoderma, Calbovit, atau Kalinet akan langsung dihitung silang dengan total berat panen untuk melahirkan metrik profitabilitas yang jujur.
              </p>
              <p className="mt-6 font-mono text-[10px] text-primary/70">ledger.compute() : active</p>
            </div>
          </motion.div>

          {/* BENTO 2: AUTOMATION INTERFACE */}
          <motion.div
            whileHover={{ y: -5 }}
            className="col-span-6 rounded-[36px] border border-white/[0.40] bg-white/[0.62] p-8 shadow-[0_32px_64px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/[0.05] dark:bg-white/[0.04] md:col-span-2"
          >
            <div className="mb-4 h-11 w-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Workflow className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Automation</p>
            <h3 className="mt-4 text-xl font-bold tracking-tight">Smart Sync & Notion Pipeline</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Koneksi instan ke Notion API. Tetap gunakan database andalan Anda, dan biarkan engine kami yang merender visualisasinya.
            </p>
            <p className="mt-6 font-mono text-[10px] text-amber-600/70">notion.api.stream : online</p>
          </motion.div>

          {/* BENTO 3: TEAM OPERATIONS */}
          <motion.div
            whileHover={{ y: -5 }}
            className="col-span-6 rounded-[36px] border border-white/[0.40] bg-white/[0.62] p-8 shadow-[0_32px_64px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/[0.05] dark:bg-white/[0.04] md:col-span-2"
          >
            <div className="mb-4 h-11 w-11 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Orbit className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Team Operations</p>
            <h3 className="mt-4 text-xl font-bold tracking-tight">Field Coordination Transit</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Catat aktivitas harian dari tengah kebun dengan satu tangan menggunakan laci transit cerdas anti-lag.
            </p>
            <p className="mt-6 font-mono text-[10px] text-blue-600/70">field.node : deployed</p>
          </motion.div>

          {/* BENTO 4: PRODUCTION INSIGHT */}
          <motion.div
            whileHover={{ y: -5 }}
            className="col-span-6 rounded-[36px] border border-white/[0.40] bg-gradient-to-br from-primary/[0.08] to-lime-400/[0.04] p-8 shadow-[0_32px_64px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/[0.05] md:col-span-2"
          >
            <div className="mb-4 h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Production Insights</p>
            <h3 className="mt-4 text-xl font-bold tracking-tight">Harvest Velocity Curves</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Pantau tren tonase per petak area untuk membaca peta produktivitas tanaman di tiap musim panen.
            </p>
            <p className="mt-6 font-mono text-[10px] text-primary/70">yield.analytics : tracking</p>
          </motion.div>

          {/* BENTO 5: DECISION LAYER */}
          <motion.div
            whileHover={{ y: -5 }}
            className="col-span-6 rounded-[36px] border border-white/[0.40] bg-white/[0.62] p-8 shadow-[0_32px_64px_rgba(0,0,0,0.04)] backdrop-blur-2xl dark:border-white/[0.05] dark:bg-white/[0.04] md:col-span-2"
          >
            <div className="mb-4 h-11 w-11 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Layers className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Decision Layer</p>
            <h3 className="mt-4 text-xl font-bold tracking-tight">Data Discipline Protocol</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 leading-relaxed">
              Hilangkan bias tebakan margin usaha. Ambil keputusan bisnis kebun berlandaskan metrik dashboard yang solid.
            </p>
            <p className="mt-6 font-mono text-[10px] text-purple-600/70">matrix.verify : secure</p>
          </motion.div>

        </div>

        {/* BOTTOM FULL-WIDTH ASSURANCE BANNER */}
        <div className="group relative overflow-hidden rounded-[32px] border border-white/[0.40] bg-white/[0.025] p-6 sm:p-8 backdrop-blur-2xl mt-6 dark:border-white/[0.05] bg-slate-900/5 dark:bg-white/[0.02]">
          <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-amber-600 dark:text-amber-400">
                Operational Gravity: Zero.
              </p>
              <h3 className="mt-2 text-2xl sm:text-3xl font-black uppercase leading-none tracking-[-0.06em]">
                Kebun Rapi, Bisnis Sehat.
              </h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, label: "Secure Auth", value: "CLERK" },
                { icon: ScanLine, label: "Data Engine", value: "NOTION" },
                { icon: Zap, label: "Infrastructure", value: "LIVE OPS" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-2xl border border-white/[0.5] bg-white/40 dark:border-white/5 dark:bg-black/30 p-4 shadow-sm">
                    <Icon className="h-4 w-4 text-primary dark:text-emerald-400" />
                    <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.22em] text-slate-400">
                      {item.label}
                    </p>
                    <p className="mt-1 font-mono text-xs font-bold uppercase tracking-[0.18em]">
                      {item.value}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </section>

      {/* FOOTER */}
      <footer className="py-12 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 border-t border-slate-200/40 dark:border-white/5">
        © 2026 Sambelfarm Agrotech Ecosystem • All Rights Reserved
      </footer>

    </div>
  );
}
