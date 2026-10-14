import "reflect-metadata";
import "./money.js";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { toNodeHandler } from "better-auth/node";
import express from "express";
import { AppModule } from "./app.module.js";
import { auth } from "./auth/auth.js";

/** Builds the Express app: Better Auth at /api/auth/*, Nest controllers at /api/*. */
export async function createApp() {
  const server = express();
  // Better Auth reads the raw body itself, so it must be mounted before Nest's JSON parser.
  server.all("/api/auth/*splat", toNodeHandler(auth));

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    logger: ["error", "warn", "log"],
  });
  app.setGlobalPrefix("api");
  await app.init();
  return server;
}
