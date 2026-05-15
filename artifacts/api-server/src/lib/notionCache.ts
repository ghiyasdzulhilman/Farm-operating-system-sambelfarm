import NodeCache from "node-cache";

/** TTL = 5 minutes, check for expired keys every 60 s */
export const notionCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/** Unique cache key per user */
export function getDashboardCacheKey(userId: string): string {
  return `notion_dashboard_${userId}`;
}

/** Resolves after `ms` milliseconds — used to pace sequential Notion requests */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
