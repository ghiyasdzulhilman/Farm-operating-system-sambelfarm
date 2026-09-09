import type { QueryClient } from "@tanstack/react-query";
import { getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";

import type { DashboardCycleStatusFilter } from "@/types/dashboard";

const kunciDasarFeedAgronomi = ["agronomy-feed-supabase"] as const;

export const kunciQueryFeedAgronomi = {
  semua: kunciDasarFeedAgronomi,
  berdasarkanStatusSiklus: (statusSiklus: DashboardCycleStatusFilter) =>
    [...kunciDasarFeedAgronomi, statusSiklus] as const,
};

export const kunciQueryDashboard = {
  semua: getGetDashboardSummaryQueryKey(),
  ringkasan: (statusSiklus: DashboardCycleStatusFilter) =>
    [...getGetDashboardSummaryQueryKey(), statusSiklus] as const,
};

export async function segarkanDashboard(queryClient: QueryClient) {
  await queryClient.invalidateQueries({ queryKey: kunciQueryDashboard.semua });
}

export async function segarkanFeedDanDashboard(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: kunciQueryFeedAgronomi.semua }),
    segarkanDashboard(queryClient),
  ]);
}
