import { Link } from "wouter";
import { Show } from "@clerk/react";
import { 
  ArrowRight, 
  Orbit, 
  Sparkles, 
  Network, 
  Zap,
  BarChart3, 
  ShieldCheck, 
  Cpu, 
  TerminalSquare,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// --- Animasi "Antigravity" Float ---
const floatingSlow = {
  animate: {
    y: [0, -24, 0],
    transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
  }
};

const floatingFast = {
  animate: {
    y: [0, 18, 0],
    transition: { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
  }
};

export function HomePage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0A0A] font-sans text-slate-300 selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* ── 1. ANTIGRAVITY BACKGROUND ENVIRONMENT ── */}
      {/* Grid Kosmik Presisi */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      
      {/* Ambient Glow / Nebula Effect */}
      <div className="absolute left-1/2 top-[-20%] -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[150px]"></div>
      <div className="absolute left-1/4 top-1/3 -z-10 h-[400px] w-[400px] rounded-full bg-lime-400/5 blur-[120px]"></div>

      {/* ── 2. FLOATING ARTIFACTS (UI Melayang ala Agent IDE) ── */}
      <div className="absolute inset-0 z-10 hidden overflow-hidden pointer-events-none xl:block">
        <motion.div variants={floatingSlow} initial="animate" animate="animate" className="absolute left-[10%] top-[25%] rounded-2xl border border-white/5 bg-black/40 p-4 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-3">
            <Cpu className="h-5 w-5 text-emerald-400" />
            <div className="space-y-1">
              <div className="h-1.5 w-16 rounded-full bg-emerald-400/20"></div>
              <div className="h-1.5 w-10 rounded-full bg-white/20"></div>
            </div>
          </div>
        </motion.div>
        
        <motion.div variants={floatingFast} initial="animate" animate="animate" className="absolute right-[12%] top-[35%] rounded-2xl border border-white/5 bg-black/40 p-4 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-3 text-sm font-mono text-emerald-500">
            <TerminalSquare className="h-5 w-5" />
            <span>[Status] Syncing...</span>
          </div>
        </motion.div>

        <motion.div variants={floatingSlow} initial="animate" animate="animate" style={{ animationDelay: "1s" }} className="absolute bottom-[20%] left-[15%] rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 backdrop-blur-md">
          <BarChart3 className="h-6 w-6 text-emerald-400" />
        </motion.div>
      </div>

      {/* ── 3. HERO: MISSION CONTROL ── */}
      <main className="relative z-20 mx-auto flex max-w-5xl flex-col items-center px-4 pt-32 pb-20 text-center md:pt-48 md:pb-32">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          {/* Top Pill / Status Tag */}
          <div className="mb-8 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-mono tracking-widest text-emerald-400 backdrop-blur-md">
            <Orbit className="h-3.5 w-3.5 animate-[spin_4s_linear_infinite]" />
            <span>SAMBELFARM V2.0 • MISSION CONTROL</span>
          </div>

          <h1 className="text-5xl font-black leading-[1.05] tracking-tighter text-white md:text-7xl lg:text-[5.5rem]">
            FARMING, <br />
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-500 to-lime-400 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              DEFYING GRAVITY.
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg font-medium leading-relaxed text-slate-400 md:text-xl">
            Sistem operasi agrikultur tanpa bobot. Kami membebaskan Anda dari gravitasi pencatatan manual. Delegasikan intelijen data kebun Anda kepada ekosistem kami.
          </p>

          {/* Action Buttons ala IDE Terminal */}
          <div className="mt-12 flex w-full flex-col items-center justify-center gap-4 sm:flex-row sm:w-auto">
            <Show when="signed-out">
              <Link href="/sign-up">
                <Button size="lg" className="group relative overflow-hidden rounded-xl bg-white px-8 h-14 text-sm font-bold tracking-widest text-black hover:bg-slate-200 transition-all w-full sm:w-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/30 to-emerald-400/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:animate-pulse"></div>
                  <span className="relative z-10 flex items-center">
                    INITIALIZE WORKSPACE
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Button>
              </Link>
            </Show>
            
            <Show when="signed-in">
              <Link href="/dashboard">
                <Button size="lg" className="group relative overflow-hidden rounded-xl bg-emerald-500 px-8 h-14 text-sm font-bold tracking-widest text-black shadow-[0_0_40px_rgba(16,185,129,0.4)] hover:bg-emerald-400 hover:shadow-[0_0_60px_rgba(16,185,129,0.6)] transition-all w-full sm:w-auto">
                  <span className="relative z-10 flex items-center">
                    OPEN MANAGER VIEW
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Button>
              </Link>
            </Show>

            <Link href="/sign-in">
              <Button variant="ghost" size="lg" className="rounded-xl border border-white/10 bg-white/5 h-14 px-8 text-sm font-bold tracking-widest text-white hover:bg-white/10 w-full sm:w-auto">
                LOGIN TO TERMINAL
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* ── 4. GLASSMORPHISM MOCKUP (The Agent Manager Vibe) ── */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
          className="relative mt-24 w-full max-w-4xl perspective-[2000px]"
        >
          {/* Rotasi 3D Halus ala showcase Apple/Vercel */}
          <div className="relative rotate-x-[12deg] rounded-3xl border border-white/10 bg-[#111] p-2 shadow-[0_40px_100px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.2)] ring-1 ring-white/5 backdrop-blur-2xl">
            <div className="absolute -top-px left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"></div>
            
            {/* Inner Dashboard */}
            <div className="overflow-hidden rounded-[1.5rem] border border-white/5 bg-[#0A0A0A] p-6 shadow-inner">
              {/* Header macOS/IDE style */}
              <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex gap-2">
                  <div className="h-3 w-3 rounded-full bg-white/10"></div>
                  <div className="h-3 w-3 rounded-full bg-white/10"></div>
                  <div className="h-3 w-3 rounded-full bg-emerald-500/50"></div>
                </div>
                <div className="font-mono text-[10px] text-slate-500">sambelfarm/mission-control</div>
              </div>

              {/* Data Artifacts Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 rounded-2xl border border-white/5 bg-white/5 p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-mono text-[10px] uppercase text-slate-400">Yield Analytics</p>
                    <Network className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="mt-8 flex items-end gap-2">
                    {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                      <div key={i} className="w-full rounded-t-sm bg-emerald-500/20" style={{ height: `${h}px` }}>
                        <div className="h-1 w-full bg-emerald-400"></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-span-1 space-y-4">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6">
                    <p className="font-mono text-[10px] uppercase text-emerald-400">Current HPP</p>
                    <p className="mt-2 text-2xl font-black text-white">Rp 18.2k</p>
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
                    <p className="font-mono text-[10px] uppercase text-amber-500">Staging Queue</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                      </span>
                      <p className="text-sm font-bold text-white">2 Pending</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ── 5. CORE ARCHITECTURE (Bento Grid Gelap) ── */}
      <section className="relative z-20 border-t border-white/5 bg-[#050505] py-32">
        <div className="mx-auto max-w-5xl px-4">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-black tracking-tight text-white md:text-5xl">THE ARCHITECTURE.</h2>
            <p className="mt-4 font-mono text-sm text-emerald-500">ENGINEERED FOR AGRICULTURAL DOMINANCE</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {/* Box 1 */}
            <div className="group relative overflow-hidden rounded-[2rem] border border-white/5 bg-[#111] p-8 transition-colors hover:bg-[#151515]">
              <Database className="mb-6 h-8 w-8 text-emerald-400" />
              <h3 className="mb-2 text-xl font-bold text-white">Notion Native</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Database beroperasi langsung di atas Notion. Kami bertindak sebagai layer komputasi yang merender angka mentah Anda menjadi instrumen intelijen bisnis.
              </p>
            </div>
            {/* Box 2 */}
            <div className="group relative overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-8 shadow-[inset_0_0_40px_rgba(16,185,129,0.05)]">
              <Zap className="mb-6 h-8 w-8 text-emerald-400" />
              <h3 className="mb-2 text-xl font-bold text-white">Zero-Latency Staging</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Antigravity Queue Technology. Input data saat di lahan minim sinyal, biarkan agent *Manager View* kami yang mengeksekusi sinkronisasi di latar belakang.
              </p>
            </div>
            {/* Box 3 */}
            <div className="group relative overflow-hidden rounded-[2rem] border border-white/5 bg-[#111] p-8 transition-colors hover:bg-[#151515]">
              <ShieldCheck className="mb-6 h-8 w-8 text-emerald-400" />
              <h3 className="mb-2 text-xl font-bold text-white">Financial Artifacts</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Kalkulasi HPP, margin profit, dan runway BEP otomatis terbuat sebagai *Artifacts* verifikasi yang mustahil salah hitung.
              </p>
            </div>
          </div>
        </div>
      </section>
      
    </div>
  );
}
