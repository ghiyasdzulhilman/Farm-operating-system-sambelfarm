// artifacts/farm-app/src/components/operasional/MasterTableView.tsx
import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { ArrowUpDown, Eye, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { AgronomyItem } from "@/types/operasional";
import { EditableCell } from "./EditableCell"; // Kita buat component ini terpisah

type RichAgronomyItem = AgronomyItem & { metaEkstra?: Record<string, any> };

interface MasterTableViewProps {
  items: RichAgronomyItem[];
  onItemClick: (item: RichAgronomyItem) => void;
  onDeleteClick?: (id: string) => void;
}

export function MasterTableView({ items, onItemClick, onDeleteClick }: MasterTableViewProps) {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Simpan", description: err.message });
    },
  });

  // Column Definitions (Modular)
  const columns = useMemo<ColumnDef<RichAgronomyItem>[]>(() => [
    {
      accessorKey: "title",
      header: "Aktivitas",
      cell: ({ row }) => (
        <EditableCell
          value={row.original.title}
          onSave={(newValue) => {
            const field = row.original.module === "operasional" ? "namaPekerjaan" : "kegiatan";
            updateMutation.mutate({
              id: row.original.id,
              module: row.original.module,
              payload: { [field]: newValue }
            });
          }}
          className="font-bold"
        />
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <EditableCell
          value={row.original.status}
          type="select"
          options={["Belum dikerjakan", "Dalam proses", "Selesai"]}
          onSave={(newValue) => 
            updateMutation.mutate({
              id: row.original.id,
              module: row.original.module,
              payload: { status: newValue }
            })
          }
        />
      ),
    },
    {
      accessorKey: "area",
      header: "Area",
      cell: ({ row }) => <span className="font-medium">{row.original.area || "-"}</span>,
    },
    // Kolom khusus Inspeksi
    {
      id: "phTanah",
      header: "pH Tanah",
      cell: ({ row }) => row.original.module === "inspeksi" ? (
        <EditableCell
          value={row.original.metaEkstra?.phTanah}
          type="number"
          onSave={(newValue) => 
            updateMutation.mutate({
              id: row.original.id,
              module: "inspeksi",
              payload: { phTanah: newValue ? Number(newValue) : null }
            })
          }
        />
      ) : "-",
    },
    // Tambahkan kolom lain sesuai kebutuhan...
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <div className="flex gap-2">
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
    <div className="w-full rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border/60 px-6 py-4 flex justify-between items-center bg-muted/30">
        <div>
          <p className="font-black tracking-tight">Tabel Master Agronomi</p>
          <p className="text-xs text-muted-foreground">Klik sel untuk mengedit • Data real-time dari Supabase</p>
        </div>
        <Badge variant="outline">Supabase Live</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-full divide-y divide-border/40">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-muted/50">
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border/40">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-muted/50 transition-colors">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-6 py-4 text-sm">
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