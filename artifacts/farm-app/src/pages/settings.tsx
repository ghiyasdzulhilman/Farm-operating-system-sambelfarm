import { useState, useEffect } from "react";
import { UserButton } from "@clerk/react";
import { motion } from "framer-motion";
import {
  Database,
  ChevronRight,
  Sun,
  Moon,
  Palette
} from "lucide-react";

import { MasterHubPage } from "@/pages/MasterHubPage"; 

// ---------------------------------------------------------------------------
// 🚀 1. MAIN PAGE COMPONENT
// ---------------------------------------------------------------------------
export function SettingsPage() {
  const [showMasterHub, setShowMasterHub] = useState(false);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">System Center</h1>
          <p className="text-muted-foreground">Premium Smart Farming ERP Configuration</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/50 p-2 backdrop-blur dark:bg-slate-950/50">
          <UserButton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        
        {/* SIDEBAR CONTAINER */}
        <aside className="space-y-4"> 
          
          {/* 🚀 TOMBOL MASTER DATA (SUPABASE) - SEKARANG JADI AKTOR UTAMA */}
          <button 
            onClick={() => setShowMasterHub(true)}
            className="group flex w-full items-center gap-3 rounded-2xl p-4 transition-all duration-300 bg-primary text-primary-foreground shadow-sm hover:opacity-90"
          >
            <div className="rounded-xl p-2 bg-primary-foreground/20 text-white transition-colors">
              <Database className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-white">Master Data</p>
              <p className="text-[10px] text-white/80">PostgreSQL Supabase</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-white" />
          </button>
          
          {/* SAKLAR TRIPLE KENDALI WARNA (Tetap dipertahankan untuk UI) */}
          <ColorControl />
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="space-y-4">
          <div className="flex min-h-[350px] flex-col items-center justify-center rounded-[1.75rem] border border-border/50 bg-card/40 text-center shadow-sm p-6 backdrop-blur-sm">
            <Database className="h-16 w-16 text-primary/20 mb-4" />
            <h3 className="text-xl font-black tracking-tight text-foreground">Sistem Native PostgreSQL Active</h3>
            <p className="text-sm text-muted-foreground max-w-md mt-2 leading-relaxed">
              Semua dependensi dan antrean sinkronisasi Notion telah dihapus secara permanen. Silakan buka <strong className="text-primary">Master Data</strong> di menu samping untuk mengelola operasional kebun Anda secara real-time.
            </p>
          </div>
        </main>
      </div>

      {/* 🚀 OVERLAY MASTER HUB */}
      {showMasterHub && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-background/95 backdrop-blur-md">
          <MasterHubPage onClose={() => setShowMasterHub(false)} />
        </div>
      )}

    </div>
  );
}


