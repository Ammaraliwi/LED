# LEDWAVE

LEDWAVE is a Next.js 16 platform for configuring, quoting and booking modular LED screens. It includes the public website, a customer portal and a database-driven staff Admin Portal.

## Stack

- Next.js 16 App Router, React 19 and TypeScript
- PostgreSQL with Drizzle ORM
- Auth.js credentials authentication with bcrypt, JWT sessions, server-side database rechecks and staff TOTP MFA
- Zod validation, Tailwind CSS and S3-compatible object storage

## Admin Portal

The protected Admin routes are:

| Route | Purpose |
| --- | --- |
| `/admin` | Booking, revenue, balance, fleet utilization, upcoming job and audit metrics |
| `/admin/products` | LED product catalog, rates and total cabinet inventory |
| `/admin/products/[id]` | Product editing and date-bound inventory blocks |
| `/admin/pricing` | Product rates, services, discount curve, weekend factor, tax, preview and audit history |
| `/admin/bookings` | Searchable/filterable booking list |
| `/admin/bookings/[id]` | Event, immutable price snapshot, status history, notes, assignments and documents |
| `/admin/customers` | Customer search and account status |
| `/admin/customers/[id]` | Profile, company data, internal notes, booking and finance history |
| `/admin/payments` | Transactional payment/refund ledger |
| `/admin/invoices` | Invoice creation, editing and reconciled status |
| `/admin/content` | Structured drafts, publishing, records and revisions |
| `/admin/content/preview` | Protected draft-data preview |
| `/admin/media` | Public/private object-storage media library |
| `/admin/users` | Invite-only staff management, roles, activation, MFA reset and session revocation |
| `/admin/settings` | MFA enrollment, site settings and contact submissions |
| `/admin/audit-log` | Append-only privileged activity history |

The public website layout and React components remain in code. Admin users edit validated content fields; the CMS does not accept arbitrary HTML or executable markup.

## Roles and permissions

Authorization is enforced in server routes and data-access functions. Sidebar visibility is only a UX convenience. Privileged requests re-read the active account, role, session version and MFA state from PostgreSQL.

| Role | Primary access |
| --- | --- |
| `super_admin` | Every permission, staff/role management, settings and publishing; MFA required |
| `sales` | Products/inventory/pricing read, bookings/customers write, finance read, content/media write |
| `operations` | Products/inventory write, pricing read, bookings/status write, customers read, media write and staff read |
| `technician` | Assigned bookings and operational status transitions, inventory/media read; no financial metrics or customer management |
| `finance` | Dashboard, products/pricing/bookings/customers read, payments record, invoices write and audit read; MFA required |
| `customer` | Customer portal only; no Admin permission or Admin API access |

The canonical matrix is in `src/lib/admin/permissions.ts`. Public registration always inserts `role = customer`; staff accounts exist only through one-time invitations.

## Pricing and booking integrity

The browser submits product ID, requested dimensions and dates, selected service flags, equipment IDs and private media IDs. It cannot submit cabinet count, rental days, product rate, weekend/corporate flags, discount values or totals.

The server:

1. loads the active product, equipment, customer type and complete pricing catalog from PostgreSQL;
2. derives the cabinet grid, rental duration and Qatar weekend state;
3. calculates the authoritative price with reviewed formulas;
4. locks pricing and the selected product with PostgreSQL transaction advisory locks;
5. checks every rental day against committed bookings and inventory blocks;
6. inserts the booking, history, documents and invoice atomically; and
7. stores `pricingSnapshot` plus `pricingFormulaVersion` on the booking.

Admin pricing changes affect only future calculations. Historical booking totals and snapshots are never recalculated. Seeds use `ON CONFLICT DO NOTHING` and do not overwrite Admin-managed values.

## Finance integrity

Payments are an append-only ledger. Refunds are negative records linked to the original payment. Payment recording, refund limits, booking `amountPaid`/`paymentStatus`, and related invoice statuses reconcile under one booking-level advisory lock and one database transaction. A posted payment is never edited or deleted through Admin.

## Media and storage

`public/uploads` is not used for runtime uploads. The application uses the private Railway S3-compatible bucket exposed through the standard `AWS_*` variables, stores generated object keys in PostgreSQL, and creates short-lived SigV4 URLs.

- Public classification: JPEG, PNG and WebP, 10 MB maximum.
- Private classification: JPEG, PNG, WebP and PDF, 15 MB maximum.
- Uploads are checked by magic bytes; images are dimension-inspected and suspicious active/embedded PDF markers are rejected.
- Public website assets and private booking documents share the environment-isolated Railway bucket but use separate `public/` and `private/` object-key prefixes plus database visibility metadata.
- Private downloads require a current staff permission, upload ownership, or a booking owned by the current customer.
- Invalid uploads are quarantined and removed from object storage. Admin deletion is refused while a product, project, or booking document still references the asset; an unreferenced asset is quarantined before its object is deleted and its metadata is retained as a deleted audit record.

