import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  // ✨ INI KUNCINYA: Kita daftarin manual biar dia gak bisa ngeles lagi!
  schema: [
    path.join(__dirname, "./src/schema/index.ts"),
    path.join(__dirname, "./src/schema/stagingData.ts")
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
