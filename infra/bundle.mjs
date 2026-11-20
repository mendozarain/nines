import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import * as esbuild from "esbuild";

const require = createRequire(import.meta.url);
const infraRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(infraRoot, "..");
const apiRoot = path.join(repoRoot, "apps/api");
const outDir = path.join(infraRoot, "lambda-asset");
function prismaEngineCommit() {
  const prismaDir = path.dirname(require.resolve("prisma/package.json", { paths: [apiRoot] }));
  const engines = JSON.parse(
    readFileSync(require.resolve("@prisma/engines-version/package.json", { paths: [prismaDir] }), "utf8"),
  );
  const commit = engines.prisma?.enginesVersion ?? String(engines.version ?? "").split(".").pop();
  if (!/^[a-f0-9]{40}$/.test(commit)) {
    throw new Error(`Could not read the Prisma schema-engine commit (got ${engines.version})`);
  }
  return commit;
}

function pnpm(args) {
  const result = spawnSync("pnpm", args, { cwd: repoRoot, stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`pnpm ${args.join(" ")} failed`);
  }
}

function resolvePackageJson(name, fromDir) {
  let dir = fromDir;
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, "node_modules", name, "package.json");
    if (existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  throw new Error(`Could not find package.json for ${name} starting from ${fromDir}`);
}

function copyPackage(name, destNodeModules, seen, fromDir, parentDest) {
  let packageJsonPath;
  try {
    packageJsonPath = resolvePackageJson(name, fromDir);
  } catch (error) {
    throw new Error(`Could not resolve ${name} for the Lambda asset (${error.message})`);
  }
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  const src = realpathSync(path.dirname(packageJsonPath));
  const key = `${pkg.name}@${pkg.version}`;
  const top = path.join(destNodeModules, name);
  let dest = top;
  if (existsSync(path.join(top, "package.json"))) {
    const existing = JSON.parse(readFileSync(path.join(top, "package.json"), "utf8"));
    if (existing.version !== pkg.version && parentDest) dest = path.join(parentDest, "node_modules", name);
  }
  if (seen.has(key)) {
    if (!existsSync(path.join(dest, "package.json"))) {
      mkdirSync(path.dirname(dest), { recursive: true });
      cpSync(src, dest, { recursive: true, dereference: true });
    }
    return;
  }
  seen.add(key);
  if (!existsSync(path.join(dest, "package.json"))) {
    mkdirSync(path.dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true, dereference: true });
  }
  for (const dep of Object.keys(pkg.dependencies ?? {})) {
    // Studio, the dev server, and other database drivers are not used by migrate or the API.
    if (pkg.name === "prisma" && ["@prisma/dev", "@prisma/studio-core", "mysql2", "postgres"].includes(dep)) continue;
    copyPackage(dep, destNodeModules, seen, src, dest);
  }
}

function pruneAsset() {
  const runtime = path.join(outDir, "node_modules/@prisma/client/runtime");
  const keepRuntime = new Set([
    "client.js",
    "client.mjs",
    "query_compiler_fast_bg.postgresql.js",
    "query_compiler_fast_bg.postgresql.mjs",
    "query_compiler_fast_bg.postgresql.wasm-base64.js",
    "query_compiler_fast_bg.postgresql.wasm-base64.mjs",
  ]);
  for (const file of readdirSync(runtime)) {
    if (!keepRuntime.has(file)) rmSync(path.join(runtime, file), { force: true });
  }
  const build = path.join(outDir, "node_modules/prisma/build");
  for (const file of readdirSync(build)) {
    if (file.startsWith("query_compiler_") || file === "studio.js") {
      rmSync(path.join(build, file), { force: true });
    }
  }
  const dropEngine = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) dropEngine(full);
      else if (entry.name.startsWith("schema-engine-") && entry.name !== "schema-engine-rhel-openssl-3.0.x") rmSync(full);
    }
  };
  dropEngine(path.join(outDir, "node_modules"));
}