Admin and customer uploads pass through the authenticated application server, so the bucket does not need browser-write CORS. Keep the bucket private and non-listable; public-classified assets are still served through short-lived signed URLs and private assets require application authorization first. Private PDFs are downloaded as attachments. Current Railway buckets use virtual-host style automatically; an older bucket can explicitly set `AWS_S3_URL_STYLE=path` if its Credentials tab requires path style.

## MFA and account recovery

Staff MFA uses TOTP (SHA-1, 30-second window) with AES-256-GCM-encrypted secrets. `MFA_ENCRYPTION_KEY` must decode to exactly 32 bytes. Eight one-time recovery codes are shown once and stored only as SHA-256 hashes. Used recovery codes are atomically removed.

`super_admin` and `finance` cannot use protected Admin operations until MFA is enabled and verified. Other staff roles are strongly encouraged to enroll. MFA resets and password changes increment `sessionVersion`, invalidating existing sessions. Password reset tokens and staff invitation tokens are random, short-lived, stored only as hashes and single-use.

Notification delivery uses an optional server-to-server webhook. If it is not configured, Admin shows the one-time staff invitation link for secure manual delivery. Password-reset emails require the webhook.

## First `super_admin` bootstrap

There is no default password and no seeded Admin account. Bootstrap only creates a 30-minute one-time invitation and refuses to run once any active staff user exists.

1. Apply the reviewed migrations to the intended empty/new staging database.
2. Temporarily set `ADMIN_BOOTSTRAP_TOKEN` to at least 32 random characters, `BOOTSTRAP_ADMIN_EMAIL` to the owner email and `APP_URL` to the exact staging HTTPS origin.
3. Run `npm run admin:bootstrap` once in a Railway staging shell/job.
4. Open the printed one-time URL, choose a 12–72 character password with uppercase, lowercase and a number, then sign in.
5. Enroll MFA immediately and save the recovery codes offline.
6. Remove `ADMIN_BOOTSTRAP_TOKEN` and `BOOTSTRAP_ADMIN_EMAIL` from Railway.

After bootstrap, invite all other staff from `/admin/users`.

## Environment variables

Never commit values. Use distinct secrets and buckets for staging and production.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL URL for this environment only |
| `AUTH_SECRET` | Yes | High-entropy Auth.js/session secret |
| `RATE_LIMIT_SALT` | Recommended | Separate high-entropy salt; falls back to `AUTH_SECRET` |
| `APP_URL` | Yes | Exact public origin, for example `https://staging.example.com` |
| `MFA_ENCRYPTION_KEY` | Yes for staff MFA | Base64-encoded 32-byte key; loss prevents TOTP-secret decryption |
| `AWS_ENDPOINT_URL` | Yes for uploads | Railway S3 endpoint, normally `https://storage.railway.app` |
| `AWS_S3_BUCKET_NAME` | Yes for uploads | Globally unique bucket name injected by Railway |
| `AWS_DEFAULT_REGION` | Yes | Railway region value, normally `auto` |
| `AWS_ACCESS_KEY_ID` | Yes for uploads | Private Railway bucket access-key ID |
| `AWS_SECRET_ACCESS_KEY` | Yes for uploads | Private Railway bucket secret; never exposed to the browser or logs |
| `NOTIFICATIONS_WEBHOOK_URL` | Optional | HTTPS email/notification adapter endpoint |
| `NOTIFICATIONS_WEBHOOK_TOKEN` | Optional | Bearer secret for the notification adapter |
| `ADMIN_BOOTSTRAP_TOKEN` | Bootstrap only | Remove immediately after first Admin creation |
| `BOOTSTRAP_ADMIN_EMAIL` | Bootstrap only | Remove immediately after first Admin creation |

`PORT` is supplied by Railway. `AUTH_URL`, `NEXTAUTH_URL` and `NEXTAUTH_SECRET` are not used.

Generate secrets, for example:

```bash
openssl rand -base64 48                 # AUTH_SECRET / RATE_LIMIT_SALT
openssl rand -base64 32                 # MFA_ENCRYPTION_KEY
```

## Local development

