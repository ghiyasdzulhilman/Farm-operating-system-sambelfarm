import { Link } from "wouter";
import { Show } from "@clerk/react";
import { ArrowRight, Sprout, TrendingUp, NotebookTabs, Leaf, LineChart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function HomePage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#F4F9F4] font-sans dark:bg-slate-950">
      
      {/* ── Background Premium Effects ── */}
      {/* 1. Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      {/* 2. Emerald Glow Blobs */}
      <div className="absolute left-0 right-0 top-[-10%] -z-10 m-auto h-[310px] w-[310px] rounded-full bg-emerald-500/20 opacity-40 blur-[100px]"></div>
      <div className="absolute -left-20 top-40 -z-10 h-[250px] w-[250px] rounded-full bg-amber-400/10 opacity-30 blur-[80px]"></div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-4 pt-20 pb-16 md:pt-32">
        
        {/* ── HERO SECTION ── */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center"
        >
          {/* Top Badge */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mx-auto mb-6 flex w-max items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50/50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-emerald-700 shadow-sm backdrop-blur-md dark:bg-emerald-900/20 dark:text-emerald-400 sm:text-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Sistem Manajemen Kebun Era Baru</span>
          </motion.div>

          <h1 className="mx-auto max-w-4xl text-4xl font-black tracking-tight text-slate-900 balance md:text-6xl lg:text-7xl dark:text-white" data-testid="text-hero-title">
            Kendali Penuh untuk <br className="hidden md:block"/> 
            <span className="bg-gradient-to-r from-emerald-600 to-teal-400 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300">
              Operasional Kebun
            </span> Anda
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-base font-medium text-slate-500 md:text-xl dark:text-slate-400" data-testid="text-hero-subtitle">
            Hubungkan data Notion Anda menjadi dashboard finansial kelas *Enterprise*. Ringkas, solid, dan dirancang khusus untuk pengusaha agrikultur modern.
          </p>
          
          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Show when="signed-out">
              <Link href="/sign-up">
                <Button size="lg" className="group h-14 w-full rounded-2xl bg-emerald-600 px-8 text-base font-bold shadow-[0_0_20px_rgba(5,150,105,0.3)] transition-all hover:bg-emerald-700 hover:shadow-[0_0_25px_rgba(5,150,105,0.5)] hover:-translate-y-1 sm:w-auto dark:bg-emerald-500 dark:hover:bg-emerald-400" data-testid="button-hero-signup">
                  Mulai Sekarang
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1.5" />
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg" className="h-14 w-full rounded-2xl border-slate-200 bg-white/50 px-8 text-base font-bold text-slate-700 backdrop-blur-sm transition-all hover:bg-white hover:text-emerald-600 sm:w-auto dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-emerald-400" data-testid="button-hero-signin">
                  Masuk ke Akun
                </Button>
              </Link>
            </Show>
            
            <Show when="signed-in">
              <Link href="/dashboard">
                <Button size="lg" className="group h-14 w-full rounded-2xl bg-emerald-600 px-8 text-base font-bold shadow-[0_0_20px_rgba(5,150,105,0.3)] transition-all hover:bg-emerald-700 hover:shadow-[0_0_25px_rgba(5,150,105,0.5)] hover:-translate-y-1 sm:w-auto dark:bg-emerald-500 dark:hover:bg-emerald-400" data-testid="button-hero-dashboard">
                  Buka Dashboard
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1.5" />
                </Button>
              </Link>
            </Show>
          </div>
        </motion.div>

        {/* ── THE HOOK (Mockup Teaser) ── */}
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="relative mt-16 w-full max-w-4xl"
        >
          {/* Glass background wrapper */}
          <div className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/40 p-2 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40 md:p-4">
            {/* Fake Inner Dashboard */}
            <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl"></div>
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-100 p-2.5 dark:bg-emerald-900/30">
                    <Leaf className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white">Business pulse</h3>
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Profitable • Margin 45%</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-50 bg-slate-50/50 p-4 dark:border-slate-800/50 dark:bg-slate-800/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Pendapatan</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Rp 12.500.000</p>
                </div>
                <div className="rounded-2xl border border-slate-50 bg-slate-50/50 p-4 dark:border-slate-800/50 dark:bg-slate-800/20">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">HPP / Kg</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Rp 18.000</p>
                </div>
              </div>
              
              {/* Fake gradient overlay covering the bottom to tease them */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent dark:from-slate-900"></div>
            </div>
          </div>
        </motion.div>

        {/* ── FEATURE CARDS ── */}
        <div className="mt-20 grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="group rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm transition-all hover:border-emerald-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-900/50"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 transition-colors group-hover:bg-emerald-100 dark:bg-emerald-950 dark:group-hover:bg-emerald-900/50">
              <LineChart className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">Monitor Keuangan Akurat</h3>
            <p className="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              Lacak pendapatan dan pengeluaran operasional kebun Anda secara *real-time*. Dapatkan ringkasan laba/rugi, margin, dan kalkulasi HPP otomatis tanpa pusing meracik Excel.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="group rounded-3xl border border-slate-200/60 bg-white p-8 shadow-sm transition-all hover:border-emerald-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-900/50"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 transition-colors group-hover:bg-amber-100 dark:bg-amber-950/50 dark:group-hover:bg-amber-900/50">
              <NotebookTabs className="h-7 w-7 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">Integrasi Instan ke Notion</h3>
            <p className="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
              Terhubung langsung dengan database Notion Anda. Tetap gunakan alur kerja pencatatan yang sudah jadi rahasia dapur Anda, biarkan kami yang menyajikan datanya.
            </p>
          </motion.div>
        </div>

      </div>
    </div>
  );
}
