# 🌾 SambelFarm — Living Architecture & Progress Reference

> **Tujuan dokumen:** menjadi sumber konteks teknis utama untuk developer dan AI yang bekerja pada SambelFarm. Baca dokumen ini sebelum membuat perubahan lintas modul.
>
> **Terakhir diperbarui:** 9 September 2026
> **Basis:** audit langsung source code branch `main`, bukan dokumentasi historis.
> **Status produk:** Functional Farm ERP Core → Production Hardening.
> **Aturan:** update dokumen ini setiap ada perubahan arsitektur, business rule penting, schema, endpoint, atau milestone besar.

---

## 1. Executive Summary

SambelFarm adalah Farm Operating System / farm ERP mobile-first untuk mengelola operasi kebun, agronomi, inventory, panen, biaya, dan performa usaha dalam satu sistem.

Arsitektur saat ini **100% PostgreSQL-native**. Notion bukan dependency aktif. Beberapa route masih memakai prefix `/notion/*` hanya karena legacy naming dan tidak boleh dianggap sebagai integrasi Notion.

Fondasi yang sudah tersedia:

- Clerk authentication dan onboarding organisasi.
- Multi-tenancy berbasis `organisasiId`.
- Master area, pekerja, kategori, kendala, produk, kategori keuangan.
- Siklus tanam.
- Perawatan, inspeksi, dan operasional.
- Panen dan pengeluaran.
- Inventory ledger (`stock_movement`).
- Historical HPP dan moving-average inventory valuation.
- Dashboard finance/production/operational.
- Agronomy Hub dengan Feed, Kanban, Table, detail sheet, filter, dan date filtering.

Audit 9 September 2026 menilai project sekitar **70–75% menuju production-ready MVP**. Gap terbesar bukan jumlah fitur, tetapi production hardening: automated testing, server-side validation, concurrency safety, tenant-isolation verification, API contract consistency, dan dokumentasi.

---

## 2. High-Level Architecture

```text
Browser / Mobile Web
        │
        ▼
React 19 + Vite
Wouter + TanStack Query
Tailwind v4 + shadcn/Radix
        │ fetch('/api/...')
        ▼
Express 5 + TypeScript
        │
        ├── Clerk authentication
        ├── requireOrganisasi middleware
        ▼
Drizzle ORM
        │
        ▼
PostgreSQL / Supabase
```

**Core stack:** pnpm monorepo, Node.js 24, TypeScript 5.9, React 19, Vite, Wouter, TanStack Query/Table, React Hook Form, Zod, Tailwind v4, shadcn/ui, Radix, Framer Motion, Express 5, Clerk, Drizzle ORM, Pino, PostgreSQL/Supabase.

### Architectural rule

PostgreSQL adalah **single source of truth** untuk data operasional. Jangan memperkenalkan kembali Notion atau storage eksternal sebagai sumber data utama tanpa keputusan arsitektur eksplisit.

---

## 3. Repository Structure

```text
artifacts/
├── api-server/                 # Express backend
│   └── src/
│       ├── app.ts
│       ├── index.ts
│       ├── lib/
│       ├── middlewares/
│       └── routes/
│           ├── index.ts
│           ├── health.ts
│           ├── onboarding.ts
│           ├── dashboard.ts
│           ├── expenses.ts
│           ├── harvest.ts
│           ├── finance.ts
│           ├── produk.ts
│           ├── perawatan.ts
│           ├── inspeksi.ts
│           └── operasional.ts
├── farm-app/                   # React frontend
│   └── src/
│       ├── App.tsx
│       ├── pages/
│       ├── components/{agronomy,finance,master,operasional,layout,ui}/
│       ├── hooks/
│       ├── lib/
│       └── types/
└── mockup-sandbox/             # UI experiments, bukan production app

lib/
├── db/                         # Drizzle schema + DB helpers
├── api-spec/                   # OpenAPI lama/parsial
├── api-zod/                    # generated schemas
└── api-client-react/           # generated client, jarang dipakai app utama

scripts/
```

---

## 4. Authentication, Organization & Multi-Tenancy

