import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Users, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface PekerjaTableProps {
  pekerja: any[];
  atribut: {
    roles: any[];
    jenisTenaga: any[];
    statuses: any[];
  };
  searchQuery: string;
}

export function PekerjaTable({ pekerja, atribut, searchQuery }: PekerjaTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

    // 1. FILTER DATA BERDASARKAN PENCARIAN & STATUS DELETE
  const filteredPekerja = useMemo(() => {
    return pekerja.filter((p) => 
      !p.deleted && // 🚀 FIX: Sembunyikan pekerja yang udah di-soft delete
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pekerja, searchQuery]);

    // 2. MUTASI UNTUK INLINE EDIT ATRIBUT (Langsung Tembak API)
  const editPekerjaMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string, payload: any }) => {
      const res = await fetch(`/api/notion/pekerja/${id}`, { 
        method: "PATCH", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memperbarui atribut.");
      return json;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); 
      toast({ title: "Tersimpan", description: "Atribut berhasil diperbarui." }); 
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Update", description: err.message });
    }
  });

  // 3. MUTASI HAPUS PEKERJA (SOFT DELETE)
  const delPekerjaMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notion/pekerja/${id}`, { method: "DELETE" });
      const json = await res.json();
      
      // 🚀 FIX: Lempar error manual kalau response dari server bukan 200 OK
      if (!res.ok) throw new Error(json.error || "Gagal menghapus pekerja.");
      return json;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] }); 
      toast({ title: "Dihapus", description: "Pekerja berhasil dihapus." }); 
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
    }
  });

  return (
    <div className="w-full max-w-full rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden text-left animate-in fade-in duration-300">
      
      {/* 💡 HEADER TABEL (Desain konsisten dengan AreaArchiveTable) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
        <div className="flex flex-col">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Daftar Karyawan
          </h2>
          <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
            Menampilkan {filteredPekerja.length} anggota tim aktif
          </span>
        </div>
      </div>

      {/* 💡 BODY TABEL */}
      <div className="w-full overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="border-b border-border/60 bg-muted/50">
              <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/40 w-[30%]">
                Nama
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/40">
                Jabatan / Role
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/40">
                Sistem Kerja
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground border-r border-border/40">
                Status
              </th>
              <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground w-[10%]">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPekerja.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Activity className="h-8 w-8 opacity-20 mb-2" />
                    <p className="text-sm font-semibold">Tidak ada data.</p>
                    <p className="text-xs opacity-70">Tambahkan Karyawan baru atau sesuaikan filter pencarian.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPekerja.map((item) => (
                <tr key={item.id} className="border-b border-border/40 hover:bg-muted/10 transition-colors group divide-x divide-border/40">
                  
                  {/* Kolom 1: Nama Pekerja */}
                  <td className="px-4 py-3 align-middle">
                    <span className="text-sm font-bold text-foreground">
                      {item.name}
                    </span>
                  </td>
                  
                  {/* Kolom 2: Role (Inline Dropdown) */}
                  <td className="px-4 py-2 align-middle text-center">
                    <select 
                      value={item.roleId || ""} 
                      onChange={(e) => editPekerjaMutation.mutate({ id: item.id, payload: { roleId: e.target.value } })}
                      className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1.5 rounded-lg outline-none cursor-pointer appearance-none text-center hover:bg-primary/20 transition-colors border border-primary/20 w-[140px]"
                    >
                      <option value="" disabled>-</option>
                      {atribut.roles.map((r: any) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </td>
                  
                  {/* Kolom 3: Sistem Kerja (Inline Dropdown) */}
                  <td className="px-4 py-2 align-middle text-center">
                    <select 
                      value={item.jenisTenagaKerjaId || ""} 
                      onChange={(e) => editPekerjaMutation.mutate({ id: item.id, payload: { jenisTenagaKerjaId: e.target.value } })}
                      className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-2 py-1.5 rounded-lg outline-none cursor-pointer appearance-none text-center hover:bg-emerald-500/20 transition-colors border border-emerald-500/20 w-[140px]"
                    >
                      <option value="" disabled>-</option>
                      {atribut.jenisTenaga.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </td>

                  {/* Kolom 4: Status (Inline Dropdown) */}
                  <td className="px-4 py-2 align-middle text-center">
                    <select 
                      value={item.statusId || ""} 
                      onChange={(e) => editPekerjaMutation.mutate({ id: item.id, payload: { statusId: e.target.value } })}
                      className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 px-2 py-1.5 rounded-lg outline-none cursor-pointer appearance-none text-center hover:bg-amber-500/20 transition-colors border border-amber-500/20 w-[140px]"
                    >
                      <option value="" disabled>-</option>
                      {atribut.statuses.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </td>

                  {/* Kolom 5: Aksi Hapus */}
                  <td className="px-4 py-2 align-middle text-center">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => {
                        if (confirm(`Yakin ingin menghapus "${item.name}"?`)) {
                          delPekerjaMutation.mutate(item.id);
                        }
                      }}
                      disabled={delPekerjaMutation.isPending} 
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}
