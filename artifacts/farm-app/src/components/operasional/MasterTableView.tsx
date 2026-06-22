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
      if (!res.ok) throw new Error("Gagal menyimpan");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] }),
    onError: (err: any) => toast({ variant: "destructive", title: "Gagal Simpan", description: err.message }),
  });

  const columns = useMemo<ColumnDef<RichAgronomyItem>[]>(() => [
    {
      id: "aktivitas",
      header: "Aktivitas",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-3 group">
            <div className="flex-1 min-w-0">
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
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
    {
      id: "area",
      header: "Area",
      cell: ({ row }) => <span className="font-medium text-sm">{row.original.area || "—"}</span>,
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
      id: "waktuMulai",
      header: "Mulai",
      cell: ({ row }) => {
        const item = row.original;
        return item.rawDate ? (
          <div className="text-sm text-muted-foreground">
            {new Date(item.rawDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </div>
        ) : "—";
      },
    },
    {
      id: "durasi",
      header: "Durasi",
      cell: ({ row }) => `${row.original.duration || 0} jam`,
    },
    {
      id: "tagCategory",
      header: "Kategori",
      cell: ({ row }) => (
        <EditableCell
          value={row.original.metaEkstra?.tagCategory}
          onSave={(val) => updateMutation.mutate({ id: row.original.id, module: row.original.module, payload: { tagCategory: val } })}
        />
      ),
    },
    {
      id: "pekerja",
      header: "Tim Pekerja",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.workers?.join(", ") || "—"}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onDeleteClick?.(row.original.id)} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ], [updateMutation, onItemClick, onDeleteClick]);

  const table = useReactTable({
    data: items.filter(item => item.module === "perawatan"), // Sementara fokus Perawatan
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