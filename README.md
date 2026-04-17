# riwak

Riwak is a mobile-first PWA for a coffee shop. It focuses on two things only:

1. order-ahead pickup
2. simple loyalty rewards

The app is intentionally built for phone screens, one-handed use, and fast service in a crowded shop.

## Stack

I used a simple, production-friendly stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- custom cookie-based sessions instead of NextAuth

I kept Prisma on version 6 for this MVP because it keeps the schema and migration flow simpler and more stable here than the Prisma 7 config model.

## What Is Implemented

- customer onboarding with name + phone number
- auto-generated unique loyalty PIN
- persistent signed-in customer sessions on the phone
- order-ahead without online payment
- staff queue with live order status updates
- simple loyalty stamps
- 5 stamps = 1 free drink
- reward wallet and reward redemption
- trust levels for new, returning, trusted, and limited customers
- admin menu/configuration screen
- PWA manifest, install prompt, icons, and a basic offline shell
- S3-compatible object storage for short customer voice notes
- demo data for customers, staff, menu items, orders, rewards, and trust states
- tests for the core business rules

## What Is Intentionally Deferred

- online payments
- OTP verification
- multi-store logic
- advanced analytics
- websocket live updates
- a complex reward marketplace
- full multilingual UI

The UI copy is centralized in `src/content/fr.ts` so Arabic and English can be added later without reworking the app structure.

## Local Setup

### 1. Copy environment variables

```bash
cp .env.example .env
```

If you are on Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Voice notes require S3-compatible storage variables as well:

```env
S3_BUCKET=
S3_REGION=us-east-1
S3_ENDPOINT=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=true
S3_SIGNED_URL_TTL_SECONDS=3600
```

### 2. Start PostgreSQL

```bash
docker compose up -d db
```

### 3. Install dependencies

```bash
npm install
```

### 4. Generate Prisma Client

```bash
npm run prisma:generate
```

### 5. Apply the migration

```bash
npx prisma migrate dev
```

### 6. Seed demo data

```bash
npm run prisma:seed
```

This command is for local/demo data only. Do not run it on a production database.

### 7. Start the app

```bash
npm run dev
```

Open the app at the local URL shown by Next.js.

## Demo Accounts

### Customers

Use the phone number + PIN on the register page to sign in quickly.

| Name | Phone | PIN |
| --- | --- | --- |
| Amina El Fassi | `+212600000001` | `111111` |
| Youssef Benali | `+212600000002` | `222222` |
| Salma Ait | `+212600000003` | `333333` |
| Omar Berrada | `+212600000004` | `444444` |
| Kenza Amani | `+212600000005` | `555555` |
| Anas Idrissi | `+212600000006` | `666666` |

### Staff

| Role | Email | Password |
| --- | --- | --- |
| Staff | `staff@riwak.ma` | `Riwak123!` |
| Admin | `admin@riwak.ma` | `Admin123!` |

## Loyalty Rules

- 1 qualifying purchase = 1 stamp
- 5 stamps = 1 free drink
- the free drink is stored in the customer wallet until redeemed
- redemption decrements the available free drink balance
- stamp events and reward events are saved for auditability

The MVP uses a very simple stamp system on purpose. No points, no marketplace, no tier economy.

## Order Expiry

Unpaid orders expire after the configured delay in `StoreSettings`.

Default:

- `30` minutes

The expiry is enforced in the app logic and is shown in the staff queue and customer order views.

## Menu

The seed menu uses the business labels exactly as requested:

- Express
- Itali
- Normal
- Mousse Blanche
- Milke
- Coffee

The menu is stored in the database so the admin screen can add, hide, rename, or remove items without changing the architecture.

## PWA Notes

- installable as a PWA
- manifest configured
- icons provided through static App Router icon files and PWA manifest assets
- visible add-to-home-screen nudge
- basic offline page and service worker
- live operational routes and API endpoints bypass the offline cache to avoid stale queue/status data
- voice-note files are stored in object storage and only metadata stays in PostgreSQL

## Railway Deployment

Recommended production flow:

1. Set `DATABASE_URL` in Railway
2. Set the S3-compatible storage variables used for voice notes
3. Set bootstrap credentials for the first privileged users:

```bash
BOOTSTRAP_ADMIN_EMAIL=...
BOOTSTRAP_ADMIN_PASSWORD=...
BOOTSTRAP_STAFF_EMAIL=...
BOOTSTRAP_STAFF_PASSWORD=...
```

4. Build with:

```bash
npm run prisma:generate
npm run build
```

5. Before starting a new release, run migrations:

```bash
npx prisma migrate deploy
```

6. Start the app with:

```bash
npm run start
```

Notes:

- `next start` is sufficient for Railway with the current setup
- Prisma migrations are committed in `prisma/migrations`
- the app expects PostgreSQL in production
- voice notes require an S3-compatible bucket reachable from the deployed app
- service worker cache versions are bumped when icon or offline-shell assets change

### Bootstrap Initial Staff/Admin Users

For production, use the bootstrap script instead of the demo seed:

```bash
npm run prisma:bootstrap
```

This script:

- reads `BOOTSTRAP_ADMIN_*` and `BOOTSTRAP_STAFF_*` from the environment
- creates the admin/staff users only if they do not already exist
- hashes passwords with the same bcrypt logic used by the app login flow
- leaves existing users unchanged on repeated runs

Recommended Railway flow:

1. Add the `BOOTSTRAP_*` variables in the service environment.
2. Open a shell in the deployed service container with [`railway ssh`](https://docs.railway.com/cli/ssh).
3. Run `npm run prisma:bootstrap`.
4. Verify team login works.
5. Remove the `BOOTSTRAP_*` secrets afterward if you do not want to keep them in the environment.

If you only need Railway variables locally, Railway documents that [`railway shell`](https://docs.railway.com/cli/shell) opens a local shell with service variables, and their [Variables docs](https://docs.railway.com/variables) note that service variables are also available to commands invoked by `railway run`. For the actual production bootstrap, using `railway ssh` into the deployed service is the safest manual path.

## Business Logic Notes

- only one active unpaid order per customer
- new customers can be limited to small orders
- staff can mark a customer as trusted or limited
- staff can manually adjust stamps
- order pickup is tracked in the staff queue
- customers pay at the shop, not in the app

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npm test
npm run prisma:generate
npm run prisma:seed
npm run prisma:bootstrap
```

## Files Worth Knowing

- `src/app/` contains the routes and screens
- `src/lib/actions.ts` contains server actions for orders, loyalty, trust, and settings
- `src/lib/queries.ts` contains the read-side data loaders
- `src/lib/domain.ts` contains the pure business rules used by the tests
- `src/content/fr.ts` contains the French UI copy
- `prisma/schema.prisma` contains the full data model
- `prisma/seed.ts` loads the demo dataset
- `prisma/bootstrap.ts` creates initial production staff/admin accounts from environment variables

## Notes For Future Work

If you expand this MVP later, the next likely steps are:

- real payments
- barcode/QR ticket validation at pickup
- live socket updates for staff
- Arabic and English translations
- richer admin analytics
