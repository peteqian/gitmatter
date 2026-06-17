// Minimal structured logger: one JSON line per event so logs are greppable and
// aggregator-friendly instead of ad-hoc prefixed strings. Pair with the HTTP
// request-log middleware (same shape) for end-to-end structured logs.

export type LogLevel = "info" | "warn" | "error";

export function logEvent(level: LogLevel, msg: string, fields?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level, msg, ...fields }));
}
