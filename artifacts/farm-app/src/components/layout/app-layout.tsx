import { useState, useEffect, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  NotebookText,
  FlaskConical,
  Database,
  Compass, 
  Beaker, 
  SlidersHorizontal, 
  Plus, 
  Wheat,
  Banknote,
  Sprout,
  ShoppingBasket, 
  HardHat, 
  Bug 
} from "lucide-react";

import { FormPanen } from "@/components/finance/FormPanen";
import { PengeluaranFormModal } from "@/components/finance/PengeluaranFormModal";
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

  // BOTTOM NAV ICON PREMIUM & MELENGKUNG (NO TEXT)
  const navItems = [
    { href: "/dashboard", icon: Home },
    { href: "/operasional", icon: Database },
    { href: "/lab", icon: FlaskConical },
    { href: "/settings", icon: Compass },
  ];

    // URUTAN FAB MUNCUL KE ATAS (VERTIKAL LURUS) DENGAN ICON PILIHAN MANDOR
  const quickActions = [

    { id: "expense", component: PengeluaranFormModal, icon: Banknote, delay: 0.12 },
    { id: "inspeksi", component: AddInspeksiDialog, icon: Bug, delay: 0.09 }, 
    { id: "operasional", component: AddOperasionalDialog, icon: HardHat, delay: 0.06 }, 
    { id: "perawatan", component: AddPerawatanDialog, icon: Sprout, delay: 0.03 },
    { id: "harvest", component: FormPanen, icon: ShoppingBasket, delay: 0.0 }, 
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

      {/* BACKDROP GELAP SAAT FAB DIBUKA */}
      <AnimatePresence>
        {isFabOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
            onClick={() => setIsFabOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── THE ASYMMETRIC DYNAMIC FLOATING DOCK (z-50) ─── */}
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto flex items-center justify-between gap-4 pointer-events-none">
        
        {/* KAPSUL KIRI: MENU NAVIGASI (PILL CONTAINER) */}
        <nav className="flex-1 h-14 rounded-full border border-white/20 bg-background/80 backdrop-blur-3xl shadow-[0_12px_32px_rgba(0,0,0,0.15)] px-2 flex items-center justify-around pointer-events-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a className="relative flex items-center justify-center h-11 w-11 rounded-full transition-all duration-300">
                  {/* PIL AKTIF GLOWING EFFECT BEHIND ICON */}
                  {isActive && (
                    <motion.div 
                      layoutId="active-nav-pill"
                      className="absolute inset-0 rounded-full bg-primary/10 dark:bg-white/10"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  
                  {/* ICON SAJA */}
                  <Icon className={"h-[22px] w-[22px] z-10 transition-all duration-300 " + (isActive ? "text-primary stroke-[2.5] scale-110" : "text-foreground/45 stroke-[2] hover:text-foreground/80")} />
                </a>
              </Link>
            );
          })}
        </nav>

        {/* ─── KANAN: TOMBOL PUSAT (+) & MENU VERTIKAL ─── */}
        <div className="relative pointer-events-auto shrink-0 flex justify-center">
          
          {/* MENU MUNCUL LURUS KE ATAS */}
          <AnimatePresence>
            {isFabOpen && quickActions.map((action, index) => {
              const ActionDialog = action.component;
              const Icon = action.icon;
              const verticalOffset = -((index + 1) * 54) - 4; 

              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, y: 0, scale: 0.3 }}
                  animate={{ opacity: 1, y: verticalOffset, scale: 1 }}
                  exit={{ opacity: 0, y: 0, scale: 0.3 }}
                  transition={{ type: "spring", bounce: 0.35, duration: 0.5, delay: action.delay }}
                  className="absolute z-20"
                >
                  {/* LINGKARAN ICON PREMIUM */}
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-primary text-primary-foreground shadow-xl active:scale-95 transition-all">
                    <Icon className="h-[20px] w-[20px] stroke-[2.5]" />
                    
                    {/* JURUS INVISIBLE OVERLAY */}
                    <div className="absolute inset-0 z-30 opacity-0 overflow-hidden">
                      <div className="w-full h-full [&_button]:w-full [&_button]:h-full [&_button]:absolute [&_button]:inset-0 [&_button]:opacity-0">
                        <ActionDialog />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* TOMBOL UTAMA LINGKARAN HITAM BESAR (+) */}
          <motion.button
            onClick={() => setIsFabOpen(!isFabOpen)}
            animate={{ rotate: isFabOpen ? 135 : 0 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
            className={
              "flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300 active:scale-90 shadow-[0_8px_24px_rgba(0,0,0,0.2)] z-30 " +
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