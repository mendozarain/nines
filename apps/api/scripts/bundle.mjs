// Bundles the compiled API (dist/) into self-contained Lambda packages under .lambda/.
// tsc runs first (pnpm build) because esbuild can't emit the decorator metadata Nest needs.
import { cp, mkdir, rm } from "node:fs/promises";
import { build } from "esbuild";

const common = {
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outExtension: { ".js": ".mjs" },
  sourcemap: true,
  minify: true,
  keepNames: true, // Nest resolves providers by class name
  // CommonJS dependencies inside an ESM bundle still call require()
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  // Optional Nest integrations we don't use
  external: [
    "@nestjs/microservices",
    "@nestjs/websockets",
    "@nestjs/websockets/socket-module",
    "@nestjs/microservices/microservices-module",
    "class-transformer",
    "class-validator",
    "@fastify/*",
  ],
  logLevel: "warning",
};

await rm(".lambda", { recursive: true, force: true });

await build({ ...common, entryPoints: { index: "dist/lambda.js" }, outdir: ".lambda/api" });

await build({ ...common, entryPoints: { index: "dist/migrate.js" }, outdir: ".lambda/migrate" });
await mkdir(".lambda/migrate/migrations", { recursive: true });
await cp("prisma/migrations", ".lambda/migrate/migrations", { recursive: true });

console.log("Bundled .lambda/api and .lambda/migrate");
