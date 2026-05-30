import { Eye, Edit3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";

export function MasterTableView({ items, onItemClick }: { items: AgronomyItem[], onItemClick: (item: AgronomyItem) => void }) {
  
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground font-bold text-sm border border-border/60 rounded-3xl bg-card shadow-sm">
        Tidak ada data aktivitas yang sesuai dengan filter.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-sm font-black tracking-tight">Tabel Riwayat Agronomy & Finance</p>
        <p className="text-xs text-muted-foreground">
          View cepat untuk audit, edit, dan cek histori.
        </p>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-muted/30 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Aktivitas</th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Pekerja</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-border/60 hover:bg-muted/10 transition-colors">
                <td className="px-4 py-4">
                  <div className="text-sm font-semibold">{item.time}</div>
                  <div className="text-[10px] font-bold text-muted-foreground">{item.dateLabel}</div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-black tracking-tight max-w-[200px] truncate" title={item.title}>
                    {item.title}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.category}</div>
                </td>
                <td className="px-4 py-4 text-sm truncate max-w-[120px]">{item.area}</td>
                <td className="px-4 py-4 text-sm text-muted-foreground truncate max-w-[120px]" title={item.workers.join(", ")}>
                  {item.workers.join(", ")}
                </td>
                <td className="px-4 py-4">
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                      item.status === "Selesai"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                        : item.status === "Dalam proses"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
                          : "border-muted-foreground/20 bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {item.status}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onItemClick(item)}
                      className="inline-flex h-9 items-center gap-1 rounded-xl border border-border/60 bg-background px-3 text-xs font-bold transition-all hover:bg-muted"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Detail
                    </button>
                    <button className="inline-flex h-9 items-center gap-1 rounded-xl border border-border/60 bg-background px-3 text-xs font-bold transition-all hover:bg-muted opacity-50 cursor-not-allowed" title="Fitur Edit segera hadir">
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
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
