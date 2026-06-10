import type { Context } from "hono";

/** The externally-visible origin (scheme + host), honoring reverse-proxy headers. */
export function serverOrigin(c: Context): string {
  const url = new URL(c.req.url);
  const proto = c.req.header("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = c.req.header("x-forwarded-host") ?? c.req.header("host") ?? url.host;
  return `${proto}://${host}`;
}

/** The MCP server address, used as the OAuth resource id and token audience. */
export function mcpResourceUri(c: Context): string {
  return `${serverOrigin(c)}/api/mcp`;
}
