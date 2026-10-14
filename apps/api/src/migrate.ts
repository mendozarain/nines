import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import pg from "pg";

// Applies prisma/migrations/*/migration.sql inside the VPC, where the Prisma CLI
// can't reach the database from a laptop. Rows go into Prisma's own
// _prisma_migrations table, so `prisma migrate status` agrees with what ran here.
// Invoked by the deploy script (`aws lambda invoke ... nines-migrate`).

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR ?? join(import.meta.dirname, "migrations");

export async function migrate(databaseUrl: string, dir = MIGRATIONS_DIR) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )`);
    const done = new Set(
      (
        await client.query<{ migration_name: string }>(
          `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
        )
      ).rows.map((r) => r.migration_name),
    );

    const names = (await readdir(dir, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    const applied: string[] = [];
    for (const name of names) {
      if (done.has(name)) continue;
      const sql = await readFile(join(dir, name, "migration.sql"), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const id = randomUUID();
      await client.query("BEGIN");
      try {
        await client.query(
          `INSERT INTO "_prisma_migrations" (id, checksum, migration_name) VALUES ($1, $2, $3)`,
          [id, checksum, name],
        );
        await client.query(sql);
        await client.query(
          `UPDATE "_prisma_migrations" SET finished_at = now(), applied_steps_count = 1 WHERE id = $1`,
          [id],
        );
        await client.query("COMMIT");
        applied.push(name);
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${name} failed: ${(err as Error).message}`);
      }
    }
    return { applied, alreadyApplied: done.size };
  } finally {
    await client.end();
  }
}

export const handle = async () => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return migrate(url);
};
