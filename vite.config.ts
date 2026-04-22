// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

/**
 * Lovable’s preset only injects VITE_* from .env into the client. Server code reads
 * DATABASE_URL / COOLIFY_DATABASE_URL from process.env, so we mirror values from .env
 * into process.env for local development without inlining secrets into build artifacts.
 */
export default defineConfig(async (env) => {
  const fromFile = {
    ...loadEnv(env.mode, process.cwd(), "COOLIFY_"),
    ...loadEnv(env.mode, process.cwd(), "DATABASE_"),
  } as { COOLIFY_DATABASE_URL?: string; DATABASE_URL?: string };

  const fromFileUrl = fromFile.COOLIFY_DATABASE_URL || fromFile.DATABASE_URL;
  if (fromFile.COOLIFY_DATABASE_URL && !process.env.COOLIFY_DATABASE_URL) {
    process.env.COOLIFY_DATABASE_URL = fromFile.COOLIFY_DATABASE_URL;
  }

  if (fromFile.DATABASE_URL && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = fromFile.DATABASE_URL;
  }

  // Keep local DX working when only one of the DB URLs exists in .env.
  if (fromFileUrl) {
    if (!process.env.COOLIFY_DATABASE_URL) process.env.COOLIFY_DATABASE_URL = fromFileUrl;
    if (!process.env.DATABASE_URL) process.env.DATABASE_URL = fromFileUrl;
  }

  return {};
});
