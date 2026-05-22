import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

console.log("--- DEBUGGING CONNECTION ---");
const dbUrl = process.env.DATABASE_URL;
console.log("Database URL is set:", !!dbUrl);
console.log("Host:", dbUrl ? new URL(dbUrl).host : "N/A");
console.log("----------------------------");

if (!dbUrl) {
  throw new Error("DATABASE_URL must be set in Secrets!");
}

export const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

export const db = drizzle(pool, { schema });

export * from "./schema";