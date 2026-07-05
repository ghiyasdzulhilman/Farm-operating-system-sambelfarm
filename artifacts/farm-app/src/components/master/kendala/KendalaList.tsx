import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Bug, Activity, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface KendalaListProps {
  kendala: any[];
  activeTab: "Hama" | "Penyakit";
  searchQuery: string;
}

export function KendalaList({ kendala, activeTab, searchQuery }: KendalaListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 1. MUTASI HAPUS DATA KENDALA
  const delMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notion/kendala/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus data.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-dropdown-options"] });
      toast({ title: "Dihapus", description: "Data kendala berhasil dihapus dari database." });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Gagal Menghapus", description: err.message });
    }
  });

// 2. LOGIKA FILTERING DATA MONOKROM (KEBAL HURUF BESAR/KECIL)
  const filteredKendala = useMemo(() => {
    return kendala
      .filter((item) => item.jenis?.toLowerCase() === activeTab.toLowerCase()) // 👈 Ini yang bikin aman
      .filter((item) => item.name?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [kendala, activeTab, searchQuery]);

  return (
    <div className="w-full space-y-3 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pl-1">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Daftar {activeTab} Terdaftar ({filteredKendala.length})
        </h4>
      </div>

      {/* Grid Layout: 1 Kolom di HP, otomatis 2 Kolom di Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredKendala.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-2xl border border-border/50 bg-card p-3.5 shadow-sm hover:border-foreground/20 transition-all duration-200"
          >
            {/* Sektor Kiri: Informasi Objek (Clean & Netral) */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-xl bg-muted/60 p-2 text-muted-foreground/80 shrink-0">
                {activeTab === "Hama" ? (
                  <Bug className="h-4 w-4" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
              </div>
              
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-sm font-bold text-foreground truncate">
                  {item.name}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 mt-0.5">
                  ID: {item.id.slice(0, 5)}...
                </span>
              </div>
            </div>

            {/* Sektor Kanan: Tombol Hapus (Aman di HP) */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (confirm(`Yakin ingin menghapus ${activeTab.toLowerCase()} "${item.name}"?`)) {
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

      {/* Empty State / Data Kosong */}
      {filteredKendala.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-3xl bg-muted/10 text-center text-muted-foreground">
          <ShieldAlert className="h-8 w-8 opacity-20 mb-2" />
          <p className="text-xs font-semibold">Belum ada rekam data {activeTab.toLowerCase()}.</p>
          <p className="text-[10px] opacity-70">Gunakan tombol di atas untuk mendaftarkan jenis baru.</p>
        </div>
      )}
    </div>
  );
}
