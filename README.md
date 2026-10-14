# Nines

Accounting for small Philippine gas stations: sales per pump and shift, disbursements,
receivables, payables, and BIR-ready reports (VAT, withholding, SLS/SLP).

## Stack

| Part | Tech | Runs on |
| --- | --- | --- |
| Web | React Router (SPA mode), shadcn/ui on the Beacon theme, Tailwind | AWS Amplify Hosting |
| API | NestJS, Better Auth (email + password) | AWS Lambda behind API Gateway |
| Database | PostgreSQL via Prisma 7 | Aurora Serverless v2, scales to zero |
| Infra | AWS CDK (`infra/`) | `ap-southeast-1` (Singapore) |

Amplify forwards `/api/*` to API Gateway, so the browser only talks to one origin and the
session cookie stays first-party. Money is stored as whole centavos (`BigInt`).

```
apps/web   React Router app
apps/api   NestJS API, Prisma schema and migrations
infra      CDK stack: VPC, Aurora, Lambdas, HTTP API, Amplify app
scripts    deploy.sh
```

## Run it locally

Needs Node 22, pnpm 10 and Postgres 16 (Docker works: `pnpm db:up`).

```sh
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:migrate        # creates tables
pnpm dev               # web on :5173, API on :3000
```

Open http://localhost:5173, create an account, and set up a station.

Change the database with `prisma/schema.prisma`, then `pnpm db:migrate` (it asks for a migration name).

## Deploy

Sign in to AWS first (`aws login --profile personal`), then:

```sh
./scripts/deploy.sh
```

It builds everything, deploys the CDK stack, runs migrations through the `nines-migrate`
Lambda (the database is private, inside the VPC), and uploads the web build to Amplify.
The first deploy also bootstraps CDK and takes about 15 minutes, mostly Aurora.

When idle, the only ongoing costs are Aurora storage and two Secrets Manager secrets, roughly
$1–2 a month. The first request after 10 idle minutes waits ~15 seconds while Aurora wakes up.
