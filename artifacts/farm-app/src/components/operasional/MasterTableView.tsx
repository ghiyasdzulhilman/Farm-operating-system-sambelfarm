import { useState } from "react";
import { Eye, Trash2, ChevronDown, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// Tipe data yang diperlebar untuk mengakomodasi data kaya dari Notion
type RichAgronomyItem = AgronomyItem & {
  metaEkstra?: Record<string, any>;
};

export function MasterTableView({ 
  items, 
  onItemClick,
  onDeleteClick 
}: { 
  items: RichAgronomyItem[], 
  onItemClick: (item: RichAgronomyItem) => void,
  onDeleteClick?: (id: string) => void
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // State lokal untuk melacak baris mana yang sedang loading
  const [updatingCell, setUpdatingCell] = useState<{ id: string; key: string } | null>(null);

  // 🧠 MUTASI SPESIFIK STATUS: Sesuai dengan rute PATCH dari backend saat ini
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      setUpdatingCell({ id, key: "status" });
      
      const response = await fetch(`/api/operasional/feed/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Gagal memperbarui database Notion");
      }
      return response.json();
    },
    onMutate: async (variables) => {
      // Optimistic Update: Layar langsung merespons perubahan tanpa menunggu server
      await queryClient.cancelQueries({ queryKey: ["operasional-feed"] });
      const previousData = queryClient.getQueryData(["operasional-feed"]);

      queryClient.setQueryData(["operasional-feed"], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          feed: old.feed.map((item: RichAgronomyItem) => 
            item.id === variables.id ? { ...item, status: variables.newStatus } : item
          )
        };
      });

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Jika gagal, kembalikan tampilan ke data semula
      queryClient.setQueryData(["operasional-feed"], context?.previousData);
      toast({ variant: "destructive", title: "Gagal Sinkronisasi", description: err.message });
    },
    onSuccess: () => {
      toast({ title: "Tersimpan", description: "Status di Notion berhasil diperbarui." });
    },
    onSettled: () => {
      setUpdatingCell(null);
      queryClient.invalidateQueries({ queryKey: ["operasional-feed"] });
    }
  });

  if (items.length === 0) {
    return (
      <div className="py-10 text-center text-muted-foreground font-bold text-sm border border-border/60 rounded-3xl bg-card shadow-sm w-full">
        Tidak ada data aktivitas yang sesuai.
      </div>
    );
  }

  return (
    <div className="w-full max-w-full inline-block align-middle overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
      
      <div className="border-b border-border/60 px-4 py-3 bg-card flex justify-between items-center">
        <div>
          <p className="text-sm font-black tracking-tight">Tabel Master (Mirror Notion)</p>
          <p className="text-[10px] text-muted-foreground">Status progres terhubung langsung dengan database Notion.</p>
        </div>
        <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary font-bold border-primary/20">Synced Status</Badge>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30 font-bold text-muted-foreground">
              <th className="px-4 py-3 font-black uppercase tracking-wider">Aktivitas (Title)</th>
              <th className="px-4 py-3 font-black uppercase tracking-wider">Lokasi Blok</th>
              <th className="px-4 py-3 font-black uppercase tracking-wider">Kategori</th>
              <th className="px-4 py-3 font-black uppercase tracking-wider">Prioritas</th>
              <th className="px-4 py-3 font-black uppercase tracking-wider">Status Progres</th>
              <th className="px-4 py-3 font-black uppercase tracking-wider">Spesifikasi Lapangan</th>
              <th className="px-4 py-3 font-black uppercase tracking-wider text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 bg-card">
            {items.map((item) => {
              const isStatusLoading = updatingCell?.id === item.id && updatingCell?.key === "status";

              return (
                <tr key={item.id} className="transition-colors hover:bg-muted/10 group">
                  
                  {/* 1. KOLOM TITLE: Read-only untuk saat ini */}
                  <td className="px-4 py-3 font-medium min-w-[220px]">
                    <span className="font-bold text-sm truncate block">{item.title}</span>
                  </td>

                  {/* 2. KOLOM AREA BLOK */}
                  <td className="px-4 py-3 text-muted-foreground font-semibold">
                    <span className="px-2 py-1 rounded-md bg-muted/40 border border-border/40 text-[11px] font-bold text-foreground">
                      {item.area || "Semua Area"}
                    </span>
                  </td>

                  {/* 3. KOLOM KATEGORI / TAGS */}
                  <td className="px-4 py-3">
                    <span className="font-bold text-muted-foreground bg-muted/30 border border-border/40 px-2.5 py-1 rounded-full text-[10px] uppercase">
                      {item.category}
                    </span>
                  </td>

                  {/* 4. KOLOM PRIORITAS: Visual Read-only */}
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn(
                      "px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                      item.priority === "High" ? "border-red-500/20 bg-red-500/5 text-red-600" :
                      item.priority === "Low" ? "border-blue-500/20 bg-blue-500/5 text-blue-600" :
                      "border-border bg-background text-foreground"
                    )}>
                      {item.priority}
                    </Badge>
                  </td>

                  {/* 5. KOLOM STATUS PROGRES: INLINE DROPDOWN (LIVE EDIT) */}
                  <td className="px-4 py-2">
                    <div className="relative inline-block w-32">
                      <select
                        value={item.status}
                        onChange={(e) => updateStatusMutation.mutate({ id: item.id, newStatus: e.target.value })}
                        disabled={isStatusLoading || item.isPendingStaging}
                        className={cn(
                          "w-full appearance-none rounded-xl px-2.5 py-1.5 text-[11px] font-bold outline-none border transition-all cursor-pointer shadow-sm pr-7 uppercase tracking-wider",
                          item.status === "Selesai" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20" :
                          item.status === "Dalam proses" ? "border-amber-500/20 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20" :
                          "border-muted-foreground/20 bg-muted/20 text-muted-foreground hover:bg-muted/40",
                          item.isPendingStaging && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <option value="Belum dikerjakan">❌ Belum</option>
                        <option value="Dalam proses">⚡ Proses</option>
                        <option value="Selesai">✅ Selesai</option>
                      </select>
                      {isStatusLoading ? (
                        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-primary" />
                      ) : (
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none opacity-50" />
                      )}
                    </div>
                  </td>

                  {/* 6. KOLOM SPESIFIKASI DATA KAYA DARI NOTION */}
                  <td className="px-4 py-3 min-w-[200px]">
                    <div className="flex flex-wrap gap-1 max-w-[280px]">
                      
                      {/* Ekstraksi dari Form Inspeksi */}
                      {item.module === "inspeksi" && item.metaEkstra?.hst && (
                        <span className="text-[10px] font-bold bg-purple-500/10 text-purple-700 border border-purple-500/10 px-2 py-0.5 rounded-md">
                          {item.metaEkstra.hst} HST
                        </span>
                      )}
                      {item.module === "inspeksi" && item.metaEkstra?.hama?.map((h: string) => (
                        <span key={h} className="text-[10px] font-bold bg-red-500/10 text-red-700 border border-red-500/10 px-2 py-0.5 rounded-md">
                          🪲 {h}
                        </span>
                      ))}

                      {/* Ekstraksi dari Form Perawatan / Nutrisi */}
                      {item.module === "perawatan" && item.duration && (
                        <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-700 border border-indigo-500/10 px-2 py-0.5 rounded-md">
                          ⏱️ {item.duration}
                        </span>
                      )}

                      {/* Fallback info jika data ekstra murni kosong */}
                      {(!item.metaEkstra || Object.keys(item.metaEkstra).length === 0) && (
                        <span className="text-[10px] text-muted-foreground italic">Standard Ops</span>
                      )}
                    </div>
                  </td>

                  {/* 7. AKSI EDIT / HAPUS ROW */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onItemClick(item)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-all hover:bg-muted hover:text-foreground shadow-sm"
                        title="Buka Detail"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteClick?.(item.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 text-destructive transition-all hover:bg-destructive hover:text-white shadow-sm"
                        title="Hapus Baris"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
