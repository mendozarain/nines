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
| Infra | AWS CDK in `infra/` | Account `460047018105`, region `ap-southeast-2` (Sydney). Separate from the Cozy stacks. |

```
apps/web        React Router app
apps/api        NestJS API, Prisma schema and migrations
packages/shared Litre, peso, VAT, and balance math used by the API and the UI
infra           CDK stack, Lambda bundle, and the database / frontend scripts
scripts         deploy.sh (the command you run from a laptop)
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

### Later

- BIR SLS/SLP files and withholding.
- More than one user per station (owner and cashier).
- Meter rollover.