```bash
npm ci
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Validation:

```bash
npm run test
npm run lint
npm run typecheck
npm run db:check
npm run build
```

Set `RUN_INTEGRATION_TESTS=true` only against a disposable database after applying migrations. It enables the real concurrent-booking and finance-transaction integration test.

## Migration policy and timezones

`drizzle/0001_jazzy_thunderbolt.sql` and `drizzle/0002_past_hardball.sql` are additive. They create Admin/security tables, indexes and foreign keys and add nullable/defaulted columns; they do not delete or recalculate historical business data. The second migration separates CMS drafts from the last published version so saving a draft cannot change the public website.

Existing timezone-naive columns remain unchanged. New audit/security timestamps use `timestamptz`. The added `changedAtUtc` and `recordedAtUtc` fields remain null for historical records so migration time is not misrepresented as event/payment time. New values use PostgreSQL UTC timestamps. Event and rental dates remain Qatar business date/time fields; the application treats weekends as Friday/Saturday and invoice due dates as end-of-day `Asia/Qatar`.

Do not run `db:push` on staging or production. Do not run `db:seed` during deploy. Review migration SQL and back up the target database before every first application.

## Railway Staging procedure

The feature branch must first be reviewed and merged into `staging`; this repository does not deploy or merge automatically from the feature PR.

Manual staging configuration:

1. Use a staging-only Railway application service, PostgreSQL service and persistent staging-only Railway bucket.
2. Connect the application service to branch `staging`, never `feature/admin-portal` for production.
3. Set the environment variables above with staging-only values.
4. Configure bucket CORS for the exact staging origin and direct-upload method `PUT` (with `content-type` allowed). Signed `GET` and `HEAD` requests are generated server-side.
5. Set build command to `npm ci && npm run build`.
6. Set start command to `npm start`.
7. Set health check to `/api/health`.
8. Do not add seed/bootstrap to deploy or start commands.

After taking a staging backup and reviewing the SQL, run exactly:

```bash
npm ci
npm run db:check
npm run db:migrate
npm run test
npm run build
```

For a brand-new staging database only, bootstrap catalog/content once:

```bash
npm run db:seed
```

Then run the first-super-admin process above. For an existing populated database, do not run the seed unless the missing-record behavior has been explicitly reviewed.

## Staging acceptance checklist

- Customer registration always creates a customer and redirects to `/portal`.
- Customer, inactive and revoked accounts cannot open Admin routes/APIs.
- Every staff role sees only its permitted navigation and receives 403 from disallowed APIs.
- Super Admin and finance are forced through MFA; TOTP and one recovery code work, and reuse fails.
- Product create/edit/archive and maintenance blocks are audited.
- Lowering inventory below committed peak fails.
- Two simultaneous bookings for the final cabinets produce one success and one conflict.
- Manipulated quote/booking payloads with cabinet count/rates/totals are rejected.
- Existing booking totals remain unchanged after a pricing edit; a new quote uses the new value.
- Booking status transitions reject unsafe jumps and record old/new status, actor, source, note and UTC time.
- Technician sees only assigned bookings and no financial dashboard values.
- Payment, partial/full refund, invoice and booking balances remain synchronized.
- CMS draft does not change the public site; publish does; unsafe markup fails validation; revision is recorded.
- Public image upload renders; private document cannot be opened by another customer.
- File type spoofing, oversize files and suspicious PDFs are rejected/quarantined.
- Contact submissions are visible in Admin and absent from application PII logs.
- Staff role change/deactivation/session revoke takes effect on the next protected request.
- The final active `super_admin` cannot be deactivated or demoted.
- Audit entries omit passwords, tokens, recovery codes, cookies and signed URLs.
- `/api/health`, responsive Admin navigation, loading, error, empty and pagination states work.

## Backup and rollback

Before staging or production migration, create a provider snapshot and a logical backup:

```bash
pg_dump --format=custom --no-owner --no-acl "$DATABASE_URL" --file=ledwave-before-admin.dump
pg_restore --list ledwave-before-admin.dump > ledwave-before-admin.contents.txt
```

Store the dump outside the application service and verify it is non-empty. Test restoration into a separate disposable database when possible:

```bash
createdb ledwave_restore_test
pg_restore --clean --if-exists --no-owner --no-acl --dbname=ledwave_restore_test ledwave-before-admin.dump
```

Application rollback is to redeploy the previous known-good commit. Because the migration is additive, the previous application ignores new tables/columns. Do not hand-delete Admin tables during an incident. If a full database rollback is approved, stop writes, preserve a new incident snapshot, restore the pre-migration dump into a new PostgreSQL service, validate counts/checksums, then repoint the application. This discards all writes after the backup and therefore requires explicit business approval.

## Delivery workflow

```text
feature/admin-portal -> Draft PR to staging -> CI -> review -> Railway Staging test
staging -> reviewed PR to main -> Production
```

Never merge or deploy the feature PR automatically. `main` and production remain untouched until the staging acceptance checklist is complete and a separate promotion is approved.
