# 🌾 SambelFarm — Replit Development Guide

> **IMPORTANT:** Baca `ARCHITECTURE.md` sebelum membuat perubahan arsitektur, database, business rule, atau perubahan lintas modul.
>
> `ARCHITECTURE.md` adalah living source of context untuk arsitektur, progress, technical debt, roadmap, invariants, dan architecture changelog.
>
> File ini sengaja dibuat ringkas sebagai operational guide untuk development/testing di Replit.

## Current Product

SambelFarm adalah **Farm Operating System / farm ERP mobile-first** untuk mengelola operasi kebun dari aktivitas lapangan sampai biaya, inventory, panen, dan profitability.

Current phase:

```text
Functional Farm ERP Core → Production Hardening
```

Project saat audit 9 September 2026 diperkirakan sekitar **70–75% menuju production-ready MVP**. Fokus utama sekarang adalah reliability dan data integrity, bukan menambah sebanyak mungkin fitur baru.

## Current Architecture

```text
React 19 + Vite
        ↓
Express 5 + TypeScript
        ↓
Clerk Auth + requireOrganisasi
        ↓
Drizzle ORM
        ↓
PostgreSQL / Supabase
```

- **Monorepo:** pnpm workspaces
- **Node.js:** 24
- **TypeScript:** 5.9
- **Frontend:** React 19, Vite, Wouter, TanStack Query/Table, Tailwind v4, shadcn/Radix, React Hook Form, Zod
- **Backend:** Express 5, Clerk, Drizzle ORM, Zod, Pino
- **Database:** PostgreSQL / Supabase
- **Tenant boundary:** `organisasiId`

## ⚠️ Notion Is NOT Part of the Current Architecture

SambelFarm sekarang **100% PostgreSQL-native**.

Jangan:

- menambahkan kembali Notion OAuth;
- membuat Notion database mapping;
- menambahkan Notion access token storage;
- menggunakan Notion sebagai source of truth;
- menganggap route `/notion/*` berarti project masih menggunakan Notion.

Beberapa endpoint masih memakai prefix `/notion/*` karena **legacy naming only**. Rename akan dilakukan terpisah jika dianggap aman.

## Important Locations

```text
ARCHITECTURE.md
  Living architecture + progress reference

lib/db/src/
  Drizzle schema dan database helpers

artifacts/api-server/src/
  Express backend

artifacts/api-server/src/routes/
  Business API routes

artifacts/farm-app/src/
  React frontend

artifacts/farm-app/src/pages/AgronomyHubPage.tsx
  Operational/Agronomy hub

artifacts/farm-app/src/components/operasional/
  Feed, Kanban, Table, Detail Sheet, filters

lib/api-spec/
lib/api-zod/
lib/api-client-react/
  Legacy/partial generated API infrastructure; BUKAN source of truth lengkap saat ini
```

## Run & Verify

Gunakan command root berikut setelah perubahan signifikan:

```bash
pnpm run typecheck
pnpm run build
```

Backend development:

```bash
pnpm --filter @workspace/api-server run dev
```

Database development command yang tersedia:

```bash
pnpm --filter @workspace/db run push
```

> Jangan melakukan perubahan schema/database tanpa memahami data impact terlebih dahulu. Lihat `ARCHITECTURE.md`.

## Critical Engineering Rules

### 1. Tenant isolation is mandatory

Semua business data harus dibatasi `organisasiId`.

Jangan melakukan lookup/update/delete entity hanya berdasarkan UUID jika entity tersebut tenant-owned.

Tenant A tidak boleh dapat membaca, mengubah, atau menghapus data Tenant B.

### 2. Never mutate inventory without the ledger

`produkMaster.stokSaatIni` adalah current state.

`stock_movement` adalah historical inventory journal.

Perubahan stok harus menjaga keduanya konsisten.

### 3. Multi-table writes must be atomic

Gunakan DB transaction untuk operasi yang mengubah beberapa tabel, khususnya:

- pembelian stok;
- pemakaian produk perawatan;
- stock rollback;
- onboarding organisasi;
- mutation lain yang memiliki dependent records.

