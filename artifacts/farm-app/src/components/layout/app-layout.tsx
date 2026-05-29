import { useState, useEffect, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  NotebookText, 
  Beaker, 
  SlidersHorizontal, 
  Plus, 
  Wheat
} from "lucide-react";

import { AddHarvestDialog } from "@/components/harvest/add-harvest-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { AddPerawatanDialog } from "@/components/agronomy/AddPerawatanDialog";
import { AddInspeksiDialog } from "@/components/agronomy/AddInspeksiDialog";
import { AddOperasionalDialog } from "@/components/agronomy/AddOperasionalDialog";

import {
  useGetNotionConnectionStatus,
  getGetNotionConnectionStatusQueryKey,
} from "@workspace/api-client-react";

export function AppLayout({
  children,
}: {
  children: ReactNode
}) {
  const [isTopbarHidden, setIsTopbarHidden] = useState(false);
  const [location] = useLocation();
  const { isSignedIn } = useAuth();
  const [isFabOpen, setIsFabOpen] = useState(false);

  const { data: connectionStatus } = useGetNotionConnectionStatus({
    query: {
      queryKey: getGetNotionConnectionStatusQueryKey(),
    },
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsTopbarHidden(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-background">
        {children}
      </main>
    );
  }

  // IKON BARU: Lebih round, smooth, dan premium (Anti tajem-tajem)
  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/operasional", icon: NotebookText, label: "Operasional" },
    { href: "/lab", icon: Beaker, label: "Lab" },
    { href: "/settings", icon: SlidersHorizontal, label: "Setelan" },
  ];

  // POPUP VERTIKAL KE ATAS (Angka offset minus = gerak ke atas)
  const quickActions = [
    { id: "expense", component: AddExpenseDialog, offset: -320, delay: 0.14 },
    { id: "inspeksi", component: AddInspeksiDialog, offset: -255, delay: 0.11 },
    { id: "operasional", component: AddOperasionalDialog, offset: -190, delay: 0.08 },
    { id: "perawatan", component: AddPerawatanDialog, offset: -125, delay: 0.05 },
    { id: "harvest", component: AddHarvestDialog, offset: -60, delay: 0.02 },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 font-sans text-foreground transition-colors duration-500">
      
      {/* HEADER: Top Bar */}
      <header
        className={
          "sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-2xl transition-all duration-300 " +
          (isTopbarHidden ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100")
        }
      >
        <div className="container flex h-14 items-center justify-between px-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Wheat className="h-5 w-5 text-primary" />
              <span className="font-bold text-lg tracking-tight text-foreground">
                Sambel Farm
              </span>
            </div>

            <Link href="/connect">
              {(() => {
                const isConnected = connectionStatus?.connected;
                const isInvalid = isConnected && connectionStatus?.tokenStatus === "invalid";

                const colorClass = isInvalid
                  ? "text-accent bg-accent/10 border-accent/20 hover:bg-accent/20"
                  : isConnected
                    ? "text-primary bg-primary/10 border-primary/20 hover:bg-primary/20"
                    : "text-destructive bg-destructive/10 border-destructive/20 hover:bg-destructive/20";

                const dotClass = isInvalid
                  ? "bg-accent animate-pulse"
                  : isConnected
                    ? "bg-primary"
                    : "bg-destructive";

                const label = isInvalid ? "Token Invalid" : isConnected ? "Connected" : "Disconnected";

                return (
                  <button className={"inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border w-fit transition-all " + colorClass}>
                    <div className={"w-2 h-2 rounded-full " + dotClass} />
                    {label}
                  </button>
                );
              })()}
            </Link>
          </div>
        </div>
      </header>

      {/* AREA KONTEN UTAMA */}
      <main className="container p-4 md:p-6 mx-auto max-w-7xl">
        {children}
      </main>

      {/* BACKDROP OVERLAY OVERVIEW */}
      <AnimatePresence>
        {isFabOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsFabOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── 🛠️ THE NEW ASYMMETRIC DYNAMIC FLOATING DOCK (z-50) ─── */}
      <div className="fixed bottom-6 left-4 right-4 z-50 max-w-md mx-auto flex items-center justify-between gap-3 pointer-events-none">
        
        {/* KAPSUL KIRI: MENU NAVIGASI UTAMA (PILL CONTAINER) */}
        <nav className="flex-1 h-[52px] rounded-full border border-white/20 bg-background/85 backdrop-blur-3xl shadow-[0_12px_32px_rgba(0,0,0,0.15)] px-1.5 flex items-center justify-between pointer-events-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.label} href={item.href}>
                <a className="relative flex items-center justify-center h-[40px] px-3.5 rounded-full transition-all duration-300">
                  {/* PIL AKTIF GLOWING EFFECT */}
                  {isActive ? (
                    <motion.div 
                      layoutId="asymmetric-nav-pill"
                      className="absolute inset-0 rounded-full bg-foreground/10 dark:bg-white/15 flex items-center px-3 shadow-inner"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    >
                      <span className="ml-[22px] text-xs font-bold text-foreground pr-0.5 tracking-tight animate-in fade-in duration-300">
                        {item.label}
                      </span>
                    </motion.div>
                  ) : null}
                  
                  {/* ICON */}
                  <Icon className={"h-[18px] w-[18px] z-10 transition-colors duration-300 " + (isActive ? "text-primary stroke-[2.5]" : "text-foreground/45 stroke-[2] hover:text-foreground/80")} />
                </a>
              </Link>
            );
          })}
        </nav>

        {/* ─── CONTAINER TOMBOL PUSAT AKSI KANAN (FAB COCKPIT) ─── */}
        <div className="relative pointer-events-auto shrink-0 flex justify-center">
          
          {/* POPUP SAKTI KE ATAS (VERTIKAL) */}
          {quickActions.map((action) => {
            const ActionDialog = action.component;
            return (
              <AnimatePresence key={action.id}>
                {isFabOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.3 }}
                    animate={{ opacity: 1, y: action.offset, scale: 1 }}
                    exit={{ opacity: 0, y: 0, scale: 0.3 }}
                    transition={{ type: "spring", bounce: 0.35, duration: 0.5, delay: action.delay }}
                    className="absolute z-20 flex justify-center"
                  >
                    <div className="h-12 w-12 rounded-full border border-white/20 bg-primary shadow-xl active:scale-95 transition-all flex items-center justify-center overflow-hidden">
                      {/* CSS HACK DEWA: Membunuh semua teks dan menyisakan SVG sempurna di tengah */}
                      <div className="absolute inset-0 [&_button]:flex [&_button]:h-full [&_button]:w-full [&_button]:items-center [&_button]:justify-center [&_button]:rounded-full [&_button]:bg-transparent [&_button]:p-0 [&_button]:m-0 [&_button]:border-none [&_button]:shadow-none [&_button]:text-[0px] [&_button]:text-transparent [&_button>span]:hidden [&_button_svg]:mx-auto [&_button_svg]:h-[22px] [&_button_svg]:w-[22px] [&_button_svg]:text-white">
                        <ActionDialog onSuccess={() => setIsFabOpen(false)} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}

          {/* TOMBOL UTAMA LINGKARAN HITAM BESAR (+) SEPERTI GAMBAR LU */}
          <motion.button
            onClick={() => setIsFabOpen(!isFabOpen)}
            animate={{ rotate: isFabOpen ? 135 : 0 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
            className={
              "flex h-[52px] w-[52px] items-center justify-center rounded-full border transition-all duration-300 active:scale-90 shadow-[0_8px_24px_rgba(0,0,0,0.2)] z-30 " +
              (isFabOpen 
                ? "bg-destructive border-destructive/30 text-white" 
                : "bg-slate-950 border-slate-800 text-white dark:bg-white dark:border-white dark:text-slate-950")
            }
            aria-label="Menu Aksi"
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </motion.button>
        </div>

      </div>

    </div>
  );
}
