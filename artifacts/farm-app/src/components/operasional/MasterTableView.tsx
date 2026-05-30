import { Eye, Edit3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

export function MasterTableView({ items, onItemClick }: { items: AgronomyItem[], onItemClick: (item: AgronomyItem) => void }) {
  
  if (items.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground font-bold text-sm border border-border/60 rounded-3xl bg-card shadow-sm">
        Tidak ada data aktivitas yang sesuai dengan filter.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-sm font-black tracking-tight">Tabel Riwayat Cepat</p>
        <p className="text-[10px] text-muted-foreground">Geser ke kanan untuk melihat detail.</p>
      </div>

      {/* Kontainer scroll horizontal */}
      <div className="overflow-x-auto custom-scrollbar relative">
        <table className="w-full min-w-[600px] text-left border-collapse">
          <thead className="bg-muted/30 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="px-3 py-3 whitespace-nowrap">Waktu</th>
              {/* Kolom Aktivitas dibikin Sticky biar gak hilang pas digeser */}
              <th className="px-3 py-3 whitespace-nowrap sticky left-0 bg-muted/30 backdrop-blur-sm shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10">Aktivitas</th>
              <th className="px-3 py-3 whitespace-nowrap">Area</th>
              <th className="px-3 py-3 whitespace-nowrap">Status</th>
              <th className="px-3 py-3 whitespace-nowrap text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border/60 hover:bg-muted/10 transition-colors group">
                
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="text-xs font-bold">{item.time}</div>
                  <div className="text-[9px] font-semibold text-muted-foreground">{item.dateLabel}</div>
                </td>
                
                {/* Kolom Sticky */}
                <td className="px-3 py-3 sticky left-0 bg-card group-hover:bg-muted/10 transition-colors shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] z-10">
                  <div className="text-xs font-black tracking-tight max-w-[140px] truncate" title={item.title}>
                    {item.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">{item.category}</div>
                </td>
                
                <td className="px-3 py-3 text-xs truncate max-w-[100px]">{item.area}</td>
                
                <td className="px-3 py-3 whitespace-nowrap">
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                      item.status === "Selesai" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                        : item.status === "Dalam proses" ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
                        : "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {item.status}
                  </Badge>
                </td>
                
                <td className="px-3 py-3 whitespace-nowrap text-right">
                  <button
                    onClick={() => onItemClick(item)}
                    className="inline-flex h-7 items-center justify-center rounded-lg border border-border/60 bg-background px-2.5 text-[10px] font-bold text-primary transition-all hover:bg-muted"
                  >
                    <Eye className="mr-1.5 h-3 w-3" />
                    Buka
                  </button>
                </td>
                
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
