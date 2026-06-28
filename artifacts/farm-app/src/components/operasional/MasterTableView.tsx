// src/components/operasional/MasterTableView.tsx
import { useMemo, useState } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, type ColumnDef } from "@tanstack/react-table";
import { Eye, Trash2, Lock, ArrowRight, Columns3, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const [columnVisibility, setColumnVisibility] = useState({});

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

  const kategoriOptions = useMemo(() => {
    return (dropdownOptions?.kategori || []).map((k: any) => ({ label: k.name, value: k.id, module: k.module }));
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

  // Mutasi Kategori (Langsung tembak ID)
  const addKategoriMutation = useMutation({
    mutationFn: async ({ name, module }: { name: string; module: string }) => {
      const res = await fetch('/api/notion/kategori', { method: 'POST', body: JSON.stringify({ name, module }), headers: { 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error("Gagal menambah kategori");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operasional-options-list"] })
  });
  const deleteKategoriMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notion/kategori/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Gagal menghapus kategori");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operasional-options-list"] })
  });


    // 3. Helper Pengatur Waktu & Tanggal (KUNCI DI ZONA WIB)
  const updateDateTime = (item: RichAgronomyItem, field: 'waktuMulai' | 'waktuSelesai', dateStr?: string, timeStr?: string) => {
    const currentVal = item.metaEkstra?.[field] || new Date().toISOString();
    const tempDate = new Date(currentVal);
    
    // Ambil tanggal & waktu dari DB dalam format string WIB
    const wibDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(tempDate);
    const wibTimeStr = tempDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });
    
    // Timpa dengan inputan user jika ada
    const finalDateStr = dateStr || wibDateStr;
    const finalTimeStr = timeStr ? `${timeStr}:00` : wibTimeStr;
    
    // Gabungin ke ISO 8601 dengan offset paksa WIB (+07:00) supaya DB nggak bingung
    const isoStringWithWIB = `${finalDateStr}T${finalTimeStr}+07:00`;
    
    updateMutation.mutate({ id: item.id, module: item.module, payload: { [field]: new Date(isoStringWithWIB).toISOString() } });
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
              className="text-muted-foreground hover:text-primary transition-opacity h-7 w-7 p-0"
            >
              <Eye className="h-4 w-4 text-muted-foreground hover:text-primary" />
            </Button>
          </div>
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
              <span>{item.category || ""}</span>
            </div>
          );
        }

        // 💡 Filter opsi kategori berdasarkan modul (operasional/perawatan)
        const currentOptions = kategoriOptions.filter((k: any) => k.module === item.module);
        
        // 💡 Ambil ID Kategori dari data yang dikirim backend
        const currentKategoriId = item.module === "perawatan" 
          ? (item.tagCategoryId || item.metaEkstra?.tagCategoryId) 
          : (item.kategoriId || item.metaEkstra?.kategoriId);

       return (
          <div className="min-w-[140px]">
            <EditableCell
              value={currentKategoriId} // Menggunakan UUID
              type="select"
              options={currentOptions}
              placeholder="Pilih Kategori..."
              onSave={(val) => {
                // Tembak kolom foreign key yang baru
                const field = item.module === "perawatan" ? "tagCategoryId" : "kategoriId";
                updateMutation.mutate({ id: item.id, module: item.module, payload: { [field]: val } });
              }}
              onAddOption={(newLabel) => addKategoriMutation.mutate({ name: newLabel, module: item.module })} // 💡 Fitur tambah kategori TETAP ADA
              // ❌ onDeleteOption dicabut biar aman dari hapus master
            />
          </div>
        );

      },
    },

     {
      id: "area",
      header: "Area",
      cell: ({ row }) => {
        const item = row.original;
        
        // 🚀 GABUNGKAN NAMA AREA DENGAN NAMA SIKLUS (TANAMAN)
        // Pastikan namaSiklus ditarik dari tipe metaEkstra jika ada, atau default ke properti item
        const namaSiklus = item.metaEkstra?.namaSiklus || (item as any).namaSiklus;
        const displayLabel = namaSiklus && namaSiklus !== "-" 
          ? `${item.area} - ${namaSiklus}` 
          : item.area;

        return (
          <div className="min-w-[160px]">
            <EditableCell
              value={item.areaId} 
              type="select"
              options={areaOptions}
              placeholder={displayLabel} // 👈 Masukkan label gabungan ke placeholder
              onSave={(val) => updateMutation.mutate({ id: item.id, module: item.module, payload: { areaId: val } })}
            />
          </div>
        );
      },
    },

   {
      id: "hst",
      header: "HST",
      cell: ({ row }) => {
        const item = row.original;
        const tglTanamStr = item.metaEkstra?.tanggalPindahTanam || (item as any).tanggalPindahTanam;
        let hstDisplay = "-";

        if (tglTanamStr) {
          try {
            // 1. Ambil YYYY-MM-DD murni dari tanggal tanam
            const dateOnlyTanam = tglTanamStr.split('T')[0];
            const plantDate = new Date(`${dateOnlyTanam}T00:00:00`);

            // 2. Ambil YYYY-MM-DD dari tanggal aktivitas (Pakai format lokal WIB)
            const dateAktivitasRaw = new Date(item.metaEkstra?.waktuMulai || item.rawDate || new Date());
            const dateOnlyAktivitas = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(dateAktivitasRaw);
            const activityDate = new Date(`${dateOnlyAktivitas}T00:00:00`);

            if (!isNaN(plantDate.getTime()) && !isNaN(activityDate.getTime())) {
              // 3. Hitung selisih hari murni
              const diffTime = activityDate.getTime() - plantDate.getTime();
              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
              
              // 4. Tambah 1 karena hari pindah tanam dihitung sebagai 1 HST
              const hst = diffDays + 1;

              hstDisplay = hst <= 0 ? "Pra-tanam" : `${hst} HST`;
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
      id: "pekerja",
      header: "Tim Pekerja",
      cell: ({ row }) => {
        const item = row.original;
        // Ambil array ID Pekerja dari metaEkstra, fallback ke string kosong
        const currentWorkerIds = Array.isArray(item.metaEkstra?.pekerjaIds) ? item.metaEkstra.pekerjaIds : [];

        return (
          <div className="min-w-[180px]"> {/* 💡 Dilebarin dikit karena ada format "Nama - Jenis" */}
            <EditableCell
              value={currentWorkerIds} 
              type="multi-select"
              options={workerOptions} 
              placeholder="Pilih Pekerja"
              onSave={(nextIds: string[]) => {
                // 💡 Fungsi ini yang otomatis nge-handle Un-assign kalau lu silang nama pekerja dari baris
                updateMutation.mutate({ id: item.id, module: item.module, payload: { pekerjaIds: nextIds } });
              }}
              onAddOption={(newLabel) => addPekerjaMutation.mutate(newLabel)} // 💡 Fitur tambah pekerja TETAP ADA
              // ❌ onDeleteOption dicabut biar aman dari hapus master
            />
          </div>
        );

      },
    },

   {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const item = row.original;
        
        // 💡 Bikin dinamis: pisahkan opsi status berdasarkan modul
        const statusOptions = item.module?.toLowerCase() === "inspeksi"
          ? ["Baru ditemukan", "Sedang ditangani", "Sudah ditangani"]
          : ["Belum dikerjakan", "Dalam proses", "Selesai"];

        return (
          <EditableCell
            value={item.status}
            type="select"
            options={statusOptions}
            onSave={(val) => updateMutation.mutate({ id: item.id, module: item.module, payload: { status: val } })}
          />
        );
      },
    },

    {
      id: "tanggal",
      header: "Tanggal (Mulai - Selesai)",
      cell: ({ row }) => {
        const item = row.original;
        const startRaw = item.metaEkstra?.waktuMulai ? new Date(item.metaEkstra.waktuMulai) : null;
        const endRaw = item.metaEkstra?.waktuSelesai ? new Date(item.metaEkstra.waktuSelesai) : null;

        // Format ke YYYY-MM-DD khusus zona waktu WIB
        const dateOptions: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Jakarta' };
        const startDate = startRaw ? new Intl.DateTimeFormat('en-CA', dateOptions).format(startRaw) : "";
        const endDate = endRaw ? new Intl.DateTimeFormat('en-CA', dateOptions).format(endRaw) : "";

        return (
          <div className="flex items-center gap-1 min-w-[280px]">
            <EditableCell
              value={startDate}
              type="date"
              className="w-full text-center px-0"
              onSave={(val) => {
                if (val) updateDateTime(item, 'waktuMulai', val, undefined);
              }}
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <EditableCell
              value={endDate}
              type="date"
              className="w-full text-center px-0"
              onSave={(val) => {
                if (val) updateDateTime(item, 'waktuSelesai', val, undefined);
              }}
            />
          </div>
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
        
        // Memaksa format jam ke WIB (Asia/Jakarta)
        const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' };
        const startTime = startRaw ? startRaw.toLocaleTimeString('en-GB', timeOptions) : "";
        const endTime = endRaw ? endRaw.toLocaleTimeString('en-GB', timeOptions) : "";

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
                  // 💡 PERBAIKAN LOGIKA: 
                  // Jika endRaw (tanggal selesai) BELUM ada, baru numpang ke tanggal mulai.
                  // Jika endRaw SUDAH ada, kirim undefined agar tanggal aslinya dipertahankan.
                  let fallbackDate = undefined;
                  
                  if (!endRaw) {
                    fallbackDate = startRaw 
                      ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(startRaw)
                      : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
                  }
                  
                  updateDateTime(item, 'waktuSelesai', fallbackDate, val);
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
          const tStart = new Date(item.metaEkstra.waktuMulai).getTime();
          const tEnd = new Date(item.metaEkstra.waktuSelesai).getTime();
          
          if (!isNaN(tStart) && !isNaN(tEnd)) {
             const msDiff = tEnd - tStart;
             calcHours = Math.max(0, msDiff / (1000 * 60 * 60)); // Akurat convert ms ke jam
          }
        } else if (item.metaEkstra?.durasiKerja) {
          calcHours = item.metaEkstra.durasiKerja;
        }

        return (
          <div className="flex items-center gap-1 min-w-[80px]">
            <EditableCell
              value={parseFloat(calcHours.toFixed(2))}
              type="number"
              disabled={true} 
              className="w-14 text-right bg-muted/20 font-medium"
              onSave={() => {}} // Disabled, tidak perlu disave manual
            />
            <span className="text-xs text-muted-foreground">Jam</span>
          </div>
        );
      },
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

    ], [updateMutation, addAreaMutation, deleteAreaMutation, addPekerjaMutation, deletePekerjaMutation, addKategoriMutation, deleteKategoriMutation, onItemClick, onDeleteClick, areaOptions, workerOptions, kategoriOptions]);

  // 💡 SORTING DATA DARI YANG TERBARU KE TERLAMA (DESCENDING)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      // Ambil waktu dari waktuMulai (atau fallback ke 0 kalau kosong)
      const timeA = new Date(a.metaEkstra?.waktuMulai || a.rawDate || 0).getTime();
      const timeB = new Date(b.metaEkstra?.waktuMulai || b.rawDate || 0).getTime();
      
      // Urutkan menurun: B dikurangi A
      return timeB - timeA;
    });
  }, [items]);

    const table = useReactTable({
    data: sortedItems,
    columns,
    state: { columnVisibility }, 
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // 💡 KAMUS LABEL KOLOM (Selipkan tepat di atas return)
  const COLUMN_LABELS: Record<string, string> = {
    aktivitas: "Kegiatan",
    tagCategory: "Kategori",
    area: "Area",
    hst: "Umur (HST)",
    pekerja: "Tim Pekerja",
    status: "Status",
    tanggal: "Tanggal",
    waktu: "Jam Kerja",
    durasi: "Durasi",
    actions: "Hapus",
  };

  return (
    <div className="w-full max-w-full rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden text-left">
      
      {/* 💡 HEADER FILTER KOLOM PREMIUM */}
      {/* 💡 Note: "justify-end" diganti menjadi "justify-between" agar judul di kiri & tombol di kanan */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/20">
        
        {/* 📝 TAMBAHAN TEKS JUDUL DI SINI BRO */}
        <div className="flex flex-col">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Table View
          </h2>
          {/* Opsional sub-judul kecil, kalau gak butuh baris <span sub-judul> di bawah ini boleh dihapus */}
          <span className="text-[10px] text-muted-foreground font-medium"></span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 rounded-lg text-[11px] font-bold tracking-wider text-muted-foreground hover:text-primary shadow-sm">
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
                    <span>{COLUMN_LABELS[column.id] || column.id}</span>
                    
                    {/* Kotak Checkbox Sukses Pindah Kanan & Membulat Dikit */}
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
