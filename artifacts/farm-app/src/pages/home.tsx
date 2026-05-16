import { Link } from "wouter";
import { Show } from "@clerk/react";
import { 
  ArrowRight, 
  Sprout, 
  LineChart, 
  Cloud, 
  Zap, 
  Target, 
  ShieldCheck, 
  Globe, 
  MousePointerClick,
  BarChart3,
  PieChart,
  LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

// --- Sub-Components untuk Kebersihan Kode ---

const FloatingCard = ({ children, className, delay = 0 }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.8, ease: [0.21, 1.11, 0.81, 0.99] }}
    className={`absolute hidden md:block rounded-3xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-xl ${className}`}
  >
    {children}
  </motion.div>
);

const FeatureCard = ({ icon: Icon, title, desc, tag }: any) => (
  <motion.div 
    whileHover={{ y: -10 }}
    className="group relative flex flex-col justify-end overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-8 transition-all hover:border-emerald-500/50 hover:shadow-[0_20px_40px_rgba(5,150,105,0.1)] dark:border-slate-800 dark:bg-slate-900"
  >
    <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-50 opacity-0 transition-all group-hover:opacity-100 dark:bg-emerald-900/20"></div>
    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
      <Icon className="h-7 w-7" />
    </div>
    <span className="mb-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600">{tag}</span>
    <h3 className="mb-3 text-2xl font-black text-slate-900 dark:text-white">{title}</h3>
    <p className="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">{desc}</p>
  </motion.div>
);

