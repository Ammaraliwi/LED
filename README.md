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

2. **Configure environment** — copy `.env` (already present in this project with working local
   defaults) and adjust for your environment:

   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/ledrental"
   AUTH_SECRET="<random 32+ byte secret>"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **Provision the database** (a local Postgres example):

   ```bash
   createuser ledapp --pwprompt --createdb
   createdb ledrental -O ledapp
   npx drizzle-kit push          # creates all tables from src/db/schema.ts
   npx tsx src/db/seed.ts        # seeds LED products, packages, equipment, pricing, content
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
