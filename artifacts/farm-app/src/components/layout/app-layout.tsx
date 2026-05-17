import { useState, useEffect, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Plus, 
  FlaskConical, 
  Settings, 
  Wheat,
  ClipboardList,
  Sprout, 
  Coins,
} from "lucide-react";

import { AddHarvestDialog } from "@/components/harvest/add-harvest-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
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

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/operasional", icon: ClipboardList, label: "Operasional" },
    { href: "/lab", icon: FlaskConical, label: "Lab" },
    { href: "/settings", icon: Settings, label: "Setelan" },
  ];

  // KALIBRASI BUSUR KIPAS (Lengkungan Organik untuk 4 Balon)
  const quickActions = [
    // Posisi TENGAH KIRI (Nantinya Paling Kiri di x: -80, y: -45)
    { id: "harvest", component: AddHarvestDialog, position: { x: -40, y: -85 }, delay: 0.03 },
    // Posisi TENGAH KANAN (Nantinya Paling Kanan di x: 80, y: -45)
    { id: "expense", component: AddExpenseDialog, position: { x: 40, y: -85 }, delay: 0.08 },
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

      {/* ----- BOTTOM NAV DOCK ----- */}
      <nav className="fixed bottom-5 left-4 right-4 z-50 max-w-md mx-auto rounded-[2rem] border border-primary/30 bg-background/70 backdrop-blur-3xl shadow-[0_0_20px] shadow-primary/20 pb-safe transition-all duration-300">
        <div className="relative max-w-md mx-auto h-16 px-4">
          
          <div className="flex items-center justify-between h-full w-full">
            {/* SAYAP KIRI */}
            <div className="flex w-2/5 justify-around h-full items-center">
              {[navItems[0], navItems[1]].map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link key={item.label} href={item.href}>
                    <a className="relative flex flex-col items-center justify-center h-full w-[50px] transition-colors">
                      <Icon className={"h-[22px] w-[22px] transition-all duration-500 " + (isActive ? "text-primary scale-110 stroke-[2]" : "text-muted-foreground/50 stroke-[1.5]")} />
                      {isActive && (
                        <motion.div 
                          layoutId="nav-glow-dot"
                          className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary shadow-[0_0_8px] shadow-primary"
                          transition={{ type: "spring", stiffness: 380, damping: 28 }}
                        />
                      )}
                    </a>
                  </Link>
                );
              })}
            </div>

            <div className="w-1/5 flex justify-center items-center" />

            {/* SAYAP KANAN */}
            <div className="flex w-2/5 justify-around h-full items-center">
              {[navItems[2], navItems[3]].map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link key={item.label} href={item.href}>
                    <a className="relative flex flex-col items-center justify-center h-full w-[50px] transition-colors">
                      <Icon className={"h-[22px] w-[22px] transition-all duration-500 " + (isActive ? "text-primary scale-110 stroke-[2]" : "text-muted-foreground/50 stroke-[1.5]")} />
                      {isActive && (
                        <motion.div 
                          layoutId="nav-glow-dot"
                          className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary shadow-[0_0_8px] shadow-primary"
                          transition={{ type: "spring", stiffness: 380, damping: 28 }}
                        />
                      )}
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ─── COCKPIT "BALLOON CLUSTER" FAB ─── */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6 flex justify-center items-center">
            
            <AnimatePresence>
              {isFabOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-background/60 backdrop-blur-md -z-10"
                  onClick={() => setIsFabOpen(false)}
                />
              )}
            </AnimatePresence>
            
            {/* KUMPULAN BALON AKSI */}
            {quickActions.map((action) => {
              const ActionDialog = action.component;
              return (
                <AnimatePresence key={action.id}>
                  {isFabOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                      animate={{ opacity: 1, x: action.position.x, y: action.position.y, scale: 1 }}
                      exit={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                      transition={{ type: "spring", bounce: 0.35, duration: 0.5, delay: action.delay }}
                      className="absolute z-20"
                    >
                      <div className="relative drop-shadow-2xl">
                        
                        {/* BALON PRIMARY GLASSMORPHISM */}
                        <div className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full border border-white/30 bg-primary/85 backdrop-blur-xl shadow-[0_8px_20px] shadow-primary/30 active:scale-95 transition-all">
                          
                          {/* CSS MAUT PEMBUNUH TEKS: Force button full circle, font size 0, text transparent */}
                          <div className="absolute inset-0 h-full w-full overflow-hidden flex items-center justify-center [&_button]:h-full [&_button]:w-full [&_button]:rounded-full [&_button]:bg-transparent [&_button]:p-0 [&_button]:border-none [&_button]:shadow-none [&_button]:text-[0px] [&_button]:text-transparent [&_button>span]:hidden [&_button_svg]:h-6 [&_button_svg]:w-6 [&_button_svg]:text-white [&_button_svg]:m-0">
                            <ActionDialog onSuccess={() => setIsFabOpen(false)} />
                          </div>
                          
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              );
            })}

            {/* TOMBOL PUSAT (+) */}
            <motion.button
              onClick={() => setIsFabOpen(!isFabOpen)}
              animate={{ rotate: isFabOpen ? 45 : 0 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              className={
                "relative flex h-[64px] w-[64px] items-center justify-center rounded-full transition-all duration-300 active:scale-95 " +
                (isFabOpen 
                  ? "bg-destructive/80 text-white shadow-[0_0_20px] shadow-destructive/40 border border-destructive/50 backdrop-blur-xl" 
                  : "bg-background/40 backdrop-blur-2xl border-[1.5px] border-primary/50 shadow-[0_0_25px] shadow-primary/40")
              }
              aria-label="Aksi Kebun"
            >
              <Plus className={"h-7 w-7 stroke-[1.5] transition-colors duration-300 " + (isFabOpen ? "text-white" : "text-primary")} />
            </motion.button>
          </div>

        </div>
      </nav>

    </div>
  );
}
