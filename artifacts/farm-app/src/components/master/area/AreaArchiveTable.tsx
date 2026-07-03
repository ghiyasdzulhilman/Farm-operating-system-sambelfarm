import { useMemo } from "react";
import { Leaf, CalendarDays, Map, Activity, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AreaArchiveTableProps {
  areas: any[];
  allSiklus: any[];
  searchQuery: string;
}

export function AreaArchiveTable({ areas, allSiklus, searchQuery }: AreaArchiveTableProps) {
  
  // 1. OLAH DATA: Filter, Gabung (Join), dan Urutkan
  const tableData = useMemo(() => {
    return allSiklus
      // Ambil yang sudah beres saja
      .filter((siklus) => siklus.status !== "Aktif")
      // Tempelkan nama area dari master
      .map((siklus) => {
        const parentArea = areas.find((a) => a.id === siklus.areaId);
        // Buang embel-embel " - " kalau ada
        const cleanAreaName = parentArea?.name?.includes(" - ") 
          ? parentArea.name.split(" - ")[0].trim() 
          : parentArea?.name || "Area Dihapus";
          
        return { ...siklus, areaName: cleanAreaName };
      })
      // Terapkan kotak pencarian (cari nama area ATAU nama tanaman)
      .filter((item) => 
        item.areaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.namaSiklus.toLowerCase().includes(searchQuery.toLowerCase())
      )
      // Urutkan dari siklus yang paling baru diakhiri (asumsi dari tanggal tanam kalau tgl selesai belum ada)
      .sort((a, b) => new Date(b.tanggalPindahTanam).getTime() - new Date(a.tanggalPindahTanam).getTime());
  }, [allSiklus, areas, searchQuery]);

  return (
    <div className="w-full max-w-full rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden text-left animate-in fade-in duration-300">
      
      {/* 💡 HEADER TABEL (Meniru gaya MasterTableView lu) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
        <div className="flex flex-col">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Riwayat Arsip Tanam
          </h2>
          <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
            Menampilkan {tableData.length} siklus yang telah selesai
          </span>
        </div>
      </div>

      {/* 💡 BODY TABEL */}
      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-muted/50">
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/40 w-1/4">
                Nama Area
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/40 w-1/3">
                Komoditas / Tanaman
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/40">
                Tanggal Tanam
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Status Akhir
              </th>
            </tr>
          </thead>
          <tbody>
            {tableData.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Activity className="h-8 w-8 opacity-20 mb-2" />
                    <p className="text-sm font-semibold">Tidak ada arsip yang ditemukan.</p>
                    <p className="text-xs opacity-70">Siklus yang telah diakhiri akan muncul di sini.</p>
                  </div>
                </td>
              </tr>
            ) : (
              tableData.map((row) => (
                <tr key={row.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors group divide-x divide-border/40">
                  
                  {/* Kolom 1: Area */}
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Map className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      {row.areaName}
                    </div>
                  </td>
                  
                  {/* Kolom 2: Tanaman */}
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <Leaf className="h-4 w-4 text-emerald-600/50" />
                      {row.namaSiklus}
                    </div>
                  </td>
                  
                  {/* Kolom 3: Tanggal */}
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 opacity-60" />
                      {new Date(row.tanggalPindahTanam).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                  </td>

                  {/* Kolom 4: Status (Badge statis seperti di MasterTableView) */}
                  <td className="px-4 py-3 align-middle">
                    <div className="inline-flex items-center px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-500/10 border border-slate-500/20 rounded-md">
                      {row.status}
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}
