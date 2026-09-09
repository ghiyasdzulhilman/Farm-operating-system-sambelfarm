export type DashboardCycleStatusFilter = "aktif" | "selesai";
export type DashboardTimeFilter = "Semua Waktu" | "7 Hari" | "30 Hari" | "90 Hari" | "Kustom";

export type DashboardDateRange = {
  start: string;
  end: string;
};

export type DashboardContext = {
  siklusId: string;
  areaId: string;
  areaName: string;
  namaSiklus: string;
  statusSiklus: "Aktif" | "Selesai" | "Ditutup";
  tanggalPindahTanam: string;
  modalAwal: number;
  label: string;
};

export type DashboardDailyFact = {
  date: string;
  siklusId: string | null;
  areaId: string | null;
  pendapatan: number;
  pengeluaran: number;
  harvestWeight: number;
  harvestCount: number;
};

export type DashboardCostFact = {
  date: string;
  siklusId: string | null;
  areaId: string | null;
  kategoriId: string | null;
  kategoriName: string;
  totalBiaya: number;
};

export type DashboardActivity = {
  id: string;
  type: "harvest" | "expense";
  siklusId: string | null;
  areaId: string | null;
  occurredAt: string;
  title: string;
  description: string;
};

export type DashboardDataset = {
  cycleStatus: DashboardCycleStatusFilter;
  contexts: DashboardContext[];
  facts: DashboardDailyFact[];
  costFacts: DashboardCostFact[];
  activities: DashboardActivity[];
  meta: {
    generatedAt: string;
    timezone: "Asia/Jakarta";
  };
};

export type DashboardAreaSummary = {
  id: string;
  name: string;
  modalAwal: number;
  pendapatan: number;
  pengeluaran: number;
  profit: number;
  margin: number;
  harvestWeight: number;
};

export type DashboardCostBreakdownItem = {
  kategoriId: string | null;
  name: string;
  amount: number;
  percentage: number;
};

export type DashboardDerivedSummary = {
  financial: {
    totalModal: number;
    totalPendapatan: number;
    totalPengeluaran: number;
    labaRugi: number;
    marginTotal: number;
    bepProgress: number;
    cashCostPerKg: number;
    costBreakdown: DashboardCostBreakdownItem[];
  };
  production: {
    totalHarvestWeight: number;
    hpp: number;
    averageRevenuePerKg: number;
  };
  operational: {
    totalAreas: number;
    activeAreas: number;
  };
  insight: {
    businessStatus: string;
    recommendation: string;
  };
  areas: DashboardAreaSummary[];
  activities: DashboardActivity[];
};
