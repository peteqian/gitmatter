import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db/client";
import { userApiKeys } from "@workspace/db/schema";
import {
  deleteUserApiKey,
  getUserJurisdiction,
  saveUserApiKey,
  setUserJurisdiction,
} from "@workspace/core";
import { getUser } from "../session.js";

export const keysRoute = new Hono();

keysRoute.get("/api/settings", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ jurisdiction: await getUserJurisdiction(user.id) });
});

keysRoute.put("/api/settings", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = (await c.req.json()) as { jurisdiction?: string | null };
  await setUserJurisdiction(user.id, body.jurisdiction ?? null);
  return c.json({ jurisdiction: body.jurisdiction ?? null });
});

keysRoute.get("/api/keys", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const [row] = await db
    .select({ provider: userApiKeys.provider })
    .from(userApiKeys)
    .where(and(eq(userApiKeys.userId, user.id), eq(userApiKeys.provider, "anthropic")));
  return c.json({ hasAnthropic: !!row });
});

keysRoute.put("/api/keys", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = (await c.req.json()) as { anthropicKey?: string };
  if (!body.anthropicKey) return c.json({ error: "anthropicKey required" }, 400);
  await saveUserApiKey(user.id, body.anthropicKey, "anthropic");
  return c.json({ hasAnthropic: true });
});

keysRoute.delete("/api/keys", async (c) => {
  const user = await getUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  await deleteUserApiKey(user.id, "anthropic");
  return c.json({ hasAnthropic: false });
});
