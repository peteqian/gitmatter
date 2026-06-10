import type { Context } from "hono";
import { resolveMcpToken } from "@workspace/core";

/** Resolve the gitcounsel user behind a `Authorization: Bearer <token>` header. */
export async function authenticateMcp(
  c: Context
): Promise<{ userId: string; label: string } | null> {
  const header = c.req.header("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return resolveMcpToken(match[1]!.trim());
}
