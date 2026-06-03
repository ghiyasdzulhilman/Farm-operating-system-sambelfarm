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
      <div className="py-10 text-center text-muted-foreground font-bold text-sm border border-border/60 rounded-3xl bg-card shadow-sm w-full">
        Tidak ada data aktivitas yang sesuai.
      </div>
    );
  }

  return (
    // CONTROLLER UTAMA: Kita pasang `inline-block` dan `max-w-full` biar dia sejajar presisi sama kotak Filter
    <div className="w-full max-w-full inline-block align-middle overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
      
      <div className="border-b border-border/60 px-4 py-3 bg-card">
        <p className="text-sm font-black tracking-tight">Tabel Master (Mirror Notion)</p>
        <p className="text-[10px] text-muted-foreground">Geser tabel ke samping untuk melihat properti lain.</p>
      </div>

      {/* 👇 INI TAMENG UTAMANYA: `overflow-x-auto` di sini mengunci scroll samping HANYA di dalam kotak ini */}
      <div className="w-full overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar">
        {/* `table-fixed` memaksa kolom tunduk pada lebar `w-[...]` yang kita tentukan */}
        <table className="w-full min-w-[700px] table-fixed text-left border-collapse">
          
          {/* JUDUL PROPERTI MELAYANG (Sticky Top) & Ikut Geser Samping */}
          <thead className="sticky top-0 z-20 bg-muted/95 backdrop-blur-md shadow-sm border-b border-border/60 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th className="w-[100px] px-4 py-3">Waktu</th>
              <th className="w-[200px] px-4 py-3">Aktivitas</th>
              <th className="w-[130px] px-4 py-3">Area</th>
              <th className="w-[150px] px-4 py-3">Status</th>
              <th className="w-[120px] px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border/60">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                
                {/* WAKTU */}
                <td className="px-4 py-3">
                  <div className="text-xs font-bold text-foreground/90 whitespace-nowrap">{item.time}</div>
                  <div className="text-[9px] font-semibold text-muted-foreground whitespace-nowrap">{item.dateLabel}</div>
                </td>
                
                {/* AKTIVITAS */}
                <td className="px-4 py-3">
                  <div className="text-xs font-black tracking-tight truncate w-full" title={item.title}>
                    {item.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate w-full">{item.category}</div>
                </td>
                
                {/* AREA */}
                <td className="px-4 py-3 text-xs font-medium text-foreground/80 truncate">
                  {item.area}
                </td>
                
                {/* STATUS DROPDOWN */}
                <td className="px-4 py-3">
                  <select
                    value={item.status}
                    onChange={(e) => onStatusChange?.(item.id, e.target.value)}
                    className={cn(
                      "w-full rounded-xl border border-border/80 bg-background px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer text-center",
                      item.status === "Selesai" && "border-emerald-500/30 bg-emerald-500/5 text-emerald-700",
                      item.status === "Dalam proses" && "border-amber-500/30 bg-amber-500/5 text-amber-700",
                      item.status === "Belum dikerjakan" && "border-muted-foreground/20 bg-muted/30 text-muted-foreground"
                    )}
                  >
                    <option value="Belum dikerjakan">❌ Belum</option>
                    <option value="Dalam proses">⚡ Proses</option>
                    <option value="Selesai">✅ Selesai</option>
                  </select>
                </td>
                
                {/* AKSI EDIT / HAPUS */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onItemClick(item)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                      title="Buka Detail"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteClick?.(item.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 text-destructive transition-all hover:bg-destructive hover:text-white"
                      title="Hapus Baris"
                    >
                      <Trash2 className="h-4 w-4" />
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
