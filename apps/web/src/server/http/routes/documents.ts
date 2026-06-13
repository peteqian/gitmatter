import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  canAccessArtifact,
  createDocument,
  deleteDocument,
  DOCX_MIME,
  fileTypeFromName,
  getDocument,
  getObject,
  listDocuments,
  retryDocument,
  uploadDocument,
} from "@workspace/core";
import { type AuthEnv } from "../middleware/auth.js";
import { resolveCreateMatter } from "../lib/matter.js";
import { createDocumentSchema } from "../schemas/documents.js";

export const documentsRoute = new Hono<AuthEnv>();

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

documentsRoute.get("/api/documents", async (c) => {
  return c.json(await listDocuments(c.get("user").id));
});

// MVP: create a document from pasted text/markdown. File upload + markitdown
// extraction lands in a later phase.
documentsRoute.post("/api/documents", zValidator("json", createDocumentSchema), async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const matterId = await resolveCreateMatter(user, body.matterId);
  if (!matterId) return c.json({ error: "Forbidden" }, 403);
  const doc = await createDocument(user.id, {
    title: body.title,
    markdown: body.markdown,
    fileType: body.fileType,
    matterId,
  });
  return c.json(doc, 201);
});

// Upload a PDF/DOCX: bytes -> storage, row inserted `pending`. Markdown
// extraction runs in the background worker; the client polls `status`.
documentsRoute.post("/api/documents/upload", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) return c.json({ error: "file is required" }, 400);
  const fileType = fileTypeFromName(file.name);
  if (!fileType) return c.json({ error: "only PDF and DOCX/DOC are supported" }, 400);
  if (file.size > MAX_UPLOAD_BYTES) return c.json({ error: "file exceeds 25 MB limit" }, 400);

  const user = c.get("user");
  const matterId = await resolveCreateMatter(
    user,
    typeof body.matterId === "string" ? body.matterId : undefined
  );
  if (!matterId) return c.json({ error: "Forbidden" }, 403);

  const bytes = Buffer.from(await file.arrayBuffer());
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : file.name;
  try {
    const doc = await uploadDocument(user.id, { title, fileType, bytes, matterId });
    return c.json(doc, 202);
  } catch (err) {
    // Storage/extraction-setup failures (e.g. S3 not configured) surface here.
    const message = err instanceof Error ? err.message : "upload failed";
    return c.json({ error: `Could not store file: ${message}` }, 502);
  }
});

// Download the stored file (e.g. a generated .docx). Viewer access is enough.
documentsRoute.get("/api/documents/:id/download", async (c) => {
  const id = c.req.param("id");
  if (!(await canAccessArtifact(c.get("user").id, "document", id)))
    return c.json({ error: "Not found" }, 404);
  const doc = await getDocument(id);
  if (!doc?.storagePath) return c.json({ error: "no stored file" }, 404);
  const bytes = await getObject(doc.storagePath);
  const mime = doc.fileType === "docx" ? DOCX_MIME : "application/octet-stream";
  const filename = doc.title.endsWith(".docx") ? doc.title : `${doc.title}.docx`;
  return new Response(bytes as BodyInit, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
    },
  });
});

// Re-queue a failed extraction.
documentsRoute.post("/api/documents/:id/retry", async (c) => {
  const id = c.req.param("id");
  if (!(await canAccessArtifact(c.get("user").id, "document", id, "editor")))
    return c.json({ error: "Not found" }, 404);
  const doc = await retryDocument(id);
  if (!doc) return c.json({ error: "document not found or not failed" }, 404);
  return c.json(doc);
});

documentsRoute.delete("/api/documents/:id", async (c) => {
  const id = c.req.param("id");
  if (!(await canAccessArtifact(c.get("user").id, "document", id, "editor")))
    return c.json({ error: "Not found" }, 404);
  await deleteDocument(id);
  return c.body(null, 204);
});
