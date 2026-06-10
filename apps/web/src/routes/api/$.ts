import { createFileRoute } from "@tanstack/react-router";

// Delegate every /api/* request to the Hono app. The app is imported lazily so
// its server-only dependencies (db, better-auth) never reach the client bundle.
async function serve({ request }: { request: Request }) {
  const { app } = await import("../../server/http/app");
  return app.fetch(request);
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: serve,
      POST: serve,
      PUT: serve,
      PATCH: serve,
      DELETE: serve,
      OPTIONS: serve,
      HEAD: serve,
    },
  },
});
