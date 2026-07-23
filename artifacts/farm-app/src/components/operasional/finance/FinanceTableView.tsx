import React, { useMemo, useState } from "react";
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from "@tanstack/react-table";
import { Columns3, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface FinanceTableViewProps {
  items: any[];
  onDelete: (id: string, module: string) => void;
}

// 🚀 FORMATTER ANGKA & RUPIAH
const formatRupiah = (angka: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(angka || 0);

const formatAngka = (angka: any) =>
  new Intl.NumberFormat("id-ID").format(Number(angka) || 0);

// 🚀 KAMUS LABEL KOLOM
const LABELS_PENGELUARAN: Record<string, string> = {
  tanggal: "Tanggal",
  kategori: "Kategori",
  namaItem: "Nama Item",
  qty: "Qty",
  hargaSatuan: "Harga Satuan",
  totalBiaya: "Total Biaya",
  aksi: "Aksi",
};

const LABELS_PANEN: Record<string, string> = {
  tanggal: "Tanggal",
  areaSiklus: "Area & Siklus",
  kegiatan: "Kegiatan",
  kuantitas: "Kuantitas",
  hargaJual: "Harga Jual / Kg",
  totalPendapatan: "Total Pendapatan",
  aksi: "Aksi",
};

// 🚀 KOMPONEN HELPER: BENTO TABLE (Biar nggak nulis ulang UI dua kali)
function BentoTable({
  title,
  data,
  columns,
  columnLabels,
}: {
  title: string;
  data: any[];
  columns: ColumnDef<any>[];
  columnLabels: Record<string, string>;
}) {
  const [columnVisibility, setColumnVisibility] = useState({});

  const table = useReactTable({
    data,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full max-w-full rounded-[1.5rem] border border-border/50 bg-card/80 backdrop-blur-md shadow-[0_8px_30px_-4px_rgba(0,0,0,0.05)] overflow-hidden text-left transition-all duration-300">
      
      {/* HEADER CARD & DROPDOWN FILTER KOLOM */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 bg-muted/30 backdrop-blur-sm">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-foreground/90">
          {title}
        </h2>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8.5 gap-2 rounded-xl bg-background/80 hover:bg-background border-border/50 text-[11px] font-bold tracking-wider text-muted-foreground hover:text-primary shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all">
              <Columns3 className="h-3.5 w-3.5" />
              KOLOM
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-lg border-border/60">
            <div className="px-2 py-1.5 mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase border-b border-border/50">
               Filter Kolom
            </div>
            
            <div className="flex flex-col gap-0.5">
              {table.getAllLeafColumns().map(column => {
                const isChecked = column.getIsVisible();
                return (
                  <DropdownMenuItem
                    key={column.id}
                    onSelect={(e) => {
                      e.preventDefault();
                      column.toggleVisibility(!isChecked);
                    }}
                    className={`flex items-center justify-between text-xs cursor-pointer py-2 px-3 rounded-lg transition-colors focus:bg-primary/10 focus:!text-primary ${isChecked ? 'text-primary !text-primary font-bold' : 'text-foreground font-medium'}`}
                  >
                    <span>{columnLabels[column.id] || column.id}</span>
                    <div className={`flex h-4 w-4 items-center justify-center rounded-[4px] border transition-all ${isChecked ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40 bg-background'}`}>
                      {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ISI TABEL */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b border-border/40 bg-muted/60 backdrop-blur-sm">
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 whitespace-nowrap">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b border-border/40 hover:bg-muted/40 transition-all duration-200 group">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-3 py-1.5 align-middle text-sm">
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

// 🚀 KOMPONEN UTAMA
export const FinanceTableView: React.FC<FinanceTableViewProps> = ({ items, onDelete }) => {
  const pengeluaran = items.filter((i) => i.module === "pengeluaran");
  const panen = items.filter((i) => i.module === "panen");

  // 💡 DEFINISI KOLOM PENGELUARAN
  const pengeluaranCols = useMemo<ColumnDef<any>[]>(() => [
    {
      id: "tanggal",
      header: "Tanggal",
      cell: ({ row }) => <div className="font-medium text-muted-foreground">{new Date(row.original.rawDate).toLocaleDateString("id-ID")}</div>
    },
    {
      id: "kategori",
      header: "Kategori",
      cell: ({ row }) => (
        <span className="bg-muted text-muted-foreground px-2.5 py-1 rounded-md text-xs font-semibold">
          {row.original.category}
        </span>
      )
    },
    {
      id: "namaItem",
      header: "Nama Item",
      cell: ({ row }) => <div className="font-bold text-foreground/90">{row.original.title}</div>
    },
    {
      id: "qty",
      header: () => <div className="text-right w-full">Qty</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-muted-foreground whitespace-nowrap">
          {formatAngka(row.original.metaEkstra?.kuantitas || 1)} {row.original.metaEkstra?.satuanKerja}
        </div>
      )
    },
    {
      id: "hargaSatuan",
      header: () => <div className="text-right w-full">Harga Satuan</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-muted-foreground whitespace-nowrap">
          {formatRupiah(Number(row.original.metaEkstra?.hargaSatuan))}
        </div>
      )
    },
    {
      id: "totalBiaya",
      header: () => <div className="text-right w-full">Total Biaya</div>,
      cell: ({ row }) => (
        <div className="text-right font-black text-foreground/90 whitespace-nowrap">
          {formatRupiah(row.original.metaEkstra?.totalBiaya)}
        </div>
      )
    },
    {
      id: "aksi",
      header: () => <div className="text-center w-full">Aksi</div>,
      cell: ({ row }) => (
        <div className="flex justify-center w-full">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onDelete(row.original.id, "pengeluaran")}
            className="text-destructive/30 group-hover:text-destructive group-hover:opacity-100 transition-all duration-200 h-8 w-8 p-0 hover:bg-destructive/10 hover:scale-105 rounded-lg"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  ], [onDelete]);

  // 💡 DEFINISI KOLOM PANEN
  const panenCols = useMemo<ColumnDef<any>[]>(() => [
    {
      id: "tanggal",
      header: "Tanggal",
      cell: ({ row }) => <div className="font-medium text-muted-foreground">{new Date(row.original.rawDate).toLocaleDateString("id-ID")}</div>
    },
    {
      id: "areaSiklus",
      header: "Area & Siklus",
      cell: ({ row }) => (
        <div>
          <div className="font-bold text-foreground/90">{row.original.area}</div>
          <div className="text-[11px] font-medium text-muted-foreground mt-0.5">{row.original.namaSiklus}</div>
        </div>
      )
    },
    {
      id: "kegiatan",
      header: "Kegiatan",
      cell: ({ row }) => <div className="font-bold text-foreground/90">{row.original.title}</div>
    },
    {
      id: "kuantitas",
      header: () => <div className="text-right w-full">Kuantitas</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-muted-foreground whitespace-nowrap">
          {formatAngka(row.original.metaEkstra?.kuantitasKg)} Kg
        </div>
      )
    },
    {
      id: "hargaJual",
      header: () => <div className="text-right w-full">Harga Jual / Kg</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-muted-foreground whitespace-nowrap">
          {formatRupiah(row.original.metaEkstra?.hargaJualPerKg)}
        </div>
      )
    },
    {
      id: "totalPendapatan",
      header: () => <div className="text-right w-full">Total Pendapatan</div>,
      cell: ({ row }) => (
        <div className="text-right font-black text-foreground/90 whitespace-nowrap">
          {formatRupiah(row.original.metaEkstra?.totalPendapatan)}
        </div>
      )
    },
    {
      id: "aksi",
      header: () => <div className="text-center w-full">Aksi</div>,
      cell: ({ row }) => (
        <div className="flex justify-center w-full">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onDelete(row.original.id, "panen")}
            className="text-destructive/30 group-hover:text-destructive group-hover:opacity-100 transition-all duration-200 h-8 w-8 p-0 hover:bg-destructive/10 hover:scale-105 rounded-lg"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    },
  ], [onDelete]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 🟢 SAKLAR KOSONG TOTAL */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-muted/30 rounded-[1.5rem] border-2 border-dashed border-border/50">
          <p className="text-muted-foreground font-medium">
            Tidak ada data keuangan yang ditemukan untuk filter saat ini.
          </p>
        </div>
      )}

      {/* 🔴 TABEL PENGELUARAN */}
      {pengeluaran.length > 0 && (
        <BentoTable
          title="Pengeluaran"
          data={pengeluaran}
          columns={pengeluaranCols}
          columnLabels={LABELS_PENGELUARAN}
        />
      )}

      {/* 🟢 TABEL PANEN */}
      {panen.length > 0 && (
        <BentoTable
          title="Panen"
          data={panen}
          columns={panenCols}
          columnLabels={LABELS_PANEN}
        />
      )}

    </div>
  );
};

export default FinanceTableView;
