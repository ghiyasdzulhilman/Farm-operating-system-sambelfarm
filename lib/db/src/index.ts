import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Debugging buat mastiin URL yang kebaca emang yang "oqhyd..." itu
console.log("--- DEBUGGING CONNECTION ---");
const dbUrl = process.env.DATABASE_URL;
console.log("Database URL is set:", !!dbUrl);
console.log("Host:", dbUrl ? new URL(dbUrl).host : "N/A");
console.log("----------------------------");

if (!dbUrl) {
  throw new Error("DATABASE_URL must be set in Secrets!");
}

// Koneksi Direct (Tanpa SSL/SSL mode disable)
// Ini cara paling stabil buat Replit ke Supabase Direct Port 5432
export const pool = new Pool({ 
  connectionString: dbUrl,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
