// src/components/operasional/MasterTableView.tsx
import { useMemo } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, type ColumnDef } from "@tanstack/react-table";
import { Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

  const columns = useMemo<ColumnDef<RichAgronomyItem>[]>(() => [
    {
      accessorKey: "title",
      header: "Aktivitas",
      cell: ({ row }) => (
        <EditableCell
          value={row.original.title}
          onSave={(val) => {
            const field = row.original.module === "operasional" ? "namaPekerjaan" : "kegiatan";
            updateMutation.mutate({ id: row.original.id, module: row.original.module, payload: { [field]: val } });
          }}
          className="font-semibold"
        />
      ),
    },
    {
      accessorKey: "area",
      header: "Area",
      cell: ({ row }) => <span className="font-medium">{row.original.area || "—"}</span>,
    },
    {
      accessorKey: "status",
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
      accessorKey: "duration",
      header: "Durasi",
      cell: ({ row }) => `${row.original.duration || 0} jam`,
    },
    // Kolom khusus Inspeksi
    {
      id: "phTanah",
      header: "pH Tanah",
      cell: ({ row }) => row.original.module === "inspeksi" ? (
        <EditableCell
          value={row.original.metaEkstra?.phTanah}
          type="number"
          onSave={(val) => updateMutation.mutate({ id: row.original.id, module: "inspeksi", payload: { phTanah: val } })}
        />
      ) : "—",
    },
    {
      id: "tingkatSerangan",
      header: "Serangan (%)",
      cell: ({ row }) => row.original.module === "inspeksi" ? (
        <EditableCell
          value={row.original.metaEkstra?.tingkatSerangan}
          type="number"
          onSave={(val) => updateMutation.mutate({ id: row.original.id, module: "inspeksi", payload: { tingkatSerangan: val } })}
        />
      ) : "—",
    },
    {
      accessorKey: "notes",
      header: "Catatan",
      cell: ({ row }) => (
        <EditableCell
          value={row.original.notes}
          type="textarea"
          onSave={(val) => {
            const field = row.original.module === "inspeksi" ? "keterangan" : "catatan";
            updateMutation.mutate({ id: row.original.id, module: row.original.module, payload: { [field]: val } });
          }}
        />
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => onItemClick(row.original)}>
            <Eye className="h-4 w-4" />
          </Button>
          {onDeleteClick && (
            <Button variant="ghost" size="sm" onClick={() => onDeleteClick(row.original.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    },
  ], [updateMutation, onItemClick, onDeleteClick]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b bg-muted/30 flex justify-between items-center">
        <div>
          <p className="font-black">Master Agronomy Table</p>
          <p className="text-xs text-muted-foreground">Inline editing • Real-time Supabase</p>
        </div>
        <Badge variant="outline">3 Modul Terintegrasi</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b bg-muted/50">
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b hover:bg-muted/50 transition-colors">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}