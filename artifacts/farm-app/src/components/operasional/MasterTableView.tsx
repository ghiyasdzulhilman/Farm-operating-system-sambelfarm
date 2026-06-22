// src/components/operasional/MasterTableView.tsx
import { useMemo } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, type ColumnDef } from "@tanstack/react-table";
import { Eye, Trash2, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { AgronomyItem } from "@/types/operasional";
import { EditableCell } from "./EditableCell";

type RichAgronomyItem = AgronomyItem & { metaEkstra?: Record<string, any> };

export function MasterTableView({ 
  items, 
  onItemClick, 
  onDeleteClick 
}: { 
  items: RichAgronomyItem[]; 
  onItemClick: (item: RichAgronomyItem) => void;
  onDeleteClick?: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 1. Fetch Opsi Master (Area & Pekerja)
  const { data: dropdownOptions } = useQuery({
    queryKey: ["operasional-options-list"],
    queryFn: async () => fetch("/api/notion/operasional-dropdown-options").then(res => res.json())
  });

  const areaOptions = useMemo(() => {
    return (dropdownOptions?.areas || []).map((a: any) => ({ label: a.name, value: a.id }));
  }, [dropdownOptions]);

  const workerOptions = useMemo(() => {
    return (dropdownOptions?.petugas || []).map((p: any) => ({ label: p.name, value: p.id }));
  }, [dropdownOptions]);

  // 2. MUTASI DATA (Update, Tambah Master, Hapus Master)
  const updateMutation = useMutation({
    mutationFn: async ({ id, module, payload }: { id: string; module: string; payload: any }) => {
      const res = await fetch(`/api/notion/edit-activity/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, ...payload }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan perubahan");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] }),
    onError: (err: any) => toast({ variant: "destructive", title: "Gagal Simpan", description: err.message }),
  });

    // Mutasi Area
  const addAreaMutation = useMutation({
    mutationFn: async (name: string) => fetch('/api/notion/areas', { method: 'POST', body: JSON.stringify({ name }), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operasional-options-list"] })
  });
  const deleteAreaMutation = useMutation({
    mutationFn: async (id: string) => fetch(`/api/notion/areas/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operasional-options-list"] })
  });

  // Mutasi Pekerja
  const addPekerjaMutation = useMutation({
    mutationFn: async (nama: string) => fetch('/api/notion/pekerja', { method: 'POST', body: JSON.stringify({ nama }), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operasional-options-list"] })
  });
  const deletePekerjaMutation = useMutation({
    mutationFn: async (id: string) => fetch(`/api/notion/pekerja/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operasional-options-list"] })
  });

  // Mutasi Hapus Baris (Row) Aktivitas
  const deleteActivityMutation = useMutation({
    mutationFn: async ({ id, module }: { id: string; module: string }) => {
      const res = await fetch(`/api/notion/activity/${module}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Gagal menghapus baris");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] })
  });

  // 3. Helper Pengatur Waktu & Tanggal
  const updateDateTime = (item: RichAgronomyItem, field: 'waktuMulai' | 'waktuSelesai', dateStr?: string, timeStr?: string) => {
    // Ambil basis waktu dari metaEkstra atau sekarang
    const baseDate = new Date(item.metaEkstra?.[field] || item.rawDate || new Date());
    
    if (dateStr) {
      const [year, month, day] = dateStr.split('-');
      baseDate.setFullYear(Number(year), Number(month) - 1, Number(day));
    }
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':');
      baseDate.setHours(Number(hours), Number(minutes), 0, 0);
    }
    
    updateMutation.mutate({ id: item.id, module: item.module, payload: { [field]: baseDate.toISOString() } });
  };

  // 4. Definisi Kolom Dinamis
  const columns = useMemo<ColumnDef<RichAgronomyItem>[]>(() => [
    {
      id: "aktivitas",
      header: "Kegiatan / Pekerjaan",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-2 group">
            <div className="flex-1 min-w-[150px]">
              <EditableCell
                value={item.title}
                onSave={(val) => {
                  const field = item.module === "operasional" ? "namaPekerjaan" : "kegiatan";
                  updateMutation.mutate({ id: item.id, module: item.module, payload: { [field]: val } });
                }}
                className="font-semibold"
              />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onItemClick(item)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
            >
              <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
            </Button>
          </div>
        );
      },
    },
    {
      id: "tanggal",
      header: "Tanggal",
      cell: ({ row }) => {
        const item = row.original;
        // Ambil YYYY-MM-DD dari waktuMulai
        const dateValue = item.metaEkstra?.waktuMulai ? new Date(item.metaEkstra.waktuMulai).toISOString().split('T')[0] : "";
        return (
          <EditableCell
            value={dateValue}
            type="date"
            onSave={(val) => {
              if (val) updateDateTime(item, 'waktuMulai', val, undefined);
            }}
          />
        );
      },
    },
    {
      id: "waktu",
      header: "Waktu (Mulai - Akhir)",
      cell: ({ row }) => {
        const item = row.original;
        const startRaw = item.metaEkstra?.waktuMulai ? new Date(item.metaEkstra.waktuMulai) : null;
        const endRaw = item.metaEkstra?.waktuSelesai ? new Date(item.metaEkstra.waktuSelesai) : null;
        
        const startTime = startRaw ? startRaw.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : "";
        const endTime = endRaw ? endRaw.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : "";

        return (
          <div className="flex items-center gap-1 min-w-[140px]">
            <EditableCell
              value={startTime}
              type="time"
              placeholder="00:00"
              className="w-16 text-center px-0"
              onSave={(val) => { if (val) updateDateTime(item, 'waktuMulai', undefined, val); }}
            />
            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            <EditableCell
              value={endTime}
              type="time"
              placeholder="Selesai"
              className="w-16 text-center px-0"
              onSave={(val) => {
                if (val) {
                  // Jika belum ada waktu selesai, samakan tanggalnya dengan waktu mulai
                  const baseDateStr = startRaw ? startRaw.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                  updateDateTime(item, 'waktuSelesai', baseDateStr, val);
                }
              }}
            />
          </div>
        );
      },
    },
    {
      id: "durasi",
      header: "Durasi",
      cell: ({ row }) => {
        const item = row.original;
        let calcHours = 0;
        
        if (item.metaEkstra?.waktuMulai && item.metaEkstra?.waktuSelesai) {
          const msDiff = new Date(item.metaEkstra.waktuSelesai).getTime() - new Date(item.metaEkstra.waktuMulai).getTime();
          calcHours = Math.max(0, msDiff / (1000 * 60 * 60)); // Convert to hours
        } else if (item.metaEkstra?.durasiKerja) {
          calcHours = item.metaEkstra.durasiKerja;
        }

        return (
          <div className="flex items-center gap-1 min-w-[80px]">
            <EditableCell
              value={parseFloat(calcHours.toFixed(1))}
              type="number"
              disabled={true} 
              className="w-12 text-right bg-muted/20 font-medium"
              onSave={() => {}} // Disabled, tidak perlu disave manual
            />
            <span className="text-xs text-muted-foreground">Jam</span>
          </div>
        );
      },
    },
    {
      id: "area",
      header: "Area",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <EditableCell
            value={item.areaId} 
            type="select"
            options={areaOptions}
            placeholder={item.area}
            onSave={(val) => updateMutation.mutate({ id: item.id, module: item.module, payload: { areaId: val } })}
            onAddOption={(newLabel) => addAreaMutation.mutate(newLabel)}
            onDeleteOption={(id) => deleteAreaMutation.mutate(id)}
          />
        );
      },
    },
    {
      id: "tagCategory",
      header: "Kategori",
      cell: ({ row }) => {
        const item = row.original;
        
        // 💡 Inspeksi di-lock
        if (item.module === "inspeksi") {
          return (
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground bg-muted/30 rounded-md w-fit">
              <Lock className="h-3 w-3" />
              <span>{item.category || "Diagnosis"}</span>
            </div>
          );
        }

        const optionsMap: Record<string, string[]> = {
          perawatan: ["Biologis / POC", "Fungisida", "Insektisida", "Olah Tanah", "Lainnya"],
          operasional: ["Penyemprotan", "Panen", "Sanitasi", "Maintenance", "Lainnya"]
        };
        const currentOptions = optionsMap[item.module] || ["Lainnya"];

        return (
          <div className="min-w-[120px]">
            <EditableCell
              value={item.category}
              type="select"
              options={currentOptions}
              onSave={(val) => {
                const field = item.module === "perawatan" ? "tagCategory" : "kategori";
                updateMutation.mutate({ id: item.id, module: item.module, payload: { [field]: val } });
              }}
              // Untuk Kategori, kita bisa biarkan kosong dulu mutasinya, atau handle secara lokal
            />
          </div>
        );
      },
    },
    {
      id: "pekerja",
      header: "Tim Pekerja",
      cell: ({ row }) => {
        const item = row.original;
        // Ambil array ID Pekerja dari metaEkstra, fallback ke string kosong
        const currentWorkerIds = Array.isArray(item.metaEkstra?.pekerjaIds) ? item.metaEkstra.pekerjaIds : [];

        return (
          <div className="min-w-[150px]">
            <EditableCell
              value={currentWorkerIds} 
              type="multi-select"
              options={workerOptions} 
              placeholder="Pilih Pekerja"
              onSave={(nextIds: string[]) => {
                updateMutation.mutate({ id: item.id, module: item.module, payload: { pekerjaIds: nextIds } });
              }}
              onAddOption={(newLabel) => addPekerjaMutation.mutate(newLabel)}
              onDeleteOption={(id) => deletePekerjaMutation.mutate(id)}
            />
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <EditableCell
          value={row.original.status}
          type="select"
          options={["Belum dikerjakan", "Dalam proses", "Selesai"]}
          onSave={(val) => updateMutation.mutate({ id: row.original.id, module: row.original.module, payload: { status: val } })}
        />
      ),
    },
        {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            if (confirm("Yakin ingin menghapus baris data ini?")) {
              deleteActivityMutation.mutate({ id: row.original.id, module: row.original.module });
            }
          }} 
          className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ], [updateMutation, addAreaMutation, deleteAreaMutation, addPekerjaMutation, deletePekerjaMutation, onItemClick, onDeleteClick, areaOptions, workerOptions]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="w-full max-w-full rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden text-left">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b bg-muted/50">
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap border-r last:border-r-0">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center text-muted-foreground text-sm">
                  Tidak ada baris data aktivitas yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b hover:bg-muted/20 transition-colors group divide-x">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-2 py-1 align-middle text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
