import { type ProviderId, providersFor } from "@workspace/registry";
import { type Actor, getUserTenant, hasMatterAccess } from "../core/index.js";
import { ensureDefaultMatter } from "../platform/index.js";
import { buildAuditTools } from "./audit.js";
import { buildDiscoveryTools } from "./discovery.js";
import { buildDocumentTools } from "./documents.js";
import { buildMatterTools } from "./matters.js";
import { buildResearchTools } from "./research.js";
import { buildReviewTools } from "./reviews.js";
import type { ToolContext, ToolSpec } from "./types.js";
import { buildWorkflowTools } from "./workflows.js";

export type { ToolSpec } from "./types.js";

/**
 * The gitmatter tool catalog, bound to one acting user. Every tool runs as that
 * user (attributed as an agent) and enforces the same per-artifact access checks
 * regardless of whether it's reached over MCP or from the in-app assistant.
 *
 * Tools live in per-domain modules (reviews, documents, workflows, audit,
 * matters, discovery, research); this assembler builds the shared context and
 * concatenates them, gating the research tools by jurisdiction.
 */
export function buildToolCatalog(
  actor: Actor,
  opts: { jurisdiction: string; defaultMatterLabel: string }
): ToolSpec[] {
  const providerIds = new Set<ProviderId>(providersFor(opts.jurisdiction).map((p) => p.id));

  // Resolve the matter a new artifact lands in: an explicit (editor-checked)
  // matterId, or the acting user's default matter. Returns null when forbidden.
  const resolveMatter = async (matterId?: string): Promise<string | null> => {
    if (matterId) {
      return (await hasMatterAccess(actor.userId, matterId, "editor")) ? matterId : null;
    }
    const tenantId = await getUserTenant(actor.userId);
    if (!tenantId) return null;
    return ensureDefaultMatter(actor.userId, opts.defaultMatterLabel, tenantId);
  };

  const ctx: ToolContext = { actor, resolveMatter };

  return [
    ...buildReviewTools(ctx),
    ...buildAuditTools(ctx),
    ...buildMatterTools(ctx),
    ...buildDocumentTools(ctx),
    ...buildDiscoveryTools(ctx),
    ...buildWorkflowTools(ctx),
    ...buildResearchTools(ctx, providerIds),
  ];
}
