import { useState, useEffect } from "react";
import { Sun, Moon, Palette, Check } from "lucide-react";
import { motion } from "framer-motion";

// Daftar resep warna utama Sambelfarm (Format: HSL tanpa tulisan hsl())
const BRAND_COLORS = [
  { name: "Hijau Daun (Default)", hsl: "142 76% 36%", bgClass: "bg-[#16a34a]" },
  { name: "Merah Cabai Matang", hsl: "0 72% 51%", bgClass: "bg-[#dc2626]" },
  { name: "Jingga Cabai Rawit", hsl: "25 75% 50%", bgClass: "bg-[#f97316]" },
  { name: "Kuning Tonase Mas", hsl: "45 90% 45%", bgClass: "bg-[#eab308]" },
];

export function ColorControl() {
  const [isDark, setIsDark] = useState(false);
  const [activeColor, setActiveColor] = useState("142 76% 36%");

  // 1. KENDALI TEMA: Tukar baris Light Mode <=> Dark Mode
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDark]);

  // 2. KENDALI WARNA: Suntik kode HSL baru ke variable --primary pusat
  const handleColorChange = (hslValue: string) => {
    setActiveColor(hslValue);
    document.documentElement.style.setProperty("--primary", hslValue);
  };

  return (
    <div className="p-4 rounded-3xl border border-border bg-card/50 backdrop-blur-xl max-w-xs space-y-4 shadow-sm">
      {/* Header Kecil */}
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Palette className="h-4 w-4 text-primary" />
        <span>Sistem Kontrol Visual</span>
      </div>

      {/* Kontrol 1: Mode Siang / Malam */}
      <div className="flex items-center justify-between border-b pb-3 border-border/50">
        <span className="text-xs font-semibold">Mode Layar</span>
        <button
          onClick={() => setIsDark(!isDark)}
          className="relative inline-flex h-7 w-12 items-center rounded-full bg-muted transition-colors focus:outline-none"
        >
          <motion.div
            layout
            className="flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm"
            animate={{ x: isDark ? 22 : 4 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {isDark ? (
              <Moon className="h-3 w-3 text-slate-950" />
            ) : (
              <Sun className="h-3 w-3 text-amber-500" />
            )
          )}
          </motion.div>
        </button>
      </div>

      {/* Kontrol 2: Palet Warna Brand Cabai */}
      <div className="space-y-2">
        <span className="text-xs font-semibold block text-left">Warna Utama Aplikasi</span>
        <div className="flex gap-3">
          {BRAND_COLORS.map((color) => (
            <button
              key={color.hsl}
              onClick={() => handleColorChange(color.hsl)}
              className={`h-7 w-7 rounded-full ${color.bgClass} flex items-center justify-center relative transition-transform active:scale-95 shadow-sm`}
              title={color.name}
            >
              {activeColor === color.hsl && (
                <motion.div layoutId="checkedCircle" className="absolute inset-0 border-2 border-white rounded-full flex items-center justify-center bg-black/10">
                  <Check className="h-3 w-3 text-white stroke-[4]" />
                </motion.div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
