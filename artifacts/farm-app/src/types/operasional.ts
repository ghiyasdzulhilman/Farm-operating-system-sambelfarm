// 🚀 FIX: Hapus "finance", ganti jadi "pengeluaran" dan "panen"
export type ModuleKey = "all" | "perawatan" | "inspeksi" | "operasional" | "pengeluaran" | "panen";
  
export type ViewKey = "feed" | "modules" | "table" | "kanban";

export type AgronomyItem = {
  id: string;
  module: Exclude<ModuleKey, "all">;
  title: string;
  area: string;
  time: string;
  dateLabel: string;
  tanggalPindahTanam?: string | null;
  status: "Selesai" | "Dalam proses" | "Belum dikerjakan";
  priority: "High" | "Medium" | "Low";
  duration: string;
  category: string;
  workers: string[];
  notes?: string;
  attachments: string[];
  history: Array<{ time: string; text: string }>;
  icon: "sprout" | "leaf" | "wrench" | "banknote";
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
