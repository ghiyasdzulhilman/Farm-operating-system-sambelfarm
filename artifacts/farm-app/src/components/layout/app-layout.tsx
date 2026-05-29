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

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
    { href: "/operasional", icon: ClipboardList, label: "Operasional" },
    { href: "/lab", icon: FlaskConical, label: "Lab" },
    { href: "/settings", icon: Settings, label: "Setelan" },
  ];

  // KALIBRASI URUTAN TOMBOL AKSI DARI KANAN KE KIRI (Numpuk Vertikal Anggun)
  const quickActions = [
    { id: "expense", component: AddExpenseDialog, offset: -290, delay: 0.02, label: "Beban Finansial" },
    { id: "inspeksi", component: AddInspeksiDialog, offset: -230, delay: 0.05, label: "Inspeksi" },
    { id: "operasional", component: AddOperasionalDialog, offset: -170, delay: 0.08, label: "Operasional" },
    { id: "perawatan", component: AddPerawatanDialog, offset: -110, delay: 0.11, label: "Perawatan" },
    { id: "harvest", component: AddHarvestDialog, offset: -50, delay: 0.14, label: "Panen Raya" },
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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setIsFabOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── 🛠️ THE NEW ASYMMETRIC DYNAMIC FLOATING DOCK (z-50) ─── */}
      <div className="fixed bottom-6 left-4 right-4 z-50 max-w-md mx-auto flex items-center justify-between gap-3 pointer-events-none">
        
        {/* KAPSUL KIRI: MENU NAVIGASI UTAMA (PILL CONTAINER) */}
        <nav className="flex-1 h-14 rounded-full border border-white/10 bg-background/70 backdrop-blur-3xl shadow-[0_12px_32px_rgba(0,0,0,0.15)] px-2 flex items-center justify-between pointer-events-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.label} href={item.href}>
                <a className="relative flex items-center justify-center h-10 px-3.5 rounded-full transition-all duration-300">
                  {/* PIL AKTIF GLOWING EFFECT */}
                  {isActive ? (
                    <motion.div 
                      layoutId="asymmetric-nav-pill"
                      className="absolute inset-0 rounded-full bg-foreground/10 dark:bg-white/15 flex items-center px-3 shadow-inner"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    >
                      {/* Teks Label Hanya Muncul Saat Item Tersebut Aktif (Sesuai Gambar Referensi Lu!) */}
                      <span className="ml-6 text-xs font-bold text-foreground pr-1 tracking-tight animate-in fade-in duration-300">
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
        <div className="relative pointer-events-auto shrink-0">
          
          {/* POPUP SAKTI DARI KANAN KE KIRI (DENGAN LABEL TEKS DI ATASNYA!) */}
          {quickActions.map((action) => {
            const ActionDialog = action.component;
            return (
              <AnimatePresence key={action.id}>
                {isFabOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: 0, scale: 0.6 }}
                    animate={{ opacity: 1, x: action.offset, scale: 1 }}
                    exit={{ opacity: 0, x: 0, scale: 0.6 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4, delay: action.delay }}
                    className="absolute top-1.5 z-20"
                  >
                    <div className="flex flex-col items-center group relative">
                      {/* LABEL TEKS MINI DI ATAS BALON (Biar Mandor Lu Gak Menebak-nebak!) */}
                      <div className="absolute -top-7 bg-slate-900/90 text-white dark:bg-white/95 dark:text-slate-900 text-[9px] font-black tracking-wide uppercase px-2 py-0.5 rounded-md shadow-md opacity-90 whitespace-nowrap">
                        {action.label}
                      </div>

                      {/* BALON LINGKARAN BALIK KE CENTER */}
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-primary text-primary-foreground shadow-lg active:scale-90 transition-all overflow-hidden hover:opacity-90">
                        <ActionDialog onSuccess={() => setIsFabOpen(false)} triggerOnlyIcon={true} />
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
            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
            className={
              "flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-300 active:scale-95 shadow-[0_8px_24px_rgba(0,0,0,0.2)] z-30 " +
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