export function HomePage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -200]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -500]);

  return (
    <div ref={containerRef} className="relative min-h-screen w-full bg-[#FAFBF9] selection:bg-emerald-200 selection:text-emerald-900 dark:bg-slate-950">
      
      {/* ── 1. GLOBAL DECORATIONS ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] top-[5%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[120px]"></div>
        <div className="absolute -right-[10%] top-[20%] h-[600px] w-[600px] rounded-full bg-lime-400/10 blur-[150px]"></div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-800"></div>
      </div>

      {/* ── 2. NAVIGATION (Sleek & Floating) ── */}
      <nav className="fixed top-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-8 rounded-full border border-white/40 bg-white/60 px-6 py-3 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-900/60">
        <div className="flex items-center gap-2 font-black tracking-tighter text-emerald-700 dark:text-emerald-400">
          <Sprout className="h-5 w-5" />
          <span>SAMBELFARM</span>
        </div>
        <div className="hidden h-4 w-px bg-slate-200 dark:bg-slate-800 md:block"></div>
        <div className="hidden gap-6 text-xs font-bold uppercase tracking-widest text-slate-500 md:flex">
          <a href="#features" className="transition-colors hover:text-emerald-600">Features</a>
          <a href="#story" className="transition-colors hover:text-emerald-600">Our Vision</a>
        </div>
        <Show when="signed-in">
          <Link href="/dashboard">
            <Button size="sm" className="rounded-full bg-emerald-600 font-bold dark:bg-emerald-500">Dashboard</Button>
          </Link>
        </Show>
        <Show when="signed-out">
          <Link href="/sign-in">
            <Button size="sm" variant="ghost" className="rounded-full font-bold">Login</Button>
          </Link>
        </Show>
      </nav>

      {/* ── 3. HERO SECTION (The Visionary Stage) ── */}
      <header className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-32 text-center md:pt-40">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-5xl"
        >
          {/* Badge */}
          <div className="mx-auto mb-8 flex w-max items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 shadow-sm backdrop-blur-sm dark:border-emerald-900/50 dark:bg-slate-900/80 dark:text-emerald-400">
            <Globe className="h-3 w-3 animate-spin-slow" />
            <span>Agriculture Operating System v2.0</span>
          </div>

          <h1 className="text-6xl font-black leading-[0.95] tracking-tight text-slate-950 md:text-8xl lg:text-9xl dark:text-white">
            DIRT INTO <br />
            <span className="bg-gradient-to-b from-emerald-400 to-emerald-700 bg-clip-text text-transparent">DATA.</span>
          </h1>

          <p className="mx-auto mt-10 max-w-2xl text-lg font-medium leading-relaxed text-slate-500 md:text-2xl dark:text-slate-400">
            Ubah cara Anda melihat kebun. Sambelfarm adalah intelijen bisnis yang mengubah input operasional menjadi kejernihan profit. 
            <span className="text-slate-900 dark:text-white"> Dibuat untuk petani yang berpikir seperti CEO.</span>
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row">
            <Link href="/sign-up">
              <Button size="lg" className="h-16 rounded-full bg-emerald-600 px-10 text-lg font-black tracking-tight shadow-2xl shadow-emerald-600/40 transition-transform hover:scale-105 active:scale-95 dark:bg-emerald-500">
                MULAI EKSPEDISI DATA
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3 text-sm font-bold text-slate-400">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Trusted by 100+ Modern Agropreneurs
            </div>
          </div>
        </motion.div>

        {/* --- Floating Visual Elements (The Wow Factor) --- */}
        <div className="relative mt-20 h-[400px] w-full max-w-6xl">
           <FloatingCard className="left-0 top-0 z-20 w-64 rotate-[-6deg]" delay={0.4}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Margin Profit</p>
                  <p className="text-xl font-black text-slate-900">45.8%</p>
                </div>
              </div>
           </FloatingCard>

           <FloatingCard className="right-10 top-20 z-10 w-72 rotate-[4deg]" delay={0.6}>
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">HPP Control</p>
                  <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full w-[70%] bg-emerald-500"></div>
                </div>
                <p className="text-xs font-bold text-slate-600">Rp 18.200 / Kg</p>
              </div>
           </FloatingCard>

           <FloatingCard className="left-20 bottom-10 z-30 w-56 rotate-[2deg] border-emerald-500/30 bg-emerald-500/10" delay={0.8}>
              <div className="flex items-center gap-3 text-emerald-700">
                <PieChart className="h-6 w-6" />
                <span className="text-sm font-black uppercase tracking-tighter">Real-time Sync</span>
              </div>
           </FloatingCard>

           {/* Central "Dashboard" Mockup Teaser */}
           <motion.div 
            style={{ y: y1 }}
            className="mx-auto mt-10 h-[500px] w-full max-w-4xl rounded-t-[3rem] border-x border-t border-white/40 bg-white/30 p-4 shadow-[0_-20px_80px_rgba(5,150,105,0.15)] backdrop-blur-3xl dark:border-white/10 dark:bg-slate-900/30"
           >
              <div className="h-full w-full rounded-t-[2rem] bg-gradient-to-br from-slate-900 to-slate-950 p-8 text-left shadow-inner">
                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <div className="flex gap-4">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                    <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                  </div>
                  <LayoutDashboard className="h-5 w-5 text-white/20" />
                </div>
                <div className="mt-10 space-y-6">
                  <div className="h-8 w-1/3 rounded-lg bg-white/10 animate-pulse"></div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-32 rounded-2xl bg-white/5 border border-white/5"></div>
                    <div className="h-32 rounded-2xl bg-white/5 border border-white/5"></div>
                    <div className="h-32 rounded-2xl bg-emerald-500/20 border border-emerald-500/20"></div>
                  </div>
                </div>
              </div>
           </motion.div>
        </div>
      </header>

      {/* ── 4. PROBLEM SECTION (The Empathy Hook) ── */}
      <section id="story" className="relative bg-slate-950 py-32 text-white">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="grid gap-20 lg:grid-cols-2 lg:items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="text-4xl font-black leading-tight md:text-6xl">
                BERHENTI <br />
                <span className="text-emerald-400">MENEBAK-NEBAK</span> <br />
                PROFIT ANDA.
              </h2>
              <p className="mt-8 text-lg leading-relaxed text-slate-400 md:text-xl">
                Banyak pengusaha kebun gagal bukan karena tanamannya mati, tapi karena mereka 
                <span className="text-white"> buta terhadap angka operasionalnya sendiri.</span> <br /><br />
                Sambelfarm hadir untuk menghentikan kebocoran finansial di antara sela-sela polybag. Kami menghubungkan Notion Anda ke sebuah mesin kalkulasi otomatis yang memberitahu Anda kapan harus berekspansi dan kapan harus efisiensi.
              </p>
            </motion.div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="h-40 rounded-3xl bg-emerald-600 p-6">
                  <p className="text-3xl font-black italic">0%</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Ghosting Data</p>
                </div>
                <div className="h-60 rounded-3xl bg-slate-900 p-6 border border-white/5">
                  <LineChart className="h-10 w-10 text-emerald-400 mb-4" />
                  <p className="font-bold">HPP Insight</p>
                </div>
              </div>
              <div className="space-y-4 pt-12">
                <div className="h-60 rounded-3xl bg-slate-900 p-6 border border-white/5">
                  <Cloud className="h-10 w-10 text-blue-400 mb-4" />
                  <p className="font-bold">Notion Sync</p>
                </div>
                <div className="h-40 rounded-3xl bg-amber-500 p-6 text-slate-950">
                   <Target className="h-10 w-10 mb-4" />
                   <p className="font-black italic">Precision</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. FEATURES (The Tech Specs) ── */}
      <section id="features" className="py-32">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="mb-20 text-center">
            <h2 className="text-4xl font-black text-slate-950 md:text-6xl dark:text-white">CORE ENGINE.</h2>
            <p className="mt-4 font-bold text-emerald-600 uppercase tracking-widest">Built for High-Growth Farming</p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard 
              icon={BarChart3}
              tag="Financial Intelligence"
              title="Laba Rugi Visual"
              desc="Lupakan tabel angka yang membosankan. Lihat pergerakan uang Anda dalam visualisasi yang intuitif dan mudah dipahami dalam sekali lirik."
            />
            <FeatureCard 
              icon={MousePointerClick}
              tag="One-Handed Operation"
              title="Input Dari Lahan"
              desc="Didesain untuk dioperasikan saat Anda berdiri di tengah kebun. Input pengeluaran atau panen hanya butuh beberapa detik."
            />
            <FeatureCard 
              icon={ShieldCheck}
              tag="Notion Backbone"
              title="Data Tetap Milik Anda"
              desc="Kami tidak menyimpan data Anda di server kami. Semua tersimpan aman di Notion Anda. Kami hanya menjadi 'wajah' pintarnya."
            />
          </div>
        </div>
      </section>

      {/* ── 6. FINAL CALL TO ACTION (The Conversion) ── */}
      <section className="relative overflow-hidden py-32">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <div className="relative z-10 rounded-[3rem] bg-emerald-600 p-12 text-white shadow-2xl md:p-20 dark:bg-emerald-900">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
            <h2 className="text-5xl font-black tracking-tight md:text-7xl">
              SIAP JADI <br /> PENGUASA PASAR?
            </h2>
            <p className="mx-auto mt-8 max-w-xl text-lg font-medium text-emerald-100">
              Bergabunglah dengan ekosistem agropreneur yang sudah meninggalkan cara lama. Kelola kebun Anda seperti bisnis teknologi.
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/sign-up">
                <Button size="lg" className="h-16 w-full rounded-2xl bg-white px-10 text-lg font-black text-emerald-900 transition-transform hover:scale-105 sm:w-auto">
                  AKTIVASI SEKARANG
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="ghost" className="h-16 w-full rounded-2xl border border-white/20 px-10 text-lg font-black text-white hover:bg-white/10 sm:w-auto">
                  LIHAT DEMO
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. FOOTER ── */}
      <footer className="py-12 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
        © 2026 Sambelfarm Agrotech Ecosystem • All Rights Reserved
      </footer>

    </div>
  );
}