pnpm(["--filter", "@nines/shared", "build"]);
pnpm(["--filter", "@nines/api", "exec", "prisma", "generate"]);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: {
    lambda: path.join(apiRoot, "src/lambda.ts"),
    migrate: path.join(apiRoot, "src/migrate.ts"),
  },
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outdir: outDir,
  external: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "prisma",
    // Optional Nest packages. The framework require()s them inside try/catch.
    "@nestjs/websockets",
    "@nestjs/websockets/socket-module",
    "@nestjs/microservices",
    "@nestjs/microservices/microservices-module",
    "class-transformer",
    "class-validator",
    "class-transformer/storage",
  ],
  tsconfigRaw: {
    compilerOptions: {
      experimentalDecorators: true,
      emitDecoratorMetadata: false,
    },
  },
  logLevel: "warning",
});

const destNodeModules = path.join(outDir, "node_modules");
mkdirSync(destNodeModules, { recursive: true });
const seen = new Set();
for (const name of ["@prisma/client", "@prisma/adapter-pg", "pg", "prisma", "dotenv"]) {
  copyPackage(name, destNodeModules, seen, apiRoot);
}
copyPrismaCliExtras(destNodeModules, seen);

function copyPrismaCliExtras(destNodeModules, seen) {
  const prismaDir = realpathSync(path.dirname(resolvePackageJson("prisma", apiRoot)));
  const studioSrc = realpathSync(path.dirname(resolvePackageJson("@prisma/studio-core", prismaDir)));
  const studioDest = path.join(destNodeModules, "@prisma/studio-core");
  mkdirSync(path.join(studioDest, "dist/data"), { recursive: true });
  cpSync(path.join(studioSrc, "package.json"), path.join(studioDest, "package.json"));
  for (const sub of ["bff", "mysql2", "node-sqlite", "postgresjs"]) {
    cpSync(path.join(studioSrc, "dist/data", sub), path.join(studioDest, "dist/data", sub), { recursive: true, dereference: true });
  }

  const devSrc = realpathSync(path.dirname(resolvePackageJson("@prisma/dev", prismaDir)));
  const devDest = path.join(destNodeModules, "@prisma/dev");
  mkdirSync(path.join(devDest, "dist"), { recursive: true });
  cpSync(path.join(devSrc, "package.json"), path.join(devDest, "package.json"));
  for (const file of readdirSync(path.join(devSrc, "dist"))) {
    if (file.startsWith("state.")) cpSync(path.join(devSrc, "dist", file), path.join(devDest, "dist", file));
  }
  for (const dep of ["pathe", "proper-lockfile", "std-env", "valibot", "zeptomatch", "get-port-please", "remeda"]) {
    copyPackage(dep, destNodeModules, seen, devSrc, devDest);
  }

  const enginesDir = realpathSync(path.dirname(resolvePackageJson("@prisma/engines", prismaDir)));
  copyPackage("iconv-lite", destNodeModules, seen, enginesDir, path.join(destNodeModules, "prisma"));
}

const schemaDir = path.join(outDir, "prisma");
mkdirSync(schemaDir, { recursive: true });
cpSync(path.join(apiRoot, "prisma/schema.prisma"), path.join(schemaDir, "schema.prisma"));
cpSync(path.join(apiRoot, "prisma/migrations"), path.join(schemaDir, "migrations"), { recursive: true });
cpSync(path.join(apiRoot, "prisma.config.ts"), path.join(outDir, "prisma.config.ts"));
writeFileSync(path.join(outDir, "package.json"), JSON.stringify({ name: "nines-lambda", private: true }) + "\n");

const engineDir = path.join(destNodeModules, "@prisma/engines");
mkdirSync(engineDir, { recursive: true });
const enginePath = path.join(engineDir, "schema-engine-rhel-openssl-3.0.x");
const engineUrl = `https://binaries.prisma.sh/all_commits/${prismaEngineCommit()}/rhel-openssl-3.0.x/schema-engine.gz`;
const response = await fetch(engineUrl);
if (!response.ok) {
  throw new Error(`Could not download the Prisma schema engine (${response.status})`);
}
writeFileSync(enginePath, gunzipSync(Buffer.from(await response.arrayBuffer())), { mode: 0o755 });
pruneAsset();
console.log(`Lambda asset ready at ${outDir}`);
