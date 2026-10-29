# Nines

General small-business accounting for the Philippines: sales invoices, charge
customers and collections, suppliers and AP, cash reconciliation, chart of
accounts, journals, trial balance, financial statements, fixed assets, payroll,
and tax checklists. An optional **Fuel station** module (pumps, meter shifts,
tanks, deliveries, dips) turns on from onboarding or settings when the industry
is Fuel station.

This version is the local app (plus an optional Electron desktop shell). Sign up,
set up one business, and keep the daily books. Full BIR SLS/SLP file export is
still later; withholding on collections (1%/2% + BIR 2307 ref) is supported.

## Stack

| Part | Tech | Notes |
| --- | --- | --- |
| Web | React Router (SPA), shadcn/ui, Tailwind | Vite on :5173 proxies `/api`; dark mode + Cmd-K |
| API | NestJS, Better Auth (email + password) | Port 3000 |
| Database | PostgreSQL via Prisma 7 | Money as whole centavos (`BigInt`). Fuel metres as centilitres. |
| Desktop | Electron + electron-builder | Thin webview shell in `apps/desktop` |
| Infra | AWS CDK in `infra/` | Account `460047018105`, region `ap-southeast-2` (Sydney). |

```
apps/web        React Router app
apps/api        NestJS API, Prisma schema and migrations
apps/desktop    Electron shell (loads hosted or local URL)
packages/shared Money, tax, COA, aging helpers
infra           CDK stack, Lambda bundle, and database / frontend scripts
scripts         deploy.sh (laptop deploy; do not run from the agent)
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

Demo logins after seeding:

| Account | Password | Business | Module |
| --- | --- | --- | --- |
| `demo@nines.local` | `station123` | Bautista Fuel Point (Antipolo) | Fuel station on — shifts, tanks, deliveries, charge fleet, SC/PWD, VAT-exempt org |
| `shop@nines.local` | `shop123` | Cruz Neighborhood Store | General retail — fuel nav hidden |

Or create your own account. Guided onboarding asks for industry (General / Retail / Services / Fuel station), business details, VAT vs percentage tax, then fuels/pumps or starter items.

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

- Email / password auth; guided onboarding by industry; optional fuel module.
- Customers: individual or organization, TIN, tax treatment (VATable / exempt / zero-rated with reason + reference), SC/PWD 20% + ID, charge limits and terms, aging, printable statement of account, creditable withholding on collections.
- Sales invoices (cash/card/e-wallet/charge) with tax splits; items/services with price, unit, tax type.
- Fuel module (when on): products, pumps, shift meter readings, tanks, deliveries (DR vs measured), dips.
- Expenses, suppliers, AP; cash reconciliation (per shift when fuel, per day otherwise).
- Books: PH chart of accounts (fuel accounts added with the module), auto + manual journals, trial balance, income statement, balance sheet.
- Fixed assets (straight-line), basic payroll register, read-only tax calendar checklist.
- Dashboard KPIs + 14-day chart; reports including VATable / VAT / exempt / zero-rated / SC-PWD splits.
- Desktop Electron shell with offline/unreachable screen and Aurora cold-start loader.

Dates use Asia/Manila. Amounts are shown as `₱1,234.56`. Money is stored as centavos.

## Workbook mapping

The Philippine Gasoline Station Accounting Workbook sheets map as follows (core vs fuel):

| Sheet | Nines | Module |
| --- | --- | --- |
| START HERE / Controls & Policies | Onboarding, settings, tax calendar notes | Core |
| COA | Chart of accounts (+ fuel accounts when module on) | Core + Fuel |
| Daily Sales | Sales invoices; fuel also uses shift meter sales | Core + Fuel |
| Fuel Deliveries | Fuel deliveries (DR, measured, cost, freight, input VAT, WHT, due date) | Fuel |
| Fuel Inventory | Tanks, dips, book vs physical; general items use simple stock | Core items / Fuel tanks |
| Purchases & Expenses | Expenses + supplier bills | Core |
| Cash Reconciliation | Cash recon (shift-linked when fuel) | Core |
| AR & Credit Sales | Customers, charge sales, collections, aging, SOA | Core |
| AP & Supplier Ledger | Suppliers, bills, payments, aging | Core |
| Payroll | Payroll register | Core (basic) |
| Fixed Assets | Fixed assets + straight-line depreciation helper | Core (basic) |
| Journal Entries | Auto journals from sales/collections/expenses/deliveries + manual JE | Core |
| Trial Balance / Financial Statements | Trial balance, income statement, balance sheet | Core |
| Tax Calendar | Read-only checklist | Core |

## Later

- BIR SLS/SLP file exports.
- More than one user per business (owner and cashier).
- Meter rollover for fuel pumps.

## Deploy to AWS

Nines deploys to account `460047018105` in `ap-southeast-2` (Sydney). That account’s organization policy denies every other region, and CDK is already bootstrapped there (`CDKToolkit`). The gas-station app has its own cluster and stack. It does not touch `cozy-d714` or `CozyD714`.

```text
Browser
  -> Amplify Hosting (the static site)
       -> /api/* rewrite
            -> API Gateway HTTP API -> Lambda (NestJS)
                 -> Aurora PostgreSQL Serverless v2 (express configuration, IAM auth, scales to 0 ACU)
```

The cluster is created outside CloudFormation, the same way as the other app: `infra/scripts/create-database.sh` calls `create-db-cluster --with-express-configuration`. There is no VPC and no NAT gateway. The database is reached through the Aurora internet access gateway, and the only login is a short-lived IAM token. Minimum capacity is 0 ACU, maximum is 4 ACU, and it pauses after 5 minutes with no connections (`SecondsUntilAutoPause=300`). PostgreSQL version is 17.9.

Amplify forwards `/api/*` to the HTTP API and leaves every other path on the site. The browser talks to one host, so the Better Auth session cookie stays first-party. CDK stores `BETTER_AUTH_SECRET` in Secrets Manager (`nines/app`). `./scripts/deploy.sh` adds `BETTER_AUTH_URL`, `WEB_ORIGIN`, and `TRUSTED_ORIGINS` set to the Amplify URL.

### Idle cost and wake time

While the cluster is paused you are not charged for Aurora compute. You still pay for storage (about US$0.10 per GB-month in Sydney; a new station database is well under 1 GB) and for the one secret (US$0.40 per month). Lambda, API Gateway, and Amplify add nothing while nobody is using the site. There is no NAT gateway. Expect about US$0.50 to US$1 per month when the app is idle.

The first request after the 5-minute pause waits for Aurora to resume. AWS documents that as about 15 seconds. If the cluster has been paused for more than 24 hours, resume can take 30 seconds or longer. The API allows 25 seconds to connect and API Gateway allows 30 seconds for the whole call, so a normal wake succeeds and feels slow. A resume after a day of quiet can time out once; the database is awake by then, and the next click goes through. Opening a connection is what wakes it. Nothing polls the database, so it can stay paused.

### Command

From a laptop, after signing in:

```sh
aws login --profile personal
./scripts/deploy.sh
```

Add `--seed` to load the demo station (`demo@nines.local` / `station123`). That replaces the demo user if it is already there. Add `--profile some-other-name` if the profile is not `personal`.

The script installs dependencies, creates the `nines` cluster if it is missing, runs `cdk deploy`, applies Prisma migrations with an IAM token, optionally seeds, uploads the web build to Amplify, and prints the site URL.

`cdk destroy` removes the Lambdas, the API, Amplify, and the secret. It does not delete the Aurora cluster. The cluster has deletion protection on.

Check the template locally with `pnpm --filter @nines/infra synth`. That uses placeholder database coordinates from `infra/cdk.json`. The deploy script replaces them with the real cluster.

### One-time steps

1. `aws login --profile personal`, and confirm `aws sts get-caller-identity --profile personal` is account `460047018105`.
2. Confirm the bootstrap stack `CDKToolkit` is in `ap-southeast-2`. It already is for this account. If it were missing: `pnpm --filter @nines/infra exec cdk bootstrap aws://460047018105/ap-southeast-2 --profile personal`.
3. The laptop needs outbound TCP 5432 to the cluster endpoint. Express-configuration clusters are on the public internet gateway, and migrations run from the laptop with the Prisma CLI (IAM token, TLS).
4. Attach `infra/iam/deployer-policy.json` to the identity behind the `personal` profile, or an equivalent admin policy. The RDS and `rds-db:connect` statements are what `deploy.sh` calls directly. `cdk deploy` itself assumes the existing CDK bootstrap roles.

Docker is not required. Node 22 and pnpm 10 are.

## Desktop app

The `apps/desktop` package (`@nines/desktop`) is a thin Electron shell that loads the hosted Nines site (or your local Vite dev server). It is not required for day-to-day web development.

### Run in dev

Start the web app and API as usual (`pnpm dev`), then in another terminal:

```sh
pnpm desktop:dev
```

That opens Electron pointed at `http://localhost:5173`. Override the URL with `NINES_APP_URL` or a small JSON config (see `apps/desktop/README.md`).

### Package installers

From the repo root after `pnpm install`:

```sh
pnpm --filter @nines/desktop build
pnpm --filter @nines/desktop package        # NSIS (Windows), dmg (macOS), AppImage (Linux)
pnpm --filter @nines/desktop package:linux  # Linux AppImage only
pnpm desktop:package                        # same as package:linux from root
```

Artifacts land in `apps/desktop/release/`.

**Signing (TODO):** Windows Authenticode and macOS notarization are not wired up yet. Configure `electron-builder` signing before distributing builds to users.

**CI:** Desktop installers are built locally only; this repo does not publish desktop releases from CI.
