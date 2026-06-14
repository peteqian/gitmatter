import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "../server/http/lib/auth";

// Resolves the better-auth session on the server from the request's cookies.
// Called in the root route's beforeLoad so the session is known during SSR —
// the app can then render the correct (logged-in / logged-out) shell in the
// server HTML instead of a blank screen that waits for client-side hydration.
// createServerFn keeps the server-only `auth` (db, drizzle) out of the client
// bundle; the client gets an RPC stub.
export const getServerSession = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  return auth.api.getSession({ headers });
});

export type ServerSession = Awaited<ReturnType<typeof getServerSession>>;
