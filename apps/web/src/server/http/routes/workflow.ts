import { Hono } from "hono";
import {
  createWorkflow,
  getWorkflow,
  listCommits,
  listWorkflows,
  updateWorkflow,
} from "@workspace/core";
import type { TabularColumn } from "@workspace/db/schema";
import { getUser } from "../session.js";

export const workflowRoute = new Hono();

workflowRoute.get("/api/workflows", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json(await listWorkflows(user.id));
});

workflowRoute.post("/api/workflows", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = (await c.req.json()) as {
    title?: string;
    type?: "assistant" | "tabular";
    promptMd?: string;
    columnsConfig?: TabularColumn[];
  };
  if (!body.title || !body.type || !body.promptMd) {
    return c.json({ error: "title, type, promptMd required" }, 400);
  }
  const id = await createWorkflow(
    { type: "user", userId: user.id },
    {
      title: body.title,
      type: body.type,
      promptMd: body.promptMd,
      columnsConfig: body.columnsConfig,
    }
  );
  return c.json({ id }, 201);
});

workflowRoute.get("/api/workflows/:id", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const result = await getWorkflow(c.req.param("id"));
  if (!result) return c.json({ error: "Not found" }, 404);
  if (!result.workflow.isSystem && result.workflow.userId !== user.id) {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json(result);
});

workflowRoute.patch("/api/workflows/:id", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const result = await getWorkflow(c.req.param("id"));
  if (!result || result.workflow.userId !== user.id) return c.json({ error: "Not found" }, 404);
  const patch = (await c.req.json()) as Record<string, unknown>;
  await updateWorkflow({ type: "user", userId: user.id }, c.req.param("id"), patch);
  return c.json(await getWorkflow(c.req.param("id")));
});

workflowRoute.get("/api/workflows/:id/history", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json(await listCommits("workflow", c.req.param("id")));
});
