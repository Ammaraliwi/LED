# LEDWAVE — Premium LED Screen Rental & Booking Platform

A production-grade Next.js application for an event-technology company renting modular LED
screens. This is **Phase 1**: the full public marketing site, the interactive screen
configurator, real-time availability + dynamic pricing, checkout, authentication, and the
customer portal — all backed by a real PostgreSQL database. The Admin Portal (inventory, CRM,
finance, operations) is scoped as Phase 2 and is not included yet.

## Stack

- **Framework:** Next.js 16 (App Router, Server Components, Route Handlers)
- **Database:** PostgreSQL, accessed via [Drizzle ORM](https://orm.drizzle.team/) (chosen over
  Prisma because Prisma's engine binaries could not be downloaded in the build sandbox — Drizzle
  is pure TypeScript with no native binaries, and is a fully supported production-grade ORM)
- **Auth:** NextAuth v5 (Credentials provider, JWT sessions, bcrypt password hashing)
- **Styling:** Tailwind CSS v4, custom dark cinematic design system (see `src/app/globals.css`)
- **Animation:** Framer Motion
- **Validation:** Zod on every API route
- **File storage:** Local filesystem under `public/uploads` behind a single route
  (`src/app/api/upload/route.ts`) — swap this one file for an S3/R2 client to go to production
  cloud storage without touching any calling code.

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment** — copy `.env.example` to `.env.local` and adjust it for your
   environment. Never commit the resulting environment file:

   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/ledrental"
   AUTH_SECRET="<random 32+ byte secret>"
   ```

3. **Provision the database** (a local Postgres example):

   ```bash
   createuser ledapp --pwprompt --createdb
   createdb ledrental -O ledapp
   npm run db:migrate            # applies committed, non-interactive migrations
   npm run db:seed               # deliberate seed; never runs automatically during deploy
   ```

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`.

5. **Production build**

   ```bash
   npm run build
   npm start
   ```

## Deployment Workflow

`main` is the production branch. `staging` is the pre-production integration branch. Normal
development must happen on a short-lived `feature/*`, `fix/*`, or `chore/*` branch; developers
and Codex must not commit feature work directly to `main`.

```text
feature/* (or fix/* / chore/*)
        ↓ pull request + CI
staging
        ↓ Railway staging deployment + approval
pull request: staging → main
        ↓ CI
main
        ↓ Railway production deployment
```

Railway should watch `staging` for the staging environment and `main` for production. A release
is promoted by opening a pull request from `staging` into `main`; do not cherry-pick ordinary
feature work directly onto `main`.

### Railway environments

Create two Railway environments with separate services and databases:

| Railway environment | GitHub branch | PostgreSQL | Purpose |
| --- | --- | --- | --- |
| `staging` | `staging` | Staging Postgres only | Integration and approval |
| `production` | `main` | Production Postgres only | Live website |

For both application services:

