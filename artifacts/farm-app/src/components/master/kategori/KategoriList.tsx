import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Tag, FolderArchive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface KategoriListProps {
  kategori: any[];
  activeTab: "perawatan" | "operasional";
  searchQuery: string;
}

export function KategoriList({ kategori, activeTab, searchQuery }: KategoriListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. MUTASI HAPUS KATEGORI
    // 1. MUTASI HAPUS KATEGORI
  const delMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notion/kategori/${id}`, { method: "DELETE" });
      const json = await res.json();
      
      // 💡 Cegat di sini! Kalau statusnya bukan 2xx (misal 400 dari backend), lempar errornya
      if (!res.ok) {
        throw new Error(json.error || "Terjadi kesalahan saat menghapus data.");
      }
      
      return json;
    },
    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] });
      toast({ title: "Dihapus", description: "Kategori berhasil dihapus dari database." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
    }
  });

  // 2. LOGIKA FILTERING DATA
  const filteredKategori = useMemo(() => {
    return kategori
      .filter((item) => item.module === activeTab)
      .filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [kategori, activeTab, searchQuery]);

  return (
    <div className="w-full space-y-3 animate-in fade-in duration-300">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground pl-1">
        Opsi Kategori Tersedia ({filteredKategori.length})
      </h4>

      {/* Grid Layout: 1 Kolom di HP, otomatis jadi 2 Kolom di Tablet/Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredKategori.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm hover:border-primary/30 transition-all duration-200"
          >
            {/* Sektor Kiri: Ikon & Nama Kategori */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-xl bg-muted/60 p-2 text-muted-foreground/80">
                <Tag className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-foreground truncate">
                {item.name}
              </span>
            </div>

            {/* Sektor Kanan: Tombol Hapus (HP-Friendly Touch Target) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm(`Yakin ingin menghapus kategori "${item.name}"?`)) {
                  delMutation.mutate(item.id);
                }
              }}
              disabled={delMutation.isPending}
              className="h-9 w-9 text-destructive/70 hover:text-destructive hover:bg-destructive/10 rounded-xl shrink-0 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Placeholder State kalau pencarian/data kosong */}
      {filteredKategori.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-3xl bg-muted/10 text-center text-muted-foreground">
          <FolderArchive className="h-8 w-8 opacity-20 mb-2" />
          <p className="text-xs font-semibold">Belum ada data kategori.</p>
          <p className="text-[10px] opacity-70">Klik tombol "+ Kategori" untuk menambahkan opsi baru.</p>
        </div>
      )}
    </div>
  );
}
