import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { Signer } from "@aws-sdk/rds-signer";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import pg from "pg";

const require = createRequire(__filename);

export const APP_DB_USER = "nines_app";
export const ADMIN_DB_USER = "postgres";
export const APP_DATABASE = "nines";
export const APP_SECRET_NAME = "nines/app";

export function quoteIdent(value: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) throw new Error(`Unsafe SQL identifier: ${value}`);
  return `"${value}"`;
}

export function postgresUrl(user: string, token: string, host: string, database: string, port = 5432): string {
  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(token)}@${host}:${port}/${database}?sslmode=require`;
}

type MigrateResult = { ok: true; log: string; seeded?: boolean };

export async function handler(event?: { seed?: boolean }): Promise<MigrateResult> {
  return run({ seed: event?.seed === true });
}

export async function run(options: { seed?: boolean } = {}): Promise<MigrateResult> {
  const host = required("DB_HOST");
  const region = process.env.AWS_REGION?.trim() || "ap-southeast-2";
  const port = Number(process.env.DB_PORT ?? 5432);
  const admin = process.env.DB_ADMIN_USER?.trim() || ADMIN_DB_USER;
  const appUser = process.env.DB_USER?.trim() || APP_DB_USER;
  const database = process.env.DB_NAME?.trim() || APP_DATABASE;
  const adminToken = await authToken(host, port, admin, region);

  await withClient(host, port, admin, adminToken, "postgres", async (client) => {
    const role = quoteIdent(appUser);
    const exists = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [appUser]);
    if (!exists.rowCount) await client.query(`CREATE ROLE ${role} LOGIN`);
    await client.query(`GRANT rds_iam TO ${role}`);
    const db = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
    if (!db.rowCount) await client.query(`CREATE DATABASE ${quoteIdent(database)}`);
  });

  const migrateToken = await authToken(host, port, admin, region);
  const adminUrl = postgresUrl(admin, migrateToken, host, database, port);
  const log = await runPrismaMigrate(adminUrl);

  const grantToken = await authToken(host, port, admin, region);
  await withClient(host, port, admin, grantToken, database, async (client) => {
    const role = quoteIdent(appUser);
    const adminRole = quoteIdent(admin);
    await client.query(`GRANT USAGE ON SCHEMA public TO ${role}`);
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
    await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${role}`);
    await client.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${adminRole} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`,
    );
    await client.query(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${adminRole} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${role}`,
    );
  });

  if (options.seed) {
    const appToken = await authToken(host, port, appUser, region);
    await runSeed(postgresUrl(appUser, appToken, host, database, port));
  }

  return { ok: true, log: log.slice(-4000), seeded: options.seed === true };
}

async function authToken(host: string, port: number, username: string, region: string): Promise<string> {
  return new Signer({ hostname: host, port, username, region }).getAuthToken();
}

async function withClient(
  host: string,
  port: number,
  user: string,
  password: string,
  database: string,
  work: (client: pg.Client) => Promise<void>,
): Promise<void> {
  const client = new pg.Client({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 60_000,
  });
  await client.connect();
  try {
    await work(client);
  } finally {
    await client.end();
  }
}

function projectRoot(): string {
  if (process.env.LAMBDA_TASK_ROOT) return process.env.LAMBDA_TASK_ROOT;
  return path.resolve(__dirname, "..");
}

async function runPrismaMigrate(databaseUrl: string): Promise<string> {
  const root = projectRoot();
  const cli = require.resolve("prisma/build/index.js");
  const output: string[] = [];
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: databaseUrl };
  if (!env.PRISMA_SCHEMA_ENGINE_BINARY) delete env.PRISMA_SCHEMA_ENGINE_BINARY;
  const code = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [cli, "migrate", "deploy"], {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk: Buffer) => output.push(chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => output.push(chunk.toString()));
    child.on("error", reject);
    child.on("close", (exitCode) => resolve(exitCode ?? 1));
  });
  const log = output.join("");
  console.log(log);
  if (code !== 0) throw new Error(`prisma migrate deploy exited with ${code}`);
  return log;
}

async function runSeed(databaseUrl: string): Promise<void> {
  const secret = await appSecret();
  const root = projectRoot();
  if (process.env.LAMBDA_TASK_ROOT) {
    process.env.DATABASE_URL = databaseUrl;
    process.env.BETTER_AUTH_SECRET = secret.BETTER_AUTH_SECRET;
    if (secret.WEB_ORIGIN) process.env.WEB_ORIGIN = secret.WEB_ORIGIN;
    const { seedDemo } = await import("../prisma/seed");
    await seedDemo();
    return;
  }
  const tsx = require.resolve("tsx/dist/cli.mjs");
  const code = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [tsx, "prisma/seed.ts"], {
      cwd: root,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        BETTER_AUTH_SECRET: secret.BETTER_AUTH_SECRET,
        WEB_ORIGIN: secret.WEB_ORIGIN ?? process.env.WEB_ORIGIN ?? "http://localhost:5173",
        NODE_ENV: "production",
      },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (exitCode) => resolve(exitCode ?? 1));
  });
  if (code !== 0) throw new Error(`seed exited with ${code}`);
}

async function appSecret(): Promise<{ BETTER_AUTH_SECRET: string; WEB_ORIGIN?: string }> {
  const client = new SecretsManagerClient({});
  const { SecretString } = await client.send(new GetSecretValueCommand({ SecretId: process.env.APP_SECRET_ARN || APP_SECRET_NAME }));
  if (!SecretString) throw new Error("App secret is empty");
  const parsed = JSON.parse(SecretString) as { BETTER_AUTH_SECRET?: string; WEB_ORIGIN?: string };
  if (!parsed.BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET is missing from the app secret");
  return { BETTER_AUTH_SECRET: parsed.BETTER_AUTH_SECRET, WEB_ORIGIN: parsed.WEB_ORIGIN };
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

if (typeof module !== "undefined" && require.main === module) {
  run({ seed: process.argv.includes("--seed") })
    .then((result) => {
      console.log(result.seeded ? "Migrations applied and demo data seeded." : "Migrations applied.");
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
