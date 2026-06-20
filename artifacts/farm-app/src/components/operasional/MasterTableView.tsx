import { useState } from "react";
import { 
  Eye, Trash2, ChevronDown, Loader2, 
  Calendar, Clock, MapPin, Users, FileText, Bug
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { AgronomyItem } from "@/types/operasional";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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
  
  // State untuk melacak sel mana yang sedang dalam mode edit (baris_id + nama_kolom)
  const [activeCell, setActiveCell] = useState<{ id: string; field: string } | null>(null);
  const [cellValue, setCellValue] = useState<string>("");

  // Mutasi Universal untuk semua perubahan sel tabel (termasuk status)
  const updateActivityMutation = useMutation({
    mutationFn: async ({ id, module, payload }: { id: string; module: string; payload: any }) => {
      const response = await fetch(`/api/notion/edit-activity/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, ...payload }),
      });
      if (!response.ok) throw new Error("Gagal menyimpan data");
      return response.json();
    },
    onSuccess: () => {
      // Refresh data di background agar tabel sinkron dengan database
      queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] });
      setActiveCell(null);
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Gagal Simpan", description: err.message });
      setActiveCell(null);
    }
  });

  // Handler saat selesai mengetik di sel (onBlur / Enter)
  const handleCellSave = (item: RichAgronomyItem, field: string) => {
    if (activeCell?.id !== item.id || activeCell?.field !== field) return;
    
    const payload: any = {};
    if (field === "title") payload[item.module === "operasional" ? "namaPekerjaan" : "kegiatan"] = cellValue;
    if (field === "phTanah") payload.phTanah = cellValue ? Number(cellValue) : null;
    if (field === "tingkatSerangan") payload.tingkatSerangan = cellValue ? Number(cellValue) : null;
    if (field === "tagCategory") payload.tagCategory = cellValue;
    if (field === "jenisTenagaKerja") payload.jenisTenagaKerja = cellValue;

    updateActivityMutation.mutate({ id: item.id, module: item.module, payload });
  };

  // Helper untuk membersihkan catatan dari embel-embel "Detail Kendala" saat mode edit
  const getCleanCatatan = (item: RichAgronomyItem) => {
    return (item.notes || "").split("\n\n⚠️ Detail Kendala:")[0];
  };

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
          <p className="text-sm font-black tracking-tight">Tabel Induk Agronomi</p>
          <p className="text-[10px] text-muted-foreground">Tap pada teks di dalam baris tabel untuk mengedit sel layaknya Notion.</p>
        </div>
        <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary font-bold border-primary/20">Supabase Synced</Badge>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[1200px] border-collapse text-left text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30 font-bold text-muted-foreground">
              <th className="px-4 py-3 font-black uppercase tracking-wider w-[220px]">Aktivitas (Judul)</th>
              <th className="px-4 py-3 font-black uppercase tracking-wider">Status & Prioritas</th>
              <th className="px-4 py-3 font-black uppercase tracking-wider">Modul & Area</th>
              <th className="px-4 py-3 font-black uppercase tracking-wider w-[100px]">pH Tanah</th>
              <th className="px-4 py-3 font-black uppercase tracking-wider w-[100px]">Serangan</th>
              <th className="px-4 py-3 font-black uppercase tracking-wider w-[150px]">Kategori / Tenaga</th>
              <th className="px-4 py-3 font-black uppercase tracking-wider w-[250px]">Catatan Lapangan</th>
              <th className="px-4 py-3 font-black uppercase tracking-wider text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 bg-card">
            {items.map((item) => {
              const isUpdating = updateActivityMutation.isPending && updateActivityMutation.variables?.id === item.id;

              return (
                <tr key={item.id} className="transition-colors hover:bg-muted/10 group">
                  
                  {/* 1. KOLOM JUDUL AKTIVITAS (INLINE EDIT) */}
                  <td className="px-4 py-3 min-w-[220px]">
                    <div className="flex flex-col gap-1.5 w-full">
                      <div 
                        className="cursor-text hover:bg-muted/40 p-1 -ml-1 rounded transition-colors w-full"
                        onClick={() => { if(activeCell?.id !== item.id || activeCell?.field !== "title") { setActiveCell({ id: item.id, field: "title" }); setCellValue(item.title); } }}
                      >
                        {activeCell?.id === item.id && activeCell?.field === "title" ? (
                          <input autoFocus type="text" value={cellValue} onChange={(e) => setCellValue(e.target.value)} onBlur={() => handleCellSave(item, "title")} onKeyDown={(e) => e.key === "Enter" && handleCellSave(item, "title")} className="font-bold text-sm bg-transparent border-b border-primary outline-none w-full" />
                        ) : (
                          <span className="font-bold text-sm truncate block w-full">{item.title}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium pl-1">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3 opacity-70"/> {item.dateLabel}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3 opacity-70"/> {item.time}</span>
                      </div>
                    </div>
                  </td>

                  {/* 2. KOLOM STATUS & PRIORITAS (INTERAKTIF) */}
                  <td className="px-4 py-3 w-[160px]">
                    <div className="flex flex-col items-start gap-2">
                      <div className="relative w-full max-w-[140px]">
                        <select
                          value={item.status}
                          onChange={(e) => updateActivityMutation.mutate({ id: item.id, module: item.module, payload: { status: e.target.value } })}
                          disabled={isUpdating}
                          className={cn(
                            "w-full appearance-none rounded-xl px-2.5 py-1.5 text-[11px] font-bold outline-none border transition-all cursor-pointer shadow-sm pr-7 uppercase tracking-wider",
                            item.status === "Selesai" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" :
                            item.status === "Dalam proses" ? "border-amber-500/20 bg-amber-500/10 text-amber-700" :
                            "border-muted-foreground/20 bg-muted/20 text-muted-foreground"
                          )}
                        >
                          <option value="Belum dikerjakan">❌ Belum</option>
                          <option value="Dalam proses">⚡ Proses</option>
                          <option value="Selesai">✅ Selesai</option>
                        </select>
                        {isUpdating ? (
                          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-primary" />
                        ) : (
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none opacity-50" />
                        )}
                      </div>
                      
                      {/* Edit Prioritas Langsung */}
                      <select
                        value={item.priority || "Medium"}
                        onChange={(e) => updateActivityMutation.mutate({ id: item.id, module: item.module, payload: { prioritas: e.target.value } })}
                        className={cn(
                          "appearance-none bg-transparent outline-none cursor-pointer px-2 py-0 text-[9px] font-bold uppercase tracking-wider border rounded-md",
                          item.priority === "High" ? "border-red-500/20 bg-red-500/5 text-red-600" :
                          item.priority === "Low" ? "border-blue-500/20 bg-blue-500/5 text-blue-600" :
                          "border-border bg-background text-foreground"
                        )}
                      >
                        <option value="High">HIGH Priority</option>
                        <option value="Medium">MEDIUM Priority</option>
                        <option value="Low">LOW Priority</option>
                      </select>
                    </div>
                  </td>

                  {/* 3. KOLOM MODUL & AREA (READ-ONLY) */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 rounded-sm bg-muted">{item.module}</Badge>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                        <MapPin className="h-3 w-3 text-primary" /> {item.area || "-"}
                      </span>
                    </div>
                  </td>

                  {/* 4. KOLOM pH TANAH (INLINE EDIT - Spesifik Inspeksi) */}
                  <td className="px-4 py-3 w-[100px]">
                    {item.module === "inspeksi" ? (
                      <div 
                        onClick={() => { if(activeCell?.id !== item.id || activeCell?.field !== "phTanah") { setActiveCell({ id: item.id, field: "phTanah" }); setCellValue(String(item.metaEkstra?.phTanah || "")); } }}
                        className="cursor-pointer hover:bg-muted/40 p-1.5 rounded transition-colors text-emerald-600 font-black text-sm"
                      >
                        {activeCell?.id === item.id && activeCell?.field === "phTanah" ? (
                          <input autoFocus type="number" step="0.1" value={cellValue} onChange={(e) => setCellValue(e.target.value)} onBlur={() => handleCellSave(item, "phTanah")} onKeyDown={(e) => e.key === "Enter" && handleCellSave(item, "phTanah")} className="w-[50px] bg-transparent border-b border-emerald-600 outline-none p-0" />
                        ) : (
                          item.metaEkstra?.phTanah || "-"
                        )}
                      </div>
                    ) : <span className="text-muted-foreground opacity-50">-</span>}
                  </td>

                  {/* 5. KOLOM SERANGAN (INLINE EDIT - Spesifik Inspeksi) */}
                  <td className="px-4 py-3 w-[100px]">
                    {item.module === "inspeksi" ? (
                      <div 
                        onClick={() => { if(activeCell?.id !== item.id || activeCell?.field !== "tingkatSerangan") { setActiveCell({ id: item.id, field: "tingkatSerangan" }); setCellValue(String(item.metaEkstra?.tingkatSerangan || "")); } }}
                        className="cursor-pointer hover:bg-muted/40 p-1.5 rounded transition-colors text-destructive font-black text-sm"
                      >
                        {activeCell?.id === item.id && activeCell?.field === "tingkatSerangan" ? (
                          <input autoFocus type="number" value={cellValue} onChange={(e) => setCellValue(e.target.value)} onBlur={() => handleCellSave(item, "tingkatSerangan")} onKeyDown={(e) => e.key === "Enter" && handleCellSave(item, "tingkatSerangan")} className="w-[50px] bg-transparent border-b border-destructive outline-none p-0" />
                        ) : (
                          item.metaEkstra?.tingkatSerangan ? `${item.metaEkstra.tingkatSerangan}%` : "-"
                        )}
                      </div>
                    ) : <span className="text-muted-foreground opacity-50">-</span>}
                  </td>

                  {/* 6. KOLOM KATEGORI / TENAGA (INLINE EDIT - Perawatan & Operasional) */}
                  <td className="px-4 py-3 w-[150px]">
                    {item.module === "perawatan" && (
                       <div onClick={() => { if(activeCell?.id !== item.id || activeCell?.field !== "tagCategory") { setActiveCell({ id: item.id, field: "tagCategory" }); setCellValue(item.metaEkstra?.tagCategory || ""); } }} className="cursor-pointer hover:bg-muted/40 p-1.5 rounded transition-colors font-bold text-[11px] text-primary">
                         {activeCell?.id === item.id && activeCell?.field === "tagCategory" ? (
                           <input autoFocus type="text" value={cellValue} onChange={(e) => setCellValue(e.target.value)} onBlur={() => handleCellSave(item, "tagCategory")} onKeyDown={(e) => e.key === "Enter" && handleCellSave(item, "tagCategory")} className="w-full bg-transparent border-b border-primary outline-none" />
                         ) : (item.metaEkstra?.tagCategory || "Nutrisi")}
                       </div>
                    )}
                    {item.module === "operasional" && (
                       <div onClick={() => { if(activeCell?.id !== item.id || activeCell?.field !== "jenisTenagaKerja") { setActiveCell({ id: item.id, field: "jenisTenagaKerja" }); setCellValue(item.metaEkstra?.jenisTenagaKerja || ""); } }} className="cursor-pointer hover:bg-muted/40 p-1.5 rounded transition-colors font-bold text-[11px] text-blue-600">
                         {activeCell?.id === item.id && activeCell?.field === "jenisTenagaKerja" ? (
                           <input autoFocus type="text" value={cellValue} onChange={(e) => setCellValue(e.target.value)} onBlur={() => handleCellSave(item, "jenisTenagaKerja")} onKeyDown={(e) => e.key === "Enter" && handleCellSave(item, "jenisTenagaKerja")} className="w-full bg-transparent border-b border-blue-600 outline-none" />
                         ) : (item.metaEkstra?.jenisTenagaKerja || "Harian")}
                       </div>
                    )}
                    {item.module === "inspeksi" && <span className="text-muted-foreground opacity-50 pl-1.5">-</span>}
                  </td>

                  {/* 7. KOLOM CATATAN (INLINE EDIT) */}
                  <td className="px-4 py-3 w-[250px]">
                    <div className="flex flex-col gap-1 max-w-[280px]">
                      {/* Render Badge Kendala jika ada (Read-only) */}
                      {item.module === "inspeksi" && (item.metaEkstra?.hama?.length > 0 || item.metaEkstra?.penyakit?.length > 0) && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {item.metaEkstra.hama?.map((h: string) => <Badge key={h} variant="destructive" className="text-[9px] px-1 py-0 bg-red-500/10 text-red-700 border-red-500/20">🪲 {h}</Badge>)}
                          {item.metaEkstra.penyakit?.map((p: string) => <Badge key={p} variant="destructive" className="text-[9px] px-1 py-0 bg-orange-500/10 text-orange-700 border-orange-500/20">🦠 {p}</Badge>)}
                        </div>
                      )}
                      
                      {/* Area Edit Catatan */}
                      {activeCell?.id === item.id && activeCell?.field === "catatan" ? (
                        <textarea 
                          autoFocus rows={2} value={cellValue} 
                          onChange={(e) => setCellValue(e.target.value)} 
                          onBlur={() => {
                            const payload: any = {};
                            payload[item.module === "inspeksi" ? "keterangan" : "catatan"] = cellValue;
                            updateActivityMutation.mutate({ id: item.id, module: item.module, payload });
                            setActiveCell(null);
                          }} 
                          className="w-full text-[11px] bg-background border border-primary/50 rounded p-1.5 outline-none resize-none shadow-sm" 
                        />
                      ) : (
                        <p 
                          onClick={() => { setActiveCell({ id: item.id, field: "catatan" }); setCellValue(getCleanCatatan(item)); }}
                          className="text-[11px] text-muted-foreground line-clamp-2 cursor-pointer hover:bg-muted/40 p-1 -ml-1 rounded transition-colors"
                          title={getCleanCatatan(item)}
                        >
                          <FileText className="inline h-3 w-3 mr-1 opacity-70" />
                          {getCleanCatatan(item) || "Tap untuk tambah catatan..."}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* 8. AKSI BUKA DETAIL / HAPUS */}
                  <td className="px-4 py-3 text-right align-middle">
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
