import { and, eq, gte, type SQL, sql } from "drizzle-orm";
import { db } from "@workspace/db/client";
import { type UsageKind, usageEvents } from "@workspace/db/schema";
import { getEnvNumber } from "../core/config.js";
import { logEvent } from "../core/log.js";
import { recordAudit } from "./audit.js";

// Spending meter. Each metered action appends a usage_events row, then the
// relevant budgets are summed over a rolling window. Enforcement is LOG-ONLY:
// going over budget emits a structured `budget.exceeded` log + audit row, but
// never rejects the action. A budget env unset or <= 0 disables that check.
// Everything is best-effort — metering must never break the action it observes.

const windowMinutes = () => getEnvNumber("BUDGET_WINDOW_MINUTES", 60);
const since = (minutes: number) => new Date(Date.now() - minutes * 60_000);

async function flag(
  scope: string,
  who: { actorId?: string | null; tenantId?: string | null },
  detail: Record<string, unknown>
): Promise<void> {
  logEvent("warn", "budget.exceeded", { scope, ...who, ...detail });
  await recordAudit({
    eventType: "budget.exceeded",
    actorId: who.actorId ?? null,
    tenantId: who.tenantId ?? null,
    metadata: { scope, ...detail },
  });
}

/** Sum input+output tokens for LLM rows matching `scope` within the window. */
async function sumLlmTokens(scope: SQL, after: Date): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(coalesce(${usageEvents.inputTokens}, 0) + coalesce(${usageEvents.outputTokens}, 0)), 0)`,
    })
    .from(usageEvents)
    .where(and(eq(usageEvents.kind, "llm"), scope, gte(usageEvents.createdAt, after)));
  return Number(row?.total ?? 0);
}

/** Count rows of a kind matching `scope` within the window. */
async function countInWindow(kind: UsageKind, scope: SQL, after: Date): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${usageEvents.count}), 0)` })
    .from(usageEvents)
    .where(and(eq(usageEvents.kind, kind), scope, gte(usageEvents.createdAt, after)));
  return Number(row?.total ?? 0);
}

/** Record one LLM completion's token usage and check per-user/per-tenant budgets. */
export async function recordLlmUsage(e: {
  userId: string;
  tenantId?: string | null;
  provider?: string | null;
  model?: string | null;
  inputTokens?: number;
  outputTokens?: number;
}): Promise<void> {
  try {
    await db.insert(usageEvents).values({
      kind: "llm",
      userId: e.userId,
      tenantId: e.tenantId ?? null,
      provider: e.provider ?? null,
      model: e.model ?? null,
      inputTokens: e.inputTokens ?? 0,
      outputTokens: e.outputTokens ?? 0,
    });
    const after = since(windowMinutes());
    const userBudget = getEnvNumber("USER_LLM_TOKEN_BUDGET", 0);
    if (userBudget > 0) {
      const used = await sumLlmTokens(eq(usageEvents.userId, e.userId), after);
      if (used > userBudget)
        await flag(
          "user_llm",
          { actorId: e.userId, tenantId: e.tenantId },
          { used, budget: userBudget }
        );
    }
    const tenantBudget = getEnvNumber("TENANT_LLM_TOKEN_BUDGET", 0);
    if (tenantBudget > 0 && e.tenantId) {
      const used = await sumLlmTokens(eq(usageEvents.tenantId, e.tenantId), after);
      if (used > tenantBudget)
        await flag(
          "tenant_llm",
          { actorId: e.userId, tenantId: e.tenantId },
          { used, budget: tenantBudget }
        );
    }
  } catch {
    // best-effort: never let metering break a completed LLM call
  }
}

/** Record one MCP tool call and check the per-token call budget. */
export async function recordToolCall(e: {
  tokenId?: string | null;
  userId: string;
  tenantId?: string | null;
  tool: string;
}): Promise<void> {
  try {
    await db.insert(usageEvents).values({
      kind: "tool",
      userId: e.userId,
      tenantId: e.tenantId ?? null,
      tokenId: e.tokenId ?? null,
      tool: e.tool,
    });
    const budget = getEnvNumber("MCP_TOKEN_CALL_BUDGET", 0);
    if (budget > 0 && e.tokenId) {
      const used = await countInWindow(
        "tool",
        eq(usageEvents.tokenId, e.tokenId),
        since(windowMinutes())
      );
      if (used > budget)
        await flag(
          "mcp_token",
          { actorId: e.userId, tenantId: e.tenantId },
          { tokenId: e.tokenId, used, budget }
        );
    }
  } catch {
    // best-effort
  }
}

/** Record one CourtListener request and check the per-user per-minute budget. */
export async function recordCourtListenerCall(e: {
  userId: string;
  tenantId?: string | null;
}): Promise<void> {
  try {
    await db
      .insert(usageEvents)
      .values({ kind: "courtlistener", userId: e.userId, tenantId: e.tenantId ?? null });
    const budget = getEnvNumber("COURTLISTENER_CALL_BUDGET_PER_MIN", 0);
    if (budget > 0) {
      const used = await countInWindow("courtlistener", eq(usageEvents.userId, e.userId), since(1));
      if (used > budget)
        await flag("courtlistener", { actorId: e.userId, tenantId: e.tenantId }, { used, budget });
    }
  } catch {
    // best-effort
  }
}

/** Record one extraction job and check the per-user queue budget. */
export async function recordExtraction(e: {
  userId: string;
  tenantId?: string | null;
}): Promise<void> {
  try {
    await db
      .insert(usageEvents)
      .values({ kind: "extraction", userId: e.userId, tenantId: e.tenantId ?? null });
    const budget = getEnvNumber("EXTRACTION_QUEUE_BUDGET", 0);
    if (budget > 0) {
      const used = await countInWindow(
        "extraction",
        eq(usageEvents.userId, e.userId),
        since(windowMinutes())
      );
      if (used > budget)
        await flag("extraction", { actorId: e.userId, tenantId: e.tenantId }, { used, budget });
    }
  } catch {
    // best-effort
  }
}
