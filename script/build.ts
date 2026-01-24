import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// Keep node_modules external by default to avoid bundling quirks across runtimes.
// Opt-in to dependency bundling with BUNDLE_DEPS=true if needed for cold starts.
const bundleDeps = process.env.BUNDLE_DEPS === "true";
const allowlist = bundleDeps
  ? [
      "@google/generative-ai",
      "axios",
      "connect-pg-simple",
      "cors",
      "date-fns",
      "drizzle-orm",
      "drizzle-zod",
      "express",
      "express-rate-limit",
      "express-session",
      "jsonwebtoken",
      "memorystore",
      "multer",
      "nanoid",
      "nodemailer",
      "openai",
      "passport",
      "passport-local",
      "pg",
      "stripe",
      "uuid",
      "ws",
      "xlsx",
      "zod",
      "zod-validation-error",
    ]
  : [];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = bundleDeps
    ? allDeps.filter((dep) => !allowlist.includes(dep))
    : allDeps;

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    target: "node20",
    outfile: "dist/index.js",
    sourcemap: true,
    sourcesContent: true,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    minifyIdentifiers: false,
    keepNames: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
