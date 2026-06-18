import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

export default defineConfig({
  // Schema yang benar
  schema: "./lib/db/src/schema.ts",        // ← Ubah ke ini
  // Atau kalau mau lebih fleksibel:
  // schema: "./lib/db/src/**/*.ts",

  out: "./drizzle",                       // folder untuk migration
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Tambahan biar lebih strict
  verbose: true,
  strict: true,
});