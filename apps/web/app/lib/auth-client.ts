import { createAuthClient } from "better-auth/react";

// Same origin: /api/* is proxied to the NestJS API (Vite in dev, Amplify rewrites in prod),
// so the session cookie is first-party.
export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? "http://localhost" : window.location.origin,
  basePath: "/api/auth",
});
