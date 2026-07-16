import { Thermometer, TrendingUp, Radar, Clock3 } from "lucide-react";
import type { AgronomyItem } from "@/types/operasional";

interface InspeksiFieldsProps {
  item: AgronomyItem;
  activeField: string | null;
  setActiveField: (val: string | null) => void;
  localValue: string;
  setLocalValue: (val: string) => void;
  handleInlineSave: (field: string) => void;
}

export function InspeksiFields({
  item,
  activeField,
  setActiveField,
  localValue,
  setLocalValue,
  handleInlineSave,
}: InspeksiFieldsProps) {
  if (item.module !== "inspeksi" || !item.metaEkstra) return null;

  return (
    <>
      {/* pH Tanah */}
      <div 
        onClick={() => { if(activeField !== "phTanah") { setActiveField("phTanah"); setLocalValue(String(item.metaEkstra.phTanah || "")); } }}
        className="rounded-3xl border border-border/40 bg-card p-3.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.04)] cursor-pointer hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2 text-muted-foreground/80 mb-1">
          <Thermometer className="h-4 w-4 opacity-70" />
          <span className="text-[11px] font-bold uppercase tracking-widest">pH Tanah</span>
        </div>
        {activeField === "phTanah" ? (
          <input autoFocus type="number" step="0.1" value={localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={() => handleInlineSave("phTanah")} onKeyDown={(e) => e.key === "Enter" && handleInlineSave("phTanah")} className="w-full bg-transparent text-lg font-black text-foreground outline-none border-b border-primary/30 p-0" />
        ) : (
          <p className="text-lg font-black text-foreground">{item.metaEkstra.phTanah || "-"}</p>
        )}
      </div>

      {/* Tingkat Serangan */}
      <div 
        onClick={() => { if(activeField !== "tingkatSerangan") { setActiveField("tingkatSerangan"); setLocalValue(String(item.metaEkstra.tingkatSerangan || "")); } }}
        className="rounded-3xl border border-border/40 bg-card p-3.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.04)] cursor-pointer hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2 text-muted-foreground/80 mb-1">
          <TrendingUp className="h-4 w-4 opacity-70" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Serangan</span>
        </div>
        {activeField === "tingkatSerangan" ? (
          <input autoFocus type="number" value={localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={() => handleInlineSave("tingkatSerangan")} onKeyDown={(e) => e.key === "Enter" && handleInlineSave("tingkatSerangan")} className="w-full bg-transparent text-lg font-black text-foreground outline-none border-b border-primary/30 p-0" />
        ) : (
          <p className="text-lg font-black text-foreground">{item.metaEkstra.tingkatSerangan ? `${item.metaEkstra.tingkatSerangan}%` : "0%"}</p>
        )}
      </div>

      {/* Radius Terpapar */}
      <div 
        onClick={() => { if(activeField !== "radius") { setActiveField("radius"); setLocalValue(String(item.metaEkstra.radius || "")); } }}
        className="rounded-3xl border border-border/40 bg-card p-3.5 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.04)] cursor-pointer hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2 text-muted-foreground/80 mb-1">
          <Radar className="h-4 w-4 opacity-70" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Radius</span>
        </div>
        {activeField === "radius" ? (
          <input autoFocus type="number" value={localValue} onChange={(e) => setLocalValue(e.target.value)} onBlur={() => handleInlineSave("radius")} onKeyDown={(e) => e.key === "Enter" && handleInlineSave("radius")} className="w-full bg-transparent text-lg font-black text-foreground outline-none border-b border-primary/30 p-0" />
        ) : (
          <p className="text-lg font-black text-foreground">{item.metaEkstra.radius ? `${item.metaEkstra.radius} m` : "-"}</p>
        )}
      </div>

      {/* 🔒 KOTAK KE-4: Durasi Kerja (Kunci Menjadi Read-Only) */}
      <div className="rounded-3xl border border-border/30 bg-muted/30 p-3.5 shadow-[inset_0_1px_4px_rgba(255,255,255,0.2)] select-none">
        <div className="flex items-center gap-2 text-muted-foreground/70 mb-1">
          <Clock3 className="h-4 w-4 opacity-70" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Durasi Kerja</span>
        </div>
        <p className="text-lg font-black text-muted-foreground">
          {item.metaEkstra.durasiKerja ? `${item.metaEkstra.durasiKerja} Jam` : "0 Jam"}
        </p>
      </div>
    </>
  );
}
