import { z } from "zod";
import { getUserTenant } from "../core/index.js";
import { listMatterDocuments } from "../content/index.js";
import { createClient, createMatter, listClients, listMattersForUser } from "../platform/index.js";
import type { ToolContext, ToolSpec } from "./types.js";

// Clients, matters, and a matter's filed documents — the Client → Matter spine.
export function buildMatterTools({ actor, resolveMatter }: ToolContext): ToolSpec[] {
  return [
    {
      name: "list_clients",
      description: "List the clients you have access to.",
      schema: {},
      handler: async () => listClients(actor.userId),
    },
    {
      name: "create_client",
      description: "Create a client for your firm.",
      schema: {
        name: z.string(),
        type: z.enum(["organization", "individual"]).optional(),
        clientNumber: z.string().optional(),
      },
      handler: async ({ name, type, clientNumber }) => {
        const tenantId = await getUserTenant(actor.userId);
        if (!tenantId) return { error: "Forbidden: no tenant" };
        const client = await createClient(actor.userId, tenantId, {
          name: name as string,
          type: type as "organization" | "individual" | undefined,
          clientNumber: clientNumber as string | undefined,
        });
        return { clientId: client.id, name: client.name, type: client.type };
      },
    },
    {
      name: "list_matters",
      description: "List the matters you're staffed on, with client and your role.",
      schema: {},
      handler: async () => listMattersForUser(actor.userId),
    },
    {
      name: "create_matter",
      description: "Create a matter for a client. You become its owner.",
      schema: {
        clientId: z.string(),
        name: z.string(),
        practiceArea: z.string().optional(),
      },
      handler: async ({ clientId, name, practiceArea }) => {
        const matter = await createMatter(actor.userId, {
          clientId: clientId as string,
          name: name as string,
          practiceArea: practiceArea as string | undefined,
        });
        return { matterId: matter.id };
      },
    },
    {
      name: "list_matter_documents",
      description:
        "List the documents filed under a matter (newest first), with title, type, and extraction status. Use this to find a matter's documents — `search` only matches titles.",
      schema: { matterId: z.string() },
      handler: async ({ matterId }) => {
        const resolved = await resolveMatter(matterId as string | undefined);
        if (!resolved) return { error: "Forbidden: no access to that matter" };
        const docs = await listMatterDocuments(resolved);
        return {
          documents: docs.map((d) => ({
            id: d.id,
            title: d.title,
            fileType: d.fileType,
            status: d.status,
            createdAt: d.createdAt,
          })),
        };
      },
    },
  ];
}
