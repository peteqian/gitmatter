import type { Context } from "hono";

/** The externally-visible origin (scheme + host), honoring reverse-proxy headers. */
export function serverOrigin(c: Context): string {
  const url = new URL(c.req.url);
  // A proxy chain appends to X-Forwarded-* (comma-separated); the first hop is the
  // client-facing value. Take it, or the URLs become malformed ("https, http://…").
  const first = (v: string | undefined) => v?.split(",")[0]?.trim();
  const proto = first(c.req.header("x-forwarded-proto")) ?? url.protocol.replace(":", "");
  const host = first(c.req.header("x-forwarded-host")) ?? c.req.header("host") ?? url.host;
  return `${proto}://${host}`;
}

/** The MCP server address, used as the OAuth resource id and token audience. */
export function mcpResourceUri(c: Context): string {
  return `${serverOrigin(c)}/api/mcp`;
}
