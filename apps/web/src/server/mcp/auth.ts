import type { Context } from "hono";
import { resolveMcpToken, resolveOAuthToken } from "@workspace/core";
import { mcpResourceUri } from "../http/lib/origin.js";

/** Resolve the gitcounsel user behind a `Authorization: Bearer <token>` header. */
export async function authenticateMcp(
  c: Context
): Promise<{ userId: string; label: string; tokenId?: string } | null> {
  const header = c.req.header("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1]!.trim();
  // A static minted token (gc_) first; then an OAuth access token bound to this
  // resource — the MCP server address is the required token audience (RFC 8707).
  const stat = await resolveMcpToken(token);
  if (stat) return stat;
  const oauth = await resolveOAuthToken(token, mcpResourceUri(c));
  if (oauth) return { userId: oauth.userId, label: `oauth:${oauth.clientId}` };
  return null;
}
