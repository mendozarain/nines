import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";
const authUrl = process.env.BETTER_AUTH_URL?.trim();
const trustedFromEnv = (process.env.TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  basePath: "/api/auth",
  // Production (Amplify) passes one https origin. Local dev accepts the Vite and API hosts.
  baseURL: authUrl
    ? authUrl
    : {
        allowedHosts: ["localhost:5173", "localhost:3000", "127.0.0.1:5173", "127.0.0.1:3000"],
        fallback: webOrigin,
        protocol: "http" as const,
      },
  trustedOrigins: [...new Set([webOrigin, "http://localhost:5173", "http://localhost:3000", ...trustedFromEnv, ...(authUrl ? [authUrl] : [])])],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === "production",
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    ...(process.env.NODE_ENV === "production" ? { ipAddress: { ipAddressHeaders: ["x-forwarded-for"] as string[] } } : {}),
  },
});

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};
