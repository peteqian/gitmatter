import { config as loadEnv } from "dotenv";
import { defineConfig } from "vite-plus";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Load monorepo-root .env into process.env so server handlers (db, auth) see it.
loadEnv({ path: "../../.env" });

// Avoid 3000 (the default every other dev app grabs). Configurable via PORT;
// strictPort is off so a busy port falls through to the next free one.
const port = Number(process.env.PORT) || 4280;

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  server: { port, strictPort: false },
  preview: { port, strictPort: false },
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
});

export default config;
