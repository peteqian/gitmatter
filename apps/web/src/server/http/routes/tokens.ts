import { Hono } from "hono";
import { listMcpTokens, mintMcpToken, revokeMcpToken } from "@workspace/core";
import { getUser } from "../session.js";

export const tokensRoute = new Hono();

tokensRoute.get("/api/mcp-tokens", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json(await listMcpTokens(user.id));
});

tokensRoute.post("/api/mcp-tokens", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = (await c.req.json()) as { label?: string };
  const token = await mintMcpToken(user.id, body.label?.trim() || "default");
  // Shown once; never retrievable again.
  return c.json({ token }, 201);
});

tokensRoute.delete("/api/mcp-tokens/:id", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  await revokeMcpToken(user.id, c.req.param("id"));
  return c.body(null, 204);
});