Clerk adalah identity provider utama.

```text
Clerk userId
   ↓
pekerja.clerkUserId
   ↓
pekerja.organisasiId
   ↓
organisasi.id
```

Onboarding berada di luar `requireOrganisasi` karena user baru belum mempunyai tenant. Create organisasi + owner/pekerja dilakukan dalam DB transaction.

Protected business routes melewati `requireOrganisasi`. Middleware resolve `organisasiId` dari pekerja dan memasukkannya ke request. User login yang belum onboarding menerima `403 BELUM_ONBOARDING`.

Sebagian besar tabel domain memiliki `organisasiId`. Banyak relasi menggunakan composite foreign key `(id, organisasiId)` sehingga referensi lintas tenant juga dibatasi database.

**Outstanding P0:** audit semua lookup/update/delete berbasis ID dan tambahkan automated tenant-isolation tests.

---

## 5. Core Domain Model

### Master

- `organisasiTable`
- `areasTable`
- `pekerjaTable`
- `pekerjaAtributMasterTable`
- `kategoriTable`
- `kendalaMasterTable`
- `kategoriKeuanganTable`
- `produkMasterTable`

### Siklus Tanam

`siklusTanamTable` menghubungkan aktivitas dan economics ke periode tanam. Field penting: `organisasiId`, `areaId`, `namaSiklus`, `tanggalPindahTanam`, `status`, `modalAwal`.

Status: `Aktif`, `Selesai`, `Ditutup`.

Target lifecycle:

```text
Area → Mulai Siklus → Aktivitas Agronomi → Biaya & Produk → Panen → Tutup Siklus → Profitability
```

### Agronomy

**Perawatan:** `perawatanTable`, `perawatanPekerjaTable`, `perawatanProdukTable`. Racikan menyimpan historical price/cost agar laporan lama tidak berubah ketika harga master berubah.

**Inspeksi:** `inspeksiTable`, `inspeksiTemuanTable`, `inspeksiPekerjaTable`. Mencakup pH, tingkat serangan, radius, temuan, status, catatan, pekerja.

**Operasional:** `operasionalTable`, `operasionalPekerjaTable`. Digunakan untuk pekerjaan umum, prioritas, kategori, tenaga kerja, area, siklus, dan status.

---

## 6. Finance & Harvest

### Pengeluaran

`pengeluaranTable` menangani biaya biasa dan pembelian stok.

Endpoint utama:

```text
GET    /api/pengeluaran
POST   /api/pengeluaran
PUT    /api/pengeluaran/:id
DELETE /api/pengeluaran/:id
GET    /api/pengeluaran-dropdown-options
GET    /api/kategori-keuangan
```

Pembelian stok melakukan operasi atomik:

```text
insert pengeluaran → insert stock movement → update stok + moving-average HPP
```

Edit pengeluaran dibatasi ke metadata agar historical inventory tidak di-rewrite sembarangan.

Delete pembelian stok memakai state matching terhadap ledger. Jika current stock/HPP sudah berbeda dari state sesudah transaksi tersebut, delete diblokir dengan `LEDGER_BLOCKED` karena sudah ada transaksi lanjutan.

### Panen

`panenTable` menyimpan area, siklus, tanggal, kegiatan, kuantitas kg, harga jual/kg, total pendapatan, kualitas, dan creator. CRUD tersedia. Database memiliki constraint non-negative dan consistency check total pendapatan.

---

## 7. Inventory & Historical HPP

Inventory adalah transaction-critical accounting ledger.

`produkMasterTable` menyimpan current `stokSaatIni` dan `hargaPerSatuanDasar`.

`stockMovementTable` menyimpan historical mutation: `delta`, `stokSebelum`, `stokSesudah`, `hargaHppSebelum`, `hargaHppSesudah`, `nilaiPembelianBaru`, source transaction, dan timestamp.

Moving-average HPP:

```text
oldAssetValue = oldStock × oldHpp
newAssetValue = oldAssetValue + purchaseValue
newHpp        = newAssetValue / newStock
```

**Invariant:** update stock master dan insert ledger harus berada dalam satu DB transaction.

