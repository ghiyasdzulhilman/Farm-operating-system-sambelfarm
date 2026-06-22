// src/components/perawatan/columns.tsx
import { ColumnDef } from "@tanstack/react-table";
import { Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { EditableCell } from "../agronomy/EditableCell";

// Tipe data mengikuti Drizzle Schema map
export type PerawatanRow = {
  id: string;
  kegiatan: string;
  areaId: string;
  waktuMulai: string;
  waktuSelesai: string | null;
  durasiKerja: number;
  tagCategory: string;
  status: string;
  pekerjaIds: string[]; 
  catatan: string | null;
};

export const getPerawatanColumns = (
  metaData: { areas: { id: string; name: string }[]; workers: { id: string; nama: string }[] },
  onUpdate: (id: string, column: string, val: any) => void,
  onDetail: (row: PerawatanRow) => void,
  onDelete: (id: string) => void
): ColumnDef<PerawatanRow>[] => [
  {
    accessorKey: "kegiatan",
    header: "Kegiatan Perawatan",
    cell: ({ row, getValue }) => (
      <div className="flex items-center justify-between group">
        <div className="flex-1">
          <EditableCell value={getValue()} rowId={row.original.id} columnId="kegiatan" onUpdate={onUpdate} />
        </div>
        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 h-7 w-7 ml-1" onClick={() => onDetail(row.original)}>
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
  {
    accessorKey: "areaId",
    header: "Area",
    cell: ({ row, getValue }) => (
      <EditableCell
        value={getValue()}
        rowId={row.original.id}
        columnId="areaId"
        type="select"
        options={metaData.areas.map((a) => ({ label: a.name, value: a.id }))}
        onUpdate={onUpdate}
      />
    ),
  },
  {
    accessorKey: "waktuMulai",
    header: "Waktu Mulai",
    cell: ({ row, getValue }) => (
      <EditableCell value={getValue()} rowId={row.original.id} columnId="waktuMulai" type="datetime-local" onUpdate={onUpdate} />
    ),
  },
  {
    accessorKey: "durasiKerja",
    header: "Durasi (Jam)",
    cell: ({ row, getValue }) => (
      <EditableCell value={getValue()} rowId={row.original.id} columnId="durasiKerja" type="number" onUpdate={onUpdate} />
    ),
  },
  {
    accessorKey: "tagCategory",
    header: "Kategori",
    cell: ({ row, getValue }) => (
      <EditableCell
        value={getValue()}
        rowId={row.original.id}
        columnId="tagCategory"
        type="select"
        options={[
          { label: "Biologis / POC", value: "Biologis" },
          { label: "Fungisida", value: "Fungisida" },
          { label: "Insektisida", value: "Insektisida" },
          { label: "Olah Tanah", value: "Olah Tanah" }
        ]}
        onUpdate={onUpdate}
      />
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row, getValue }) => (
      <EditableCell
        value={getValue()}
        rowId={row.original.id}
        columnId="status"
        type="select"
        options={[
          { label: "Belum dikerjakan", value: "Belum dikerjakan" },
          { label: "Dalam proses", value: "Dalam proses" },
          { label: "Selesai", value: "Selesai" },
        ]}
        onUpdate={onUpdate}
      />
    ),
  },
  {
    accessorKey: "pekerjaIds",
    header: "Tim Pekerja",
    cell: ({ row }) => {
      // Cast array string secara aman dari JSONB default []
      const selectedIds = (row.getValue("pekerjaIds") as string[]) || [];
      return (
        <Popover>
          <PopoverTrigger asChild>
            <div className="cursor-pointer min-h-[32px] flex flex-wrap gap-1 p-1 hover:bg-muted/50 rounded w-full">
              {selectedIds.length === 0 && <span className="text-muted-foreground text-sm pl-1">Pilih...</span>}
              {selectedIds.map((id) => {
                const worker = metaData.workers.find((w) => w.id === id);
                return <Badge key={id} variant="secondary" className="text-xs">{worker?.nama || "Unknown"}</Badge>;
              })}
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-2">
              {metaData.workers.map((worker) => {
                const isChecked = selectedIds.includes(worker.id);
                return (
                  <div key={worker.id} className="flex items-center space-x-2 p-1 hover:bg-muted rounded">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        const nextIds = checked
                          ? [...selectedIds, worker.id]
                          : selectedIds.filter((id) => id !== worker.id);
                        onUpdate(row.original.id, "pekerjaIds", nextIds);
                      }}
                    />
                    <label className="text-sm font-medium leading-none cursor-pointer w-full">{worker.nama}</label>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-7 w-7" onClick={() => onDelete(row.original.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    ),
  },
];
