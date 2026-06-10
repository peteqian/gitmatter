import type { Context } from "hono";
import { resolveMcpToken, resolveOAuthToken } from "@workspace/core";
import { canonicalMcpUri } from "../http/lib/origin.js";

/** Resolve the gitcounsel user behind a `Authorization: Bearer <token>` header. */
export async function authenticateMcp(
  c: Context
): Promise<{ userId: string; label: string } | null> {
  const header = c.req.header("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1]!.trim();
  // A static minted token (gc_) first; then an OAuth access token bound to this
  // resource — the canonical MCP URI is the required audience (RFC 8707).
  const stat = await resolveMcpToken(token);
  if (stat) return stat;
  const oauth = await resolveOAuthToken(token, canonicalMcpUri(c));
  if (oauth) return { userId: oauth.userId, label: `oauth:${oauth.clientId}` };
  return null;
}
