import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  createContract,
  createReview,
  createWorkflow,
  deriveBlame,
  diffCommits,
  getContract,
  getReview,
  getUserApiKey,
  getWorkflow,
  listCommits,
  listContracts,
  listReviews,
  listWorkflows,
  proposeEdit,
  resolveEdit,
  runCell,
  searchCaseLaw,
  updateWorkflow,
  verifyCitations,
} from "@workspace/core";
import type { Actor } from "@workspace/core";
import { providersFor } from "@workspace/registry";

function json(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

/**
 * The MCP server gitcounsel exposes to Claude Desktop / CLI / Cowork. Every tool
 * acts as the gitcounsel user the token was minted by, attributed as an agent so
 * its mutations land in the same git-style audit log as human actions.
 */
export function buildMcpServer(account: { userId: string; label: string; jurisdiction: string }) {
  const actor: Actor = {
    type: "agent",
    userId: account.userId,
    agentLabel: `mcp:${account.label}`,
  };
  const server = new McpServer({ name: "gitcounsel", version: "0.1.0" });
  const providerIds = new Set(providersFor(account.jurisdiction).map((p) => p.id));

  server.registerTool(
    "list_reviews",
    { description: "List the user's tabular reviews.", inputSchema: {} },
    async () => {
      const rows = await listReviews(actor.userId);
      return json(rows.map((r) => ({ id: r.id, title: r.title, documentIds: r.documentIds })));
    }
  );

  server.registerTool(
    "get_review",
    {
      description:
        "Get a tabular review's columns, cells, and per-cell blame (who last set each cell).",
      inputSchema: { reviewId: z.string() },
    },
    async ({ reviewId }) => {
      const result = await getReview(reviewId);
      if (!result || result.review.userId !== actor.userId) return json({ error: "Not found" });
      return json(result);
    }
  );

  server.registerTool(
    "create_review",
    {
      description: "Create a tabular review over documents with extraction columns.",
      inputSchema: {
        title: z.string(),
        documentIds: z.array(z.string()),
        columns: z.array(z.object({ name: z.string(), prompt: z.string() })),
      },
    },
    async ({ title, documentIds, columns }) => {
      const reviewId = await createReview(actor, {
        title,
        documentIds,
        columnsConfig: columns.map((c, i) => ({ index: i, name: c.name, prompt: c.prompt })),
      });
      return json({ reviewId });
    }
  );

  server.registerTool(
    "run_cell",
    {
      description: "Extract (or re-extract) one cell with Claude and commit the change.",
      inputSchema: { reviewId: z.string(), documentId: z.string(), columnIndex: z.number() },
    },
    async ({ reviewId, documentId, columnIndex }) => {
      const apiKey = await getUserApiKey(actor.userId, "anthropic");
      if (!apiKey) return json({ error: "No Anthropic key configured for this account" });
      const result = await runCell(actor, { reviewId, documentId, columnIndex, apiKey });
      return json({ committed: result.commit?.seq, changes: result.changes });
    }
  );

  server.registerTool(
    "query_history",
    {
      description: "List the commit history for a review (newest first).",
      inputSchema: { reviewId: z.string() },
    },
    async ({ reviewId }) => json(await listCommits("tabular_review", reviewId))
  );

  server.registerTool(
    "diff",
    {
      description: "Field-level diff of a review between two commit sequence numbers.",
      inputSchema: { reviewId: z.string(), fromSeq: z.number(), toSeq: z.number() },
    },
    async ({ reviewId, fromSeq, toSeq }) =>
      json(await diffCommits("tabular_review", reviewId, fromSeq, toSeq))
  );

  server.registerTool(
    "blame",
    {
      description:
        "Which commit last set a given field path (e.g. cell/<documentId>/<columnIndex>).",
      inputSchema: { reviewId: z.string(), path: z.string() },
    },
    async ({ reviewId, path }) => json(await deriveBlame("tabular_review", reviewId, path))
  );

  // --- Contracts (text redline) ---

  server.registerTool(
    "list_contracts",
    { description: "List the user's contracts.", inputSchema: {} },
    async () => json((await listContracts(actor.userId)).map((c) => ({ id: c.id, title: c.title })))
  );

  server.registerTool(
    "get_contract",
    {
      description: "Get a contract's body and its tracked edits (with status and blame).",
      inputSchema: { contractId: z.string() },
    },
    async ({ contractId }) => {
      const result = await getContract(contractId);
      if (!result || result.contract.userId !== actor.userId) return json({ error: "Not found" });
      return json(result);
    }
  );

  server.registerTool(
    "create_contract",
    {
      description: "Create a contract from text/markdown.",
      inputSchema: { title: z.string(), body: z.string() },
    },
    async ({ title, body }) => json({ contractId: await createContract(actor, { title, body }) })
  );

  server.registerTool(
    "propose_contract_edit",
    {
      description:
        "Propose a tracked change (find -> replace). Creates a pending edit; body unchanged until accepted.",
      inputSchema: {
        contractId: z.string(),
        find: z.string(),
        replace: z.string(),
        reason: z.string().optional(),
      },
    },
    async ({ contractId, find, replace, reason }) => {
      try {
        const changeId = await proposeEdit(actor, contractId, { find, replace, reason });
        return json({ changeId });
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : "failed" });
      }
    }
  );

  server.registerTool(
    "resolve_contract_edit",
    {
      description: "Accept (apply to body) or reject a tracked change.",
      inputSchema: {
        contractId: z.string(),
        changeId: z.string(),
        decision: z.enum(["accept", "reject"]),
      },
    },
    async ({ contractId, changeId, decision }) => {
      try {
        const r = await resolveEdit(actor, contractId, changeId, decision);
        return json({ committed: r.commit?.seq });
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : "failed" });
      }
    }
  );

  // --- Workflows ---

  server.registerTool(
    "list_workflows",
    { description: "List available workflow templates (system + user).", inputSchema: {} },
    async () =>
      json(
        (await listWorkflows(actor.userId)).map((w) => ({
          id: w.id,
          title: w.title,
          type: w.type,
          isSystem: w.isSystem,
        }))
      )
  );

  server.registerTool(
    "read_workflow",
    {
      description: "Read a workflow template and its per-field blame.",
      inputSchema: { workflowId: z.string() },
    },
    async ({ workflowId }) => json(await getWorkflow(workflowId))
  );

  server.registerTool(
    "write_workflow",
    {
      description: "Create a workflow, or update one by passing workflowId.",
      inputSchema: {
        workflowId: z.string().optional(),
        title: z.string().optional(),
        type: z.enum(["assistant", "tabular"]).optional(),
        promptMd: z.string().optional(),
      },
    },
    async ({ workflowId, title, type, promptMd }) => {
      if (workflowId) {
        await updateWorkflow(actor, workflowId, { title, type, promptMd });
        return json({ workflowId });
      }
      if (!title || !type || !promptMd)
        return json({ error: "title, type, promptMd required to create" });
      return json({ workflowId: await createWorkflow(actor, { title, type, promptMd }) });
    }
  );

  // --- Baked-in legal research (jurisdiction-gated). CourtListener is US-only. ---
  if (providerIds.has("courtlistener")) {
    server.registerTool(
      "search_case_law",
      {
        description:
          "Search US case law opinions (CourtListener) by keyword, with optional court/date filters.",
        inputSchema: {
          query: z.string(),
          court: z.string().optional(),
          filedAfter: z.string().optional(),
          filedBefore: z.string().optional(),
          limit: z.number().optional(),
        },
      },
      async (args) => {
        try {
          return json(await searchCaseLaw(args));
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : "failed" });
        }
      }
    );

    server.registerTool(
      "verify_citations",
      {
        description:
          "Verify/normalize US reporter citations (e.g. '467 U.S. 837') against CourtListener.",
        inputSchema: { citations: z.array(z.string()) },
      },
      async ({ citations }) => {
        try {
          return json(await verifyCitations(citations));
        } catch (e) {
          return json({ error: e instanceof Error ? e.message : "failed" });
        }
      }
    );
  }

  return server;
}
