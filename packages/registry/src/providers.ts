// Tool providers and the jurisdiction -> provider/tool queries. Pure data + pure
// functions, imported by BOTH the backend (to decide which tools to build) and
// the frontend (to show which tools are available). Adding a provider is a data
// edit here plus its handlers in core's catalog.ts.

import { type Jurisdiction, jurisdictionMatches } from "./jurisdiction.js";
import { TOOL, type ToolMeta } from "./tools.js";

export type ProviderId = "courtlistener" | "ipaustralia";

export type ToolProvider = {
  id: ProviderId;
  name: string;
  /** Patterns this provider serves: exact ("US-NY"), prefix ("US" matches US-*), or "*" (any). */
  jurisdictions: Jurisdiction[];
  tools: ToolMeta[];
};

export const PROVIDERS: ToolProvider[] = [
  {
    id: "courtlistener",
    name: "CourtListener",
    jurisdictions: ["US"], // federal -> also serves US-* sub-jurisdictions
    // Baked into the gitmatter backend (not a consumed sidecar). Exposed as our
    // own tools over our MCP server and in chat; gated to US jurisdictions.
    tools: [
      { name: TOOL.searchCaseLaw, summary: "Search US case law opinions." },
      { name: TOOL.verifyCitations, summary: "Verify/normalize reporter citations." },
    ],
  },
  {
    id: "ipaustralia",
    name: "IP Australia",
    jurisdictions: ["AU"],
    // Baked into the gitmatter backend (like CourtListener). Read-only patent and
    // trade mark search over our MCP server and in chat; gated to AU.
    tools: [
      { name: TOOL.searchTrademarks, summary: "Search Australian trade marks." },
      { name: TOOL.getTrademark, summary: "Get an Australian trade mark by number." },
      { name: TOOL.searchPatents, summary: "Search Australian patents." },
      { name: TOOL.getPatent, summary: "Get an Australian patent by application number." },
    ],
  },
];

export function providersFor(jurisdiction: Jurisdiction): ToolProvider[] {
  return PROVIDERS.filter((p) =>
    p.jurisdictions.some((pat) => jurisdictionMatches(pat, jurisdiction))
  );
}

export function toolsFor(jurisdiction: Jurisdiction): Array<ToolMeta & { providerId: ProviderId }> {
  return providersFor(jurisdiction).flatMap((p) =>
    p.tools.map((t) => ({ ...t, providerId: p.id }))
  );
}
