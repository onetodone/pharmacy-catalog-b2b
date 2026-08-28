# Pharmacy Catalog

A B2B (wholesale) multi-vendor pharmacy shop. `ADMIN` runs the platform, `SUPPLIER` owns products and fulfils
orders, `CUSTOMER` browses the catalog and checks out (one order per supplier).

The repository is a **pnpm workspace** with two packages:

| Package | Stack | Role |
|---|---|---|
| [`app-nest`](./app-nest) | NestJS 12 · Prisma 7 (`@prisma/adapter-pg`) · PostgreSQL · JWT | REST API |
| [`app-vite`](./app-vite) | Vite 8 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui | Web client (SPA) |

---

## Table of contents

- [Quick start](#quick-start)
- [Architecture overview](#architecture-overview)
- [Backend — `app-nest`](#backend--app-nest)
- [Frontend — `app-vite`](#frontend--app-vite)
- [Roles & access](#roles--access)
- [Business rules](#business-rules)
- [Scripts](#scripts)
- [ToDo / Future plans](#todo--future-plans)

---

## Quick start

### Prerequisites

- **Node.js ≥ 20**, **pnpm ≥ 11**
- **PostgreSQL** — provided centrally by the WSL Docker server as `local-postgres`
  (`localhost:5432`, `postgres` / `root`). Check with `dstatus`; start with `dstart postgres`.

### Install & run

```bash
pnpm install

# Backend env — copy and adjust
cp app-nest/.env.example app-nest/.env

# Database: create schema, apply migrations, seed demo data
pnpm db:migrate      # prisma migrate dev  (app-nest)
pnpm db:seed         # prisma db seed

# Run both dev servers in parallel
pnpm dev
#   API  → http://localhost:3300/api      (health check: GET /api/health)
#   Web  → http://localhost:4300
```

`pnpm build` type-checks and builds both packages. CI ([`.github/workflows/build.yml`](./.github/workflows/build.yml))
runs `build` + `typecheck` + `lint` on every push / PR.

### Demo accounts

Seeded by `pnpm db:seed`. **Password for all accounts: `11111111`.**

| Login | Role | Notes |
|---|---|---|
| `admin` | ADMIN | Platform Admin |
| `supplier1` | SUPPLIER | Nordic Pharma Distribution |
| `supplier2` | SUPPLIER | MediSource Wholesale |
| `customer1` | CUSTOMER | Downtown Pharmacy LLC (has sample orders) |
| `customer2` | CUSTOMER | Green Valley Drugstore |
| `customer3` | CUSTOMER | **Left unapproved** — approve it from **Admin → Users** to demo the flow |

> The seed also creates 6 categories, 6 manufacturers, 24 products, 3 news posts and 2 sample
> orders. It is idempotent (upsert / count-guarded), so it is safe to re-run.

---

## Architecture overview

```
┌─────────────────┐        /api  (proxied in dev)        ┌──────────────────┐
│   app-vite      │ ──────────────────────────────────►  │    app-nest      │
│  React 19 SPA   │        /uploads                      │  NestJS REST API │
│  localhost:4300 │ ◄──────────────────────────────────  │  localhost:3300  │
└─────────────────┘   JSON + JWT (Bearer, localStorage)  └────────┬─────────┘
                                                                  │ Prisma 7
                                                                  │ @prisma/adapter-pg
                                                          ┌───────▼─────────┐
                                                          │   PostgreSQL    │
                                                          │ pharmacy_catalog│
                                                          └─────────────────┘
```

- **Auth**: stateless JWT (HS256), sent as `Authorization: Bearer <token>`, stored in the
  browser's `localStorage`. No refresh tokens / sessions.
- **API base path**: `/api`. Uploaded files are served from `/uploads`.
- In development the Vite dev server proxies `/api` and `/uploads` to the API. In production a
  reverse proxy is expected to route both to `app-nest` (or set `VITE_API_URL` /
  `VITE_ASSETS_URL` to an absolute origin with CORS configured).
- **Cart** is 100 % client-side (`zustand` + `localStorage`). Checkout groups the cart by
  `product.ownerId` → **one `Order` per supplier**.

---

## Backend — `app-nest`

NestJS 12 REST API. See [`app-nest/`](./app-nest).

### Stack

- **NestJS 12** (`@nestjs/platform-express`), global `ValidationPipe`
  (`whitelist` + `forbidNonWhitelisted` + `transform`).
- **Prisma 7** with the **`@prisma/adapter-pg`** driver adapter (`pg` pool).
  - Prisma 7 removed `url` from `schema.prisma`. The connection string lives in
    [`app-nest/prisma.config.ts`](./app-nest/prisma.config.ts) for the CLI (migrate / seed) and
    is passed to `PrismaClient` via `new PrismaPg(process.env.DATABASE_URL)` at runtime
    ([`src/prisma/prisma.service.ts`](./app-nest/src/prisma/prisma.service.ts)).
  - `prisma migrate reset` is blocked by Prisma's AI-agent guard — use `migrate dev` /
    `migrate deploy` / `db seed`.
- **Auth**: `passport-jwt` + `@nestjs/jwt` (`JwtModule.registerAsync` + `ConfigService`),
  `bcryptjs` for password hashing.
- **File uploads**: `multer` v2, disk storage, 2 MB limit, PNG/JPEG/WEBP only
  ([`src/common/upload.ts`](./app-nest/src/common/upload.ts)). Files go to `uploads/products/`.
- **Static files**: `@nestjs/serve-static` serves `uploads/` at `/uploads`.

### Guards & decorators

Two global guards (registered in [`app.module.ts`](./app-nest/src/app.module.ts) as `APP_GUARD`):

- `JwtAuthGuard` — every route requires a valid JWT unless annotated `@Public()`.
- `RolesGuard` — enforces `@Roles(Role.ADMIN, ...)` on routes / controllers.
- `@CurrentUser()` — injects the authenticated `AuthUser` (`{ id, role, ... }`).

### Data model ([`prisma/schema.prisma`](./app-nest/prisma/schema.prisma))

`User` · `Category` · `Manufacturer` · `Product` · `Order` · `OrderItem` · `Post`

- Enums: `Role` (`ADMIN` / `SUPPLIER` / `CUSTOMER`), `OrderStatus`
  (`PENDING` → `PROCESSING` → `SHIPPED` → `DELIVERED`, or `CANCELLED`),
  `PaymentStatus` (`UNPAID` / `PENDING` / `PAID` / `DECLINED`).
- `Product.archived` = soft delete (order history keeps referencing archived products).
- `User.approved` — customer self-signups wait for admin approval; `User.banned` blocks login.
- `Order.code` = `SSS-NNNNN` (zero-padded supplier id + zero-padded order id).
- `Product.price`, `Order.totalPrice`, `OrderItem.price/totalPrice` are `Decimal(10,2)` —
  they serialize to **strings** over JSON; the frontend coerces with `Number(...)`.

### API surface (all under `/api`)

| Module | Endpoints | Access |
|---|---|---|
| `auth` | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | public / self |
| `users` | `PATCH /users/me`, `POST /users/me/password`, `GET /users`, `GET /users/:id`, `POST /users`, `PATCH /users/:id`, `PATCH /users/:id/approve`, `PATCH /users/:id/ban`, `DELETE /users/:id` | `me*` = self · rest = ADMIN |
| `categories` | `GET` · `POST` / `PATCH /:id` / `DELETE /:id` | read: any · write: ADMIN |
| `manufacturers` | `GET` · `POST` / `PATCH /:id` / `DELETE /:id` | read: any · write: ADMIN |
| `products` | `GET` (list, filtered + paginated), `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id`, `POST /:id/cover` (multipart) | list/detail scoped by role · write: ADMIN + SUPPLIER (own) |
| `orders` | `POST /orders/checkout`, `GET`, `GET /:id`, `PATCH /:id/status`, `PATCH /:id/payment-status`, `DELETE /:id` | scoped by role (see below) |
| `posts` | `GET`, `GET /:id` · `POST` / `PATCH /:id` / `DELETE /:id` | read: any · write: ADMIN |
| `stats` | `GET /stats/overview` (dashboard aggregates) | ADMIN + SUPPLIER (own scope) |
| `health` | `GET /health` | public |

**Role scoping**: `SUPPLIER` sees only their own products / orders / stats; `CUSTOMER` sees
only non-archived products and their own orders; `ADMIN` sees everything.

### Environment ([`app-nest/.env.example`](./app-nest/.env.example))

| Var | Example / default | Notes |
|---|---|---|
| `PORT` | `3300` | API port (NestFactory falls back to `3000` if unset) |
| `CORS_ORIGIN` | `http://localhost:5174,http://localhost:4300` | comma-separated allowed origins |
| `DATABASE_URL` | `postgresql://postgres:root@localhost:5432/pharmacy_catalog?schema=public` | read by `prisma.config.ts` (CLI) and the adapter (runtime) |
| `JWT_SECRET` | *(change in production)* | HS256 signing secret — resolved via `ConfigService` |
| `JWT_EXPIRES_IN` | `1h` | token lifetime |
| `MIN_ORDER_TOTAL` | `0` | minimum order total (USD) enforced at checkout; `0` disables it. |

### Scripts (`app-nest`)

```
pnpm --filter ./app-nest dev          # nest start --watch
pnpm --filter ./app-nest build        # nest build → dist/
pnpm --filter ./app-nest start:prod   # node dist/main.js
pnpm --filter ./app-nest lint         # eslint (lint:fix to autofix)
pnpm --filter ./app-nest typecheck    # tsc --noEmit
pnpm --filter ./app-nest exec prisma migrate dev
pnpm --filter ./app-nest exec prisma db seed
```

---

## Frontend — `app-vite`

Vite + React SPA. See [`app-vite/`](./app-vite).

### Stack

- **React 19** + **react-router-dom 7** ([`src/App.tsx`](./app-vite/src/App.tsx)).
- **Vite 8** — dev server on port **4300**, proxies `/api` + `/uploads` to
  `VITE_DEV_API_PROXY` (default `http://localhost:3300`).
- **Tailwind CSS v4** (CSS-first: `@import 'tailwindcss'`, `@theme inline`, no
  `tailwind.config.js`) via `@tailwindcss/postcss`.
- **shadcn/ui** primitives (Radix UI) in [`src/components/ui/`](./app-vite/src/components/ui).
- **@tanstack/react-query** for server state ([`src/lib/queries.ts`](./app-vite/src/lib/queries.ts)),
  **axios** client with a JWT request interceptor + 401 → `/login` redirect
  ([`src/lib/api.ts`](./app-vite/src/lib/api.ts)).
- **zustand** + `localStorage` for the cart ([`src/lib/cart.ts`](./app-vite/src/lib/cart.ts)).
- **react-hook-form** + **zod 4** for forms, **sonner** for toasts, **lucide-react** icons.

### Structure

```
src/
  App.tsx                 route table (ProtectedRoute + role gates)
  context/auth.tsx        auth context — login/logout, current user, token
  components/
    layouts/              ShopLayout (customer) · AdminLayout (admin/supplier)
    ui/                   shadcn primitives
    ProtectedRoute.tsx    role-based route guard + cross-area redirect
  lib/                    api client, react-query hooks, cart store, types, formatters
  pages/
    auth/                 LoginPage · RegisterPage
    shop/                 Catalog · Cart · Checkout · ShopOrders · ShopProfile · News · NewsItem
    admin/                Dashboard · AdminProducts · ProductForm · Categories · Manufacturers ·
                          AdminOrders · Users · AdminNews · AdminProfile
```

### Routing

- `/` + children → `ShopLayout`, gated to `CUSTOMER`.
- `/admin` + children → `AdminLayout`, gated to `ADMIN` + `SUPPLIER`; `categories`,
  `manufacturers`, `users`, `news` are additionally gated to `ADMIN` only.
- Any unknown path redirects to `/`. Accessing the wrong area redirects to the user's home.

### Environment ([`app-vite/.env.example`](./app-vite/.env.example))

Only `VITE_`-prefixed vars reach the bundle, and they are **inlined at build time** — rebuild
after changing them. All are optional:

| Var | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `/api` | absolute URL only when the API is on a different origin |
| `VITE_ASSETS_URL` | `/uploads` | uploaded-asset base URL |
| `VITE_DEV_API_PROXY` | `http://localhost:3300` | dev-only proxy target for `/api` + `/uploads` |

### Scripts (`app-vite`)

```
pnpm --filter ./app-vite dev          # vite dev server (:4300)
pnpm --filter ./app-vite build        # tsc -b && vite build → dist/
pnpm --filter ./app-vite preview      # serve the production build
pnpm --filter ./app-vite lint
pnpm --filter ./app-vite typecheck    # tsc -b
```

---

## Roles & access

| Role | Area | Can see / do |
|---|---|---|
| `CUSTOMER` | Storefront (`/`) | Catalog, cart, checkout, own orders, profile, news. Self-registration held until an admin approves the account. |
| `SUPPLIER` | Admin panel (`/admin`) | Dashboard (own scope), own products (CRUD + cover upload), orders placed against them, own profile. |
| `ADMIN` | Admin panel (`/admin`) | Everything: all products / orders / users, categories, manufacturers, news, platform dashboard. |

---

## Business rules

- **Checkout splits one cart into one order per supplier** (`Order.code` = `SSS-NNNNN`).
  Duplicate cart lines are merged; archived / missing products are rejected.
- **Stock** is decremented at checkout (inside a `$transaction`) and **restored when an order
  is cancelled**.
- **Role-gated order state machine**
  ([`app-nest/src/orders/order-status.ts`](./app-nest/src/orders/order-status.ts)):
  - **Admin** — any transition.
  - **Supplier** (own orders) — `PENDING → PROCESSING → SHIPPED`, or `CANCELLED` while not shipped.
  - **Customer** (own orders) — `PENDING → CANCELLED`, `SHIPPED → DELIVERED`.
- **Payment status** (`UNPAID` / `PENDING` / `PAID` / `DECLINED`) is set manually by
  admin / supplier — there is no payment gateway.
- `MIN_ORDER_TOTAL` (per-supplier order total) is enforced at checkout when `> 0`.

---

## Scripts

Root (`package.json`) — run across the whole workspace:

| Script | Does |
|---|---|
| `pnpm dev` | both dev servers in parallel |
| `pnpm build` | `pnpm -r build` (type-check + build both) |
| `pnpm lint` / `pnpm typecheck` | across both packages |
| `pnpm db:migrate` | `prisma migrate dev` (app-nest) |
| `pnpm db:seed` | `prisma db seed` |
| `pnpm db:reset` | `prisma migrate reset` — **blocked by Prisma's agent guard**; drop/recreate the DB manually instead |
| `pnpm start:api` / `pnpm start:web` | one side only |

> Workspace packages are named `@onetodone/pharmacy-catalog-{js,nest,vite}-app`, which no
> longer match their folder names — all scripts use **path filters** (`--filter ./app-nest`).

---

## ToDo / Future plans

### Auth & security

- [ ] **Refresh tokens + httpOnly cookies** instead of a long-lived JWT in `localStorage`
      (current setup is vulnerable to XSS token theft and cannot revoke tokens).
- [ ] Rate limiting / brute-force protection on `POST /auth/login`.
- [ ] Password-reset flow (needs the transactional email that was dropped).
- [ ] Real `JWT_SECRET` management for production (`.env.example` still ships a placeholder).

### Backend

- [ ] **Automated tests** — there are currently **no unit or e2e tests**, only a manual
      Playwright walk-through done during development. Add Jest unit tests for the order state
      machine / checkout transaction and a Supertest e2e suite.
- [ ] **Avatar upload for users** — `imageUpload('avatars')` helper exists in
      [`common/upload.ts`](./app-nest/src/common/upload.ts) but no endpoint is wired; the
      `User.avatar` column is unused.
- [ ] Product image handling: only a single `cover` is supported; no gallery, no image
      deletion / replacement cleanup on disk, no orphaned-file GC.
- [ ] Pagination is offset-based everywhere; add cursor pagination for large catalogs.
- [ ] No soft-delete **restore** UI/endpoint for archived products; no hard-delete path.
- [ ] OpenAPI / Swagger document generation (`@nestjs/swagger`).
- [ ] Structured logging + request tracing (currently `console.log`).
- [ ] Move `MIN_ORDER_TOTAL` / other business config into the DB so admins can change it.

### Frontend

- [ ] **Route-level code splitting** — the production bundle is ~510 kB; lazy-load admin pages.
- [ ] Optimistic updates / better error boundaries around mutations.
- [ ] Accessibility pass (focus traps, ARIA on custom widgets, keyboard nav on tables).
- [ ] i18n (App is English-only now).
- [ ] Empty / loading / error states are minimal on several admin tables.
- [ ] Cart lives only in `localStorage` — no server-side cart, lost across devices.

### Features

- [ ] Payment gateway integration.
- [ ] Order-level ticketing / customer ↔ supplier messaging.
- [ ] Transactional email (order confirmations, status changes).
- [ ] PDF invoices / packing slips, barcode generation.
- [ ] Platform settings screen, scheduled jobs (cron).
- [ ] Staff sub-users (delegated accounts under a supplier / customer).

### Ops / deployment

- [ ] Dockerfiles + a deployment `docker-compose` for the two apps (infra Postgres is
      managed centrally, app containers are not defined).
- [ ] Production migration strategy (`prisma migrate deploy` in a release step).
- [ ] CI currently builds + lints only — add a job that runs migrations against a throwaway
      Postgres and executes the (future) test suite.
- [ ] Health/readiness probes beyond `GET /api/health` (DB connectivity check).
