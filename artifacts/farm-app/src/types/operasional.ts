export type ModuleKey = "all" | "perawatan" | "inspeksi" | "operasional" | "finance";
export type ViewKey = "feed" | "modules" | "table";

export type AgronomyItem = {
  id: string;
  module: Exclude<ModuleKey, "all">;
  title: string;
  area: string;
  time: string;
  dateLabel: string;
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
};
