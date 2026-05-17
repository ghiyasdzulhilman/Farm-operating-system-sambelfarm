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

  // Definisi Aksi Balon (Gelembung Kaca - TENGAH + ICON ONLY)
  const quickActions = [
    // Posisi 2: TENGAH KIRI (Harvest)
    { id: "harvest", icon: Sprout, component: AddHarvestDialog, position: { x: -28, y: -110 }, delay: 0.05 },
    // Posisi 3: TENGAH KANAN (Expense)
    { id: "expense", icon: Coins, component: AddExpenseDialog, position: { x: 28, y: -110 }, delay: 0.1 },
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

      {/* ----- PREMIUM BOTTOM NAV DOCK (EDGE GLOW EDITION) ----- */}
      <nav className="fixed bottom-5 left-4 right-4 z-50 max-w-md mx-auto rounded-[2rem] border border-primary/30 bg-background/70 backdrop-blur-3xl shadow-[0_0_20px] shadow-primary/20 pb-safe transition-all duration-300">
        <div className="relative max-w-md mx-auto h-16 px-4">
          
          <div className="flex items-center justify-between h-full w-full">
            {/* SAYAP NAVIGASI KIRI */}
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

            {/* SAYAP NAVIGASI KANAN */}
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
            
            {/* CONTAINER GELEMBUNG BALON (TENGAH BUSUR) */}
            {quickActions.map((action) => {
              const ActionDialog = action.component;
              return (
                <AnimatePresence key={action.id}>
                  {isFabOpen && (
                    <motion.div
                      initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                      animate={{ opacity: 1, x: action.position.x, y: action.position.y, scale: 1 }}
                      exit={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                      transition={{ type: "spring", bounce: 0.4, duration: 0.6, delay: action.delay }}
                      className="absolute z-20"
                    >
                      <div className="relative drop-shadow-2xl">
                        {/* Gelembung kaca transparan */}
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-background/60 backdrop-blur-xl active:scale-95 transition-all shadow-[0_0_15px] shadow-primary/20 hover:bg-primary/10">
                          {/* Paksa ICON ONLY constraint: text & span disembunyikan */}
                          <div className="[&_button]:h-full [&_button]:w-full [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:border-none [&_button]:p-0 [&_button]:bg-transparent [&_button]:text-primary [&_button]:rounded-full [&_svg]:h-[22px] [&_svg]:w-[22px] [&_svg]:mr-0 [&_svg]:stroke-[1.5] [&_span]:hidden [&_span]:text-[0px]">
                            <ActionDialog onSuccess={() => setIsFabOpen(false)} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              );
            })}

            {/* TOMBOL PUSAT (FROSTED GLASS) */}
            <motion.button
              onClick={() => setIsFabOpen(!isFabOpen)}
              animate={{ rotate: isFabOpen ? 45 : 0 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              className={
                "relative flex h-[68px] w-[68px] items-center justify-center rounded-full transition-all duration-300 active:scale-95 " +
                (isFabOpen 
                  ? "bg-destructive/80 text-white shadow-[0_0_20px] shadow-destructive/40 border border-destructive/50 backdrop-blur-xl" 
                  : "bg-background/40 backdrop-blur-2xl border-[1.5px] border-primary/50 shadow-[0_0_25px] shadow-primary/40")
              }
              aria-label="Aksi Kebun"
            >
              <Plus className={"h-8 w-8 stroke-[1.5] transition-colors duration-300 " + (isFabOpen ? "text-white" : "text-primary")} />
            </motion.button>
          </div>

        </div>
      </nav>

    </div>
  );
}
