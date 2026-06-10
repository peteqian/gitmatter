import { type Context, Hono } from "hono";
import { type AuthEnv } from "../middleware/auth.js";
import { canonicalMcpUri, serverOrigin } from "../lib/origin.js";

export const oauthRoute = new Hono<AuthEnv>();

// The single scope covering gitcounsel's MCP tool surface (product features only;
// never auth/user settings — see the connector allowlist).
export const MCP_SCOPE = "mcp";

// ---- Discovery (public, root-level well-known) ----

function protectedResourceMetadata(c: Context) {
  return c.json({
    resource: canonicalMcpUri(c),
    authorization_servers: [serverOrigin(c)],
    scopes_supported: [MCP_SCOPE],
  });
}

// RFC 9728: served at the root and at the MCP endpoint's path-suffixed variant.
oauthRoute.get("/.well-known/oauth-protected-resource", protectedResourceMetadata);
oauthRoute.get("/.well-known/oauth-protected-resource/api/mcp", protectedResourceMetadata);

// RFC 8414: authorization server metadata. issuer == origin, so the AS metadata
// lives at the root well-known path (no path insertion).
oauthRoute.get("/.well-known/oauth-authorization-server", (c) => {
  const origin = serverOrigin(c);
  return c.json({
    issuer: origin,
    authorization_endpoint: `${origin}/api/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    scopes_supported: [MCP_SCOPE],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    client_id_metadata_document_supported: true,
  });
});
