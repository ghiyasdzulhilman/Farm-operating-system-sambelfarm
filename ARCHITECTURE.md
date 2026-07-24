# 🌾 SambelFarm Platform — Architecture Documentation

> **Tujuan dokumen ini:** Referensi arsitektur lengkap yang bisa ditempel di awal percakapan baru dengan AI manapun, supaya AI langsung paham struktur project tanpa perlu re-audit dari nol.
>
> **Terakhir digenerate:** 24 Juli 2026, dari audit langsung terhadap source code (bukan dari ingatan/laporan lama).
> **Status migrasi:** 100% PostgreSQL. Notion API sudah dihapus fisik dari kodebase — nama endpoint `/notion/*` yang masih tersisa adalah utang penamaan lama, BUKAN indikasi dependency ke Notion.

---

## 1. Ringkasan Arsitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                        │
│   artifacts/farm-app  →  React 19 + Vite + Wouter + TanStack     │
│   Query, panggil backend via fetch("/api/...") langsung          │
│   (bukan lewat generated hooks — lihat catatan §5)                │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ HTTPS (fetch, credentials: true)
┌───────────────────────────────▼───────────────────────────────────┐
│                    BACKEND (Express 5, artifacts/api-server)      │
│   app.ts → clerkMiddleware → router("/api") → routes/*.ts         │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ Drizzle ORM
┌───────────────────────────────▼───────────────────────────────────┐
│                  DATABASE (PostgreSQL via Supabase)                │
│                  lib/db/src/schema.ts (17 tabel)                   │
└─────────────────────────────────────────────────────────────────┘

Auth: Clerk (clerkMiddleware di backend, ClerkProvider di frontend)
      Jembatan Clerk User ID ⇄ pekerja.id lewat pekerjaTable.clerkUserId
Monorepo: pnpm workspace — artifacts/*, lib/*, scripts/*
```

**Stack:** React 19 + Vite + TanStack Query + Wouter (routing) + Framer Motion (animasi) + shadcn/ui (Radix) di frontend. Express 5 + TypeScript + Clerk Auth + Pino (logging) di backend. PostgreSQL (Supabase) + Drizzle ORM sebagai data layer. pnpm monorepo dengan workspace `@workspace/db`, `@workspace/api-zod`, `@workspace/api-client-react`.

**Environment kerja Ghiyas:** 100% mobile. Edit lewat GitHub web editor, testing lewat Replit preview. Review kode pakai format before-after.

---

## 2. Struktur Folder Monorepo

```
Farm-operating-system-sambelfarm-main/
├── artifacts/
│   ├── api-server/          # Backend Express
│   │   └── src/
│   │       ├── app.ts               # Setup Express app (middleware chain)
│   │       ├── index.ts             # Entry point, start server
│   │       ├── lib/
│   │       │   ├── authHelpers.ts   # getPekerjaIdFromClerk()
│   │       │   └── logger.ts        # Pino logger config
│   │       ├── middlewares/
│   │       │   └── clerkProxyMiddleware.ts  # Proxy Clerk Frontend API
│   │       └── routes/
│   │           ├── index.ts         # Router aggregator
│   │           ├── health.ts        # GET /healthz
│   │           ├── dashboard.ts     # GET /dashboard/summary
│   │           ├── expenses.ts      # /pengeluaran, /kategori-keuangan
│   │           ├── harvest.ts       # /harvest
│   │           ├── finance.ts       # /finance/kategori
│   │           ├── produk.ts        # /produk (master + stok)
│   │           ├── perawatan.ts     # /notion/*perawatan* (nama lama)
│   │           ├── inspeksi.ts      # /notion/*inspeksi*
│   │           └── operasional.ts   # /notion/* (operasional + master data)
│   ├── farm-app/             # Frontend React
│   │   └── src/
│   │       ├── main.tsx / App.tsx   # Entry point + routing + Clerk setup
│   │       ├── pages/                # 6 halaman utama
│   │       ├── components/
│   │       │   ├── agronomy/         # Dialog tambah data (Perawatan/Inspeksi/Operasional)
│   │       │   ├── finance/           # Dialog tambah Panen & Pengeluaran
│   │       │   ├── master/            # CRUD master data (area, pekerja, produk, dst)
│   │       │   ├── operasional/       # Kanban/Table/Feed view + Detail Sheet
│   │       │   ├── layout/            # AppLayout (nav + FAB)
│   │       │   └── ui/                # shadcn/ui primitives (~50 file, generic)
│   │       ├── lib/
│   │       │   ├── areaOverrideForm.ts # Utility broadcast/spesifik
│   │       │   └── utils.ts
│   │       ├── hooks/                # use-toast, use-mobile
│   │       └── types/operasional.ts  # Tipe AgronomyItem, ModuleKey, ViewKey
│   └── mockup-sandbox/       # Sandbox terpisah untuk eksperimen UI (tidak terhubung ke app utama)
├── lib/
│   ├── db/src/
│   │   ├── schema.ts         # Drizzle schema — SUMBER KEBENARAN struktur data
│   │   ├── index.ts          # Koneksi DB (Pool + drizzle instance)
│   │   └── helpers/stock.ts  # adjustStock() — helper krusial mutasi stok
│   ├── api-zod/               # Skema validasi Zod (generated, sebagian besar tidak dipakai)
│   └── api-client-react/      # Hook React Query hasil Orval codegen (JARANG dipakai langsung)
└── scripts/                   # Script utilitas kecil (hello.ts, dsb)
```

---

## 3. Database Schema (`lib/db/src/schema.ts`)

Sumber kebenaran tunggal untuk struktur data. 17 tabel, dibagi 4 kelompok:

### 3.1 Master Tables
| Tabel | Kolom penting | Keterangan |
|---|---|---|
| `areasTable` (`areas`) | `id`, `name` | Daftar kebun/lahan |
| `pekerjaTable` (`pekerja`) | `clerkUserId` (unik, nullable) | 🚀 **Jembatan emas** ke akun login Clerk. `roleId`/`jenisTenagaKerjaId`/`statusId` merujuk ke `pekerjaAtributMasterTable` |
| `pekerjaAtributMasterTable` (`pekerja_atribut_master`) | `namaOption`, `jenisAtribut` | Master fleksibel untuk role/jenis tenaga kerja/status pekerja |
| `kategoriTable` (`kategori_master`) | `name`, `module` | Kategori aktivitas (dipakai perawatan/operasional) |
| `kendalaMasterTable` (`kendala_master`) | `nama` (unik), `jenis` | Master hama/penyakit untuk temuan inspeksi |
| `siklusTanamTable` (`siklus_tanam`) | `areaId`, `modalAwal`, `status` (Aktif/Selesai/Ditutup) | Siklus tanam per area, basis perhitungan BEP & margin. `CHECK modal_awal >= 0` |
| `produkMasterTable` (`produk_master`) | `stokSaatIni`, `hargaPerSatuanDasar` (HPP Moving Average), `n/p/k/ca/mg` (kandungan nutrisi), `deleted` | Master produk/pupuk/pestisida + stok. Unique index case-insensitive pada `lower(nama)`. `hargaPerSatuanDasar = 0` = sentinel "belum diset harga" |

### 3.2 Transactional Tables (Agronomi)
| Tabel | Kolom penting | Keterangan |
|---|---|---|
| `perawatanTable` (`perawatan`) | `areaId`, `siklusId`, `tagCategoryId`, `status` | Aktivitas perawatan kebun (pemupukan, penyemprotan, dll) |
| `perawatanPekerjaTable` (`perawatan_pekerja`) | junction | Pekerja yang ditugaskan ke satu perawatan (many-to-many, replace kolom JSONB lama) |
| `perawatanProdukTable` (`perawatan_produk`) | `kuantitasPemakaian`, `hargaTercatatPerSatuan`, `totalBiaya` | Racikan produk yang dipakai di satu perawatan — **harga dicatat historis saat transaksi**, bukan referensi live ke master |
| `inspeksiTable` (`inspeksi`) | `phTanah`, `tingkatSerangan`, `radius`, `status` | Aktivitas inspeksi lapangan |
| `inspeksiTemuanTable` (`inspeksi_temuan`) | `kendalaMasterId`, `catatanKhusus` | Temuan hama/penyakit per inspeksi |
| `inspeksiPekerjaTable` (`inspeksi_pekerja`) | junction | Pekerja yang ditugaskan ke satu inspeksi |
| `operasionalTable` (`operasional`) | `namaPekerjaan`, `prioritas`, `kategoriId`, `jenisTenagaKerjaId` | Tugas operasional umum (bukan perawatan tanaman spesifik) |
| `operasionalPekerjaTable` (`operasional_pekerja`) | junction | Pekerja yang ditugaskan ke satu tugas operasional |

### 3.3 Finance & Accounting Tables
| Tabel | Kolom penting | Keterangan |
|---|---|---|
| `kategoriKeuanganTable` (`kategori_keuangan`) | `tipe` ('pengeluaran'/'pendapatan') | Master kategori transaksi keuangan |
| `pengeluaranTable` (`pengeluaran`) | `isPembelianStok`, `produkId`, `totalBiaya` | Transaksi biaya. `CHECK pembelian_stok_konsisten`: produkId wajib ada **hanya jika** isPembelianStok=true. **⚠️ Lihat Temuan Kritis #1 & #2 di §7** |
| `panenTable` (`panen`) | `kuantitasKg`, `hargaJualPerKg`, `totalPendapatan` | Transaksi hasil panen (pendapatan) |

### 3.4 Inventory Log (Stock Journal)
| Tabel | Kolom penting | Keterangan |
|---|---|---|
| `stockMovementTable` (`stock_movement`) | `delta`, `stokSebelum`, `stokSesudah`, `hargaHppSebelum`, `hargaHppSesudah`, `nilaiPembelianBaru` | **Insert-only audit journal.** Sumber kebenaran mutasi stok — `produkMaster.stokSaatIni` hanyalah cache yang WAJIB diupdate atomically bareng insert ini (lihat §4.5). `CHECK`: hanya boleh terhubung ke SALAH SATU dari `perawatanProdukId` atau `pengeluaranId`, tidak bisa dua-duanya |

**Constraint penting yang perlu diingat:**
- Semua uang disimpan sebagai **integer Rupiah** (bukan desimal).
- Semua kuantitas/stok disimpan sebagai `numeric(18,3)` untuk presisi.
- `total_biaya_konsisten_v2` di `pengeluaran`: toleransi `ABS(total - kuantitas*harga) <= (ROUND(kuantitas) + 100)` — **longgar dan proporsional ke kuantitas, bukan ke uang** (lihat temuan kritis).
- Tidak ada migration history Drizzle (pakai `push`, bukan `generate`+`migrate`).
- Tidak ada test file di seluruh kodebase.

---

## 4. Backend — Routes & Logic (`artifacts/api-server/src/routes/`)

Semua route di-mount di bawah prefix `/api` (lihat `app.ts` → `app.use("/api", router)`). Auth dicek per-route via `getAuth(req)` dari `@clerk/express`; hampir semua endpoint mewajibkan `userId` (401 jika tidak login).

### 4.1 `health.ts`
| Method & Path | Fungsi |
|---|---|
| `GET /api/healthz` | Health check sederhana, tidak butuh auth |

### 4.2 `produk.ts` — Master Produk & Manajemen Stok
| Method & Path | Fungsi |
|---|---|
| `GET /api/produk` | List semua produk aktif (sembunyikan yang soft-deleted) |
| `POST /api/produk` | Buat produk baru + insert `stock_movement` tipe `stok_awal` jika ada stok awal |
| `PATCH /api/produk/:id` | Update field produk. **Jaring pengaman:** `stokSaatIni` DITOLAK jika dikirim langsung — stok hanya boleh berubah lewat `adjustStock()` |
| `DELETE /api/produk/:id` | **Smart delete**: cek riwayat di `stock_movement`. Jika bersih (tanpa riwayat selain stok awal) → hard delete. Jika ada riwayat transaksi → soft delete (`deleted=true`) untuk menjaga integritas laporan historis |
| `POST /api/produk/:id/adjust` | Penyesuaian stok manual (stok opname) berdasarkan `stokFisik` aktual |
| `GET /api/produk/trash` | List produk yang di-soft-delete, lengkap dengan riwayat HPP terakhir |
| `POST /api/produk/:id/restore` | Pulihkan produk dari trash |
| `DELETE /api/produk/:id/force` | Hapus permanen produk + **cascade manual** semua riwayat terkait (stock_movement, perawatan_produk, pengeluaran) dalam satu transaksi |

### 4.3 `expenses.ts` — Pengeluaran (Finance)
| Method & Path | Fungsi |
|---|---|
| `GET /api/pengeluaran` | List pengeluaran, join ke area/siklus/kategori untuk resolusi nama. Filter opsional `?statusSiklus=aktif\|selesai` |
| `POST /api/pengeluaran` | **Transaksi 3-in-1**: (1) insert ke `pengeluaran`, (2) jika `isPembelianStok=true` → insert `stock_movement` (jurnal), (3) update `produk_master.stokSaatIni` + `hargaPerSatuanDasar` pakai **rumus Moving Average** (`(nilaiAsetLama + nilaiBeliBaru) / stokSesudah`) |
| `GET /api/kategori-keuangan` | List kategori keuangan (legacy/global, semua tipe) |
| `GET /api/pengeluaran-dropdown-options` | Dropdown kategori khusus tipe 'pengeluaran' untuk form |

⚠️ **Belum ada endpoint PUT/DELETE untuk pengeluaran individual** — beda dengan `harvest.ts` yang CRUD-nya lengkap.

### 4.4 `harvest.ts` — Panen (Finance)
| Method & Path | Fungsi |
|---|---|
| `GET /api/harvest/dropdown` | Dropdown area digabung nama siklus aktif |
| `GET /api/harvest` | List riwayat panen, join area & siklus. Filter `?statusSiklus=` |
| `POST /api/harvest` | Insert panen baru, auto-assign ke siklus aktif area terkait, hitung `totalPendapatan = kuantitas × harga` |
| `PUT /api/harvest/:id` | Edit panen, fallback ke data lama untuk field yang tidak dikirim, hitung ulang siklus jika area berubah |
| `DELETE /api/harvest/:id` | Hapus data panen |

### 4.5 `finance.ts` — Kategori Keuangan (Master, mount di `/api/finance`)
| Method & Path | Fungsi |
|---|---|
| `GET /finance/kategori` | List kategori keuangan |
| `POST /finance/kategori` | Tambah kategori baru, tangkap error unique constraint |
| `PUT /finance/kategori/:id` | Update kategori |
| `DELETE /finance/kategori/:id` | Hapus kategori (ditangkap jika masih dipakai transaksi → FK violation 23503) |

### 4.6 `dashboard.ts`
| Method & Path | Fungsi |
|---|---|
| `GET /api/dashboard/summary` | **Agregasi paralel** (Promise.all) langsung dari SQL: total modal per area (dari siklus), total panen (pendapatan+berat), total pengeluaran per area, 5 aktivitas panen & pengeluaran terakhir (digabung jadi satu feed). Hitung margin, profit, HPP, BEP progress secara global & per-area. Field `notionDatabaseId: null` dan `stagingStats` masih ada sebagai stub kompatibilitas frontend lama (aman untuk dihapus). ⚠️ Lihat Temuan Kritis #2 |

### 4.7 `perawatan.ts` — Aktivitas Perawatan Kebun
| Method & Path | Fungsi |
|---|---|
| `POST /api/notion/add-perawatan` | Simpan aktivitas perawatan baru. Support mode **broadcast/spesifik** untuk tanggal, pekerja, tags, status, catatan, dan produk per-area. Memotong stok & catat `perawatan_produk` pakai harga master TERBARU saat insert |
| `GET /api/notion/all-perawatan` | List semua perawatan + join relasi. Filter `?statusSiklus=` |
| `PATCH /api/notion/perawatan/:id` | Update selektif. **Logika kritis — Diff-Based PATCH (fix bug harga historis):** membandingkan `logProduk` baru vs lama pakai algoritma delta (Ember A=dihapus/Ember B=ditambah/Ember C=diubah): item dihapus → `adjustStock` reversal + hapus baris; item baru → potong stok pakai harga master TERBARU; item diubah → hitung selisih stok TAPI **tetap pakai harga historis tercatat**, bukan harga master saat ini. Ini mencegah bug lama yang mereprice diam-diam transaksi masa lalu |
| `DELETE /api/notion/perawatan/:id` | Hapus aktivitas perawatan |

### 4.8 `inspeksi.ts` — Aktivitas Inspeksi Lapangan
| Method & Path | Fungsi |
|---|---|
| `POST /api/notion/add-inspeksi` | Simpan inspeksi baru + temuan hama/penyakit (`inspeksi_temuan`), support broadcast/spesifik |
| `GET /api/notion/all-inspeksi` | List semua inspeksi + join relasi. Filter `?statusSiklus=` |
| `POST /api/notion/kendala-master` | Tambah entri baru ke master hama/penyakit |

### 4.9 `operasional.ts` — Tugas Operasional + Master Data Hub
File terbesar (935 baris) — selain CRUD operasional, juga jadi **rumah bagi banyak endpoint master data** lintas modul:
| Method & Path | Fungsi |
|---|---|
| `GET /notion/operasional-dropdown-options` | **Endpoint dropdown utama** yang dipakai hampir semua form di seluruh app — mengembalikan daftar area, pekerja/petugas, kategori, atribut pekerja, kendala master sekaligus |
| `POST /notion/add-operasional` | Simpan tugas operasional baru, broadcast/spesifik |
| `GET /notion/all-operasional` | List semua tugas operasional |
| `PATCH /notion/edit-activity/:id` | **Endpoint edit universal** — bisa update aktivitas dari modul perawatan/inspeksi/operasional lewat satu endpoint (routing internal berdasarkan module) |
| `POST/DELETE /notion/areas` & `/notion/areas/:id` | CRUD master Area |
| `POST/PATCH/DELETE /notion/pekerja` & `/notion/pekerja/:id` | CRUD master Pekerja |
| `DELETE /notion/activity/:module/:id` | Hapus aktivitas generik berdasarkan nama modul |
| `POST/DELETE /notion/kategori` & `/notion/kategori/:id` | CRUD master Kategori |
| `GET/POST /notion/siklus-tanam` | CRUD Siklus Tanam |
| `POST/DELETE /notion/pekerja-atribut` | CRUD atribut pekerja (role/jenis tenaga kerja/status) |
| `POST/DELETE /notion/kendala` & `/notion/kendala/:id` | CRUD master Hama/Penyakit |

> 📌 **Catatan penamaan:** prefix `/notion/*` di file `perawatan.ts`, `inspeksi.ts`, `operasional.ts` adalah **utang penamaan lama** — backend-nya 100% PostgreSQL, tidak ada dependency Notion sama sekali. Rename ke `/agronomy/*` masih jadi task terpisah yang belum dikerjakan (prioritas rendah, kosmetik).

### 4.10 Helper Krusial: `adjustStock()` (`lib/db/src/helpers/stock.ts`)
Dipanggil dari `perawatan.ts` (pemakaian produk) — fungsi tunggal yang **wajib** dipakai setiap kali stok berubah karena pemakaian/reversal (bukan pembelian, yang punya jalur sendiri di `expenses.ts`):
1. Update `produk_master.stokSaatIni` dengan `WHERE stokSaatIni >= |delta|` (jika delta negatif) — mencegah stok minus lewat race condition (row-level lock implisit via kondisi WHERE).
2. Jika baris terupdate = 0 → throw `STOK_TIDAK_CUKUP:{produkId}`.
3. Insert baris baru ke `stock_movement` sebagai jejak audit (HPP tidak berubah untuk tipe pemakaian, hanya stok).

---

## 5. Frontend — Halaman, Komponen, dan Endpoint yang Dipanggil

### 5.1 Routing (`App.tsx`)
| Path | Komponen | Proteksi |
|---|---|---|
| `/` | `HomeRedirect` → `HomePage` (landing) atau redirect `/dashboard` jika sudah login | Publik |
| `/sign-in`, `/sign-up` | Clerk `SignIn`/`SignUp` | Publik |
| `/dashboard` | `DashboardPage` | Wajib login |
| `/settings` | `SettingsPage` (berisi entry point ke `MasterHubPage`) | Wajib login |
| `/operasional` | `AgronomyHubPage` | Wajib login |

> Catatan: `AppLayout` punya nav item `/lab` (ikon FlaskConical) yang **belum punya route terdaftar** di `App.tsx` — akan jatuh ke `NotFound`.

### 5.2 Halaman (`pages/`)

**`AgronomyHubPage.tsx`** — Hub utama operasional harian. Fetch paralel dari 6 endpoint sekaligus (`/api/notion/all-operasional`, `/api/notion/all-perawatan`, `/api/notion/all-inspeksi`, `/api/notion/operasional-dropdown-options`, `/api/pengeluaran`, `/api/harvest`), lalu normalisasi jadi satu tipe `AgronomyItem` seragam. Punya saklar domain **Agronomi ⟷ Finance** dalam satu unified feed. Delegasikan tampilan ke `KanbanView`/`LiveFeedView`/`MasterTableView`/`FinanceTableView` tergantung `activeView`. Panggil `PATCH /api/notion/edit-activity/:id`, `DELETE /api/notion/activity/:module/:id`, `PATCH /api/notion/perawatan/:id`, dan endpoint hapus khusus `/api/pengeluaran/:id` & `/api/harvest/:id`.

**`MasterHubPage.tsx`** — Menu ERP grouped (dirender di dalam `SettingsPage`, bukan route terpisah). Kategori: Agronomy (Area & Siklus, Kategori Aktivitas, Hama & Penyakit), Inventory (Produk & Stok; **Peralatan & Mutasi Stok masih placeholder "Coming Soon"**), Resources (Karyawan; **Kehadiran masih placeholder**), Finance (Kategori Keuangan). Merender komponen `*Manager` sesuai menu aktif.

**`dashboard.tsx`** — Dashboard utama. `useQuery` ke `GET /api/dashboard/summary`. Delegasikan render ke 4 section: `FinancialSection`, `ProductionSection`, `OperationalSection`, `InsightSection`.

**`settings.tsx`** — System Center. Tombol ke Master Data (buka `MasterHubPage`), pengaturan tema (dark/light), kustomisasi warna (`ColorControl`), dan `UserButton` dari Clerk.

**`home.tsx`** — Landing page publik (untuk user belum login). ⚠️ **Masih mempromosikan "Smart Sync & Notion Pipeline"** — kontradiksi dengan arsitektur aktual yang sudah 100% Postgres. Perlu update copy.

**`not-found.tsx`** — 404 page sederhana.

### 5.3 Komponen `agronomy/` (Dialog Tambah Data — dipicu dari FAB di `AppLayout`)
| File | Endpoint dipanggil | Fungsi |
|---|---|---|
| `AddPerawatanDialog.tsx` | `POST /api/notion/add-perawatan`, `GET /api/notion/operasional-dropdown-options`, `GET /api/notion/perawatan-dropdown-options`, `GET /api/produk` | Form tambah aktivitas perawatan, termasuk racikan produk (mode broadcast/spesifik pakai `areaOverrideForm.ts`) |
| `AddInspeksiDialog.tsx` | `POST /api/notion/add-inspeksi`, `GET /api/notion/operasional-dropdown-options`, `POST /api/notion/${type}` (tambah kendala on-the-fly) | Form tambah inspeksi + temuan hama/penyakit |
| `AddOperasionalDialog.tsx` | `POST /api/notion/add-operasional`, `GET /api/notion/operasional-dropdown-options`, `POST /api/notion/${type}` | Form tambah tugas operasional |

### 5.4 Komponen `finance/` (Dialog Tambah Data)
| File | Endpoint dipanggil | Fungsi |
|---|---|---|
| `FormPanen.tsx` | `POST /api/harvest`, `GET /api/harvest/dropdown` | Form input hasil panen |
| `PengeluaranFormModal.tsx` | `POST /api/pengeluaran`, `GET /api/pengeluaran-dropdown-options`, `GET /api/finance/kategori`, `GET /api/produk` | Form input pengeluaran, toggle "ini pembelian stok?" untuk munculkan field produk & kuantitas |

### 5.5 Komponen `master/` (CRUD Master Data — dipakai dalam `MasterHubPage`)
| Domain | Manager + Form/List | Endpoint |
|---|---|---|
| Area & Siklus | `AreaManager.tsx`, `AreaActiveGrid.tsx`, `AreaFormModal.tsx`, `SiklusFormModal.tsx` | `/api/notion/areas*`, `/api/notion/siklus-tanam` |
| Pekerja | `PekerjaManager.tsx`, `PekerjaTable.tsx`, `PekerjaFormModal.tsx`, `PekerjaAtributPanel.tsx` | `/api/notion/pekerja*`, `/api/notion/pekerja-atribut*` |
| Kategori Aktivitas | `KategoriManager.tsx`, `KategoriList.tsx`, `KategoriFormModal.tsx` | `/api/notion/kategori*` |
| Hama & Penyakit | `KendalaManager.tsx`, `KendalaList.tsx`, `KendalaFormModal.tsx` | `/api/notion/kendala*` |
| Produk & Stok | `ProdukManager.tsx`, `ProdukList.tsx`, `ProdukFormModal.tsx`, `HppHistoryPopover.tsx` | `/api/produk*` (termasuk `/adjust`, `/restore`, `/force`, `/trash`) |
| Kategori Keuangan | `KategoriKeuanganManager.tsx`, `KategoriKeuanganFormModal.tsx` | `/api/finance/kategori*` |

### 5.6 Komponen `operasional/` (Tampilan Feed & Detail)
| File | Fungsi |
|---|---|
| `SummaryHeader.tsx` | Kartu ringkasan (jumlah aktivitas hari ini, selesai, proses, todo) |
| `FilterControls.tsx` | Kontrol saklar view (Kanban/Table/Feed), domain (Agronomi/Finance), modul, filter waktu/status/siklus |
| `KanbanView.tsx` | Tampilan papan Kanban 3 kolom berdasarkan status |
| `LiveFeedView.tsx` | Tampilan feed kronologis, bisa dikelompokkan per waktu atau per area |
| `MasterTableView.tsx` | Tampilan tabel untuk modul agronomi (perawatan/inspeksi/operasional), inline-edit lewat `EditableCell.tsx` |
| `finance/FinanceTableView.tsx` | Tampilan tabel khusus domain finance (pengeluaran/panen), pakai TanStack Table |
| `EditableCell.tsx` | Sel tabel yang bisa diedit inline (text/number/select/multi-select/date/time) via popover |
| `ActivityDetailSheet.tsx` | **Sheet detail** yang muncul saat item diklik — komposisi dari komponen `sheet-parts/*` di bawah |
| `sheet-parts/ActivityTitle.tsx` | Judul aktivitas, editable inline |
| `sheet-parts/JadwalPelaksanaan.tsx` | Tampilan & edit jadwal (waktu mulai/selesai) |
| `sheet-parts/TimKebun.tsx` | Daftar pekerja yang ditugaskan |
| `sheet-parts/CatatanUmum.tsx` | Catatan umum, editable, dengan parsing khusus untuk memisahkan catatan tambahan dari field lain |
| `sheet-parts/CatatanTemuan.tsx` | Khusus modul inspeksi — tampilkan temuan hama/penyakit |
| `sheet-parts/InspeksiFields.tsx` | Field spesifik inspeksi (pH tanah, tingkat serangan, radius) |
| `sheet-parts/OperasionalFields.tsx` | Field spesifik operasional (prioritas) |
| `sheet-parts/PerawatanRacikan.tsx` | Editor racikan produk untuk perawatan (tambah/hapus/ubah kuantitas), kirim ke `PATCH /api/notion/perawatan/:id` |

### 5.7 Komponen Dashboard (`components/*Section.tsx`)
`FinancialSection.tsx`, `ProductionSection.tsx`, `OperationalSection.tsx`, `InsightSection.tsx` — masing-masing merender satu bagian dari payload `GET /api/dashboard/summary` (financial/production/operational/insight).

### 5.8 Layout & Utilities
- **`layout/app-layout.tsx`** — Shell aplikasi: top bar, bottom nav (Home/Database/Lab/Settings), dan **FAB (Floating Action Button)** yang membuka 5 dialog tambah data (Pengeluaran, Inspeksi, Operasional, Perawatan, Panen) secara vertikal.
- **`lib/areaOverrideForm.ts`** — Utility inti pola **broadcast/spesifik**: `buildAreaOverridePayload()`, `cloneFormValue()`, dll. Dipakai di semua form yang mendukung "set sama untuk semua area" vs "override per area" (Perawatan, Inspeksi, Operasional).
- **`lib/utils.ts`** — `cn()` helper (classnames merge, standar shadcn/ui).
- **`types/operasional.ts`** — Kontrak tipe sentral: `ModuleKey` (`all|perawatan|inspeksi|operasional|pengeluaran|panen`), `ViewKey` (`feed|modules|table|kanban`), `AgronomyItem` (bentuk data seragam yang dipakai lintas semua tampilan feed/kanban/table).
- **`components/ui/*`** — ~50 file primitif shadcn/ui (button, dialog, sheet, table, dst) — generic, tidak spesifik ke domain SambelFarm.

---

## 6. Pola Arsitektur & Konvensi Penting

1. **Broadcast vs Spesifik** — Pola form dua-mode dipakai di Perawatan/Inspeksi/Operasional: user bisa set satu nilai untuk semua area terpilih ("broadcast") atau override per-area ("spesifik"). Diimplementasikan di frontend (`areaOverrideForm.ts`) dan didekode di backend lewat `mode*` fields di body request (`modeTanggal`, `modePekerja`, `modeProduk`, dst).
2. **Harga Historis vs Harga Master** — Saat item produk baru ditambahkan ke racikan, pakai harga master TERBARU. Saat item lama diedit (kuantitas berubah tapi produk sama), pakai **harga yang sudah tercatat historis**, BUKAN harga master saat ini. Ini mencegah bug reprice diam-diam pada data lama.
3. **Diff-Based PATCH (Ember A/B/C)** — Pola update selektif untuk array racikan produk: bandingkan array baru vs lama, kelompokkan jadi Dihapus/Ditambah/Diubah, lalu eksekusi masing-masing dengan efek stok yang sesuai — dalam satu transaksi DB.
4. **Stock Movement sebagai Source of Truth** — `produk_master.stokSaatIni` adalah CACHE. Perubahan stok HARUS selalu disertai insert ke `stock_movement` dalam transaksi yang sama (via `adjustStock()` untuk pemakaian, atau manual 3-in-1 di `expenses.ts` untuk pembelian).
5. **Moving Average HPP** — Setiap pembelian stok baru menghitung ulang `hargaPerSatuanDasar` di `produk_master` dengan rumus rata-rata tertimbang: `(stokLama × hppLama + qtyBeli × hargaBeli) / stokBaru`.
6. **Smart Delete** — Produk dengan riwayat transaksi tidak bisa dihapus permanen secara default (soft delete via `deleted=true`); hanya produk "bersih" (tanpa riwayat) yang di-hard-delete otomatis. Force delete tersedia sebagai aksi terpisah dan eksplisit.
7. **Auth Bridge** — `getPekerjaIdFromClerk(clerkUserId)` di `authHelpers.ts` adalah satu-satunya cara menerjemahkan identitas login Clerk (`req.auth.userId`) menjadi UUID pekerja internal untuk kolom `createdBy`/`updatedBy` (audit trail).
8. **Timezone WIB Naive Strategy** — `perawatan.ts` dan `operasional.ts` punya helper `parseWIB()`/`toWIBString()` sendiri-sendiri (duplikasi, belum di-extract ke shared util) untuk memastikan input datetime tanpa timezone eksplisit diperlakukan sebagai WIB (+07:00).
9. **Frontend memanggil API langsung** — Mayoritas komponen frontend pakai `fetch("/api/...")` mentah di dalam `useQuery`/`useMutation`, BUKAN lewat hook hasil generate Orval (`@workspace/api-client-react`). Package tersebut hanya dipakai untuk `getGetDashboardSummaryQueryKey()` (invalidasi cache), bukan fetching data. `openapi.yaml` juga baru punya 2 path (`/healthz`, `/dashboard/summary`) — endpoint finance yang baru migrasi belum masuk spec.

---
