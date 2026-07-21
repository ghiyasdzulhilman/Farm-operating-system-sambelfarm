import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, CalendarDays, DollarSign, PackageOpen, ShoppingCart, Tag, CheckCircle2 } from "lucide-react";

interface FormPanenProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FormPanen({ isOpen, onClose }: FormPanenProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- FORM STATES ---
  const [areaId, setAreaId] = useState("");
  const [siklusId, setSiklusId] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [kegiatan, setKegiatan] = useState("Panen Rutin");
  const [kuantitasKg, setKuantitasKg] = useState("");
  const [hargaJualPerKg, setHargaJualPerKg] = useState("");
  const [kualitas, setKualitas] = useState("");
  const [channelPenjualan, setChannelPenjualan] = useState("");
  const [catatan, setCatatan] = useState("");

  // --- AUTO CALCULATE TOTAL PENDAPATAN ---
  const totalPendapatan = (Number(kuantitasKg) || 0) * (Number(hargaJualPerKg) || 0);

  // --- RESET FORM KETIKA DITUTUP ---
  useEffect(() => {
    if (!isOpen) {
      setAreaId("");
      setSiklusId("");
      setTanggal(new Date().toISOString().split('T')[0]);
      setKegiatan("Panen Rutin");
      setKuantitasKg("");
      setHargaJualPerKg("");
      setKualitas("");
      setChannelPenjualan("");
      setCatatan("");
    }
  }, [isOpen]);

  // --- FETCH DATA DROPDOWN AREA & SIKLUS AKTIF ---
  const { data: dropdownData, isLoading: isDropdownLoading } = useQuery({
    queryKey: ["harvestDropdown"],
    queryFn: async () => {
      const res = await fetch("/api/harvest/dropdown");
      if (!res.ok) throw new Error("Gagal mengambil data dropdown");
      return res.json();
    },
    enabled: isOpen, // Hanya fetch kalau lacinya dibuka
  });

  // --- MUTATION POST DATA ---
  const harvestMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/harvest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan data panen");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["harvest"] });
      toast({
        title: "Sukses!",
        description: "Data panen berhasil dicatat.",
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      });
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Gagal menyimpan",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!kuantitasKg || !hargaJualPerKg || !tanggal) {
      toast({
        title: "Validasi Gagal",
        description: "Tanggal, kuantitas (Kg), dan Harga Jual wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    harvestMutation.mutate({
      areaId,
      siklusId,
      tanggal,
      kegiatan,
      kuantitasKg,
      hargaJualPerKg,
      kualitas,
      channelPenjualan,
      catatan
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-[2rem] px-4 pb-12 sm:max-w-md mx-auto">
        <SheetHeader className="mb-6 text-left">
          <SheetTitle className="text-2xl font-black flex items-center gap-2">
            <PackageOpen className="h-6 w-6 text-primary" />
            Catat Panen
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Masukkan data hasil panen dan pendapatan dari kebun.
          </p>
        </SheetHeader>

        {isDropdownLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* GROUP 1: SUMBER TANAMAN */}
            <div className="space-y-4 rounded-2xl border border-border/50 bg-muted/20 p-4">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Area / Blok 
                </label>
                <select
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Pilih Area...</option>
                  {dropdownData?.areas?.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Siklus Tanam Aktif
                </label>
                <select
                  value={siklusId}
                  onChange={(e) => setSiklusId(e.target.value)}
                  className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Pilih Siklus (Opsional)...</option>
                  {dropdownData?.siklus?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.namaSiklus}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Tanggal Panen</label>
                <Input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="h-12 rounded-xl"
                  required
                />
              </div>
            </div>

            {/* GROUP 2: HASIL & PENDAPATAN */}
            <div className="space-y-4 rounded-2xl border border-border/50 bg-primary/5 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <PackageOpen className="h-4 w-4 text-primary" />
                    Kuantitas (Kg)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Contoh: 15.5"
                    value={kuantitasKg}
                    onChange={(e) => setKuantitasKg(e.target.value)}
                    className="h-12 rounded-xl font-mono text-lg"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Harga/Kg (Rp)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Contoh: 12000"
                    value={hargaJualPerKg}
                    onChange={(e) => setHargaJualPerKg(e.target.value)}
                    className="h-12 rounded-xl font-mono text-lg"
                    required
                  />
                </div>
              </div>

              {/* LIVE CALCULATION DISPLAY */}
              <div className="flex items-center justify-between rounded-xl bg-primary p-4 text-primary-foreground shadow-inner">
                <span className="text-sm font-medium opacity-90">Total Pendapatan:</span>
                <span className="text-2xl font-black tabular-nums">
                  Rp {totalPendapatan.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* GROUP 3: DETAIL TAMBAHAN (OPSIONAL) */}
            <div className="space-y-4 rounded-2xl border border-border/50 bg-muted/20 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                    <Tag className="h-4 w-4" />
                    Grade / Kualitas
                  </label>
                  <select
                    value={kualitas}
                    onChange={(e) => setKualitas(e.target.value)}
                    className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">(Kosong)</option>
                    <option value="Grade A">Grade A</option>
                    <option value="Grade B">Grade B</option>
                    <option value="Sortiran">Sortiran / Afkir</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                    <ShoppingCart className="h-4 w-4" />
                    Dijual ke
                  </label>
                  <Input
                    type="text"
                    placeholder="Misal: Tengkulak, Pasar..."
                    value={channelPenjualan}
                    onChange={(e) => setChannelPenjualan(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-muted-foreground">Catatan Khusus</label>
                <Textarea
                  placeholder="Kondisi cuaca saat panen, atau keterangan lainnya..."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="min-h-[80px] rounded-xl resize-none"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={harvestMutation.isPending} 
              className="h-14 w-full rounded-2xl text-lg font-bold shadow-lg"
            >
              {harvestMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Hasil Panen"
              )}
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
