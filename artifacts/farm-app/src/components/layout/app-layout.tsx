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
  Tractor,
  Banknote,
  ChevronRight,
  ClipboardList
} from "lucide-react";

// Import komponen dialog input lu (Pastiin path-nya sesuai)
import { AddHarvestDialog } from "@/components/harvest/add-harvest-dialog";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { isSignedIn } = useAuth();
  const [isFabOpen, setIsFabOpen] = useState(false);

  if (!isSignedIn) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  // Definisi navigasi (Cuma 4 item)
  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/operasional", icon: ClipboardList, label: "Operasional" }, // Ganti ikon biar lebih pro
    { href: "/lab", icon: FlaskConical, label: "Lab" },
    { href: "/settings", icon: Settings, label: "Setelan" },
  ];

  return (
    <div className="min-h-screen bg-muted/20 pb-24 md:pb-0 font-sans">
      {/* HEADER: Profil User */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between px-4 max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
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

      {/* BOTTOM NAVIGATION (REVISED FOR PRECISION) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="relative max-w-lg mx-auto h-16 px-4">
          
          {/* CONTAINER JEMPOL: Isi 4 Nav + 1 Lobang di tengah */}
          <div className="flex items-center justify-between h-full w-full gap-1">
            
            {/* Bagian Kiri (Nav 1 & 2) */}
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

            {/* Bagian Kanan (Nav 3 & 4) */}
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

          {/* ----- THE SUPER FAB: Tombol Input Tengah (PRECISION TUNED) ----- */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-4 flex justify-center items-center"> {/* Turun dikit biar presisi */}
            
            {/* Menu Pop-up pas tombol plus diklik */}
            <AnimatePresence>
              {isFabOpen && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm -z-10"
                    onClick={() => setIsFabOpen(false)}
                  />
                  
                  {/* Pilihan Input: Gaya LIST ITEM Profesional (FULL REMAKE) */}
                  <motion.div
                    initial={{ opacity: 0, y: 15, scale: 0.9, x: "-50%" }}
                    animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                    exit={{ opacity: 0, y: 15, scale: 0.9, x: "-50%" }}
                    className="absolute bottom-20 left-1/2 w-[280px] bg-card p-2 rounded-2xl border border-border shadow-2xl z-20"
                  >
                    <h4 className="text-xs font-semibold text-muted-foreground pt-2 px-3 pb-2">Menu Input Cepat</h4>
                    
                    {/* LIST ITEM: Tambah Panen (🌶️) */}
                    {/* Catatan: Komponen lu harusnya menerima children sebagai trigger, kalau tidak, gua perlu liat daleman komponen lu */}
                    <AddHarvestDialog onSuccess={() => {}} >
                        <div onClick={() => setIsFabOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer text-left w-full border border-border/50 bg-background shadow-sm">
                            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-emerald-100 text-emerald-700">
                                <Sprout className="h-5 w-5"/>
                            </div>
                            <div>
                                <div className="text-sm font-semibold">Tambah Panen</div>
                                <div className="text-[11px] text-muted-foreground">Catat hasil panen dari blok.</div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50 ml-auto flex-shrink-0" />
                        </div>
                    </AddHarvestDialog>
                    
                    {/* LIST ITEM: Catat Pengeluaran (💸) */}
                    <AddExpenseDialog onSuccess={() => {}} >
                        <div onClick={() => setIsFabOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer text-left w-full border border-border/50 bg-background shadow-sm mt-1">
                            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-rose-100 text-rose-700">
                                <Banknote className="h-5 w-5"/>
                            </div>
                            <div>
                                <div className="text-sm font-semibold">Catat Pengeluaran</div>
                                <div className="text-[11px] text-muted-foreground">Catat biaya operasional.</div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50 ml-auto flex-shrink-0" />
                        </div>
                    </AddExpenseDialog>
                    
                    <div className="pt-1" /> {/* Spacer bawah */}
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Tombol Plus Tengah yang Presisi */}
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
