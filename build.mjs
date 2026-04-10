import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { rm, readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const allowlist = [
  "@google/generative-ai",
  "axios",
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
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  const rootDir = path.dirname(fileURLToPath(import.meta.url));
  const clientRoot = path.join(rootDir, "client");
  const sharedDir = path.join(rootDir, "shared");
  const distDir = path.join(rootDir, "dist");
  const clientIndex = path.join(clientRoot, "index.html");
  const serverEntry = path.join(rootDir, "server", "index.ts");

  console.log("[build] rootDir", rootDir);
  console.log("[build] clientRoot", clientRoot);
  console.log("[build] sharedDir", sharedDir);
  console.log("[build] distDir", distDir);

  await access(clientIndex);
  await access(serverEntry);
  await access(path.join(rootDir, "package.json"));

  await rm(distDir, { recursive: true, force: true });

  console.log("building client...");
  try {
    await viteBuild({
      configFile: false,
      root: clientRoot,
      base: "./",
      plugins: [react()],
      resolve: {
        alias: {
          "@": path.join(clientRoot, "src"),
          "@shared": sharedDir,
          "@assets": path.join(rootDir, "attached_assets"),
        },
      },
      build: {
        outDir: path.join(distDir, "public"),
        emptyOutDir: true,
      },
      server: {
        fs: {
          strict: true,
          deny: ["**/.*"],
        },
      },
    });
    console.log("[build] client build complete");
  } catch (err) {
    console.error("[build] client build failed", err);
    throw err;
  }

  console.log("building server...");
  const pkg = JSON.parse(
    await readFile(path.join(rootDir, "package.json"), "utf-8"),
  );
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  try {
    await esbuild({
      entryPoints: [serverEntry],
      platform: "node",
      bundle: true,
      format: "cjs",
      outfile: "dist/index.cjs",
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      minify: true,
      external: externals,
      logLevel: "info",
      alias: {
        "@": path.join(clientRoot, "src"),
        "@shared": sharedDir,
      },
    });
    console.log("[build] server build complete");
  } catch (err) {
    console.error("[build] server build failed", err);
    throw err;
  }
}

buildAll().catch((err) => {
  console.error("[build] failed", err);
  process.exit(1);
});
