import { describe, expect, it } from "vitest";
import { databasePoolConfig } from "../src/db";
import { postgresUrl, quoteIdent } from "../src/migrate";

describe("database pool", () => {
  it("uses DATABASE_URL for local Postgres", () => {
    expect(databasePoolConfig({ DATABASE_URL: "postgresql://nines:nines@localhost:5432/nines" })).toEqual({
      connectionString: "postgresql://nines:nines@localhost:5432/nines",
    });
  });

  it("mints an IAM token per connection when DB_IAM_AUTH is set", () => {
    const config = databasePoolConfig({
      DB_IAM_AUTH: "true",
      DB_HOST: "nines.cluster-example.ap-southeast-2.rds.amazonaws.com",
      DB_USER: "nines_app",
      DB_NAME: "nines",
      DB_PORT: "5432",
      AWS_REGION: "ap-southeast-2",
    });
    expect(config.host).toBe("nines.cluster-example.ap-southeast-2.rds.amazonaws.com");
    expect(config.user).toBe("nines_app");
    expect(config.database).toBe("nines");
    expect(config.port).toBe(5432);
    expect(config.ssl).toEqual({ rejectUnauthorized: true });
    expect(config.idleTimeoutMillis).toBe(10_000);
    expect(typeof config.password).toBe("function");
  });
});

describe("migrate helpers", () => {
  it("quotes simple SQL identifiers and rejects anything else", () => {
    expect(quoteIdent("nines_app")).toBe('"nines_app"');
    expect(() => quoteIdent("nines_app;drop")).toThrow(/Unsafe SQL identifier/);
  });

  it("encodes IAM tokens in the Postgres URL", () => {
    expect(postgresUrl("postgres", "token/with+slash=", "db.example", "nines")).toBe(
      "postgresql://postgres:token%2Fwith%2Bslash%3D@db.example:5432/nines?sslmode=require",
    );
  });
});
