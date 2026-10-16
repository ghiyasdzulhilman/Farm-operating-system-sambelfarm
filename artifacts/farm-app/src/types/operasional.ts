// 🚀 FIX: Hapus "finance", ganti jadi "pengeluaran" dan "panen"
export type ModuleKey = "all" | "perawatan" | "inspeksi" | "operasional" | "pengeluaran" | "panen";
  
export type ViewKey = "feed" | "modules" | "table" | "kanban";

export type StatusAgronomi =
  | "Selesai"
  | "Dalam proses"
  | "Belum dikerjakan"
  | "Sudah ditangani"
  | "Sedang ditangani"
  | "Baru ditemukan";

export type AgronomyItem = {
  id: string;
  module: Exclude<ModuleKey, "all">;
  title: string;
  area: string;
  areaId?: string | null;
  siklusId?: string | null;
  namaSiklus?: string;
  time: string;
  dateLabel: string;
  rawDate: string;
  tanggalPindahTanam?: string | null;
  status: StatusAgronomi;
  priority: "High" | "Medium" | "Low";
  duration: string;
  category: string;
  kategoriId?: string | null;
  tagCategoryId?: string | null;
  produkId?: string | null;
  workers: string[];
  notes?: string;
  attachments: string[];
  history: Array<{ time: string; text: string }>;
  icon: "sprout" | "leaf" | "wrench" | "banknote" | "shoppingBasket";
  isPendingStaging?: boolean;
  source?: {
    type: "notion" | "staging";
    databaseType?: string;
    pageId?: string;
    stagingId?: string;
    url?: string;
  };
  metaEkstra?: Record<string, any>;
};
