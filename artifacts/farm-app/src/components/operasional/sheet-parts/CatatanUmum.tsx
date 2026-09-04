// 🚀 THE FIX: Tambahkan useEffect di import
import { useState, useEffect } from "react";
import type { AgronomyItem } from "@/types/operasional";

interface CatatanUmumProps {
  item: AgronomyItem;
  onStatusChange?: (id: string, payload: any) => void | Promise<any>;
}

export function CatatanUmum({ item, onStatusChange }: CatatanUmumProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState("");

  const getCleanCatatan = () => {
    // 🚀 THE FIX: Cek juga metaEkstra.catatanKhusus untuk nampilin data Pengeluaran
    const raw = item.notes || item.metaEkstra?.catatanKhusus || item.metaEkstra?.catatan || "";
    
    if (item.module === "perawatan" && raw.includes("\n\nCatatan Tambahan:\n")) {
      const parts = raw.split("\n\nCatatan Tambahan:\n");
      return parts[parts.length - 1]; 
    }
    if (item.module === "inspeksi" && raw.includes("\n\n⚠️ Detail Kendala:\n")) {
      return raw.split("\n\n⚠️ Detail Kendala:\n")[0];
    }
    return raw;
  };

  // 🚀 THE FIX: Anti-Lag! Sinkronkan memori lokal HANYA saat data awal berubah
  useEffect(() => {
    if (!isEditing) {
      setLocalValue(getCleanCatatan());
    }
  }, [item, isEditing]);

    const handleSave = () => {
    setIsEditing(false);
    const valStr = localValue.trim();
    
    if (valStr !== getCleanCatatan()) {
      const payload: any = {};
      
      // 🚀 THE FIX: Sesuai backend expenses.ts, Pengeluaran butuh "keterangan"
      if (item.module === "inspeksi" || item.module === "pengeluaran") {
        payload.keterangan = valStr;
      } else {
        // 🚀 Agronomi dan Panen pakai 'catatan'
        payload.catatan = valStr;
      }

      onStatusChange?.(item.id, payload);
    }
  };

  return (
    <section className="mt-6 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
        <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">
          {item.module === "inspeksi" ? "Catatan Kegiatan" : "Catatan"}
        </h3>
      </div>
      
      <div 
        // 🚀 THE FIX: Hapus setLocalValue di sini karena udah di-handle mulus oleh useEffect
        onClick={() => { if(!isEditing) setIsEditing(true); }}
        className="group/notes w-full text-[14px] leading-relaxed text-foreground/90 min-h-[120px] cursor-pointer transition-all hover:bg-muted/30 rounded-2xl p-3 -mx-3"
      >
        {isEditing ? (
          <textarea 
            autoFocus 
            rows={4} 
            value={localValue} 
            onChange={(e) => setLocalValue(e.target.value)} 
            onBlur={handleSave} 
            // 🚀 THE FIX: Tambahkan focus:ring-0 biar UI-nya bersih di HP
            className="w-full bg-transparent outline-none resize-none p-0 focus:ring-0" 
          />
        ) : (
          <div className="whitespace-pre-wrap">{getCleanCatatan() || "Ketik catatan disini..."}</div>
        )}
      </div>
    </section>
  );
}