- Build command: `npm ci && npm run build` (or Railway's equivalent Nixpacks build steps).
- Start command: `npm start`.
- Pre-deploy command: `npm run db:migrate`, but only after reviewing committed migration SQL and
  confirming the database's migration baseline as described below.
- Health-check path: `/api/health`.
- Restart policy: restart on failure.

The start script binds to `0.0.0.0`. Next.js reads Railway's injected `PORT` directly and falls
back to port 3000 locally, so no shell-specific `${PORT:-3000}` expansion is required.

Each environment must define its own values for these required application variables:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Use the PostgreSQL URL belonging to that Railway environment only. |
| `AUTH_SECRET` | Yes | Use a unique, high-entropy value in each environment. |

`PORT` is injected by Railway and consumed by the Next.js CLI; do not store it in `.env`.
NextAuth is configured to trust Railway's forwarded host and protocol, so callbacks and redirects
follow the active staging or production domain. `AUTH_URL`, `NEXTAUTH_URL`, and
`NEXTAUTH_SECRET` are not required by this application and should not be used as substitutes for
the two variables above. Do not copy production secrets into GitHub Actions: CI uses inert
build-only placeholders and never connects to a database.

### Database migrations and seed data

Drizzle schema changes follow this reviewed, non-interactive workflow:

1. Change `src/db/schema.ts` on a feature branch.
2. Run `npm run db:generate` and review the generated SQL under `drizzle/`.
3. Run `npm run db:check`, then commit the schema and generated migration together.
4. Test `npm run db:migrate` against the staging database.
5. Promote the same reviewed commit to `main`; production runs `npm run db:migrate` before the
   new application version starts.

`npm run db:push` remains available for disposable local development only. It can prompt and can
apply schema changes without a reviewed migration, so never configure it as a Railway deploy or
pre-deploy command.

The initial migration in this repository is a baseline for new databases. If an existing Railway
database was previously created with `drizzle-kit push`, back it up and compare it with
`src/db/schema.ts` before enabling automatic migrations. Do not run the baseline blindly against
an existing populated database: establish the migration baseline in a controlled maintenance
window first.

Seeding is always manual:

```bash
npm run db:seed
```

When approved pricing values change, update an already-seeded environment explicitly:

```bash
npm run db:update-pricing
```

The pricing updater changes only the three LED cabinet daily rates, the approved core pricing
settings, and the matching processor/operator equipment rates. It runs in a transaction and
fails without partial changes if any expected row is missing. Run it separately for each intended
environment; it is never part of build, deploy, start, or migration commands.

The seed script skips records it has already created where practical. Seed staging independently
when test data is needed. Do not add `db:seed` to production build, deploy, start, or migration
commands.

### GitHub branch protection

Configure these rules manually in GitHub after the CI workflow has completed at least once:

- `main`: require a pull request, require the `validate` CI job, prevent direct pushes and force
  pushes, require conversation resolution, and require the branch to be up to date when that
  policy fits the team's merge cadence.
- `staging`: prefer pull requests, require the `validate` CI job, prevent force pushes, and limit
  direct pushes to controlled integration or release management only.

Administrators should not bypass these rules for normal development. Railway and database
credentials belong in Railway environment variables, not GitHub repository secrets.

## Architecture Notes

### Database schema (`src/db/schema.ts`)

Covers: `users`, `customers`, `ledProducts`, `equipment`, `packages`, `pricingSettings`,
`bookings`, `bookingAddons`, `bookingDocuments`, `bookingStatusHistory`, `invoices`, `payments`,
plus editable homepage content (`testimonials`, `projects`, `siteStats`, `faqs`). Enums model
booking status, payment status, customer type, event type and admin roles (`user_role` already
includes `super_admin` / `sales` / `operations` / `technician` / `finance` for the Phase 2 admin
build-out).

### Pricing engine (`src/lib/pricing.ts`)

A single pure function, `computePricing()`, is the source of truth for every price shown
anywhere in the app. It is called:

- Client-side (via `POST /api/quote`) for the **live-updating quotation** as a customer
  configures a screen.
- Server-side again, authoritatively, inside `POST /api/bookings` at the moment a booking is
  created — so a client can never submit a price it computed itself.

Multi-day discount curves, installation/dismantling/transport fees, technician & processor
rates, weekend multiplier, corporate discount and VAT are all read from the `pricingSettings`
table (key/value + JSON), so they can be changed without a code deploy once an admin UI exists.

### Inventory & double-booking prevention

`POST /api/availability` and `POST /api/bookings` both sum `totalCabinets` across all
**non-cancelled, non-draft** bookings for a product whose `[installationDate, dismantlingDate]`
window overlaps the requested window, and compare that against the product's `totalCabinets`.
The booking route re-validates this **inside the same request** right before insert (not trusting
the client's last availability check), so two customers racing for the last cabinets can't both
succeed.

### Booking wizard (`src/components/configure/booking-wizard.tsx`)

A single client-side state machine (no page reloads between steps) — Screen → Dates → Services →
Event Details → Account → Review — with a persistent live-quote sidebar. Availability and price
are re-fetched (debounced) on every relevant change. Authenticated users skip the Account step
automatically.

### Customer portal (`src/app/portal/**`)

Server-rendered, session-gated (`src/app/portal/layout.tsx` redirects to `/login` if
unauthenticated). Dashboard, bookings list/detail with a status timeline, quotations, invoices
(auto-generated when a booking is confirmed), payments, documents, profile editing, and support.

## What's Next (Phase 2)

The `user_role` enum, `pricingSettings` table, and inventory-aware availability logic were built
with the Admin Portal in mind:

- Admin dashboard (KPIs, charts)
- Booking calendar (day/week/month)
- Inventory & equipment asset management (individual cabinet/asset tracking, maintenance)
- Pricing configuration UI (writes to `pricingSettings`)
- Quotation → booking conversion, PDF generation, email/WhatsApp send
- Invoice & payment management, refunds
- Operations checklist view (prepare/load/deliver/install/test/return)
- Role-based permissions (roles already modeled: Super Admin, Sales, Operations, Technician,
  Finance)
- Reports (revenue, utilization, customer LTV) with PDF/Excel export
