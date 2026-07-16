import { ChevronDown, Trash2, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import type { AgronomyItem } from "@/types/operasional";

interface PerawatanRacikanProps {
  item: AgronomyItem;
  editedProducts: Array<any>;
  setEditedProducts: (val: Array<any>) => void;
  isDirty: boolean;
  setIsDirty: (val: boolean) => void;
  produkOptions: any;
  onProdukChange?: (id: string, logProduk: any[]) => Promise<any>;
  isUpdatingProduk?: boolean;
}

export function PerawatanRacikan({
  item,
  editedProducts,
  setEditedProducts,
  isDirty,
  setIsDirty,
  produkOptions,
  onProdukChange,
  isUpdatingProduk = false,
}: PerawatanRacikanProps) {
  const queryClient = useQueryClient();

  if (item.module !== "perawatan") return null;

  return (
    <section className="mt-6 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
        <h3 className="text-[12px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80">
          Bahan & Dosis
        </h3>
      </div>

      <div className="rounded-3xl border border-border/40 bg-card p-4 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.04)] flex flex-col">
        {editedProducts.length === 0 ? (
          <div className="text-sm text-muted-foreground italic text-center py-2">Belum ada produk yang digunakan.</div>
        ) : (
          <div className="flex flex-col divide-y divide-border/30">
            {editedProducts.map((prod, index) => (
              <div key={index} className="flex gap-2 items-center py-3 first:pt-0 last:pb-0">
                {/* Dropdown Pilih Produk */}
                <div className="relative flex-1">
                  <select
                    value={prod.produkId || ""}
                    onChange={(e) => {
                      const newProds = [...editedProducts];
                      const selectedMaster = produkOptions?.data?.find((p: any) => p.id === e.target.value);
                      newProds[index] = { 
                        ...newProds[index], 
                        produkId: e.target.value,
                        namaProduk: selectedMaster?.nama,
                        satuanDasar: selectedMaster?.satuanDasar
                      };
                      setEditedProducts(newProds);
                      setIsDirty(true);
                    }}
                    className="w-full appearance-none rounded-xl bg-background border border-border/50 px-3 py-2 text-[13px] font-semibold outline-none"
                  >
                    <option value="" disabled>Pilih Produk...</option>
                    {produkOptions?.data
                      ?.filter((p: any) => p.isActive !== false || p.id === prod.produkId)
                      .map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.nama} {p.isActive === false ? "(Nonaktif)" : ""}
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50 pointer-events-none" />
                </div>

                {/* Input Gram/Dosis dengan Preview Sisa Stok */}
                {(() => {
                  const selectedMaster = produkOptions?.data?.find((p: any) => p.id === prod.produkId);
                  const stokTerkini = selectedMaster?.stokSaatIni ?? null;
                  
                  const historyProd = item?.metaEkstra?.logProduk?.find((p: any) => p.produkId === prod.produkId);
                  const dosisTersimpan = historyProd ? parseFloat(String(historyProd.kuantitasPemakaian)) : 0;
                  
                  const maxAllowed = stokTerkini !== null ? stokTerkini + dosisTersimpan : null;
                  const isOverStock = maxAllowed !== null && prod.kuantitasPemakaian > maxAllowed;

                  return (
                    <div className={cn(
                      "flex items-center bg-background border rounded-xl px-2.5 w-[120px] transition-colors shrink-0",
                      isOverStock ? "border-destructive bg-destructive/5 text-destructive shadow-sm" : "border-border/50"
                    )}>
                      <input
                        type="number"
                        min="0"
                        value={prod.kuantitasPemakaian || ""}
                        onChange={(e) => {
                          const newProds = [...editedProducts];
                          newProds[index] = { ...newProds[index], kuantitasPemakaian: parseFloat(e.target.value) || 0 };
                          setEditedProducts(newProds);
                          setIsDirty(true);
                        }}
                        className={cn(
                          "w-full bg-transparent text-[13px] font-semibold outline-none py-2 text-right",
                          "placeholder:text-muted-foreground/60 placeholder:font-normal placeholder:text-[11px]",
                          isOverStock && "text-destructive font-black"
                        )}
                        placeholder={stokTerkini !== null ? `Sisa ${stokTerkini}` : "0"}
                      />
                      <span className={cn(
                        "text-[10px] font-bold ml-1.5 shrink-0 select-none",
                        isOverStock ? "text-destructive font-black" : "text-muted-foreground"
                      )}>
                        {prod.satuanDasar || selectedMaster?.satuanDasar || "gram"}
                      </span>
                    </div>
                  );
                })()}

                {/* Tombol Hapus Baris */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10"
                  onClick={() => { setEditedProducts(editedProducts.filter((_, i) => i !== index)); setIsDirty(true); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Tombol Tambah Baris (Minimalist Action Column di Kanan) */}
        <div className="flex justify-end mt-1 pt-2 border-t border-border/30">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 rounded-full transition-all"
            onClick={() => { setEditedProducts([...editedProducts, { produkId: "", kuantitasPemakaian: 0 }]); setIsDirty(true); }}
            title="Tambah Produk"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </Button>
        </div>

        {/* Tombol Simpan (Pintar & Glowing) - Hanya Muncul Jika Ada Perubahan */}
        {isDirty && (
          <div className="mt-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300">
            <Button 
              disabled={isUpdatingProduk}
              className="w-full rounded-full h-11 text-[13px] font-bold shadow-[0_4px_14px_rgba(var(--primary),0.3)] transition-all hover:shadow-[0_6px_20px_rgba(var(--primary),0.4)] hover:-translate-y-0.5 active:scale-95"
              onClick={async () => {
                try {
                  await onProdukChange?.(item.id, editedProducts);
                  
                  // Tarik ulang data setelah sukses
                  await queryClient.invalidateQueries({ queryKey: ["produk-master-list"] });
                  await queryClient.invalidateQueries({ queryKey: ["operasional-options-list"] }); 
                  
                  setIsDirty(false);
                } catch {}
              }}
            >
              {isUpdatingProduk ? (
                <>
                  <div className="h-4 w-4 mr-2 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" strokeWidth={2.5} /> 
                  Simpan Perubahan
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
