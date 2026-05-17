import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// --- SAKLAR TEMA UTAMA (Jalan sebelum React nge-render UI) ---
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem("theme");
  const savedColor = localStorage.getItem("themeColor");
  
  if (savedTheme) {
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  } else {
    const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", isSystemDark);
  }

  if (savedColor) {
    try {
      const themeColors = JSON.parse(savedColor);
      Object.entries(themeColors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${key}`, value as string);
      });
    } catch (e) {
      console.error("Gagal membaca warna kustom");
    }
  }
}
// --------------------------------------------------------------

createRoot(document.getElementById("root")!).render(<App />);