**Known P0 risk:** pola read → calculate → write masih perlu concurrency/locking audit. Dua mutation bersamaan tidak boleh menghitung dari current state yang sama.

---

## 8. Frontend Product Architecture

Halaman utama mencakup landing/home, dashboard, onboarding, Agronomy Hub, Master Hub, settings, dan not-found. Protected routing memakai Clerk + onboarding gate.

Agronomy Hub adalah pusat monitoring dan eksekusi lapangan. Komponen/view penting mencakup `SummaryHeader`, `FilterControls`, `KanbanView`, `LiveFeedView`, `MasterTableView`, `FinanceTableView`, `EditableCell`, dan `ActivityDetailSheet`.

Target responsibility:

```text
Feed      = monitoring
Kanban    = eksekusi/status pekerjaan
Table     = audit & editing
Dashboard = decision making
```

Commit terbaru sebelum audit (5 September 2026) fokus pada `FilterControls.tsx`, `AgronomyHubPage.tsx`, custom date filter, UX date filtering, dan calendar positioning.

---

## 9. Broadcast vs Specific Area

Perawatan, inspeksi, dan operasional mendukung broadcast ke beberapa area atau input spesifik per area. Shared utility seperti `areaOverrideForm.ts` digunakan untuk cloning/override logic.

**Rule:** pertahankan abstraction ini; jangan menduplikasi business rule broadcast di setiap dialog.

---

## 10. Dashboard Data Engine

`GET /api/dashboard/summary` membaca PostgreSQL dan mengagregasi data per tenant.

Financial metrics: modal, pendapatan, pengeluaran, laba/rugi, margin, BEP progress.

Production metrics: harvest weight, HPP, average revenue/kg.

Response juga memuat area summaries, recent activities, operational summary, dan rule-based insight.

### Known placeholders

- `activeAreas` masih sama dengan seluruh area.
- `stagingStats` hardcoded `0` untuk compatibility.
- `notionDatabaseId: null` adalah legacy field.
- sebagian `cacheInfo` bersifat compatibility/placeholder.

Jangan anggap field tersebut sebagai business metrics final.

---

## 11. Validation & API Contract

Frontend sudah memakai Zod untuk beberapa form, tetapi backend validation belum konsisten. Banyak mutation route masih membaca `req.body` langsung/manual validation.

Target boundary:

```text
HTTP → Zod safeParse → validated input → business logic → DB transaction
```

Repository masih memiliki OpenAPI, generated Zod, dan generated React Query client, tetapi OpenAPI hanya mencakup sebagian kecil API nyata dan frontend utama mayoritas memakai raw `fetch()`.

**OpenAPI bukan source of truth aktual.**

Keputusan P1 yang harus dibuat:

1. hidupkan kembali contract-first OpenAPI; atau
2. sederhanakan ke shared Zod schemas + typed fetch/TanStack Query.

Jangan memperluas dua sistem setengah aktif sekaligus.

---

## 12. Data Integrity Invariants

1. Semua business data harus terkait tenant yang benar.
2. Relasi lintas tenant dilarang.
3. Stok tidak boleh berubah tanpa stock movement yang sesuai.
4. Stock master + ledger mutation harus atomic.
5. Historical HPP tidak boleh berubah karena harga master berubah.
6. Stock purchase harus memiliki produk; biaya biasa tidak boleh menghasilkan stock mutation.
7. Transaksi area-specific harus terkait siklus yang sesuai.
8. Financial amount tidak boleh negatif kecuali rule eksplisit mengizinkan.
9. Delete historical transaction tidak boleh merusak urutan ledger.
10. Tenant A tidak boleh membaca/mengubah/menghapus UUID tenant B.

### Known finance constraint debt

`total_biaya_konsisten_v2` menggunakan tolerance yang meningkat berdasarkan kuantitas. Ini perlu ditinjau karena tolerance financial seharusnya mengikuti aturan rounding uang.

---

## 13. Testing Status

Automated test suite praktis belum tersedia. Safety net saat ini terutama `pnpm run typecheck` dan `pnpm run build`.

