import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    globalSetup: ["./test/global-setup.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    env: {
      DATABASE_URL: "postgresql://nines:nines@localhost:5432/nines_test",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
      WEB_ORIGIN: "http://localhost:3000",
      NODE_ENV: "test",
    },
  },
});
