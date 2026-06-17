import { fetchWithTimeout, getEnv } from "@workspace/core";
import { sql } from "@workspace/db/client";

export type ReadinessReport = { ok: boolean; checks: Record<string, string> };

/**
 * Readiness probe: can we actually serve? A DB round-trip is required (its failure
 * makes us unready), while docling is reported but not required — extraction
 * degrades gracefully, so a docling outage must not pull the app out of rotation.
 */
export async function checkReadiness(): Promise<ReadinessReport> {
  const checks: Record<string, string> = {};
  let healthy = true;
  try {
    await sql`select 1`;
    checks.db = "up";
  } catch {
    checks.db = "down";
    healthy = false;
  }
  const doclingUrl = getEnv("DOCLING_URL");
  if (!doclingUrl) {
    checks.docling = "unconfigured";
  } else {
    try {
      const res = await fetchWithTimeout(`${new URL(doclingUrl).origin}/health`, {
        timeoutMs: 3000,
      });
      checks.docling = res.ok ? "up" : "down";
    } catch {
      checks.docling = "down";
    }
  }
  return { ok: healthy, checks };
}
