import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { toNodeHandler } from "better-auth/node";
import express from "express";
import { AppModule } from "./app.module";
import { auth } from "./auth";
import { AllExceptionsFilter } from "./common";

export async function createApp() {
  const server = express();
  server.use("/api/auth", toNodeHandler(auth));
  server.use(express.json({ limit: "1mb" }));

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server), {
    bodyParser: false,
    logger: process.env.NODE_ENV === "test" ? false : ["error", "warn", "log"],
  });
  app.setGlobalPrefix("api");
  app.enableCors({
    origin: [process.env.WEB_ORIGIN ?? "http://localhost:5173", "http://localhost:5173"],
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  return app;
}

async function bootstrap() {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Nines API listening on http://localhost:${port}`);
}

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
