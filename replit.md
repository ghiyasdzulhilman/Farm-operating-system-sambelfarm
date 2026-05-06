# Farm Management System (Sistem Manajemen Kebun)

A web app for Indonesian agri-entrepreneurs that connects to their Notion workspace via OAuth and surfaces farm financial data (Laba Rugi) on a clean dashboard.

## Run & Operate

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

Required env vars:
- `DATABASE_URL` — PostgreSQL connection string (auto-set by Replit DB)
- `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` — Clerk auth (auto-set)
- `NOTION_CLIENT_ID` — Notion OAuth app client ID
- `NOTION_CLIENT_SECRET` — Notion OAuth app secret
- `NOTION_REDIRECT_URI` — OAuth callback URL (e.g. `https://<domain>/api/notion/callback`)

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24 / **TypeScript**: 5.9
- **Frontend**: React 19 + Vite + Tailwind v4 + shadcn/ui + framer-motion
- **Auth**: Clerk (email + Google, via @clerk/react + @clerk/express)
- **Routing**: wouter (base-relative under WouterRouter)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (OpenAPI → React Query hooks + Zod schemas)
- **Build**: esbuild (CJS bundle for API server)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas for server validation
- `lib/db/src/schema/` — Drizzle table definitions
  - `notionConnections.ts` — stores per-user Notion access tokens
  - `oauthStates.ts` — transient OAuth PKCE state tokens
  - `fieldMappings.ts` — per-user field mapping config (composite PK: userId+databaseType, JSONB mappings)
- `artifacts/farm-app/src/` — React frontend
  - `pages/home.tsx` — landing page (public)
  - `pages/dashboard.tsx` — financial summary (protected)
  - `pages/connect.tsx` — Notion OAuth connect/disconnect (protected)
  - `pages/settings.tsx` — field mapping configuration UI (protected)
  - `components/layout/app-layout.tsx` — shell with header/nav
- `artifacts/api-server/src/routes/` — Express route handlers
  - `notion.ts` — POST /notion/connect, GET /notion/callback, GET /notion/status, POST /notion/disconnect
  - `expenses.ts` — GET /notion/dropdown-options, POST /notion/add-expense (mapping-aware)
  - `harvest.ts` — GET /notion/harvest-dropdown-options, POST /notion/add-harvest (mapping-aware)
  - `mappings.ts` — GET /notion/inspect-database, GET+POST /notion/field-mappings
  - `dashboard.ts` — GET /dashboard/summary (queries Notion Laba Rugi DB)

## Architecture decisions

- **Notion as headless CMS**: Each user connects their own Notion workspace via OAuth. Access tokens stored per-user in PostgreSQL. No shared database — users own their data.
- **Contract-first API**: OpenAPI spec gates codegen which gates frontend. Orval generates both React Query hooks (client) and Zod schemas (server).
- **Clerk proxy middleware**: Clerk FAPI requests are proxied through the Express API server so auth works on custom domains without DNS CNAME setup.
- **Laba Rugi auto-discovery**: The dashboard route searches the user's Notion workspace for a database matching "Laba Rugi" — no manual DB ID configuration needed.
- **State-based OAuth**: Transient state tokens stored in `oauth_states` table for CSRF protection during Notion OAuth flow.
- **Field Mapping (ID-based)**: `field_mappings` table stores per-user JSONB mapping of app field keys → `{ propertyId, propertyName, relatedDatabaseId }`. POST to Notion uses property IDs as keys (not names). Relation dropdowns use stored `relatedDatabaseId` to bypass name-based search. Falls back to hardcoded names if no mapping set.

## Product

- **Landing page**: Public marketing page with sign-in/sign-up CTAs (in Bahasa Indonesia)
- **Authentication**: Email + Google login via Clerk
- **Notion OAuth**: Connect/disconnect user's own Notion workspace; stores access token per user
- **Dashboard**: Pulls Total Pendapatan + Total Pengeluaran from the "Laba Rugi" Notion database, displays Laba/Rugi net figure in IDR format
- **Input Pengeluaran**: Form dialog (Tambah Pengeluaran) untuk menambah data ke Notion database "Expenses" — dropdown Kategori & Area dari Notion
- **Input Panen**: Form dialog (Tambah Panen) untuk menambah data ke Notion database "Panen" — dropdown Area dari "Pindah Tanam", Select statis Kualitas & Channel Penjualan
- **Pengaturan / Field Mapping**: Halaman `/settings` — user memuat kolom Notion, memetakan field aplikasi ke properti Notion, disimpan per-user per-database-type. Dropdown otomatis pakai relatedDatabaseId dari mapping.

## User preferences

- App UI should be in Bahasa Indonesia
- Template-based SaaS model: users duplicate Notion template, then connect via OAuth
- Phase 1 only (auth + Notion OAuth + financial dashboard); remaining 7 modules deferred

## Gotchas

- Notion OAuth requires `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`, and `NOTION_REDIRECT_URI` to be set before the connect flow works
- `NOTION_REDIRECT_URI` must match the URI registered in your Notion integration exactly
- Clerk proxy middleware must be mounted BEFORE `express.json()` — see `app.ts`
- Route wildcard `/*?` is required for sign-in/sign-up routes so Clerk sub-paths work

## Pointers

- See `.local/skills/clerk-auth/references/setup-and-customization.md` for Clerk customization
- See `.local/skills/pnpm-workspace/references/openapi.md` for adding new endpoints
- Notion API docs: https://developers.notion.com/reference
