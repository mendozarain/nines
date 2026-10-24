import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  basePath: "/api/auth",
  baseURL: {
    allowedHosts: ["localhost:5173", "localhost:3000", "127.0.0.1:5173", "127.0.0.1:3000"],
    fallback: webOrigin,
    protocol: "http",
  },
  trustedOrigins: [webOrigin, "http://localhost:5173", "http://localhost:3000"],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
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
  },
});

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};
