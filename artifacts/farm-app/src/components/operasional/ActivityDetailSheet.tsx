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
  Users,
  Pencil,
  AlertTriangle,
  Thermometer,
  TrendingUp,
  Save,
  X
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button"; 
import { Badge } from "@/components/ui/badge";

export function ActivityDetailSheet({ onClose = () => {} }: any) {
  // Buka terus secara default untuk keperluan mockup UI
  return (
    <Sheet open={true} onOpenChange={onClose}>
      <SheetContent
        side="right"
        // 🌟 BLUEPRINT 1: Frosted Glass & Tactile Hierarchy
        className="w-full border-l border-border/20 bg-background/80 backdrop-blur-2xl p-0 sm:max-w-[540px] [&>button]:hidden shadow-[-10px_0_50px_rgba(0,0,0,0.08)]"
      >
        <div className="flex h-full flex-col">

          {/* TOP BAR / HEADER */}
          <SheetHeader className="border-b border-border/30 bg-background/50 px-6 py-4">
            <div className="flex items-center justify-between gap-3 w-full">
              
              {/* Dropdown Status Soft Pill */}
              <div className="flex cursor-pointer items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-1.5 shadow-sm transition-all hover:bg-amber-500/20">
                <span className="text-[11px] font-black uppercase tracking-widest text-amber-600">
                  Dalam Proses
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-amber-600/70" />
              </div>

              {/* Tombol Kembali Squircle */}
              <button 
                onClick={onClose}
                className="group flex h-8 items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 pl-3 pr-1 transition-all hover:bg-primary/10"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Tutup</span>
                <div className="rounded-lg bg-primary p-1 text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>

            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar text-left space-y-8">
            
            {/* 🌟 HERO IDENTITY */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <span>08:30 WIB</span>
                <span className="text-border/50">•</span>
                <span className="text-foreground">08 Jul 2026</span>
                <span className="text-border/50">•</span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">24 HST</span>
              </div>
              
              {/* 🌟 BLUEPRINT 2: Visual Affordance for Inline Editing (Dashed border + Pencil hint on hover) */}
              <div className="group relative -ml-2 rounded-xl p-2 transition-colors hover:bg-muted/40 cursor-text inline-block w-full">
                <h2 className="text-3xl font-black tracking-tight text-foreground border-b-2 border-dashed border-primary/30 pb-1 inline-block">
                  Penyemprotan Fungisida & Kalsium
                </h2>
                <Pencil className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary opacity-0 transition-opacity group-hover:opacity-50" />
              </div>

              {/* Properties Badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/30 bg-muted/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground shadow-sm cursor-not-allowed">
                  <Lock className="h-3 w-3 opacity-50" /> Area A - Cabai Ori
                </div>
                <div className="group inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border/40 bg-card px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary shadow-sm hover:border-primary/40 transition-colors">
                  <Sprout className="h-3 w-3" /> Perawatan
                  <ChevronDown className="h-3 w-3 opacity-50 ml-1 transition-transform group-hover:translate-y-0.5" />
                </div>
              </div>
            </div>

            {/* 🌟 TELEMETRY & METRICS */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Detail Aktivitas</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* 🌟 BLUEPRINT 3: Interactive Input Card (pH Tanah) */}
                <div className="group relative rounded-[1.25rem] border border-border/50 bg-card p-4 shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-text">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Thermometer className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">pH Tanah</span>
                    </div>
                    <Pencil className="h-3.5 w-3.5 text-primary opacity-30 transition-opacity group-hover:opacity-100" />
                  </div>
                  <p className="text-2xl font-black text-foreground border-b border-dashed border-primary/20 inline-block pb-0.5">
                    6.5
                  </p>
                </div>

                {/* 🌟 BLUEPRINT 3: Read-Only Telemetry Card (Durasi) */}
                <div className="rounded-[1.25rem] border border-border/20 bg-muted/30 p-4 shadow-inner cursor-not-allowed relative overflow-hidden">
                  <div className="flex items-center gap-2 text-muted-foreground/70 mb-1.5">
                    <Clock3 className="h-4 w-4 opacity-70" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Durasi</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <p className="text-2xl font-black text-muted-foreground font-mono">2</p>
                    <span className="text-xs font-bold text-muted-foreground/70 tracking-normal">Jam</span>
                  </div>
                  <Lock className="absolute right-4 top-4 h-3.5 w-3.5 text-muted-foreground/30" />
                </div>
              </div>
            </section>

            {/* 🌟 PRESISI BAHAN & DOSIS */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Racikan Produk</h3>
              </div>

              <div className="rounded-[1.25rem] border border-border/30 bg-muted/20 p-3 shadow-inner flex flex-col gap-3">
                
                {/* 🌟 BLUEPRINT 4: Product Pill Card (Normal) */}
                <div className="flex items-center gap-2 rounded-xl bg-card border border-border/50 p-2 shadow-sm">
                  <div className="flex-1 px-2 cursor-pointer">
                    <p className="text-xs font-bold text-foreground">Kalsium Cap Tawon</p>
                    <p className="text-[9px] font-medium text-muted-foreground mt-0.5">Sisa: 1000 gr</p>
                  </div>
                  <div className="flex items-center border-l border-border/30 pl-3">
                    <div className="w-12 border-b border-dashed border-primary/30 text-right cursor-text group relative">
                      <span className="text-sm font-black text-foreground">50</span>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground ml-1.5 mr-2">gr</span>
                  </div>
                  <button className="rounded-lg bg-destructive/5 p-1.5 text-destructive transition-colors hover:bg-destructive/15">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* 🌟 BLUEPRINT 4: Product Pill Card (Over-Stock Visual Alert) */}
                <div className="flex flex-col gap-2 rounded-xl bg-destructive/5 border border-destructive/30 p-2 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-2 cursor-pointer">
                      <p className="text-xs font-bold text-destructive">Antracol 70WP</p>
                      <p className="text-[9px] font-bold text-destructive/70 mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Maks: 450 gr
                      </p>
                    </div>
                    <div className="flex items-center border-l border-destructive/20 pl-3">
                      <div className="w-12 border-b border-destructive text-right cursor-text bg-destructive/10 rounded px-1">
                        <span className="text-sm font-black text-destructive">500</span>
                      </div>
                      <span className="text-[10px] font-bold text-destructive ml-1.5 mr-2">gr</span>
                    </div>
                    <button className="rounded-lg bg-destructive/10 p-1.5 text-destructive transition-colors hover:bg-destructive/20">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Peringatan Keras di bawahnya */}
                  <div className="px-2 pb-1 text-[10px] font-bold text-destructive flex items-center gap-1">
                    ⚠️ Melebihi sisa stok gudang!
                  </div>
                </div>

                <Button variant="ghost" className="w-full border border-dashed border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 text-xs font-bold h-9 rounded-xl transition-colors">
                  <Plus className="h-4 w-4 mr-2" /> Tambah Produk
                </Button>

                {/* 🌟 BLUEPRINT 4: Primary Glow Save Button */}
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_4px_15px_-3px_rgba(var(--primary),0.4)] text-xs font-bold h-10 rounded-xl transition-all hover:-translate-y-0.5">
                  <Save className="h-4 w-4 mr-2" /> Simpan Racikan Produk
                </Button>
              </div>
            </section>

            {/* 🌟 CATATAN INTERAKTIF */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Catatan Observasi</h3>
              </div>
              <div className="group relative rounded-[1.25rem] border border-border/30 bg-card p-4 shadow-sm min-h-[100px] transition-colors hover:border-primary/40 cursor-text">
                <Pencil className="absolute right-4 top-4 h-4 w-4 text-primary opacity-0 transition-opacity group-hover:opacity-50" />
                <p className="text-sm font-medium text-foreground/80 leading-relaxed">
                  Kondisi cuaca gerimis, penyemprotan ditambah perekat. Daun bawah mulai menunjukkan gejala bercak kuning ringan, butuh pantauan lusa.
                </p>
                <div className="mt-4 border-b border-dashed border-primary/20 w-8" />
              </div>
            </section>

            {/* 🌟 BLUEPRINT 5: TIM KEBUN (Interactive Multi-Select Badge) */}
            <section className="space-y-3 pb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tim Bertugas</h3>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 p-3 rounded-[1.25rem] border border-border/30 bg-muted/20 shadow-inner">
                {/* Active Badges with Remove button */}
                <div className="group flex items-center gap-1 rounded-full border border-border/50 bg-card pl-3 pr-1 py-1 shadow-sm transition-colors hover:border-destructive/40 cursor-pointer">
                  <Users className="h-3 w-3 text-muted-foreground group-hover:text-destructive transition-colors" />
                  <span className="text-[11px] font-bold text-foreground px-1">Budi (Mandor)</span>
                  <div className="rounded-full p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />
                  </div>
                </div>
                
                <div className="group flex items-center gap-1 rounded-full border border-border/50 bg-card pl-3 pr-1 py-1 shadow-sm transition-colors hover:border-destructive/40 cursor-pointer">
                  <Users className="h-3 w-3 text-muted-foreground group-hover:text-destructive transition-colors" />
                  <span className="text-[11px] font-bold text-foreground px-1">Yanto</span>
                  <div className="rounded-full p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-3 w-3" />
                  </div>
                </div>

                {/* Add Worker Button (Affordance) */}
                <button className="flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 bg-primary/5 px-3 py-1 text-[11px] font-bold text-primary transition-all hover:bg-primary/15 hover:border-primary/60 shadow-sm">
                  <Plus className="h-3 w-3" /> Tambah Tim
                </button>
              </div>
            </section>

          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
