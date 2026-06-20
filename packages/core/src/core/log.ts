// Minimal structured logger: one JSON line per event so logs are greppable and
// aggregator-friendly instead of ad-hoc prefixed strings. Pair with the HTTP
// request-log middleware (same shape) for end-to-end structured logs.

export type LogLevel = "info" | "warn" | "error";

// Optional sink for error-level events, wired by the app at bootstrap (e.g. to
// forward into Sentry). Kept as a settable hook so this shared package never
// imports a runtime-specific error SDK — the boundary stays clean.
type ErrorReporter = (msg: string, fields?: Record<string, unknown>) => void;
let errorReporter: ErrorReporter | null = null;

export function setErrorReporter(fn: ErrorReporter | null): void {
  errorReporter = fn;
}

export function logEvent(level: LogLevel, msg: string, fields?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level, msg, ...fields }));
  if (level === "error" && errorReporter) {
    // Never let the reporter throw out of a log call.
    try {
      errorReporter(msg, fields);
    } catch {}
  }
}
