import {
  CalendarDays,
  ChevronDown,
  ArrowRight,
  Clock3,
  Banknote,
  Lock,
  Plus,
  Trash2,
  Sprout,
  Users
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button"; 
import { Badge } from "@/components/ui/badge";

export function ActivityDetailSheet({ onClose = () => {} }: any) {
  // Buka terus secara default untuk keperluan mockup
  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent
        side="right"
        // 🌟 1. CONTAINER BACKDROP KACA KUSAM
        className="w-full border-l border-border/30 bg-background/85 backdrop-blur-3xl p-0 sm:max-w-[520px] [&>button]:hidden shadow-[-10px_0_40px_rgba(0,0,0,0.05)]"
      >
        <div className="flex h-full flex-col">

          {/* 🌟 2. HEADER FLOATING */}
          <SheetHeader className="border-b border-border/40 bg-background/40 px-6 py-4">
            <div className="flex items-center justify-between gap-3 w-full">
              
              {/* Dropdown Status Soft Pill */}
              <div className="flex cursor-pointer items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-1.5 shadow-[0_4px_15px_-3px_rgba(245,158,11,0.15)] transition-all hover:bg-amber-500/20">
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-600">
                  Dalam Proses
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-amber-600/70" />
              </div>

              {/* Tombol Kembali Squircle */}
              <button 
                onClick={onClose}
                className="group flex h-8 items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 pl-3 pr-1 transition-all hover:bg-primary/10 hover:shadow-[0_4px_15px_-3px_rgba(var(--primary),0.2)]"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Tutup
                </span>
                <div className="rounded-lg bg-primary p-1 text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>

            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar text-left space-y-8">
            
            {/* 🌟 3. HERO IDENTITY (GAYA NOTION) */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <span>08:30 WIB</span>
                <span className="text-border/50">•</span>
                <span className="text-foreground">08 Jul 2026</span>
                <span className="text-border/50">•</span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">24 HST</span>
              </div>
              
              {/* Judul Inline Edit (Hover untuk lihat efek) */}
              <h2 className="text-3xl font-black tracking-tight text-foreground -ml-2 p-2 rounded-xl cursor-pointer hover:bg-muted/40 transition-colors">
                Penyemprotan Fungisida & Kalsium
              </h2>

              {/* Properties Badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] cursor-not-allowed">
                  <Lock className="h-3 w-3 opacity-50" /> Area A - Cabai Ori
                </div>
                <div className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border/40 bg-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] hover:border-primary/30">
                  <Sprout className="h-3 w-3" /> Perawatan
                  <ChevronDown className="h-3 w-3 opacity-50 ml-1" />
                </div>
              </div>
            </div>

            {/* 🌟 4. TELEMETRY & METRICS (SOFT TILES) */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Detail Aktivitas</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Tile 1 */}
                <div className="rounded-[1.25rem] border border-border/30 bg-card p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.06)] transition-all cursor-pointer">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                    <Clock3 className="h-4 w-4 opacity-70" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Durasi</span>
                  </div>
                  <p className="text-2xl font-black text-foreground">
                    2<span className="text-xs font-bold text-muted-foreground ml-1 tracking-normal">Jam</span>
                  </p>
                </div>

                {/* Tile 2 (Khusus Kalkulasi Uang) */}
                <div className="rounded-[1.25rem] border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.05)] cursor-pointer">
                  <div className="flex items-center gap-2 text-emerald-600/80 mb-1.5">
                    <Banknote className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Estimasi Biaya</span>
                  </div>
                  <p className="text-xl font-black text-emerald-700 tracking-tight">
                    Rp 45.000
                  </p>
                </div>
              </div>
            </section>

            {/* 🌟 5. PRESISI BAHAN & DOSIS (LEDGER STYLE) */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Racikan Produk</h3>
              </div>

              <div className="rounded-[1.25rem] border border-border/30 bg-card p-2 shadow-inner">
                
                {/* Baris Ledger 1 */}
                <div className="flex items-center gap-2 rounded-xl bg-background border border-border/40 p-2 shadow-sm mb-2 group">
                  <div className="flex-1 px-2 cursor-pointer">
                    <p className="text-xs font-bold text-foreground">Antracol 70WP</p>
                    <p className="text-[9px] font-medium text-muted-foreground mt-0.5">Sisa di gudang: 450 gr</p>
                  </div>
                  <div className="flex items-center border-l border-border/40 pl-3">
                    <input type="text" value="30" readOnly className="w-10 bg-transparent text-right text-sm font-black outline-none" />
                    <span className="text-[10px] font-bold text-muted-foreground ml-1 mr-2 select-none">gr</span>
                  </div>
                  <button className="rounded-lg bg-destructive/5 p-1.5 text-destructive transition-colors hover:bg-destructive/15">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Baris Ledger 2 */}
                <div className="flex items-center gap-2 rounded-xl bg-background border border-border/40 p-2 shadow-sm mb-2 group">
                  <div className="flex-1 px-2 cursor-pointer">
                    <p className="text-xs font-bold text-foreground">Kalsium Cap Tawon</p>
                    <p className="text-[9px] font-medium text-muted-foreground mt-0.5">Sisa di gudang: 1000 gr</p>
                  </div>
                  <div className="flex items-center border-l border-border/40 pl-3">
                    <input type="text" value="50" readOnly className="w-10 bg-transparent text-right text-sm font-black outline-none" />
                    <span className="text-[10px] font-bold text-muted-foreground ml-1 mr-2 select-none">gr</span>
                  </div>
                  <button className="rounded-lg bg-destructive/5 p-1.5 text-destructive transition-colors hover:bg-destructive/15">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <Button variant="ghost" className="w-full border border-dashed border-primary/30 text-primary hover:bg-primary/10 text-xs font-bold h-9 rounded-xl">
                  <Plus className="h-4 w-4 mr-2" /> Tambah Produk
                </Button>
              </div>
            </section>

            {/* 🌟 6. CATATAN INTERAKTIF (INNER SHADOW) */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Catatan Observasi</h3>
              </div>
              <div className="rounded-[1.25rem] border border-border/30 bg-muted/20 p-4 shadow-inner min-h-[100px] transition-colors hover:bg-muted/30 cursor-text">
                <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                  Kondisi cuaca gerimis, penyemprotan ditambah perekat. Daun bawah mulai menunjukkan gejala bercak kuning ringan, butuh pantauan lusa.
                </p>
              </div>
            </section>

            {/* 🌟 7. TIM KEBUN */}
            <section className="space-y-3 pb-8">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tim Bertugas</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-xl px-3 py-1 shadow-sm bg-card border-border/40">
                  <Users className="h-3 w-3 mr-1.5 text-muted-foreground" /> Budi (Mandor)
                </Badge>
                <Badge variant="outline" className="rounded-xl px-3 py-1 shadow-sm bg-card border-border/40">
                  <Users className="h-3 w-3 mr-1.5 text-muted-foreground" /> Yanto
                </Badge>
              </div>
            </section>

          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
