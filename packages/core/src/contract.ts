import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db/client";
import { commits, contractEdits, contracts } from "@workspace/db/schema";
import { type Actor, recordCommit } from "./commit.js";

export async function createContract(
  actor: Actor,
  input: { title: string; body: string; jurisdiction?: string | null }
) {
  const contractId = randomUUID();
  await recordCommit({
    artifactType: "contract",
    artifactId: contractId,
    actor,
    op: "create",
    message: `Created contract "${input.title}"`,
    apply: async ({ tx }) => {
      await tx.insert(contracts).values({
        id: contractId,
        userId: actor.userId,
        createdBy: actor.userId,
        title: input.title,
        body: input.body,
        jurisdiction: input.jurisdiction ?? null,
      });
      return {
        changes: [
          { path: "meta/title", before: null, after: input.title },
          { path: "body", before: null, after: input.body },
        ],
      };
    },
  });
  return contractId;
}

/** Propose a tracked change (find -> replace). Stored as a pending edit; body unchanged. */
export async function proposeEdit(
  actor: Actor,
  contractId: string,
  input: { find: string; replace: string; reason?: string }
) {
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId));
  if (!contract) throw new Error("Contract not found");
  if (!contract.body.includes(input.find)) {
    throw new Error("`find` text not present in the contract");
  }
  const changeId = randomUUID();
  await recordCommit({
    artifactType: "contract",
    artifactId: contractId,
    actor,
    op: "propose_edit",
    message: `Proposed edit: "${input.find.slice(0, 40)}" → "${input.replace.slice(0, 40)}"`,
    apply: async ({ tx, commitId }) => {
      await tx.insert(contractEdits).values({
        contractId,
        changeId,
        deletedText: input.find,
        insertedText: input.replace,
        reason: input.reason ?? null,
        status: "pending",
        createdBy: actor.userId,
        lastCommitId: commitId,
      });
      return {
        changes: [
          {
            path: `edit/${changeId}`,
            before: null,
            after: {
              find: input.find,
              replace: input.replace,
              reason: input.reason ?? null,
              status: "pending",
            },
          },
        ],
      };
    },
  });
  return changeId;
}

/** Accept (apply find->replace to body) or reject a tracked change. */
export async function resolveEdit(
  actor: Actor,
  contractId: string,
  changeId: string,
  decision: "accept" | "reject"
) {
  const [edit] = await db
    .select()
    .from(contractEdits)
    .where(and(eq(contractEdits.contractId, contractId), eq(contractEdits.changeId, changeId)));
  if (!edit) throw new Error("Edit not found");
  if (edit.status !== "pending") throw new Error("Edit already resolved");

  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId));
  if (!contract) throw new Error("Contract not found");

  const status = decision === "accept" ? "accepted" : "rejected";

  return recordCommit({
    artifactType: "contract",
    artifactId: contractId,
    actor,
    op: "resolve_edit",
    message: `${status} edit ${changeId.slice(0, 8)}`,
    apply: async ({ tx, commitId }) => {
      await tx
        .update(contractEdits)
        .set({ status, resolvedBy: actor.userId, resolvedAt: new Date(), lastCommitId: commitId })
        .where(eq(contractEdits.id, edit.id));

      const changes: Array<{ path: string; before: unknown; after: unknown }> = [
        { path: `edit/${changeId}/status`, before: "pending", after: status },
      ];

      if (decision === "accept" && edit.deletedText !== null) {
        const newBody = contract.body.replace(edit.deletedText, edit.insertedText ?? "");
        await tx
          .update(contracts)
          .set({ body: newBody, updatedAt: new Date() })
          .where(eq(contracts.id, contractId));
        changes.push({ path: "body", before: contract.body, after: newBody });
      }
      return { changes };
    },
  });
}

export async function listContracts(userId: string) {
  return db.select().from(contracts).where(eq(contracts.userId, userId));
}

/** Contract with its edits and per-edit blame (commit that last touched each edit). */
export async function getContract(contractId: string) {
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId));
  if (!contract) return null;

  const edits = await db
    .select()
    .from(contractEdits)
    .where(eq(contractEdits.contractId, contractId))
    .orderBy(asc(contractEdits.createdAt));

  const commitIds = [...new Set(edits.map((e) => e.lastCommitId).filter((x): x is string => !!x))];
  const blameRows = commitIds.length
    ? await db.select().from(commits).where(inArray(commits.id, commitIds))
    : [];
  const blameById = new Map(blameRows.map((b) => [b.id, b]));

  return {
    contract,
    edits: edits.map((e) => ({
      ...e,
      blame: e.lastCommitId ? (blameById.get(e.lastCommitId) ?? null) : null,
    })),
  };
}
