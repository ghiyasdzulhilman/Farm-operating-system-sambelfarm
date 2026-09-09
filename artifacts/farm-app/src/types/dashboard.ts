export type DashboardCycleStatusFilter = "aktif" | "selesai";
export type DashboardTimeFilter = "Semua Waktu" | "7 Hari" | "30 Hari" | "90 Hari" | "Kustom";
export type DashboardOperationalStatus = "pending" | "in_progress" | "completed";
export type DashboardOperationalModule = "perawatan" | "inspeksi" | "operasional";
export type DashboardActivityType = DashboardOperationalModule | "harvest" | "expense";

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

export type DashboardOperationalEvent = {
  id: string;
  module: DashboardOperationalModule;
  siklusId: string | null;
  areaId: string | null;
  occurredAt: string;
  finishedAt: string | null;
  title: string;
  originalStatus: string;
  normalizedStatus: DashboardOperationalStatus;
  durationHours: number;
  priority: string | null;
  phTanah: number | null;
  tingkatSerangan: number | null;
  radius: number | null;
};

export type DashboardActivity = {
  id: string;
  type: DashboardActivityType;
  siklusId: string | null;
  areaId: string | null;
  occurredAt: string;
  title: string;
  description: string;
  status: string | null;
};

export type DashboardDataset = {
  cycleStatus: DashboardCycleStatusFilter;
  contexts: DashboardContext[];
  facts: DashboardDailyFact[];
  costFacts: DashboardCostFact[];
  operationalEvents: DashboardOperationalEvent[];
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

export type DashboardProductionTrendPoint = {
  date: string;
  harvestWeight: number;
  harvestCount: number;
  revenue: number;
};

export type DashboardProductionAreaRank = {
  id: string;
  name: string;
  harvestWeight: number;
  revenue: number;
  revenuePerKg: number;
};

export type DashboardOperationalModuleSummary = {
  module: DashboardOperationalModule;
  count: number;
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
    harvestCount: number;
    averageKgPerHarvest: number;
    averageRevenuePerKg: number;
    trend: DashboardProductionTrendPoint[];
    areaRanking: DashboardProductionAreaRank[];
  };
  operational: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    byModule: DashboardOperationalModuleSummary[];
  };
  insight: {
    businessStatus: string;
    recommendation: string;
  };
  areas: DashboardAreaSummary[];
  activities: DashboardActivity[];
};
