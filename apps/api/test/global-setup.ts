import { execSync } from "node:child_process";

export default function setup() {
  execSync("pnpm exec prisma migrate deploy", {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: "postgresql://nines:nines@localhost:5432/nines_test",
    },
  });
}
