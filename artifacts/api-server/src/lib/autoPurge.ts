import { db, stagingDataTable } from "@workspace/db";
import { and, eq, lt } from "drizzle-orm";
import { logger } from "./logger";

const RETENTION_DAYS = 30;
const INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function purgeOldStagingData(userId?: string): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const conditions = [
    eq(stagingDataTable.status, "synced"),
    lt(stagingDataTable.updatedAt, cutoff),
  ];

  if (userId) {
    conditions.push(eq(stagingDataTable.userId, userId));
  }

  const deleted = await db
    .delete(stagingDataTable)
    .where(and(...conditions))
    .returning({ id: stagingDataTable.id });

  return deleted.length;
}

export function startAutoPurge(): void {
  const run = async () => {
    try {
      const count = await purgeOldStagingData();
      if (count > 0) {
        logger.info({ count }, "Auto-purge: deleted old synced staging records");
      }
    } catch (err) {
      logger.error({ err }, "Auto-purge: failed to clean staging data");
    }
  };

  run();

  setInterval(run, INTERVAL_MS);
}
