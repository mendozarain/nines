import "reflect-metadata";
import type { Callback, Context, Handler } from "aws-lambda";
import { loadSecrets } from "./secrets";

type ProxyHandler = Handler;

let cached: Promise<ProxyHandler> | undefined;

async function bootstrap(): Promise<ProxyHandler> {
  await loadSecrets();
  const { configure } = await import("@codegenie/serverless-express");
  const { createApp } = await import("./main");
  const app = await createApp();
  await app.init();
  const expressApp = app.getHttpAdapter().getInstance();
  return configure({ app: expressApp }) as ProxyHandler;
}

// API Gateway HTTP API (payload v2) entrypoint.
export const handler: ProxyHandler = async (event: unknown, context: Context, callback: Callback) => {
  cached ??= bootstrap().catch((error: unknown) => {
    cached = undefined;
    throw error;
  });
  const proxy = await cached;
  return proxy(event, context, callback);
};