// ---------------------------------------------------------------------------
// 📦 2. BRAND COLOR & THEME CONTROLLER WIDGET 
// ---------------------------------------------------------------------------
function hexToHsl(hex: string) {
  hex = hex.replace(/^#/, "");
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const roundedH = Math.round(h * 360);
  const roundedS = Math.round(s * 100);
  const roundedL = Math.round(l * 100);

  return {
    h: roundedH,
    s: roundedS,
    l: roundedL,
    toString: () => `${roundedH} ${roundedS}% ${roundedL}%`
  };
}

function ColorControl() {
  const [isDark, setIsDark] = useState(false);

  // State Hex Dasar 3 Warna Identitas
  const [primaryHex, setPrimaryHex] = useState("#16a34a");
  const [secondaryHex, setSecondaryHex] = useState("#a3e635");
  const [accentHex, setAccentHex] = useState("#f97316");

  // Load warna awal dari LocalStorage & Suntik Muted UI otomatis
  useEffect(() => {
    if (typeof window !== "undefined") {
      const activeDark = document.documentElement.classList.contains("dark");
      setIsDark(activeDark);
      
      const savedPrimary = localStorage.getItem("sf-primary-hex") || "#16a34a";
      const savedSecondary = localStorage.getItem("sf-secondary-hex") || "#a3e635";
      const savedAccent = localStorage.getItem("sf-accent-hex") || "#f97316";

      setPrimaryHex(savedPrimary);
      setSecondaryHex(savedSecondary);
      setAccentHex(savedAccent);

      // Pipa Sinkronisasi Otomatis untuk Muted UI
      const p = hexToHsl(savedPrimary);
      if (activeDark) {
        document.documentElement.style.setProperty("--muted", `${p.h} 8% 12%`);
        document.documentElement.style.setProperty("--muted-foreground", `${p.h} 8% 65%`);
      } else {
        document.documentElement.style.setProperty("--muted", `${p.h} 15% 94%`);
        document.documentElement.style.setProperty("--muted-foreground", `${p.h} 20% 45%`);
      }
    }
  }, []);

  // Sync Mode Gelap/Terang
  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    localStorage.setItem("theme", newIsDark ? "dark" : "light");
    
    const root = document.documentElement;
    const p = hexToHsl(primaryHex);
    if (newIsDark) {
      root.classList.add("dark");
      root.style.setProperty("--muted", `${p.h} 8% 12%`);
      root.style.setProperty("--muted-foreground", `${p.h} 8% 65%`);
    } else {
      root.classList.remove("dark");
      root.style.setProperty("--muted", `${p.h} 15% 94%`);
      root.style.setProperty("--muted-foreground", `${p.h} 20% 45%`);
    }
  };

  const handlePrimaryChange = (hex: string) => {
    setPrimaryHex(hex);
    localStorage.setItem("sf-primary-hex", hex);
    
    const p = hexToHsl(hex);
    document.documentElement.style.setProperty("--primary", p.toString());
    
    if (isDark) {
      document.documentElement.style.setProperty("--muted", `${p.h} 8% 12%`);
      document.documentElement.style.setProperty("--muted-foreground", `${p.h} 8% 65%`);
    } else {
      document.documentElement.style.setProperty("--muted", `${p.h} 15% 94%`);
      document.documentElement.style.setProperty("--muted-foreground", `${p.h} 20% 45%`);
    }
  };

  const handleSecondaryChange = (hex: string) => {
    setSecondaryHex(hex);
    localStorage.setItem("sf-secondary-hex", hex);
    document.documentElement.style.setProperty("--secondary", hexToHsl(hex).toString());
  };

  const handleAccentChange = (hex: string) => {
    setAccentHex(hex);
    localStorage.setItem("sf-accent-hex", hex);
    document.documentElement.style.setProperty("--accent", hexToHsl(hex).toString());
  };

  return (
    <div className="p-4 rounded-3xl border border-border bg-card shadow-sm w-full space-y-4 text-left">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Palette className="h-4 w-4 text-primary" />
        <span>Sistem Kontrol Visual</span>
      </div>

      <div className="flex items-center justify-between border-b pb-3 border-border/50">
        <span className="text-xs font-semibold">Mode Layar</span>
        <button
          onClick={toggleTheme}
          className="relative inline-flex h-7 w-12 items-center rounded-full bg-muted transition-colors focus:outline-none"
        >
          <motion.div
            layout
            className="flex h-5 w-5 items-center justify-center rounded-full bg-background shadow-sm"
            animate={{ x: isDark ? 22 : 4 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {isDark ? <Moon className="h-3 w-3 text-primary" /> : <Sun className="h-3 w-3 text-amber-500" />}
          </motion.div>
        </button>
      </div>

      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold block">Warna Utama</span>
            <span className="text-[10px] text-muted-foreground block">UI Utama & Basis Muted</span>
          </div>
          <div className="relative h-7 w-14 rounded-xl border border-border/60 shadow-sm overflow-hidden" style={{ backgroundColor: primaryHex }}>
            <input type="color" value={primaryHex} onChange={(e) => handlePrimaryChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer h-full w-full" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold block">Warna Kedua</span>
            <span className="text-[10px] text-muted-foreground block">Badge & Secondary UI</span>
          </div>
          <div className="relative h-7 w-14 rounded-xl border border-border/60 shadow-sm overflow-hidden" style={{ backgroundColor: secondaryHex }}>
            <input type="color" value={secondaryHex} onChange={(e) => handleSecondaryChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer h-full w-full" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold block">Warna Aksen</span>
            <span className="text-[10px] text-muted-foreground block">Notifikasi & Alert</span>
          </div>
          <div className="relative h-7 w-14 rounded-xl border border-border/60 shadow-sm overflow-hidden" style={{ backgroundColor: accentHex }}>
            <input type="color" value={accentHex} onChange={(e) => handleAccentChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer h-full w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
