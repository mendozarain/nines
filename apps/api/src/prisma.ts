import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.js";
import { env } from "./env.js";

// One client per process (per warm Lambda). Keep the pool tiny: each Lambda
// instance serves one request at a time, and Aurora Serverless has a connection cap.
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL, max: 2 }),
});
