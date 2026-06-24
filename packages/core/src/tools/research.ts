import { z } from "zod";
import { type ProviderId, TOOL } from "@workspace/registry";
import {
  getPatent,
  getTrademark,
  hasPatentCreds,
  hasTrademarkCreds,
  recordCourtListenerCall,
  recordIpAustraliaCall,
  resolveCourtListenerKey,
  searchCaseLaw,
  searchPatents,
  searchTrademarks,
  verifyCitations,
} from "../platform/index.js";
import type { ToolContext, ToolSpec } from "./types.js";

// Returned when a US-jurisdiction user invokes a CourtListener tool without a key
// (their own in Settings → Legal research, or the server-env fallback).
const NO_CL_KEY = {
  error: "No CourtListener API key. Add one in Settings → Legal research.",
} as const;

// Returned when an AU-jurisdiction user invokes an IP Australia tool but the
// server-env credentials for that product are not configured.
const NO_IPA_PATENT_KEY = {
  error: "IP Australia patent search is not configured on this instance.",
} as const;
const NO_IPA_TRADEMARK_KEY = {
  error: "IP Australia trade mark search is not configured on this instance.",
} as const;

// Baked-in legal research, jurisdiction-gated via the registry: CourtListener
// (US) and IP Australia (AU). Only the providers active for the user's
// jurisdiction contribute tools.
export function buildResearchTools(
  { actor }: ToolContext,
  providerIds: Set<ProviderId>
): ToolSpec[] {
  const tools: ToolSpec[] = [];

  if (providerIds.has("courtlistener")) {
    tools.push(
      {
        name: TOOL.searchCaseLaw,
        description:
          "Search US case law opinions (CourtListener) by keyword, with optional court/date filters.",
        schema: {
          query: z.string(),
          court: z.string().optional(),
          filedAfter: z.string().optional(),
          filedBefore: z.string().optional(),
          limit: z.number().optional(),
        },
        handler: async (args) => {
          const token = await resolveCourtListenerKey(actor.userId);
          if (!token) return NO_CL_KEY;
          void recordCourtListenerCall({ userId: actor.userId });
          try {
            return await searchCaseLaw(token, args as { query: string });
          } catch (e) {
            return { error: e instanceof Error ? e.message : "failed" };
          }
        },
      },
      {
        name: TOOL.verifyCitations,
        description:
          "Verify/normalize US reporter citations (e.g. '467 U.S. 837') against CourtListener.",
        schema: { citations: z.array(z.string()) },
        handler: async ({ citations }) => {
          const token = await resolveCourtListenerKey(actor.userId);
          if (!token) return NO_CL_KEY;
          void recordCourtListenerCall({ userId: actor.userId });
          try {
            return await verifyCitations(token, citations as string[]);
          } catch (e) {
            return { error: e instanceof Error ? e.message : "failed" };
          }
        },
      }
    );
  }

  if (providerIds.has("ipaustralia")) {
    tools.push(
      {
        name: TOOL.searchTrademarks,
        description:
          "Search Australian trade marks (IP Australia) by word/name/number. Returns matching trade mark numbers.",
        schema: {
          query: z.string(),
          status: z.array(z.string()).optional(),
          changedSinceDate: z.string().optional(),
        },
        handler: async (args) => {
          if (!hasTrademarkCreds()) return NO_IPA_TRADEMARK_KEY;
          void recordIpAustraliaCall({ userId: actor.userId });
          try {
            return await searchTrademarks(args as { query: string });
          } catch (e) {
            return { error: e instanceof Error ? e.message : "failed" };
          }
        },
      },
      {
        name: TOOL.getTrademark,
        description: "Get a single Australian trade mark (IP Australia) by its trade mark number.",
        schema: { number: z.string() },
        handler: async ({ number }) => {
          if (!hasTrademarkCreds()) return NO_IPA_TRADEMARK_KEY;
          void recordIpAustraliaCall({ userId: actor.userId });
          try {
            return await getTrademark(number as string);
          } catch (e) {
            return { error: e instanceof Error ? e.message : "failed" };
          }
        },
      },
      {
        name: TOOL.searchPatents,
        description:
          "Search Australian patents (IP Australia) by keyword. searchType 'ID' returns application numbers; 'DETAILS' returns basic records.",
        schema: {
          query: z.string(),
          searchType: z.enum(["ID", "DETAILS"]).optional(),
          pageSize: z.number().optional(),
          pageNumber: z.number().optional(),
        },
        handler: async (args) => {
          if (!hasPatentCreds()) return NO_IPA_PATENT_KEY;
          void recordIpAustraliaCall({ userId: actor.userId });
          try {
            return await searchPatents(args as { query: string });
          } catch (e) {
            return { error: e instanceof Error ? e.message : "failed" };
          }
        },
      },
      {
        name: TOOL.getPatent,
        description:
          "Get a single Australian patent (IP Australia) by its Australian application number.",
        schema: { number: z.string() },
        handler: async ({ number }) => {
          if (!hasPatentCreds()) return NO_IPA_PATENT_KEY;
          void recordIpAustraliaCall({ userId: actor.userId });
          try {
            return await getPatent(number as string);
          } catch (e) {
            return { error: e instanceof Error ? e.message : "failed" };
          }
        },
      }
    );
  }

  return tools;
}
