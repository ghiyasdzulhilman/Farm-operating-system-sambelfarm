import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// 1. DEBUGGER: Cek apa yang dibaca oleh aplikasi
console.log("--- DEBUG START ---");
console.log("DATABASE_URL detected:", process.env.DATABASE_URL ? "YES (Valid)" : "NO (Missing)");
console.log("Full URL value:", process.env.DATABASE_URL); 
console.log("--- DEBUG END ---");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 2. POOL: Pake SSL mode untuk tembus firewall/Replit DNS
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Wajib buat koneksi cloud ke Supabase
  }
});

export const db = drizzle(pool, { schema });

export * from "./schema";
