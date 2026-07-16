import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit3, Trash2, ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { KategoriKeuanganFormModal } from "./KategoriKeuanganFormModal";

export function KategoriKeuanganManager() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // 🚀 Fetch Data dari Backend
  const { data, isLoading } = useQuery({
    queryKey: ["kategori-keuangan"],
    queryFn: async () => {
      const res = await fetch("/api/finance/kategori");
      if (!res.ok) throw new Error("Gagal mengambil data");
      return res.json();
    },
  });

  // 🚀 Logic Tambah/Edit Data
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const url = editingItem ? `/api/finance/kategori/${editingItem.id}` : "/api/finance/kategori";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Gagal menyimpan data");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kategori-keuangan"] });
      toast({ title: "Sukses", description: "Kategori berhasil disimpan!" });
      setIsModalOpen(false);
      setEditingItem(null);
    },
    onError: () => toast({ title: "Error", description: "Terjadi kesalahan sistem.", variant: "destructive" }),
  });

  // 🚀 Logic Hapus Data
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/finance/kategori/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus data");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kategori-keuangan"] });
      toast({ title: "Terhapus", description: "Kategori berhasil dihapus." });
    },
    onError: () => toast({ title: "Error", description: "Gagal menghapus. Kategori mungkin sedang dipakai.", variant: "destructive" }),
  });

  const kategoriList = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header Segmen */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-[2rem] border border-border/40 shadow-sm">
        <div>
          <h2 className="text-xl font-black tracking-tight">Kategori Keuangan</h2>
          <p className="text-sm text-muted-foreground mt-1">Kelola pos pendapatan dan pengeluaran</p>
        </div>
        <Button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="rounded-xl font-bold shadow-sm">
          <Plus className="h-4 w-4 mr-2" /> Kategori Baru
        </Button>
      </div>

      {/* List Kategori */}
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 className="h-6 w-6 animate-spin text-primary opacity-50" />
        </div>
      ) : kategoriList.length === 0 ? (
        <div className="text-center p-10 border border-dashed border-border/50 rounded-[2rem] text-muted-foreground">
          Belum ada kategori keuangan yang terdaftar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {kategoriList.map((kat: any) => (
            <div key={kat.id} className="group relative flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card hover:border-primary/20 transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${kat.tipe === "pendapatan" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                  {kat.tipe === "pendapatan" ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-foreground leading-tight">{kat.nama}</h3>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">{kat.tipe}</p>
                </div>
              </div>
              
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setEditingItem(kat); setIsModalOpen(true); }} className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { if(confirm("Hapus kategori ini?")) deleteMutation.mutate(kat.id); }} className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Eksekusi */}
      <KategoriKeuanganFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={editingItem} 
        onSave={(payload) => saveMutation.mutate(payload)}
        isLoading={saveMutation.isPending}
      />
    </div>
  );
}
