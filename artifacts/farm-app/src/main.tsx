import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// --- SAKLAR TEMA UTAMA (KALIBRASI 100% COCOK) ---
if (typeof window !== 'undefined') {
  const isDark = localStorage.getItem("theme") === "dark" || 
                 (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);

  const hexToHsl = (hex: string) => {
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
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  };

  const savedPrimary = localStorage.getItem("sf-primary-hex");
  const savedSecondary = localStorage.getItem("sf-secondary-hex");
  const savedAccent = localStorage.getItem("sf-accent-hex");

  if (savedPrimary) {
    const p = hexToHsl(savedPrimary);
    document.documentElement.style.setProperty("--primary", `${p.h} ${p.s}% ${p.l}%`);
    if (isDark) {
      document.documentElement.style.setProperty("--muted", `${p.h} 8% 12%`);
      document.documentElement.style.setProperty("--muted-foreground", `${p.h} 8% 65%`);
    } else {
      document.documentElement.style.setProperty("--muted", `${p.h} 15% 94%`);
      document.documentElement.style.setProperty("--muted-foreground", `${p.h} 20% 45%`);
    }
  }
  if (savedSecondary) {
    const s = hexToHsl(savedSecondary);
    document.documentElement.style.setProperty("--secondary", `${s.h} ${s.s}% ${s.l}%`);
  }
  if (savedAccent) {
    const a = hexToHsl(savedAccent);
    document.documentElement.style.setProperty("--accent", `${a.h} ${a.s}% ${a.l}%`);
  }
}
// ------------------------------------------------

createRoot(document.getElementById("root")!).render(<App />);
