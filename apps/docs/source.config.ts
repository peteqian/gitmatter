import { defineConfig, defineDocs } from "fumadocs-mdx/config";

// Docs MDX is the repo-root `docs/` folder (single source of truth) — this app
// only renders it. Path is relative to this config file (apps/docs). The
// fumadocs-mdx Next plugin (next.config) reads this and generates the `.source`
// folder consumed by lib/source.ts.
export const docs = defineDocs({
  dir: "../../docs",
});

export default defineConfig();
