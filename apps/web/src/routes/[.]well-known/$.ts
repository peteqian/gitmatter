import { createFileRoute } from "@tanstack/react-router";

// Delegate /.well-known/* (OAuth discovery documents) to the Hono app, which the
// /api/$ route can't reach since these live at the root, not under /api.
async function serve({ request }: { request: Request }) {
  const { app } = await import("../../server/http/app");
  return app.fetch(request);
}

export const Route = createFileRoute("/.well-known/$")({
  server: {
    handlers: {
      GET: serve,
      POST: serve,
      OPTIONS: serve,
      HEAD: serve,
    },
  },
});
