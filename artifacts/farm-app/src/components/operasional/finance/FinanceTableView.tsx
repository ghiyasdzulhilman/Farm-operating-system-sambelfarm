import React, { useMemo, useState } from "react";
import { useReactTable, getCoreRowModel, flexRender, type ColumnDef } from "@tanstack/react-table";
// 🚀 THE FIX: Tambahkan Eye ke dalam import lucide-react
import { Columns3, Check, Trash2, Package, Building2, Lock, Eye } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";

// 🚀 IMPORT EDITABLE CELL DARI PARENT FOLDER
import { EditableCell } from "../EditableCell";

interface FinanceTableViewProps {
  items: any[];
  filterSiklus: "aktif" | "selesai"; 
  onDelete: (id: string, module: string) => void;
  onUpdate: (id: string, module: string, payload: any) => void;
  // 🚀 THE FIX: Daftarkan prop onItemClick
  onItemClick: (item: any) => void;
}

// 🚀 FORMATTER TANGGAL, ANGKA & RUPIAH
const formatTanggal = (dateStr: string) => {
  if (!dateStr) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(dateStr));
  } catch { return "-"; }
};

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
  areaSiklus: "Area & Siklus",
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
  hst: "Umur (HST)", // 🚀 THE FIX: Daftarkan label kolom baru
  kualitas: "Grade/Kualitas",
  kuantitas: "Kuantitas",
  hargaJual: "Harga Jual / Kg",
  totalPendapatan: "Total Pendapatan",
  aksi: "Aksi",
};