### 4. Preserve historical HPP

Historical transaction cost tidak boleh berubah hanya karena harga/HPP produk master berubah kemudian.

### 5. Validate mutations on the server

Frontend Zod validation adalah UX protection, bukan security boundary.

Target backend:

```text
HTTP request
→ Zod safeParse
→ validated input
→ business logic
→ DB transaction
```

Server-side Zod validation saat ini belum konsisten dan merupakan technical debt P0.

### 6. Respect siklus tanam

Perawatan, inspeksi, operasional, pengeluaran, dan panen dapat terkait dengan siklus. Jangan mengubah assignment/lifecycle siklus tanpa memeriksa dampaknya ke historical reporting.

### 7. Do not bypass stock rollback safety

Delete transaksi inventory-sensitive dapat diblokir dengan `LEDGER_BLOCKED` jika sudah ada transaksi lanjutan. Jangan menghapus protection ini hanya agar delete berhasil.

## Current Development Priorities

### P0 — Stability & Data Integrity

1. audit tenant isolation seluruh endpoint;
2. backend Zod validation;
3. inventory concurrency protection;
4. automated stock/HPP/rollback tests;
5. tenant-isolation tests;
6. finance constraint audit;
7. transaction-safety audit;
8. onboarding/auth smoke tests.

### P1 — Architecture Consistency

- putuskan API contract strategy;
- reduce `any` pada boundaries;
- standard error response;
- shared WIB/time utilities;
- structured logging;
- dokumentasi legacy route naming.

Detail roadmap dan progress ada di `ARCHITECTURE.md`.

## API Contract Warning

Repository memiliki OpenAPI + generated Zod + generated React Query client, tetapi OpenAPI **tidak mencakup API aktual secara lengkap** dan frontend utama mayoritas menggunakan raw `fetch()`.

Karena itu:

- jangan menganggap `lib/api-spec/openapi.yaml` sebagai source of truth lengkap;
- jangan otomatis menjalankan codegen untuk endpoint baru tanpa memahami strategi API saat ini;
- baca `ARCHITECTURE.md` bagian Validation & API Contract sebelum mengubah infrastructure ini.

## Testing Status

Automated test suite saat ini praktis belum tersedia.

Sampai test foundation selesai, minimal verification setelah perubahan signifikan:

```text
1. pnpm run typecheck
2. pnpm run build
3. test happy path di Replit preview
4. test invalid input/failure path
5. jika tenant-sensitive: test tenant isolation
6. jika inventory-sensitive: test stock + HPP + rollback behavior
```

Jangan menyatakan transaction-critical change aman hanya karena UI berhasil submit.

## AI / Agent Workflow

Untuk perubahan besar gunakan urutan:

```text
Read ARCHITECTURE.md
        ↓
Inspect current source
        ↓
Identify invariants & dependencies
        ↓
Design change
        ↓
Implement smallest safe change
        ↓
Typecheck + build
        ↓
Runtime test
        ↓
Failure/rollback test
        ↓
Update ARCHITECTURE.md jika behavior/architecture berubah
```

Jangan menebak implementation dari dokumentasi saja. Source terbaru tetap authoritative untuk detail kode.

## Documentation Responsibilities

`ARCHITECTURE.md` wajib diperbarui ketika terjadi perubahan penting pada:

- schema/constraint database;
- auth atau multi-tenancy;
- API contract penting;
- inventory/HPP/finance business rule;
- lifecycle siklus;
- milestone modul;
- technical debt/roadmap priority;
- architecture decision.

Tidak perlu update untuk perubahan kosmetik kecil.

## Current North Star

**Engineering:** membuat core SambelFarm aman, konsisten, dapat diuji, dan dapat dipercaya sebagai source of truth operasional kebun.

**Product:** memungkinkan user menjalankan siklus kebun dari aktivitas lapangan sampai mengetahui biaya, hasil, dan profitability melalui workflow mobile yang sederhana.

---

**Last refreshed:** 9 September 2026  
**Primary reference:** `ARCHITECTURE.md`
