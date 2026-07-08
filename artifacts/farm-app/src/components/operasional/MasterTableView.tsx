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
    return (dropdownOptions?.petugas || []).map((p: any) => ({ 
      label: p.deleted ? `${p.name} (Terhapus)` : p.name, 
      value: p.id,
      deleted: p.deleted // 🚀 SUNTIKAN BARU: Bawa statusnya ke opsi biar bisa difilter di kolom
    }));
  }, [dropdownOptions]);

  const kategoriOptions = useMemo(() => {
    return (dropdownOptions?.kategori || []).map((k: any) => ({ label: k.name, value: k.id, module: k.module }));
  }, [dropdownOptions]);

    // 2. MUTASI DATA (Update, Tambah Master, Hapus Master)
    const updateMutation = useMutation({
  mutationFn: async ({ id, module, payload }: { id: string; module: string; payload: any }) => {
    // 🚀 Opsi A2: Pengalihan rute pintar
    const targetUrl = module === "perawatan" 
      ? `/api/notion/perawatan/${id}`
      : `/api/notion/edit-activity/${id}`;

    const res = await fetch(targetUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module, ...payload }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || "Gagal menyimpan perubahan");
    }
    return res.json();
  },

  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] });
    queryClient.invalidateQueries({ queryKey: ["operasional-options-list"] });
  },
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

  // Mutasi Hapus Baris (Row) Aktivitas
    const deleteActivityMutation = useMutation({
    mutationFn: async ({ id, module }: { id: string; module: string }) => {
      // 🚀 Pintu khusus untuk delete perawatan agar stok balik utuh
      const targetUrl = module === "perawatan"
        ? `/api/notion/perawatan/${id}`
        : `/api/notion/activity/${module}/${id}`;
        
      const res = await fetch(targetUrl, { method: 'DELETE' });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || "Gagal menghapus baris");
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agronomy-feed-supabase"] }),
    onError: (err: any) => toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message }),
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


  // 3. Helper Pengatur Waktu & Tanggal (NAIVE STRATEGY) 🚀
    const updateDateTime = (item: RichAgronomyItem, field: 'waktuMulai' | 'waktuSelesai', dateStr?: string, timeStr?: string) => {
    const rawVal = item.metaEkstra?.[field] || new Date().toISOString().substring(0, 19).replace('T', ' ');
    const [dbDate, dbTime] = rawVal.split(/[T ]/);
    
    const finalDateStr = dateStr || dbDate;
    const finalTimeStr = timeStr ? (timeStr.length === 5 ? `${timeStr}:00` : timeStr) : dbTime;
    
    const naiveDateTimeStr = `${finalDateStr}T${finalTimeStr}`;
    const payload: any = { [field]: naiveDateTimeStr };

    // 🚀 TAMBAHAN: Kalkulasi durasi kerja otomatis saat ngedit dari tabel!
    const startRaw = field === 'waktuMulai' ? naiveDateTimeStr : item.metaEkstra?.waktuMulai;
    const endRaw = field === 'waktuSelesai' ? naiveDateTimeStr : item.metaEkstra?.waktuSelesai;

    if (startRaw && endRaw) {
      // Ubah spasi jadi T buat jaga-jaga kalau string dari DB formatnya "YYYY-MM-DD HH:mm:ss"
      const safeStart = startRaw.replace(' ', 'T');
      const safeEnd = endRaw.replace(' ', 'T');
      
      const msDiff = new Date(safeEnd).getTime() - new Date(safeStart).getTime();
      const calcHours = Math.max(0, msDiff / (1000 * 60 * 60));
      payload.durasiKerja = Math.round(calcHours); // Skema DB minta integer bulat
    }
    
    updateMutation.mutate({ id: item.id, module: item.module, payload });
  };

  // 4. Definisi Kolom Dinamis
  const columns = useMemo<ColumnDef<RichAgronomyItem>[]>(() => [
    {
      id: "aktivitas",
      header: "Kegiatan",
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
          {/* ✨ Smart Opacity: opacity-40 pas normal, terang & scale pas row di-hover */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onItemClick(item)}
              className="text-muted-foreground/40 group-hover:text-primary group-hover:opacity-100 transition-all duration-200 h-7 w-7 p-0 hover:scale-110 hover:bg-primary/10 rounded-lg"
            >
              <Eye className="h-4 w-4" />
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

    // 💡 HISTORIS FIX:
    // EditableCell resolve label dari options (selalu siklus aktif).
    // Solusi: inject option historis khusus untuk row ini,
    // sehingga label yang tampil sesuai siklus saat aktivitas dicatat.
    const namaSiklusHistoris = item.metaEkstra?.namaSiklus;
    const historisLabel = namaSiklusHistoris && namaSiklusHistoris !== "-"
      ? `${item.area} - ${namaSiklusHistoris}`
      : item.area;

    // Gabungkan: option historis untuk row ini + semua area aktif untuk pilihan edit
    // Kalau areaId sudah ada di areaOptions (label mungkin beda), kita override labelnya
    const optionsWithHistoris = areaOptions.map(opt =>
      opt.value === item.areaId
        ? { ...opt, label: historisLabel } // Override label area ini dengan historis
        : opt
    );

    if (item.module === "perawatan") {
      return (
        <div className="min-w-[160px] flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground bg-muted/30 rounded-md w-fit">
          <Lock className="h-3 w-3" />
          <span>{historisLabel}</span>
        </div>
      );
    }

    return (
      <div className="min-w-[160px]">
        <EditableCell
          value={item.areaId} 
          type="select"
          options={optionsWithHistoris}
          placeholder={historisLabel}
          onSave={(val) => updateMutation.mutate({ 
            id: item.id, 
            module: item.module, 
            payload: { areaId: val } 
          })}
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
              // 3. Hitung selisih hari murni (Tanggal Aktivitas - Tanggal Tanam)
              const diffTime = activityDate.getTime() - plantDate.getTime();
              const hst = Math.round(diffTime / (1000 * 60 * 60 * 24));
              
              // 4. Kondisi label umur tanaman murni
              if (hst < 0) {
                hstDisplay = "Pra-tanam";
              } else if (hst === 0) {
                hstDisplay = "0 HST (Hari Tanam)";
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
      id: "pekerja",
      header: "Tim kebun",
      cell: ({ row }) => {
        const item = row.original;
        const currentWorkerIds = Array.isArray(item.metaEkstra?.pekerjaIds) ? item.metaEkstra.pekerjaIds : [];

        // 🚀 FIX: LOGIKA FILTER PINTAR
        // Saring daftar pekerja khusus untuk baris ini aja
        const dynamicWorkerOptions = workerOptions.filter((opt: any) => {
          // 1. Tampilkan jika pekerja masih AKTIF (!opt.deleted)
          // 2. ATAU tampilkan jika pekerja NONAKTIF, TAPI id-nya ada di daftar tugas baris ini
          return !opt.deleted || currentWorkerIds.includes(opt.value);
        });

        // 💡 Failsafe: Jaga-jaga buat data jadul yang terlanjur kena hard-delete (hilang permanen)
        currentWorkerIds.forEach(workerId => {
          const isExist = dynamicWorkerOptions.some((opt: any) => opt.value === workerId);
          if (!isExist) {
            dynamicWorkerOptions.push({ label: "(Pekerja Terhapus)", value: workerId, deleted: true });
          }
        });

        return (
          <div className="min-w-[180px]">
            <EditableCell
              value={currentWorkerIds} 
              type="multi-select"
              options={dynamicWorkerOptions} // 👈 Pakai opsi yang udah disaring
              placeholder="Pilih tim"
              onSave={(nextIds: string[]) => {
                updateMutation.mutate({ id: item.id, module: item.module, payload: { pekerjaIds: nextIds } });
              }}
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
        
        // 🚀 BACA LANGSUNG SEBAGAI STRING (Split di huruf T)
        const startDate = item.metaEkstra?.waktuMulai ? item.metaEkstra.waktuMulai.split(/[T ]/)[0] : "";
        const endDate = item.metaEkstra?.waktuSelesai ? item.metaEkstra.waktuSelesai.split(/[T ]/)[0] : "";

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
        
        // 🚀 BACA LANGSUNG SEBAGAI STRING (Split di huruf T lalu ambil porsi jamnya HH:MM)
        const getHHMM = (str?: string) => {
          if (!str) return "";
          const timePart = str.split(/[T ]/)[1];
          return timePart ? timePart.substring(0, 5) : "";
        };

        const startTime = getHHMM(item.metaEkstra?.waktuMulai);
        const endTime = getHHMM(item.metaEkstra?.waktuSelesai);

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
                  // Kalau belum ada waktu selesai, pinjam tanggal mulai
                  let fallbackDate = undefined;
                  if (!item.metaEkstra?.waktuSelesai) {
                    fallbackDate = item.metaEkstra?.waktuMulai 
                      ? item.metaEkstra.waktuMulai.split(/[T ]/)[0]
                      : new Date().toISOString().split('T')[0];
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
        /* ✨ Smart Opacity: opacity-30 pas normal biar ga merah semarak, menyala pas di-hover */
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            if (confirm("Yakin ingin menghapus baris data ini?")) {
              deleteActivityMutation.mutate({ id: row.original.id, module: row.original.module });
            }
          }} 
          className="text-destructive/30 group-hover:text-destructive group-hover:opacity-100 transition-all duration-200 h-8 w-8 p-0 hover:bg-destructive/10 hover:scale-105 rounded-lg"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },

  ], [updateMutation, addAreaMutation, deleteAreaMutation, addKategoriMutation, deleteKategoriMutation, onItemClick, onDeleteClick, areaOptions, workerOptions, kategoriOptions]);

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
    pekerja: "Tim Kebun",
    status: "Status",
    tanggal: "Tanggal",
    waktu: "Jam Kerja",
    durasi: "Durasi",
    actions: "Hapus",
  };

  // ✨ 1. Glassmorphism Wrapper: rounded-[1.5rem], backdrop-blur, dan soft shadow ala Bento Deck
  return (
    <div className="w-full max-w-full rounded-[1.5rem] border border-border/50 bg-card/80 backdrop-blur-md shadow-[0_8px_30px_-4px_rgba(0,0,0,0.05)] overflow-hidden text-left transition-all duration-300">
      
      {/* 💡 HEADER FILTER KOLOM PREMIUM */}
      {/* ✨ 2. Top Bar: Padding lebih bernafas (px-5 py-3) dan border yang halus */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 bg-muted/30 backdrop-blur-sm">
        
        {/* JUDUL TABEL */}
        <div className="flex flex-col">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-foreground/90">
            Table View
          </h2>
          <span className="text-[10px] text-muted-foreground font-medium"></span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* ✨ 3. Tombol Taktil: bg-background/80, hover effect, dan subtle shadow */}
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
              /* ✨ 1. Header Row: Warna lebih lembut dan kontras rapi */
              <tr key={headerGroup.id} className="border-b border-border/40 bg-muted/60 backdrop-blur-sm">
                {headerGroup.headers.map(header => (
                  /* ✨ 2. Hapus 'border-r last:border-r-0' biar bebas garis vertikal kaku */
                  <th key={header.id} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground/90 whitespace-nowrap">
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
                /* ✨ 3. Table Row: Hapus 'divide-x', pertajam border-b, dan naikkan hover ke 'bg-muted/40' */
                <tr key={row.id} className="border-b border-border/40 hover:bg-muted/40 transition-all duration-200 group">
                  {row.getVisibleCells().map(cell => (
                    /* ✨ 4. Table Cell: Padding sedikit diperlebar (px-3 py-1.5) biar teks ga nempel antar kolom */
                    <td key={cell.id} className="px-3 py-1.5 align-middle text-sm">
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
