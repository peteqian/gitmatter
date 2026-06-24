// Tool-name catalog — the single source of truth for tool names. Both the
// provider metadata (providers.ts) and the backend handlers (core's catalog.ts)
// reference these constants, so a tool name cannot drift between the two sides:
// a typo there fails to compile instead of silently building a dead tool.

export const TOOL = {
  searchCaseLaw: "search_case_law",
  verifyCitations: "verify_citations",
  searchTrademarks: "search_trademarks",
  getTrademark: "get_trademark",
  searchPatents: "search_patents",
  getPatent: "get_patent",
} as const;

export type ToolName = (typeof TOOL)[keyof typeof TOOL];

export type ToolMeta = { name: ToolName; summary: string };
