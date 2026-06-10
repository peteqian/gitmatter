import { Hono } from "hono";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@workspace/db/client";
import { documents } from "@workspace/db/schema";
import { getUser } from "../session.js";

export const documentsRoute = new Hono();

documentsRoute.get("/api/documents", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.userId, user.id))
    .orderBy(desc(documents.createdAt));
  return c.json(rows);
});

// MVP: create a document from pasted text/markdown. File upload + markitdown
// extraction lands in a later phase.
documentsRoute.post("/api/documents", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = (await c.req.json()) as { title?: string; markdown?: string; fileType?: string };
  if (!body.title || !body.markdown) return c.json({ error: "title and markdown required" }, 400);
  const [doc] = await db
    .insert(documents)
    .values({
      userId: user.id,
      title: body.title,
      fileType: body.fileType ?? "text/markdown",
      markdown: body.markdown,
      sizeBytes: body.markdown.length,
    })
    .returning();
  return c.json(doc, 201);
});

documentsRoute.delete("/api/documents/:id", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  await db
    .delete(documents)
    .where(and(eq(documents.id, c.req.param("id")), eq(documents.userId, user.id)));
  return c.body(null, 204);
});
