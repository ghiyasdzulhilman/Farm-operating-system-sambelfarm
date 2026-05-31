import { Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

export function MasterTableView({ 
  items, 
  onItemClick,
  onStatusChange,
  onDeleteClick 
}: { 
  items: AgronomyItem[], 
  onItemClick: (item: AgronomyItem) => void,
  onStatusChange?: (id: string, newStatus: string) => void,
  onDeleteClick?: (id: string) => void
}) {
  
  if (items.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground font-bold text-sm border border-border/60 rounded-3xl bg-card shadow-sm mx-auto max-w-full">
        Tidak ada data aktivitas yang sesuai dengan filter.
      </div>
    );
  }

  return (
    // Kontainer Utama: Dikunci maksimal se-lebar layar HP biar gak ngegeser bodi aplikasi
    <div className="w-full max-w-[calc(100vw-2rem)] mx-auto overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className="border-b border-border/60 px-4 py-3 bg-card">
        <p className="text-sm font-black tracking-tight">Tabel Master (Mirror Notion)</p>
        <p className="text-[10px] text-muted-foreground">Scroll samping untuk data, scroll bawah untuk riwayat.</p>
      </div>

      {/* Pembungkus area scroll dengan batasan tinggi maks agar header bisa melayang */}
      <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar relative">
        <table className="w-full min-w-[650px] text-left border-collapse table-fixed">
          
          {/* HEADER TABEL: Melayang di atas saat scroll ke bawah (sticky top-0) */}
          <thead className="sticky top-0 bg-muted/90 backdrop-blur-md text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground z-20 border-b border-border/60">
            <tr>
              <th className="w-[85px] px-3 py-3">Waktu</th>
              {/* Kolom judul aktivitas melayang di kiri saat scroll samping (sticky left-0) */}
              <th className="w-[160px] px-3 py-3 sticky left-0 bg-muted/90 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Aktivitas</th>
              <th className="w-[120px] px-3 py-3">Area</th>
              <th className="w-[145px] px-3 py-3">Status</th>
              <th className="w-[75px] px-3 py-3 text-right">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/60">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/10 transition-colors group">
                
                {/* 1. KOLOM WAKTU */}
                <td className="px-3 py-2.5">
                  <div className="text-xs font-bold text-foreground/90">{item.time}</div>
                  <div className="text-[9px] font-semibold text-muted-foreground whitespace-nowrap">{item.dateLabel}</div>
                </td>
                
                {/* 2. KOLOM AKTIVITAS (STICKY LEFT-0) */}
                <td className="px-3 py-2.5 sticky left-0 bg-card group-hover:bg-muted/10 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] z-10">
                  <div className="text-xs font-black tracking-tight truncate w-full" title={item.title}>
                    {item.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate w-full">{item.category}</div>
                </td>
                
                {/* 3. KOLOM AREA */}
                <td className="px-3 py-2.5 text-xs font-medium text-foreground/80 truncate">
                  {item.area}
                </td>
                
                {/* 4. KOLOM STATUS INTERAKTIF (Bisa diganti langsung lewat select) */}
                <td className="px-3 py-2.5">
                  <select
                    value={item.status}
                    onChange={(e) => onStatusChange?.(item.id, e.target.value)}
                    className={cn(
                      "w-full rounded-xl border border-border/80 bg-background px-2 py-1 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-primary appearance-none text-center cursor-pointer",
                      item.status === "Selesai" && "border-emerald-500/30 bg-emerald-500/5 text-emerald-700",
                      item.status === "Dalam proses" && "border-amber-500/30 bg-amber-500/5 text-amber-700",
                      item.status === "Belum dikerjakan" && "border-muted-foreground/20 bg-muted/30 text-muted-foreground"
                    )}
                  >
                    <option value="Belum dikerjakan">❌ Belum Dikerjakan</option>
                    <option value="Dalam proses">⚡ Dalam Proses</option>
                    <option value="Selesai">✅ Selesai</option>
                  </select>
                </td>
                
                {/* 5. KOLOM AKSI CEPAT */}
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onItemClick(item)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                      title="Buka Detail"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteClick?.(item.id)}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 text-destructive transition-all hover:bg-destructive hover:text-white"
                      title="Hapus Baris"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