// 🚀 KOMPONEN HELPER: BENTO TABLE
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

      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[900px] border-collapse">
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
// 🚀 FIX: Tangkap filterSiklus dan onItemClick di parameter
export const FinanceTableView: React.FC<FinanceTableViewProps> = ({ items, filterSiklus, onDelete, onUpdate, onItemClick }) => {

  const pengeluaran = items.filter((i) => i.module === "pengeluaran");
  const panen = items.filter((i) => i.module === "panen");

  // 🚀 FETCH OPSI DROPDOWN KHUSUS FINANCE
  const { data: dropdownOptions } = useQuery({
    queryKey: ["pengeluaran-options-list"],
    queryFn: async () => fetch("/api/pengeluaran-dropdown-options").then(res => res.json())
  });

  const areaOptions = useMemo(() => {
    const dbAreas = (dropdownOptions?.areas || []).map((a: any) => ({ label: a.name, value: a.id }));
    // Tambahkan opsi khusus untuk mengembalikan pengeluaran jadi Biaya Umum (tanpa area)
    return [{ label: "Biaya Umum", value: null }, ...dbAreas];
  }, [dropdownOptions]);

  const kategoriOptions = useMemo(() => {
    return (dropdownOptions?.kategoriKeuangan || []).map((k: any) => ({ label: k.nama, value: k.id }));
  }, [dropdownOptions]);

  // 💡 DEFINISI KOLOM PENGELUARAN
  const pengeluaranCols = useMemo<ColumnDef<any>[]>(() => [
    {
      id: "tanggal",
      header: "Tanggal",
      cell: ({ row }) => (
        // 🚀 THE FIX: Bungkus pakai flex & group biar tombol Mata sejajar di kolom pertama
        <div className="flex items-center gap-2 group min-w-[140px]">
          <div className="flex-1 font-medium text-muted-foreground whitespace-nowrap">
            <EditableCell
              value={row.original.rawDate ? row.original.rawDate.split('T')[0] : ""}
              type="date"
              onSave={(val) => {
                if(val) onUpdate(row.original.id, "pengeluaran", { tanggal: val });
              }}
            />
          </div>
          {/* ✨ Tombol Mata Detail */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onItemClick(row.original)}
            className="text-muted-foreground/40 group-hover:text-primary group-hover:opacity-100 transition-all duration-200 h-7 w-7 p-0 hover:scale-110 hover:bg-primary/10 rounded-lg shrink-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      )
    },

    {
      id: "areaSiklus", 
      header: "Area & Siklus",
      cell: ({ row }) => {
        const isBeliStok = row.original.metaEkstra?.isPembelianStok;
        const areaId = row.original.metaEkstra?.areaId || null; // Pastikan fallback ke null
        const isOverhead = !row.original.area || row.original.area === "Area Master" || row.original.area === "-";

        // KONDISI A: Uang berubah jadi Aset Gudang (Dikunci)
        if (isBeliStok) {
          return (
            <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
              <Package className="h-3 w-3" /> Stok
            </div>
          );
        }

        // KONDISI B & C: Bebas pindah Area
        // 🚀 THE FIX: Buat Label Historis
        const historisLabel = isOverhead 
          ? "Biaya Umum" 
          : `${row.original.area} ${row.original.namaSiklus && row.original.namaSiklus !== "-" ? `- ${row.original.namaSiklus}` : ""}`;

        // 🚀 GEMBOK AREA JIKA TAB SELESAI AKTIF
        if (filterSiklus === "selesai") {
          return (
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-md w-fit">
              <Lock className="h-3 w-3 shrink-0" />
              <span className="font-semibold">{historisLabel}</span>
            </div>
          );
        }

        // 🚀 THE FIX: Suntik Label Historis ke Opsi Dropdown khusus untuk baris ini!
        const optionsWithHistoris = areaOptions.map(opt =>
          opt.value === areaId
            ? { ...opt, label: historisLabel } // Override label dengan data historis masa lalu
            : opt
        );

        return (
          <div className="min-w-[160px]">
            <EditableCell
              value={areaId}
              type="select"
              options={optionsWithHistoris} // 👈 Pakai opsi yang udah disuntik
              placeholder={historisLabel}
              onSave={(val) => onUpdate(row.original.id, "pengeluaran", { areaId: val })}
            />
          </div>
        );
      }
    },

    {
      id: "kategori",
      header: "Kategori",
      cell: ({ row }) => {
        // 🚀 THE FIX: Gembok Kategori jika tab Selesai aktif
        if (filterSiklus === "selesai") {
          return (
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-md w-fit">
              <Lock className="h-3 w-3 shrink-0" />
              <span className="font-semibold">{row.original.category || "-"}</span>
            </div>
          );
        }

        const currentKatId = row.original.metaEkstra?.kategoriId;
        return (
          <div className="min-w-[140px]">
             <EditableCell
                value={currentKatId}
                type="select"
                options={kategoriOptions}
                placeholder={row.original.category}
                onSave={(val) => onUpdate(row.original.id, "pengeluaran", { kategoriId: val })}
              />
          </div>
        );
      }
    },
    
    {
      id: "namaItem", 
      header: "Nama Item",
      cell: ({ row }) => (
        <div className="font-bold text-foreground/90 min-w-[140px]">
          <EditableCell
            value={row.original.title}
            onSave={(val) => onUpdate(row.original.id, "pengeluaran", { namaItem: val })}
          />
        </div>
      )
    },

    // 🔒 KOLOM ANGKA: READ-ONLY SEPENUHNYA
    {
      id: "qty",
      header: () => <div className="text-right w-full">Qty</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-muted-foreground whitespace-nowrap bg-muted/10 px-2 py-1 rounded-md">
          {formatAngka(row.original.metaEkstra?.kuantitas || 1)} {row.original.metaEkstra?.satuanKerja}
        </div>
      )
    },
    {
      id: "hargaSatuan",
      header: () => <div className="text-right w-full">Harga Satuan</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-muted-foreground whitespace-nowrap bg-muted/10 px-2 py-1 rounded-md">
          {formatRupiah(Number(row.original.metaEkstra?.hargaSatuan))}
        </div>
      )
    },
    {
      id: "totalBiaya",
      header: () => <div className="text-right w-full">Total Biaya</div>,
      cell: ({ row }) => (
        <div className="text-right font-black text-foreground/90 whitespace-nowrap bg-muted/20 px-2 py-1 rounded-md">
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
  ], [onDelete, onUpdate, areaOptions, kategoriOptions]);

  // 💡 DEFINISI KOLOM PANEN
  const panenCols = useMemo<ColumnDef<any>[]>(() => [
     {
      id: "tanggal",
      header: "Tanggal",
      cell: ({ row }) => (
        // 🚀 THE FIX: Bungkus pakai flex & group biar tombol Mata sejajar di kolom pertama
        <div className="flex items-center gap-2 group min-w-[140px]">
          <div className="flex-1 font-medium text-muted-foreground whitespace-nowrap">
            <EditableCell
              value={row.original.rawDate ? row.original.rawDate.split('T')[0] : ""}
              type="date"
              onSave={(val) => {
                if(val) onUpdate(row.original.id, "panen", { tanggal: val });
              }}
            />
          </div>
          {/* ✨ Tombol Mata Detail */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onItemClick(row.original)}
            className="text-muted-foreground/40 group-hover:text-primary group-hover:opacity-100 transition-all duration-200 h-7 w-7 p-0 hover:scale-110 hover:bg-primary/10 rounded-lg shrink-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      )
    },

    {
      id: "areaSiklus",
      header: "Area & Siklus",
      cell: ({ row }) => {
        const areaId = row.original.metaEkstra?.areaId;
        
        // 🚀 THE FIX: Buat Label Historis
        const historisLabel = `${row.original.area} ${row.original.namaSiklus && row.original.namaSiklus !== "-" ? `- ${row.original.namaSiklus}` : ""}`;
        
        // 🚀 GEMBOK AREA JIKA TAB SELESAI AKTIF
        if (filterSiklus === "selesai") {
          return (
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-md w-fit">
              <Lock className="h-3 w-3 shrink-0" />
              <span className="font-semibold">{historisLabel}</span>
            </div>
          );
        }

        // 🚀 THE FIX: Suntik Label Historis (Dan filter opsi Biaya Umum karena panen wajib punya area)
        const optionsWithHistoris = areaOptions
          .filter(a => a.value !== null) 
          .map(opt =>
            opt.value === areaId
              ? { ...opt, label: historisLabel } // Override label dengan data historis
              : opt
          );

        return (
          <div className="min-w-[160px]">
            <EditableCell
              value={areaId}
              type="select"
              options={optionsWithHistoris} // 👈 Pakai opsi yang udah disuntik
              placeholder={historisLabel}
              onSave={(val) => onUpdate(row.original.id, "panen", { areaId: val })}
            />
          </div>
        );
      }
    },

        {
      id: "kegiatan",
      header: "Kegiatan",
      cell: ({ row }) => (
        <div className="font-bold text-foreground/90 min-w-[140px]">
          <EditableCell
            value={row.original.title}
            onSave={(val) => onUpdate(row.original.id, "panen", { kegiatan: val })}
          />
        </div>
      )
    },
    
    // 🚀 THE FIX: SUNTIKAN KOLOM HST KHUSUS PANEN
    {
      id: "hst",
      header: "HST",
      cell: ({ row }) => {
        const item = row.original;
        const tglTanamStr = item.metaEkstra?.tanggalPindahTanam || item.tanggalPindahTanam;
        let hstDisplay = "-";

        if (tglTanamStr) {
          try {
            // 1. Ambil YYYY-MM-DD murni dari tanggal tanam
            const dateOnlyTanam = tglTanamStr.split('T')[0];
            const plantDate = new Date(`${dateOnlyTanam}T00:00:00`);

            // 2. Ambil YYYY-MM-DD dari tanggal aktivitas (Pakai format lokal WIB)
            // Khusus Panen pakai rawDate atau tanggal dari metaEkstra
            const dateAktivitasRaw = new Date(item.rawDate || item.metaEkstra?.tanggal || new Date());
            const dateOnlyAktivitas = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(dateAktivitasRaw);
            const activityDate = new Date(`${dateOnlyAktivitas}T00:00:00`);

            if (!isNaN(plantDate.getTime()) && !isNaN(activityDate.getTime())) {
              // 3. Hitung selisih hari murni (Tanggal Aktivitas - Tanggal Tanam)
              const diffTime = activityDate.getTime() - plantDate.getTime();
              const hst = Math.round(diffTime / (1000 * 60 * 60 * 24));
              
              // 4. Kondisi label umur tanaman murni
              if (hst < 0) {
                hstDisplay = "Pra-tanam";
              } else if (hst === 0) {
                hstDisplay = "0 HST (Tanam)";
              } else {
                hstDisplay = `${hst} HST`;
              }
            }
          } catch {
            hstDisplay = "-";
          }
        }

        return (
          <div className="min-w-[80px] px-2 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-center">
            {hstDisplay}
          </div>
        );
      },
    },

    {
      id: "kualitas",
      header: "Grade",
      cell: ({ row }) => (
        <div className="font-semibold text-muted-foreground text-xs min-w-[100px]">
          <EditableCell
            value={row.original.metaEkstra?.kualitas || ""}
            placeholder="Grade..."
            onSave={(val) => onUpdate(row.original.id, "panen", { kualitas: val })}
          />
        </div>
      )
    },

    // 🔒 KOLOM ANGKA: READ-ONLY SEPENUHNYA
    {
      id: "kuantitas",
      header: () => <div className="text-right w-full">Kuantitas</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-muted-foreground whitespace-nowrap bg-muted/10 px-2 py-1 rounded-md">
          {formatAngka(row.original.metaEkstra?.kuantitasKg)} Kg
        </div>
      )
    },
    {
      id: "hargaJual",
      header: () => <div className="text-right w-full">Harga Jual / Kg</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium text-muted-foreground whitespace-nowrap bg-muted/10 px-2 py-1 rounded-md">
          {formatRupiah(row.original.metaEkstra?.hargaJualPerKg)}
        </div>
      )
    },
    {
      id: "totalPendapatan",
      header: () => <div className="text-right w-full">Total Pendapatan</div>,
      cell: ({ row }) => (
        <div className="text-right font-black text-foreground/90 whitespace-nowrap bg-muted/20 px-2 py-1 rounded-md">
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
  ], [onDelete, onUpdate, areaOptions]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-muted/30 rounded-[1.5rem] border-2 border-dashed border-border/50">
          <p className="text-muted-foreground font-medium">
            Tidak ada data keuangan yang ditemukan untuk filter saat ini.
          </p>
        </div>
      )}

      {pengeluaran.length > 0 && (
        <BentoTable
          title="Pengeluaran"
          data={pengeluaran}
          columns={pengeluaranCols}
          columnLabels={LABELS_PENGELUARAN}
        />
      )}

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