P0 test priorities:

1. tenant isolation;
2. stock purchase;
3. moving-average HPP;
4. stock consumption;
5. edit/remove perawatan product mutation;
6. expense rollback;
7. `LEDGER_BLOCKED`;
8. siklus assignment;
9. finance calculations;
10. onboarding consistency/concurrency.

---

## 14. Logging & Observability

Pino HTTP logger tersedia, tetapi route masih banyak memakai `console.error()`.

Target: structured error logging, dependency-aware health checks, tidak log sensitive data, dan diagnostics yang cukup untuk debugging production.

---

## 15. Technical Debt Priority

### P0 — Data safety / production blockers

- automated tests belum tersedia;
- backend Zod validation belum konsisten;
- inventory concurrency belum dibuktikan aman;
- tenant isolation belum punya automated verification;
- transaction safety perlu audit lintas mutation.

### P1 — Architecture consistency

- `replit.md` masih mendeskripsikan Notion architecture lama;
- OpenAPI/generated client divergen dari API nyata;
- penggunaan `any` masih cukup banyak di boundaries;
- finance consistency constraint perlu diperbaiki;
- logging belum sepenuhnya structured.

### P2 — Maintainability

- legacy `/notion/*` naming;
- beberapa route besar mencampur HTTP, business logic, DB, response shaping;
- dashboard compatibility placeholders;
- timezone/WIB helpers belum standar;
- legacy Notion copy di UI/landing perlu dibersihkan bila masih ada.

---

## 16. Feature Progress Snapshot — 9 Sep 2026

| Modul | Progress | Catatan |
|---|---:|---|
| Clerk Auth | 90% | Fondasi siap |
| Organization onboarding | 90% | Transactional create |
| Multi-tenancy | 85% | Perlu isolation tests |
| Master Area | 85% | Core tersedia |
| Siklus Tanam | 85% | Core tersedia |
| Master Pekerja | 80% | Core tersedia |
| Master Kategori/Kendala | 85% | Core tersedia |
| Produk | 90% | Mature |
| Inventory ledger | 85% | Concurrency perlu hardening |
| Perawatan | 85% | Core lengkap |
| Inspeksi | 80% | Core lengkap |
| Operasional | 80% | Core lengkap |
| Panen | 85–90% | CRUD tersedia |
| Pengeluaran | 85–90% | CRUD + inventory integration |
| Dashboard Finance | 80% | Data nyata |
| Dashboard Production | 75% | Data nyata |
| Dashboard Operational | 60% | Ada placeholder |
| Insight | 55% | Rule-based sederhana |
| Agronomy Feed | 80% | Usable |
| Kanban | 75–80% | Tersedia |
| Table/Edit | 75–80% | Tersedia |
| Date/filter UX | 80% | Development terbaru |
| Automated Testing | 0–5% | Critical gap |
| API Contract Consistency | 30% | OpenAPI stale |
| Documentation Accuracy | 60% | Dokumen ini refreshed; `replit.md` stale |

```text
Foundation               ≈ 85–90%
Core Farm Operations     ≈ 80–85%
Business / Finance       ≈ 80–85%
Production Hardening     ≈ 35–45%
---------------------------------
Overall                  ≈ 70–75%
```

Persentase adalah estimasi audit source, bukan runtime telemetry.

---

## 17. Roadmap Direction

### P0 — Stability & Data Integrity

1. audit tenant isolation seluruh endpoint;
2. server-side Zod validation;
3. inventory concurrency protection;
4. stock/HPP/rollback tests;
5. tenant-isolation tests;
6. finance constraint audit;
7. transaction-safety audit;
8. onboarding/auth smoke tests.

### P1 — Architecture Consistency

API contract strategy, reduce `any`, standard error response, shared WIB utility, structured logging, rewrite `replit.md`, dokumentasi legacy routes.

### P2 — Core Product Completion

```text
Area → Siklus → Agronomy → Pengeluaran/Produk → Panen → Tutup Siklus → Profitability
```

### P3 — Mobile UX & Field Workflow

