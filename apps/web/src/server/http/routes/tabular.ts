import { Hono } from "hono";
import {
  createReview,
  diffCommits,
  getReview,
  getUserApiKey,
  listCommits,
  listReviews,
  runCell,
} from "@workspace/core";
import type { TabularColumn } from "@workspace/db/schema";
import { getUser } from "../session.js";

export const tabularRoute = new Hono();

tabularRoute.get("/api/tabular/reviews", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json(await listReviews(user.id));
});

tabularRoute.post("/api/tabular/reviews", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = (await c.req.json()) as {
    title?: string;
    columnsConfig?: TabularColumn[];
    documentIds?: string[];
  };
  if (!body.title || !body.columnsConfig?.length || !body.documentIds?.length) {
    return c.json({ error: "title, columnsConfig, documentIds required" }, 400);
  }
  const reviewId = await createReview(
    { type: "user", userId: user.id },
    { title: body.title, columnsConfig: body.columnsConfig, documentIds: body.documentIds }
  );
  return c.json({ id: reviewId }, 201);
});

tabularRoute.get("/api/tabular/reviews/:id", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const result = await getReview(c.req.param("id"));
  if (!result || result.review.userId !== user.id) return c.json({ error: "Not found" }, 404);
  return c.json(result);
});

tabularRoute.post("/api/tabular/reviews/:id/run", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const reviewId = c.req.param("id");
  const result = await getReview(reviewId);
  if (!result || result.review.userId !== user.id) return c.json({ error: "Not found" }, 404);

  const apiKey = await getUserApiKey(user.id, "anthropic");
  if (!apiKey) return c.json({ error: "No Anthropic key set" }, 400);

  const body = (await c.req.json()) as { documentId?: string; columnIndex?: number };
  if (!body.documentId || body.columnIndex === undefined) {
    return c.json({ error: "documentId and columnIndex required" }, 400);
  }
  try {
    await runCell(
      { type: "user", userId: user.id },
      { reviewId, documentId: body.documentId, columnIndex: body.columnIndex, apiKey }
    );
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "run failed" }, 500);
  }
  return c.json(await getReview(reviewId));
});

tabularRoute.get("/api/tabular/reviews/:id/history", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const result = await getReview(c.req.param("id"));
  if (!result || result.review.userId !== user.id) return c.json({ error: "Not found" }, 404);
  return c.json(await listCommits("tabular_review", c.req.param("id")));
});

tabularRoute.get("/api/tabular/reviews/:id/diff", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const result = await getReview(c.req.param("id"));
  if (!result || result.review.userId !== user.id) return c.json({ error: "Not found" }, 404);
  const from = Number(c.req.query("from") ?? "0");
  const to = Number(c.req.query("to") ?? "0");
  return c.json(await diffCommits("tabular_review", c.req.param("id"), from, to));
});
