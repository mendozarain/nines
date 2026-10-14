import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(16),
  // The URL the browser sees for the app. The web app proxies /api/* to this API,
  // so auth cookies stay first-party.
  BETTER_AUTH_URL: z.string().url(),
  WEB_ORIGIN: z.string().url(),
  PORT: z.coerce.number().default(3000),
});

export const env = schema.parse(process.env);
