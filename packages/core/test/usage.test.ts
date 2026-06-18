import { afterAll, afterEach, beforeAll, describe, expect, test } from "vite-plus/test";
import { randomUUID } from "node:crypto";
import { db, sql } from "@workspace/db/client";
import { auditEvents, tenants, usageEvents, user } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { recordLlmUsage, recordToolCall } from "../src/platform/usage.js";

let tenantId: string;
const userId = `usage-${randomUUID()}`;

beforeAll(async () => {
  const [t] = await db.insert(tenants).values({ name: "Usage Tenant" }).returning();
  tenantId = t!.id;
  await db.insert(user).values({
    id: userId,
    name: "Usage User",
    email: `${userId}@example.com`,
    emailVerified: true,
    tenantId,
  });
});

afterEach(async () => {
  delete process.env.USER_LLM_TOKEN_BUDGET;
  delete process.env.MCP_TOKEN_CALL_BUDGET;
  await db.delete(usageEvents).where(eq(usageEvents.userId, userId));
  await db.delete(auditEvents).where(eq(auditEvents.actorId, userId));
});

afterAll(async () => {
  await db.delete(tenants).where(eq(tenants.id, tenantId));
  await db.delete(user).where(eq(user.id, userId));
  await sql.end();
});

describe("recordLlmUsage", () => {
  test("appends a usage row and never throws", async () => {
    await recordLlmUsage({
      userId,
      tenantId,
      provider: "anthropic",
      model: "m",
      inputTokens: 10,
      outputTokens: 5,
    });
    const rows = await db.select().from(usageEvents).where(eq(usageEvents.userId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("llm");
    expect(rows[0]!.inputTokens).toBe(10);
  });

  test("over budget emits a budget.exceeded audit row, still returns normally", async () => {
    process.env.USER_LLM_TOKEN_BUDGET = "20";
    // 15 + 15 = 30 tokens > 20 budget on the second call.
    await recordLlmUsage({ userId, tenantId, inputTokens: 10, outputTokens: 5 });
    await recordLlmUsage({ userId, tenantId, inputTokens: 10, outputTokens: 5 });
    const flagged = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.eventType, "budget.exceeded"), eq(auditEvents.actorId, userId)));
    expect(flagged.length).toBeGreaterThanOrEqual(1);
  });

  test("under budget writes no budget.exceeded row", async () => {
    process.env.USER_LLM_TOKEN_BUDGET = "1000";
    await recordLlmUsage({ userId, tenantId, inputTokens: 10, outputTokens: 5 });
    const flagged = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.eventType, "budget.exceeded"), eq(auditEvents.actorId, userId)));
    expect(flagged).toHaveLength(0);
  });
});

describe("recordToolCall", () => {
  test("over per-token budget flags, under does not", async () => {
    const tokenId = randomUUID();
    process.env.MCP_TOKEN_CALL_BUDGET = "2";
    await recordToolCall({ tokenId, userId, tenantId, tool: "search" });
    await recordToolCall({ tokenId, userId, tenantId, tool: "search" });
    let flagged = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.eventType, "budget.exceeded"), eq(auditEvents.actorId, userId)));
    expect(flagged).toHaveLength(0); // 2 == budget, not over
    await recordToolCall({ tokenId, userId, tenantId, tool: "search" });
    flagged = await db
      .select()
      .from(auditEvents)
      .where(and(eq(auditEvents.eventType, "budget.exceeded"), eq(auditEvents.actorId, userId)));
    expect(flagged.length).toBeGreaterThanOrEqual(1); // 3 > 2
  });
});
