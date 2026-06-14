import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { db, sql } from "@workspace/db/client";
import { tenants, user } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { listCommits } from "../src/core/commit.js";
import { ensureDefaultMatter } from "../src/platform/matters.js";
import {
  getDocumentDetail,
  proposeEdit,
  resolveEdit,
  uploadDocument,
} from "../src/content/documents.js";

const userId = `test-user-${randomUUID()}`;
const actor = { type: "user", userId } as const;
const fixture = (): Buffer =>
  readFileSync(fileURLToPath(new URL("./fixtures/single-paragraph.docx", import.meta.url)));

let documentId: string;
let matterId: string;
let tenantId: string;

beforeAll(async () => {
  const [t] = await db.insert(tenants).values({ name: "Test Tenant" }).returning();
  tenantId = t!.id;
  await db.insert(user).values({
    id: userId,
    name: "Test User",
    email: `${userId}@example.com`,
    emailVerified: true,
    tenantId,
  });
  matterId = await ensureDefaultMatter(userId, "Test User", tenantId);
});

afterAll(async () => {
  // Deleting the tenant cascades clients -> matters -> documents -> members.
  await db.delete(tenants).where(eq(tenants.id, tenantId));
  await db.delete(user).where(eq(user.id, userId));
  await sql.end();
});

// Exercises real object storage (DOCX bytes -> S3/R2). Storage is S3-only with
// no local fallback, so skip when no S3 credentials are configured.
const hasS3 = !!process.env.S3_ACCESS_KEY;

(hasS3 ? describe : describe.skip)("document DOCX redline through the commit spine", () => {
  test("upload creates a versioned docx document", async () => {
    const doc = await uploadDocument(userId, {
      title: "NDA",
      fileType: "docx",
      bytes: fixture(),
      matterId,
    });
    documentId = doc.id;
    expect(doc.fileType).toBe("docx");
    expect(doc.currentVersionId).not.toBeNull();
    const result = await getDocumentDetail(documentId);
    expect(result).not.toBeNull();
    expect(result!.edits).toHaveLength(0);
  });

  test("propose routes through the OOXML engine and records a pending edit", async () => {
    await proposeEdit(actor, documentId, { find: "imported", replace: "global" });
    const result = await getDocumentDetail(documentId);
    expect(result!.edits).toHaveLength(1);
    const edit = result!.edits[0]!;
    expect(edit.status).toBe("pending");
    expect(edit.deletedText).toBe("imported");
    expect(edit.insertedText).toBe("global");
    expect(edit.blame).not.toBeNull(); // last_commit_id resolves
  });

  test("accept finalizes the change in the document text", async () => {
    const result0 = await getDocumentDetail(documentId);
    const changeId = result0!.edits[0]!.changeId;
    await resolveEdit(actor, documentId, changeId, "accept");
    const result = await getDocumentDetail(documentId);
    expect(result!.edits[0]!.status).toBe("accepted");
    expect(result!.document.markdown).toContain("global");
    expect(result!.document.markdown).not.toContain("imported");
  });

  test("every mutation is a linear commit", async () => {
    const commitList = await listCommits("document", documentId);
    // propose + resolve (upload does not record a commit)
    expect(commitList).toHaveLength(2);
    expect(commitList.map((c) => c.op)).toEqual(["resolve_edit", "propose_edit"]);
  });
});
