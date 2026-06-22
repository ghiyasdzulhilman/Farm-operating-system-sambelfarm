// src/components/operasional/MasterTableView.tsx
import { useMemo } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, type ColumnDef } from "@tanstack/react-table";
import { Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

  // 1. Ambil opsi master (Area & Petugas) langsung dari API internal backend kamu
  const { data: dropdownOptions } = useQuery({
    queryKey: ["operasional-options-list"],
    queryFn: async () => fetch("/api/notion/operasional-dropdown-options").then(res => res.json())
  });

  // Susun opsi area untuk dropdown EditableCell [{ label: "Blok A", value: "uuid" }]
  const areaOptions = useMemo(() => {
    return (dropdownOptions?.areas || []).map((a: any) => ({ label: a.name, value: a.id }));
  }, [dropdownOptions]);

  // Susun opsi pekerja berupa array nama string untuk multi-select
  const workerNames = useMemo<string[]>(() => {
    return (dropdownOptions?.petugas || []).map((p: any) => p.name) || [];
  }, [dropdownOptions]);

  // 2. Mutation Universal untuk edit data via API PATCH kamu
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
      id: "aktivitas",
      header: "Aktivitas",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-2 group">
            <div className="flex-1 min-w-0">
              <EditableCell
                value={item.title}
                onSave={(val) => {
                  // Dinamis menetapkan camelCase field Drizzle ORM
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
              <Eye className="h-4 w-4" />
            </Button>
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
          />
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
      id: "waktuMulai",
      header: "Mulai",
      cell: ({ row }) => {
        const item = row.original;
        const dateValue = item.rawDate ? new Date(item.rawDate).toISOString().slice(0, 16) : "";
        return (
          <EditableCell
            value={dateValue}
            type="datetime-local"
            onSave={(val) => {
              if (val) {
                // Kirim format ISO String murni yang disukai Postgres Timestamp
                updateMutation.mutate({ id: item.id, module: item.module, payload: { waktuMulai: new Date(val).toISOString() } });
              }
            }}
          />
        );
      },
    },
    {
      id: "durasi",
      header: "Durasi",
      cell: ({ row }) => {
        const item = row.original;
        const rawHours = typeof item.duration === "string" ? parseInt(item.duration) || 0 : item.duration;
        return (
          <EditableCell
            value={rawHours}
            type="number"
            onSave={(val) => updateMutation.mutate({ id: item.id, module: item.module, payload: { durasiKerja: val } })}
          />
        );
      },
    },
    {
      id: "tagCategory",
      header: "Kategori",
      cell: ({ row }) => {
        const item = row.original;
        const optionsMap: Record<string, string[]> = {
          perawatan: ["Biologis / POC", "Fungisida", "Insektisida", "Olah Tanah"],
          inspeksi: ["Diagnosis", "Rutin"],
          operasional: ["Penyemprotan", "Panen", "Sanitasi", "Maintenance", "Lainnya"]
        };
        const currentOptions = optionsMap[item.module] || ["Lainnya"];

        return (
          <EditableCell
            value={item.category}
            type="select"
            options={currentOptions}
            onSave={(val) => {
              // Menyesuaikan penamaan field camelCase database Drizzle per tabel modul
              const field = item.module === "perawatan" ? "tagCategory" : "kategori";
              updateMutation.mutate({ id: item.id, module: item.module, payload: { [field]: val } });
            }}
          />
        );
      },
    },
    {
      id: "pekerja",
      header: "Tim Pekerja",
      cell: ({ row }) => {
        const item = row.original;
        const currentWorkerNames = Array.isArray(item.workers) ? item.workers : [];

        return (
          <EditableCell
            value={currentWorkerNames} 
            type="multi-select"
            options={workerNames} 
            placeholder="Pilih Pekerja"
            onSave={(nextNames: string[]) => {
              // Memetakan balik array nama dari UI menjadi array UUID asli sebelum dikirim ke Drizzle
              const nextIds = nextNames.map(name => {
                const matched = dropdownOptions?.petugas?.find((p: any) => p.name === name);
                return matched ? matched.id : null;
              }).filter(Boolean);

              updateMutation.mutate({ id: item.id, module: item.module, payload: { pekerjaIds: nextIds } });
            }}
          />
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onDeleteClick?.(row.original.id)} className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0">
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ], [updateMutation, onItemClick, onDeleteClick, areaOptions, workerNames, dropdownOptions]);

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden text-left">
      <div className="px-6 py-4 border-b bg-muted/30 flex justify-between items-center">
        <div>
          <p className="font-black tracking-tight">Tabel Monitor Aktivitas</p>
          <p className="text-xs text-muted-foreground">Klik teks untuk edit secara instan ala Notion • Perubahan otomatis tersinkronisasi</p>
        </div>
        <Badge variant="outline" className="capitalize">Mode Tabel Aktif</Badge>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
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
