import { randomUUID } from "node:crypto";
import { createMiddleware } from "hono/factory";
import { logEvent } from "@workspace/core";

// Structured per-request logging. Emits one JSON line per request (via the shared
// logEvent) with a request id, method, path, status, and duration; flags slow
// requests. The id is echoed in the `x-request-id` response header (honoring an
// inbound one if the edge set it) so a log line can be tied back to a client report.

const SLOW_MS = 1000;

export const requestLog = createMiddleware(async (c, next) => {
  const id = c.req.header("x-request-id") ?? randomUUID();
  c.header("x-request-id", id);
  const start = performance.now();
  await next();
  const ms = Math.round(performance.now() - start);
  const slow = ms > SLOW_MS;
  logEvent(slow ? "warn" : "info", "request", {
    id,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    ms,
    ...(slow ? { slow: true } : {}),
  });
});
