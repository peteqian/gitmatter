import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  addMember,
  checkConflicts,
  clearConflicts,
  closeMatter,
  createClient,
  createMatter,
  getMatter,
  hasMatterAccess,
  listClients,
  listMattersForUser,
  listMembers,
  removeMember,
  searchUsers,
} from "@workspace/core";
import { type AuthEnv } from "../middleware/auth.js";
import {
  addMemberSchema,
  clearConflictsSchema,
  conflictsCheckSchema,
  createClientSchema,
  createMatterSchema,
} from "../schemas/matters.js";

export const mattersRoute = new Hono<AuthEnv>();

// ---- Clients (firm-wide directory) ----

mattersRoute.get("/api/clients", async (c) => c.json(await listClients()));

mattersRoute.post("/api/clients", zValidator("json", createClientSchema), async (c) => {
  const client = await createClient(c.get("user").id, c.req.valid("json"));
  return c.json(client, 201);
});

// ---- Matters ----

mattersRoute.get("/api/matters", async (c) => c.json(await listMattersForUser(c.get("user").id)));

mattersRoute.post(
  "/api/matters/conflicts-check",
  zValidator("json", conflictsCheckSchema),
  async (c) => c.json(await checkConflicts(c.req.valid("json")))
);

mattersRoute.post("/api/matters", zValidator("json", createMatterSchema), async (c) => {
  const matter = await createMatter(c.get("user").id, c.req.valid("json"));
  return c.json(matter, 201);
});

mattersRoute.get("/api/matters/:id", async (c) => {
  const id = c.req.param("id");
  if (!(await hasMatterAccess(c.get("user").id, id))) return c.json({ error: "Not found" }, 404);
  const matter = await getMatter(id);
  return matter ? c.json(matter) : c.json({ error: "Not found" }, 404);
});

mattersRoute.post("/api/matters/:id/close", async (c) => {
  const id = c.req.param("id");
  if (!(await hasMatterAccess(c.get("user").id, id, "owner")))
    return c.json({ error: "Forbidden" }, 403);
  await closeMatter(id);
  return c.body(null, 204);
});

mattersRoute.post(
  "/api/matters/:id/clear-conflicts",
  zValidator("json", clearConflictsSchema),
  async (c) => {
    const id = c.req.param("id");
    if (!(await hasMatterAccess(c.get("user").id, id, "owner")))
      return c.json({ error: "Forbidden" }, 403);
    await clearConflicts(id, c.req.valid("json").notes);
    return c.body(null, 204);
  }
);

// ---- Matter team ----

mattersRoute.get("/api/matters/:id/members", async (c) => {
  const id = c.req.param("id");
  if (!(await hasMatterAccess(c.get("user").id, id))) return c.json({ error: "Not found" }, 404);
  return c.json(await listMembers(id));
});

mattersRoute.post("/api/matters/:id/members", zValidator("json", addMemberSchema), async (c) => {
  const id = c.req.param("id");
  if (!(await hasMatterAccess(c.get("user").id, id, "owner")))
    return c.json({ error: "Forbidden" }, 403);
  const { userId, role } = c.req.valid("json");
  await addMember(id, userId, role);
  return c.body(null, 204);
});

mattersRoute.delete("/api/matters/:id/members/:userId", async (c) => {
  const id = c.req.param("id");
  if (!(await hasMatterAccess(c.get("user").id, id, "owner")))
    return c.json({ error: "Forbidden" }, 403);
  await removeMember(id, c.req.param("userId"));
  return c.body(null, 204);
});

// ---- Firm user directory ----

mattersRoute.get("/api/users/search", async (c) => {
  const q = c.req.query("q")?.trim();
  if (!q) return c.json([]);
  return c.json(await searchUsers(q));
});
