import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { databasePoolConfig } from "./db";
import { PrismaClient } from "./generated/prisma/client";

const adapter = new PrismaPg(databasePoolConfig());

export const prisma = new PrismaClient({ adapter });
