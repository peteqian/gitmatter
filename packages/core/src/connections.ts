import { eq } from "drizzle-orm";
import { db } from "@workspace/db/client";
import { mcpConnections } from "@workspace/db/schema";
import { PROVIDERS } from "@workspace/registry";

// Sensible local defaults when the provider's url env var is unset.
const FALLBACK_URL: Record<string, string> = {
  courtlistener: "http://localhost:8080/mcp",
  markitdown: "http://localhost:4281/mcp",
};

/** Seed a global consumed-MCP connection per registry provider (idempotent). */
export async function seedMcpConnections() {
  for (const p of PROVIDERS) {
    if (p.transport !== "mcp-http") continue;
    const existing = await db
      .select()
      .from(mcpConnections)
      .where(eq(mcpConnections.providerId, p.id));
    if (existing.length) continue;
    const url = (p.urlEnv && process.env[p.urlEnv]) || FALLBACK_URL[p.id];
    if (!url) continue;
    await db.insert(mcpConnections).values({
      providerId: p.id,
      name: p.name,
      url,
      authType: p.authType,
      enabled: true,
      userId: null,
    });
  }
}
