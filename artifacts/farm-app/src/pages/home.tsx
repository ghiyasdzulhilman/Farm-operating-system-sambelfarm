import { Link } from "wouter";
import { Show } from "@clerk/react";
import { 
  ArrowRight, 
  Sprout, 
  LineChart, 
  CloudRain, 
  Leaf, 
  ShieldCheck, 
  Zap,
  Target,
  Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function HomePage() {
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAF8] font-sans dark:bg-slate-950">
      
      {/* ── 1. HERO SECTION (The Hook) ── */}
      <section className="relative overflow-hidden pt-24 pb-20 md:pt-36 md:pb-32">
        {/* Background Ornaments */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute -top-[20%] left-1/2 h-[600px] w-[800px] -translate-x-1/2 rounded-[100%] bg-gradient-to-b from-emerald-400/20 to-transparent blur-3xl dark:from-emerald-900/40"></div>
        
        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <div className="mx-auto mb-8 flex w-max items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold tracking-wide text-emerald-700 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-400">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
              Sistem Operasional Kebun Modern
            </div>
            
            <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-slate-900 md:text-7xl lg:text-8xl dark:text-white">
              Bertani Pake <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-lime-500 dark:from-emerald-400 dark:to-lime-400">Insting</span> Itu Masa Lalu.
            </h1>
            
            <p className="mx-auto mt-8 max-w-2xl text-lg font-medium leading-relaxed text-slate-600 md:text-xl dark:text-slate-400">
              Berapa HPP per kilogram cabai Anda hari ini? Jika Anda ragu menjawabnya, Anda butuh sistem ini. Hubungkan database Notion Anda dan ubah catatan kebun menjadi *dashboard* intelijen bisnis.
            </p>
            
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Show when="signed-out">
                <Link href="/sign-up">
                  <Button size="lg" className="group h-14 w-full rounded-2xl bg-emerald-600 px-8 text-base font-bold shadow-xl shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:-translate-y-1 sm:w-auto dark:bg-emerald-500 dark:hover:bg-emerald-400">
                    Buka Ekosistem Sekarang
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </Show>
              <Show when="signed-in">
                <Link href="/dashboard">
                  <Button size="lg" className="group h-14 w-full rounded-2xl bg-emerald-600 px-8 text-base font-bold shadow-xl shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:-translate-y-1 sm:w-auto dark:bg-emerald-500 dark:hover:bg-emerald-400">
                    Masuk ke Dashboard
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </Show>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 2. THE STORY / PROBLEM AGITATION ── */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeUp}>
            <Sprout className="mx-auto mb-6 h-12 w-12 text-emerald-500" />
            <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-5xl dark:text-white">
              Tanaman Tumbuh Subur, <br className="hidden md:block" /> Tapi Uang Lari Ke Mana?
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              Masalah terbesar pengusaha agrikultur bukan pada cara menanam, tapi pada <strong>kebocoran finansial yang tidak tercatat</strong>. Biaya pupuk, pestisida, hingga operasional harian seringkali bercampur aduk. Saat panen raya tiba, omset terlihat besar, tapi profit aktualnya nihil. Kami membangun sistem ini agar Anda berhenti menebak-nebak.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── 3. BENTO GRID FEATURES (The Solution) ── */}
      <section className="py-24 bg-[#F8FAF8] dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div 
            className="mb-16 text-center"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
          >
            <h2 className="text-3xl font-black text-slate-900 md:text-4xl dark:text-white">
              Senjata Rahasia Para <span className="text-emerald-600 dark:text-emerald-400">Sambelers</span>
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Infrastruktur agritech premium, dibungkus dalam UI yang semudah membalas chat.</p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 gap-4 md:grid-cols-3 md:grid-rows-2"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}
          >
            {/* Bento Box 1: HPP (Large) */}
            <motion.div variants={fadeUp} className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-200/50 md:col-span-2 dark:bg-slate-900 dark:border-slate-800">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-100 transition-transform duration-500 group-hover:scale-150 dark:bg-emerald-900/20"></div>
              <div className="relative z-10">
                <Target className="mb-6 h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Kalkulator HPP Otomatis</h3>
                <p className="mt-4 max-w-md text-slate-600 leading-relaxed dark:text-slate-400">
                  Setiap Rupiah yang Anda keluarkan untuk polybag, Trichoderma, hingga Calbovit akan langsung dikonversi menjadi Harga Pokok Penjualan (HPP) per kilogram secara *real-time*.
                </p>
              </div>
            </motion.div>

            {/* Bento Box 2: Notion Sync */}
            <motion.div variants={fadeUp} className="group relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 shadow-sm md:col-span-1 dark:bg-slate-800">
              <div className="relative z-10">
                <CloudRain className="mb-6 h-10 w-10 text-emerald-400" />
                <h3 className="text-2xl font-bold text-white">Notion Native</h3>
                <p className="mt-4 text-slate-400 leading-relaxed">
                  Tidak perlu migrasi. Sistem kami membaca arsitektur database Notion Anda dan menyajikannya menjadi *dashboard* super cepat.
                </p>
              </div>
            </motion.div>

            {/* Bento Box 3: Anti-Ghosting */}
            <motion.div variants={fadeUp} className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 shadow-sm border border-slate-200/50 md:col-span-1 dark:bg-slate-900 dark:border-slate-800">
              <div className="relative z-10">
                <Zap className="mb-6 h-10 w-10 text-amber-500" />
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Gudang Transit Anti-Lag</h3>
                <p className="mt-4 text-slate-600 leading-relaxed dark:text-slate-400">
                  Input data panen di lahan susah sinyal? Data akan masuk ke *Staging Queue* lokal kami dan sinkronisasi otomatis ke Notion tanpa *double-input*.
                </p>
              </div>
            </motion.div>

            {/* Bento Box 4: Mobile First */}
            <motion.div variants={fadeUp} className="group relative overflow-hidden rounded-[2.5rem] bg-emerald-600 p-8 shadow-sm md:col-span-2 dark:bg-emerald-900">
              <div className="absolute right-0 top-0 h-full w-1/2 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay"></div>
              <div className="relative z-10">
                <Smartphone className="mb-6 h-10 w-10 text-emerald-100" />
                <h3 className="text-2xl font-bold text-white">Mobile-First Ecosystem</h3>
                <p className="mt-4 max-w-md text-emerald-100 leading-relaxed">
                  Dirancang khusus untuk dioperasikan dengan satu tangan saat Anda berada di tengah kebun. UI yang empuk, responsif, dan elegan.
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── 4. CTA (Bottom Hook) ── */}
      <section className="relative overflow-hidden py-24 bg-slate-900 dark:bg-black">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600/20 blur-[120px]"></div>
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <ShieldCheck className="mx-auto mb-6 h-16 w-16 text-emerald-400" />
          <h2 className="text-4xl font-black text-white md:text-5xl">
            Ambil Kendali Sekarang.
          </h2>
          <p className="mt-6 text-xl text-slate-400">
            Berhenti meraba-raba margin. Bergabunglah dengan agropreneur yang sudah melek data operasional.
          </p>
          <div className="mt-10">
            <Show when="signed-out">
              <Link href="/sign-up">
                <Button size="lg" className="h-16 rounded-2xl bg-emerald-500 px-10 text-lg font-bold text-slate-950 transition-transform hover:scale-105 hover:bg-emerald-400">
                  Buat Akun Gratis
                </Button>
              </Link>
            </Show>
            <Show when="signed-in">
              <Link href="/dashboard">
                <Button size="lg" className="h-16 rounded-2xl bg-emerald-500 px-10 text-lg font-bold text-slate-950 transition-transform hover:scale-105 hover:bg-emerald-400">
                  Buka Dashboard Saya
                </Button>
              </Link>
            </Show>
          </div>
        </div>
      </section>

    </div>
  );
}
