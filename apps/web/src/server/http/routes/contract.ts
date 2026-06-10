import { Hono } from "hono";
import {
  createContract,
  getContract,
  listCommits,
  listContracts,
  proposeEdit,
  resolveEdit,
} from "@workspace/core";
import { getUser } from "../session.js";

export const contractRoute = new Hono();

async function owns(userId: string, contractId: string) {
  const result = await getContract(contractId);
  return result && result.contract.userId === userId ? result : null;
}

contractRoute.get("/api/contracts", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json(await listContracts(user.id));
});

contractRoute.post("/api/contracts", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = (await c.req.json()) as { title?: string; body?: string; jurisdiction?: string };
  if (!body.title) return c.json({ error: "title required" }, 400);
  const id = await createContract(
    { type: "user", userId: user.id },
    { title: body.title, body: body.body ?? "", jurisdiction: body.jurisdiction ?? null }
  );
  return c.json({ id }, 201);
});

contractRoute.get("/api/contracts/:id", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const result = await owns(user.id, c.req.param("id"));
  if (!result) return c.json({ error: "Not found" }, 404);
  return c.json(result);
});

contractRoute.post("/api/contracts/:id/edits", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  if (!(await owns(user.id, id))) return c.json({ error: "Not found" }, 404);
  const body = (await c.req.json()) as { find?: string; replace?: string; reason?: string };
  if (body.find === undefined || body.replace === undefined) {
    return c.json({ error: "find and replace required" }, 400);
  }
  try {
    await proposeEdit({ type: "user", userId: user.id }, id, {
      find: body.find,
      replace: body.replace,
      reason: body.reason,
    });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "failed" }, 400);
  }
  return c.json(await getContract(id));
});

contractRoute.post("/api/contracts/:id/edits/:changeId/resolve", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  if (!(await owns(user.id, id))) return c.json({ error: "Not found" }, 404);
  const body = (await c.req.json()) as { decision?: "accept" | "reject" };
  if (body.decision !== "accept" && body.decision !== "reject") {
    return c.json({ error: "decision must be accept or reject" }, 400);
  }
  try {
    await resolveEdit(
      { type: "user", userId: user.id },
      id,
      c.req.param("changeId"),
      body.decision
    );
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "failed" }, 400);
  }
  return c.json(await getContract(id));
});

contractRoute.get("/api/contracts/:id/history", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!(await owns(user.id, c.req.param("id")))) return c.json({ error: "Not found" }, 404);
  return c.json(await listCommits("contract", c.req.param("id")));
});
