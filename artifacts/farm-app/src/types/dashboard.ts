export type DashboardSiklusFilter = "aktif" | "selesai" | "semua";
export type DashboardTimeFilter = "Semua Waktu" | "7 Hari" | "30 Hari" | "90 Hari" | "Kustom";

export type DashboardDateRange = {
  start: string;
  end: string;
};

export type DashboardFilters = {
  areaId: string;
  siklus: DashboardSiklusFilter;
  time: DashboardTimeFilter;
  customDateRange: DashboardDateRange | null;
};

export type DashboardAreaOption = {
  id: string;
  name: string;
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

export type DashboardActivity = {
  type: "harvest" | "expense";
  title: string;
  description: string;
  time: string;
};

export type DashboardSummary = {
  filters: {
    areaId: string | null;
    siklus: DashboardSiklusFilter;
    startDate: string | null;
    endDate: string | null;
  };
  filterOptions: {
    areas: DashboardAreaOption[];
  };
  financial: {
    totalModal: number;
    totalPendapatan: number;
    totalPengeluaran: number;
    labaRugi: number;
    marginTotal: number;
    bepProgress: number;
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
  currency: "IDR";
  lastUpdated: string;
};
