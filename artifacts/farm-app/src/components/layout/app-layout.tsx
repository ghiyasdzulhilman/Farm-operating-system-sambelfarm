import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth, UserButton } from "@clerk/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, 
  Sprout, 
  Plus, 
  FlaskConical, 
  Settings, 
  X,
  Tractor,
  Banknote
} from "lucide-react";

// Import komponen dialog input lu (Pastiin path-nya sesuai)
import { AddHarvestDialog } from "@/components/harvest/add-harvest-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { isSignedIn } = useAuth();
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Kalau belum login, tampilkan polos aja tanpa navigasi
  if (!isSignedIn) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/operasional", icon: Sprout, label: "Operasional" },
    // Posisi index 2 dikosongin buat tempat FAB (Tombol Tengah)
    { href: "#", isFab: true },
    { href: "/lab", icon: FlaskConical, label: "Lab" },
    { href: "/settings", icon: Settings, label: "Setelan" },
  ];

  return (
    <div className="min-h-screen bg-muted/20 pb-24 md:pb-0 font-sans">
      {/* HEADER: Cuma buat nampilin Profil lu di atas */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {/* Lu bisa ganti pakai logo Sambel Farm nanti */}
            <Tractor className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg tracking-tight text-foreground">
              Sambel Farm
            </span>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* AREA KONTEN UTAMA */}
      <main className="container p-4 md:p-6 mx-auto max-w-5xl">
        {children}
      </main>

      {/* BOTTOM NAVIGATION (Mobile First) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto relative px-2">
          {navItems.map((item, index) => {
            // RENDER TOMBOL TENGAH (FAB)
            if (item.isFab) {
              return (
                <div key="fab" className="relative -top-5 flex justify-center w-1/5">
                  {/* Menu Pop-up pas tombol plus diklik */}
                  <AnimatePresence>
                    {isFabOpen && (
                      <>
                        {/* Overlay transparan biar nutup menu pas klik di luar */}
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 bg-background/60 backdrop-blur-sm -z-10"
                          onClick={() => setIsFabOpen(false)}
                        />
                        
                        {/* Pilihan Tombol Input */}
                        <motion.div
                          initial={{ opacity: 0, y: 20, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 20, scale: 0.8 }}
                          className="absolute bottom-16 flex flex-col gap-3 items-center"
                        >
                          {/* Note: Gua bungkus komponen lu pakai div onClick biar menunya nutup otomatis pas diklik */}
                          <div onClick={() => setIsFabOpen(false)} className="flex items-center gap-2 bg-background p-2 rounded-full border shadow-lg">
                            <AddHarvestDialog onSuccess={() => {}} />
                          </div>
                          <div onClick={() => setIsFabOpen(false)} className="flex items-center gap-2 bg-background p-2 rounded-full border shadow-lg">
                            <AddExpenseDialog onSuccess={() => {}} />
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>

                  {/* Tombol Plus-nya itu sendiri */}
                  <button
                    onClick={() => setIsFabOpen(!isFabOpen)}
                    className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg text-white transition-transform active:scale-95 ${
                      isFabOpen ? "bg-rose-500 rotate-45" : "bg-primary"
                    }`}
                  >
                    <Plus className="h-7 w-7" />
                  </button>
                </div>
              );
            }

            // RENDER TOMBOL NAVIGASI BIASA
            const Icon = item.icon!;
            const isActive = location === item.href;

            return (
              <Link key={item.label} href={item.href}>
                <a className="flex flex-col items-center justify-center w-1/5 h-full gap-1 text-muted-foreground hover:text-primary transition-colors">
                  <div
                    className={`flex items-center justify-center p-1.5 rounded-full transition-all ${
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "fill-primary/20 stroke-primary" : ""}`} />
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? "text-primary" : ""}`}>
                    {item.label}
                  </span>
                </a>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
