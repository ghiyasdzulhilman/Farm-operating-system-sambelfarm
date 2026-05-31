import { Eye, Trash2, MapPin, Clock } from "lucide-react";
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
      <div className="py-10 text-center text-muted-foreground font-bold text-sm border border-border/60 rounded-3xl bg-card shadow-sm w-full">
        Tidak ada data aktivitas yang sesuai.
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {/* HEADER */}
      <div className="px-2 py-1">
        <p className="text-sm font-black tracking-tight">Tampilan List (Mobile Friendly)</p>
        <p className="text-[10px] text-muted-foreground">Edit status langsung tanpa perlu geser layar.</p>
      </div>

      {/* LIST KARTU NOTION */}
      <div className="flex flex-col gap-3 pb-6">
        {items.map((item) => (
          <div key={item.id} className="w-full rounded-2xl border border-border/60 bg-card p-3 shadow-sm hover:shadow-md transition-all flex flex-col gap-3">
            
            {/* Bagian Atas: Judul & Area */}
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <h3 className="text-sm font-black leading-tight max-w-[200px] truncate">{item.title}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.category}</p>
              </div>
              <div className="flex items-center gap-1 bg-muted/30 px-2 py-1 rounded-md border border-border/50 shrink-0">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-bold truncate max-w-[90px]">{item.area}</span>
              </div>
            </div>

            {/* Bagian Bawah: Waktu, Status, Tombol Aksi */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
              
              {/* Waktu */}
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{item.dateLabel}, {item.time}</span>
              </div>

              {/* Status & Aksi */}
              <div className="flex items-center gap-2">
                <select
                  value={item.status}
                  onChange={(e) => onStatusChange?.(item.id, e.target.value)}
                  className={cn(
                    "rounded-lg border border-border/80 bg-background px-2 py-1 text-[9px] font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer",
                    item.status === "Selesai" && "border-emerald-500/30 bg-emerald-500/5 text-emerald-700",
                    item.status === "Dalam proses" && "border-amber-500/30 bg-amber-500/5 text-amber-700",
                    item.status === "Belum dikerjakan" && "border-muted-foreground/20 bg-muted/30 text-muted-foreground"
                  )}
                >
                  <option value="Belum dikerjakan">❌ Belum</option>
                  <option value="Dalam proses">⚡ Proses</option>
                  <option value="Selesai">✅ Selesai</option>
                </select>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onItemClick(item)}
                    className="p-1.5 rounded-md border border-border/60 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteClick?.(item.id)}
                    className="p-1.5 rounded-md border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
