import type { Context } from "hono";

/** The externally-visible origin (scheme + host), honoring reverse-proxy headers. */
export function serverOrigin(c: Context): string {
  const url = new URL(c.req.url);
  const proto = c.req.header("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = c.req.header("x-forwarded-host") ?? c.req.header("host") ?? url.host;
  return `${proto}://${host}`;
}

/** The canonical MCP server URI — the OAuth resource identifier / token audience. */
export function canonicalMcpUri(c: Context): string {
  return `${serverOrigin(c)}/api/mcp`;
}
