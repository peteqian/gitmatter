import type { Context } from "hono";
import { auth } from "./auth.js";

export type AuthedUser = { id: string; email: string; name: string };

/** Resolve the better-auth session user from request headers, or null. */
export async function getUser(c: Context): Promise<AuthedUser | null> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email, name: session.user.name };
}

/** Throw a 401 Response if unauthenticated, else return the user. */
export async function requireUser(c: Context): Promise<AuthedUser> {
  const user = await getUser(c);
  if (!user) throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  return user;
}
