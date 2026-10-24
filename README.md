# Nines

Accounting for small Philippine gas stations: sales per pump and shift, expenses,
receivables, payables, and a simple VAT summary.

This version is the local app. Sign up, set up one station, and keep the daily books.
BIR sales-book exports (SLS/SLP) and withholding tax are not built yet.

## Stack

| Part | Tech | Notes |
| --- | --- | --- |
| Web | React Router (SPA), shadcn/ui, Tailwind | Vite dev server on port 5173 proxies `/api` |
| API | NestJS, Better Auth (email + password) | Port 3000 |
| Database | PostgreSQL via Prisma 7 | Money is stored as whole centavos (`BigInt`). Pump meters are stored as centilitres. |
| Infra | AWS CDK scaffold in `infra/` | Not a finished deploy. Region sketch is `ap-southeast-1`. |

```
apps/web        React Router app
apps/api        NestJS API, Prisma schema and migrations
packages/shared Litre, peso, VAT, and balance math used by the API and the UI
infra           CDK scaffold: VPC, Aurora Serverless v2, Lambdas, HTTP API
scripts         deploy.sh (scaffold)
```

The browser talks only to the Vite origin. `/api/*` is proxied to the API, so the
session cookie stays first-party. A later hosting setup can do the same with Amplify
in front of API Gateway.

## Run it locally

Needs Node 22, pnpm 10, and Postgres 16. Docker is the intended database:

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up             # Postgres 16 on localhost:5432
pnpm db:migrate        # applies the committed migrations
pnpm db:seed           # sample station and demo login
pnpm dev               # web on :5173, API on :3000
```

Open http://localhost:5173.

Demo login after seeding:

- Email: `demo@nines.local`
- Password: `station123`
- Station: Bautista Fuel Point, Antipolo (about two weeks of shifts, expenses, credit customers, and supplier bills)

Or create your own account. The first sign-in walks through station details, fuel prices, and pumps.

`pnpm db:migrate` applies migrations that are already in the repo. After you change `apps/api/prisma/schema.prisma`, create a new migration with `pnpm db:migrate:dev`.

Tests use a second database, `nines_test`, on the same Postgres. A fresh Docker volume creates it from `docker/init`. If the volume already existed:

```sh
docker compose exec postgres createdb -U nines nines_test
```

```sh
pnpm test              # money math and API tests
pnpm --filter @nines/web exec playwright install chromium
pnpm test:e2e          # sign up, set up a station, record a shift, add an expense, open reports
```

## What this version does

- Email and password sign up / sign in.
- One station per account: name, TIN, address, VAT-registered or not, fuels with a price per litre, and pumps.
- Shift entry: opening and closing meters, litres, amount, cash / card / credit, and cash over or short. Credit is assigned to a customer.
- Expenses with categories.
- Receivables: customers, charges (from shifts or entered by hand), payments, balances.
- Payables: suppliers, bills, payments, balances.
- Dashboard for today and this month, plus the last 14 days of sales.
- Reports: daily sales, monthly sales by fuel, and output VAT at 12% on VAT-inclusive prices (VAT = 12/112 of gross, rounded half up to the centavo).

Dates use Asia/Manila. Amounts are shown as `₱1,234.56`.

## Later

- BIR SLS/SLP files and withholding.
- More than one user per station (owner and cashier).
- Meter rollover.
- A real Lambda bundle, private migrations, and Amplify hosting. `./scripts/deploy.sh` only deploys the CDK scaffold and does not publish the app. Do not run it expecting a production site.

When that deploy exists, idle cost should stay close to Aurora storage plus the database secret, because Aurora Serverless v2 is set to scale to zero in the scaffold. The scaffold does not add a NAT gateway. It is not ready to run the Nest API.
