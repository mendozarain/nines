import { configure } from "@codegenie/serverless-express";
import type { Context, Handler } from "aws-lambda";
import { createApp } from "./app.js";

// Built once per warm Lambda instance, reused across requests.
let handler: Handler | undefined;

export const handle: Handler = async (event, context: Context, callback) => {
  handler ??= configure({ app: await createApp() }) as Handler;
  return handler(event, context, callback);
};
