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
  Coins
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

  // Definisi navigasi (Clean Edition - Tanpa Label teks kaku)
  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/operasional", icon: ClipboardList, label: "Operasional" },
    { href: "/lab", icon: FlaskConical, label: "Lab" },
    { href: "/settings", icon: Settings, label: "Setelan" },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 font-sans text-foreground transition-colors duration-500">
      
      {/* HEADER: Top Bar */}
      <header
        className={`
          sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-2xl transition-all duration-300
          ${isTopbarHidden ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"}
        `}
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
                  <button className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border w-fit transition-all ${colorClass}`}>
                    <div className={`w-2 h-2 rounded-full ${dotClass}`} />
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

      {/* ----- PREMIUM BOTTOM NAV DOCK ----- */}
      <nav className="fixed bottom-5 left-4 right-4 z-50 max-w-md mx-auto rounded-[2rem] border border-border/50 bg-background/80 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] pb-safe transition-all duration-300">
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
                      <Icon className={`h-5 w-5 transition-all duration-300 ${isActive ? "text-primary scale-110 stroke-[2.2]" : "text-muted-foreground/70"}`} />
                      {/* PREMIUM GLOWING DOT INDICATOR */}
                      {isActive && (
                        <motion.div 
                          layoutId="nav-glow-dot"
                          className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"
                          transition={{ type: "spring", stiffness: 380, damping: 28 }}
                        />
                      )}
                    </a>
                  </Link>
                );
              })}
            </div>

            {/* SPACE TENGAH UNTUK LIQUID FAB */}
            <div className="w-1/5 flex justify-center items-center" />

            {/* SAYAP NAVIGASI KANAN */}
            <div className="flex w-2/5 justify-around h-full items-center">
              {[navItems[2], navItems[3]].map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link key={item.label} href={item.href}>
                    <a className="relative flex flex-col items-center justify-center h-full w-[50px] transition-colors">
                      <Icon className={`h-5 w-5 transition-all duration-300 ${isActive ? "text-primary scale-110 stroke-[2.2]" : "text-muted-foreground/70"}`} />
                      {/* PREMIUM GLOWING DOT INDICATOR */}
                      {isActive && (
                        <motion.div 
                          layoutId="nav-glow-dot"
                          className="absolute bottom-1.5 h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]"
                          transition={{ type: "spring", stiffness: 380, damping: 28 }}
                        />
                      )}
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ─── COCKPIT LIQUID MORPHING FAB ─── */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-5 flex justify-center items-center">
            {/* Lapisan Blur Latar Saat FAB Terbuka */}
            <AnimatePresence>
              {isFabOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-background/40 backdrop-blur-md -z-10"
                  onClick={() => setIsFabOpen(false)}
                />
              )}
            </AnimatePresence>
            
            {/* MORPHING BUTTON CONTAINER */}
            <motion.div
              animate={{
                width: isFabOpen ? "230px" : "60px",
                height: "60px",
                borderRadius: isFabOpen ? "30px" : "50%",
              }}
              transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              className="relative flex items-center justify-between bg-primary p-1.5 shadow-2xl overflow-hidden"
            >
              {/* OPSI KIRI: TAMBAH PANEN (Muncul Pas Cair Melebar) */}
              <AnimatePresence>
                {isFabOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: -20, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -20, scale: 0.8 }}
                    transition={{ delay: 0.1 }}
                    /* AUDit UI: Paksa teks internal dialog shadcn jadi putih murni & buang ijo */
                    className="pl-3 [&_button]:bg-transparent [&_button]:text-white [&_button]:font-black [&_button]:text-xs [&_button]:border-none [&_button]:p-0 [&_button]:shadow-none [&_svg]:text-white [&_svg]:mr-1.5"
                    onClick={() => setTimeout(() => setIsFabOpen(false), 200)}
                  >
                    <AddHarvestDialog />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* TONGKAT UTAMA: TOMBOL SILANG / PLUS TENGAH */}
              <button
                onClick={() => setIsFabOpen(!isFabOpen)}
                className={`
                  absolute left-1/2 -translate-x-1/2 flex h-[48px] w-[48px] items-center justify-center rounded-full 
                  bg-white/10 text-white backdrop-blur-md transition-all duration-300 ease-in-out active:scale-95
                  ${isFabOpen ? "rotate-45 bg-black/20" : ""}
                `}
                aria-label="Aksi Kebun"
              >
                <Plus className="h-6 w-6 text-white stroke-[2.5]" />
              </button>

              {/* OPSI KANAN: TAMBAH BIAYA (Muncul Pas Cair Melebar) */}
              <AnimatePresence>
                {isFabOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: 20, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.8 }}
                    transition={{ delay: 0.1 }}
                    /* AUDit UI: Paksa teks internal dialog shadcn jadi putih murni & buang ijo */
                    className="pr-3 [&_button]:bg-transparent [&_button]:text-white [&_button]:font-black [&_button]:text-xs [&_button]:border-none [&_button]:p-0 [&_button]:shadow-none [&_svg]:text-white [&_svg]:mr-1.5"
                    onClick={() => setTimeout(() => setIsFabOpen(false), 200)}
                  >
                    <AddExpenseDialog />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

        </div>
      </nav>

    </div>
  );
}