Agronomy Hub polish, filtering, detail editing, FAB efficiency, loading/empty/error states, keyboard/dialog/scroll behavior, consistent premium UI.

### P4 — Production Readiness

Environment validation, DB health, backup/restore, migration strategy, staging/release checklist, seed/demo organization, performance/index audit.

### P5 — Expansion

Farm planning, agronomy intelligence, financial intelligence, inventory forecasting, workforce analytics, richer rule-based insight, kemudian AI setelah historical data cukup berkualitas.

---

## 18. Architecture Decisions to Preserve

Jangan bongkar tanpa alasan kuat dan migration plan:

1. PostgreSQL sebagai source of truth.
2. Drizzle schema sebagai relational contract.
3. `organisasiId` tenant boundary.
4. composite tenant foreign keys.
5. Clerk → pekerja → organisasi bridge.
6. `stock_movement` inventory journal.
7. historical transaction HPP.
8. moving-average inventory valuation.
9. DB transaction untuk multi-step writes.
10. state-aware stock rollback.
11. siklus tanam sebagai domain utama.
12. junction tables untuk pekerja/produk.
13. shared broadcast/specific-area abstraction.
14. mobile-first product design.
15. TanStack Query sebagai server-state layer.

---

## 19. Rules for AI / Future Developers

Sebelum perubahan besar:

1. baca dokumen ini;
2. baca source terbaru — dokumen bukan pengganti source;
3. identifikasi tenant boundary;
4. cek efek ke stok, HPP, finance, siklus, historical data;
5. jangan ubah schema tanpa data/migration impact plan;
6. gunakan transaction untuk write lintas tabel;
7. frontend validation bukan security boundary;
8. jangan ubah stok langsung tanpa ledger;
9. jangan menghidupkan Notion karena route legacy;
10. jalankan `pnpm run typecheck` dan `pnpm run build` setelah perubahan signifikan;
11. setelah milestone, update Progress, Technical Debt, Roadmap, dan Changelog.

Transaction-critical workflow:

```text
Investigate
→ Define invariants
→ Design
→ Implement
→ Typecheck/build
→ Happy-path test
→ Failure/rollback test
→ Cross-tenant test
→ Update docs
```

---

## 20. Documentation Maintenance Protocol

Ini adalah **living architecture document**.

### Wajib update jika

- schema/constraint berubah;
- route penting berubah;
- auth/tenant strategy berubah;
- inventory/finance business rule berubah;
- milestone besar selesai;
- technical debt penting ditemukan/diselesaikan;
- roadmap priority berubah;
- architecture decision dibuat.

Tidak perlu update untuk typo, padding/color kecil, atau refactor internal tanpa contract/behavior change.

Progress tidak boleh naik hanya karena file dibuat. Pertimbangkan implementation + validation + failure handling + tenant safety + testing + UX completeness + documentation.

---

## 21. Architecture Changelog

### 2026-09-09 — Full architecture refresh

- refresh berdasarkan audit source branch `main`;
- menambahkan organization + multi-tenant architecture;
- memperbarui pengeluaran: PUT/DELETE tersedia;
- mendokumentasikan state-aware inventory rollback;
- mendokumentasikan dashboard engine + placeholders;
- menambahkan validation/API-contract debt;
- menambahkan testing gap dan production-hardening roadmap;
- mengubah dokumen menjadi living architecture/progress reference.

### 2026-07-24 — Previous architecture audit

- mendokumentasikan perpindahan penuh dari Notion ke PostgreSQL;
- mendokumentasikan agronomy, finance, inventory, dan frontend structure saat itu.

---

## 22. Current North Star

**Engineering:** membuat core Farm Operating System yang sudah ada menjadi aman, konsisten, dapat diuji, dan dapat dipercaya sebagai source of truth operasional kebun.

**Product:** satu alur mobile yang memungkinkan pengguna menjalankan siklus kebun dari aktivitas lapangan sampai mengetahui biaya, hasil, dan profitability tanpa pencatatan terpisah.

Setelah fondasi production-ready, intelligence dan automation dapat dibangun di atas historical data yang terpercaya.
