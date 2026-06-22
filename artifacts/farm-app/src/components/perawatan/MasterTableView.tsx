// src/components/perawatan/MasterTableView.tsx
import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase"; 
import { EditableCell } from "../agronomy/EditableCell"; 

// Sesuaikan type data dengan interface aslimu
type RichAgronomyItem = any; 

interface MasterTableViewProps {
  items: RichAgronomyItem[];
  onItemClick: (item: RichAgronomyItem) => void;
  onDeleteClick?: (id: string) => void;
}

export function MasterTableView({ items, onItemClick, onDeleteClick }: MasterTableViewProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch data referensi master (Areas & Workers) untuk mengisi dropdown opsi
  const { data: areas = [] } = useQuery({
    queryKey: ["areas-options"],
    queryFn: async () => {
      const { data } = await supabase.from("areas").select("id, name");
      return (data || []).map(a => ({ label: a.name, value: a.id }));
    }
  });

  const { data: workers = [] } = useQuery({
    queryKey: ["workers-options"],
    queryFn: async () => {
      const { data } = await supabase.from("pekerja").select("id, nama");
      return (data || []).map(w => ({ label: w.nama, value: w.id }));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, module, payload }: { id: string; module: string; payload: any }) => {
      const res = await fetch(`/api/notion/edit-activity/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module, ...payload }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan data");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] }),
    onError: (err: any) => toast({ variant: "destructive", title: "Gagal Simpan", description: err.message }),
  });

  const columns = useMemo<ColumnDef<RichAgronomyItem>[]>(() => [
    {
      id: "kegiatan",
      header: "Kegiatan Perawatan",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-3 group">
            <div className="flex-1 min-w-0">
              <EditableCell
                value={item.title || item.kegiatan}
                onSave={(val) => updateMutation.mutate({ id: item.id, module: item.module, payload: { kegiatan: val } })}
                className="font-semibold"
              />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onItemClick(item)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
    {
      id: "areaId",
      header: "Area",
      cell: ({ row }) => (
        <EditableCell
          value={row.original.areaId} 
          type="select"
          options={areas}
          placeholder="Pilih Area..."
          onSave={(val) => updateMutation.mutate({ id: row.original.id, module: row.original.module, payload: { areaId: val } })}
        />
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => (
        <EditableCell
          value={row.original.status}
          type="select"
          options={[
            { label: "Belum dikerjakan", value: "Belum dikerjakan" },
            { label: "Dalam proses", value: "Dalam proses" },
            { label: "Selesai", value: "Selesai" }
          ]}
          onSave={(val) => updateMutation.mutate({ id: row.original.id, module: row.original.module, payload: { status: val } })}
        />
      ),
    },
    {
      id: "waktuMulai",
      header: "Waktu Mulai",
      cell: ({ row }) => {
        // Konversi ISO string ke format datetime-local input
        const dateValue = row.original.waktuMulai ? new Date(row.original.waktuMulai).toISOString().slice(0, 16) : "";
        return (
          <EditableCell
            value={dateValue}
            type="datetime-local"
            onSave={(val) => {
              if (val) {
                updateMutation.mutate({ id: row.original.id, module: row.original.module, payload: { waktuMulai: new Date(val).toISOString() } });
              }
            }}
          />
        );
      },
    },
    {
      id: "durasiKerja",
      header: "Durasi (Jam)",
      cell: ({ row }) => (
        <EditableCell
          value={row.original.durasiKerja || 0}
          type="number"
          onSave={(val) => updateMutation.mutate({ id: row.original.id, module: row.original.module, payload: { durasiKerja: val } })}
        />
      ),
    },
    {
      id: "tagCategory",
      header: "Kategori",
      cell: ({ row }) => (
        <EditableCell
          value={row.original.metaEkstra?.tagCategory || row.original.tagCategory}
          type="select"
          options={["Biologis / POC", "Fungisida", "Insektisida", "Olah Tanah", "Lainnya"]} 
          onSave={(val) => updateMutation.mutate({ id: row.original.id, module: row.original.module, payload: { tagCategory: val } })}
        />
      ),
    },
    {
      id: "pekerjaIds",
      header: "Tim Pekerja",
      cell: ({ row }) => (
        <EditableCell
          value={row.original.pekerjaIds || []} 
          type="multi-select"
          options={workers}
          placeholder="Pilih Pekerja..."
          onSave={(val) => updateMutation.mutate({ id: row.original.id, module: row.original.module, payload: { pekerjaIds: val } })}
        />
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onDeleteClick?.(row.original.id)} className="text-destructive hover:bg-destructive/10 h-8 w-8">
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ], [updateMutation, onItemClick, onDeleteClick, areas, workers]);

  // Filter prop item untuk memastikan hanya data perawatan yang dirender
  const tableData = useMemo(() => items.filter(item => item.module === "perawatan"), [items]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b bg-muted/30 flex justify-between items-center">
        <div>
          <p className="font-black tracking-tight">Tabel Perawatan</p>
          <p className="text-xs text-muted-foreground">Klik teks untuk edit • Klik icon mata untuk detail</p>
        </div>
        <Badge variant="outline">Perawatan Module</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b bg-muted/50">
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
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
                  Tidak ada data perawatan yang ditemukan.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b hover:bg-muted/50 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-6 py-2 align-middle">
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
