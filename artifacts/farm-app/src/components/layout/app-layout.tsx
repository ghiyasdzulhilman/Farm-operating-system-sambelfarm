import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Sprout, 
  Plus, 
  FlaskConical, 
  Settings, 
  Tractor,
  ClipboardList
} from "lucide-react";

// Import komponen dialog input lu (Pastiin path-nya sesuai)
import { AddHarvestDialog } from "@/components/harvest/add-harvest-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import {
  useGetNotionConnectionStatus,
  getGetNotionConnectionStatusQueryKey,
} from "@workspace/api-client-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { isSignedIn } = useAuth();
  const [isFabOpen, setIsFabOpen] = useState(false);
const {
  data: connectionStatus,
} = useGetNotionConnectionStatus({
  query: {
    queryKey:
      getGetNotionConnectionStatusQueryKey(),
  },
});

  if (!isSignedIn) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  // Definisi navigasi (Cuma 4 item)
  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/operasional", icon: ClipboardList, label: "Operasional" },
    { href: "/lab", icon: FlaskConical, label: "Lab" },
    { href: "/settings", icon: Settings, label: "Setelan" },
  ];

  return (
    <div className="min-h-screen bg-muted/20 pb-24 md:pb-0 font-sans">
      {/* HEADER: Profil User */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between px-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between w-full">

  <div className="flex items-center gap-2">

    <Tractor className="h-5 w-5 text-primary" />

    <span className="font-bold text-lg tracking-tight text-foreground">
      Farmlytics
    </span>

  </div>

  <Link href="/connect">

  <button
    className={`
  inline-flex
  items-center
  gap-2
  text-xs
  font-medium
  px-3
  py-1
  rounded-full
  border
  w-fit
  transition-all

  ${
    connectionStatus?.connected
      ? `
        text-emerald-600
        bg-emerald-50
        border-emerald-200
        hover:bg-emerald-100
      `
      : `
        text-rose-600
        bg-rose-50
        border-rose-200
        hover:bg-rose-100
      `
  }
`}
  >
    <div
  className={`
    w-2
    h-2
    rounded-full

    ${
      connectionStatus?.connected
        ? "bg-emerald-500"
        : "bg-rose-500"
    }
  `}
/>

    {connectionStatus?.connected
  ? "Connected"
  : "Disconnected"}
  </button>

</Link>

</div>
        </div>
      </header>

      {/* AREA KONTEN UTAMA */}
      <main className="container p-4 md:p-6 mx-auto max-w-5xl">
        {children}
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav
  className="
    fixed
    bottom-4
    left-4
    right-4
    z-50
    max-w-lg
    mx-auto
    rounded-3xl
    border
    border-border/50
    bg-background/80
    backdrop-blur-xl
    shadow-2xl
    pb-safe
  "
>
        <div className="relative max-w-lg mx-auto h-16 px-4">
          
          {/* CONTAINER JEMPOL */}
          <div className="flex items-center justify-between h-full w-full gap-1">
            
            {/* Bagian Kiri */}
            <div className="flex w-2/5 justify-around h-full items-center">
              {[navItems[0], navItems[1]].map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link key={item.label} href={item.href}>
                    <a className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors min-w-[60px]">
                      <div className={`p-2 rounded-xl transition-all ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                        <Icon className={`h-5 w-5 ${isActive ? "stroke-primary stroke-[2.5]" : ""}`} />
                      </div>
                      <span className={`text-[10px] font-semibold ${isActive ? "text-primary" : ""}`}>{item.label}</span>
                    </a>
                  </Link>
                );
              })}
            </div>

            {/* LOBANG DI TENGAH */}
            <div className="w-1/5 flex justify-center items-center" />

            {/* Bagian Kanan */}
            <div className="flex w-2/5 justify-around h-full items-center">
              {[navItems[2], navItems[3]].map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link key={item.label} href={item.href}>
                    <a className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors min-w-[60px]">
                      <div className={`p-2 rounded-xl transition-all ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                        <Icon className={`h-5 w-5 ${isActive ? "stroke-primary stroke-[2.5]" : ""}`} />
                      </div>
                      <span className={`text-[10px] font-semibold ${isActive ? "text-primary" : ""}`}>{item.label}</span>
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ----- THE SUPER FAB ----- */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-4 flex justify-center items-center">
            
            {/* Overlay Blur (Aman di-unmount karena ga ada pop-up di dalemnya) */}
            <AnimatePresence>
              {isFabOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-background/80 backdrop-blur-sm -z-10"
                  onClick={() => setIsFabOpen(false)}
                />
              )}
            </AnimatePresence>
            
            {/* SPEED DIAL PATTERN: Disembunyikan pakai CSS, BUKAN dihapus dari layar */}
            <motion.div
              initial={false}
              animate={{ 
                opacity: isFabOpen ? 1 : 0, 
                y: isFabOpen ? 0 : 15, 
                scale: isFabOpen ? 1 : 0.9,
                pointerEvents: isFabOpen ? "auto" : "none" 
              }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-3 items-center z-20 w-max"
            >
              <div 
                className="drop-shadow-lg flex justify-center w-full"
                onClick={() => {
                  setTimeout(() => setIsFabOpen(false), 200);
                }}
              >
                <AddHarvestDialog onSuccess={() => setIsFabOpen(false)} />
              </div>
              
              <div 
                className="drop-shadow-lg flex justify-center w-full"
                onClick={() => {
                  setTimeout(() => setIsFabOpen(false), 200);
                }}
              >
                <AddExpenseDialog onSuccess={() => setIsFabOpen(false)} />
              </div>
            </motion.div>

            {/* Tombol Plus Tengah */}
            <button
              onClick={() => setIsFabOpen(!isFabOpen)}
              className={`flex h-16 w-16 items-center justify-center rounded-full shadow-2xl text-white transition-all duration-300 ease-in-out active:scale-95 ${
                isFabOpen ? "bg-rose-500 rotate-45 scale-90" : "bg-primary hover:bg-primary/95"
              }`}
            >
              <Plus className="h-8 w-8" />
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
