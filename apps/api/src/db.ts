import { Signer } from "@aws-sdk/rds-signer";
import type { PoolConfig } from "pg";

// Local dev uses DATABASE_URL. On Aurora (DB_IAM_AUTH=true) the password is a short-lived IAM token,
// minted for each new connection. A small pool that closes quickly lets the cluster pause.
export function databasePoolConfig(env: NodeJS.ProcessEnv = process.env): PoolConfig {
  if (env.DB_IAM_AUTH !== "true") {
    const connectionString = env.DATABASE_URL?.trim();
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set. Copy apps/api/.env.example to apps/api/.env.");
    }
    return { connectionString };
  }

  const host = required(env, "DB_HOST");
  const port = Number(env.DB_PORT ?? 5432);
  const username = required(env, "DB_USER");
  const signer = new Signer({
    hostname: host,
    port,
    username,
    region: env.AWS_REGION?.trim() || "ap-southeast-2",
  });

  return {
    host,
    port,
    user: username,
    database: env.DB_NAME ?? "nines",
    password: () => signer.getAuthToken(),
    ssl: { rejectUnauthorized: true },
    max: Number(env.DB_POOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 25_000,
  };
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}
