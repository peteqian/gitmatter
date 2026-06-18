# Spending Controls

> 📖 A reader-friendly version is published at **/docs/admin/spending-controls**.
> This file is the source it was derived from.

gitcounsel meters cost-bearing actions — LLM completions, MCP tool calls,
CourtListener lookups, and document extractions — into the `usage_events` table.
Budgets are evaluated by summing usage over a rolling window.

**Enforcement is log-only.** Going over a budget emits a structured
`budget.exceeded` log line and writes a `budget.exceeded` row to `audit_events`.
It never rejects the action. This pass is for observing real traffic before any
hard limits are turned on. Per-tenant limits and a hard-block mode wait for the
admin/operator surfaces (P2.5).

## Metered actions

| Action                | Meter kind                  | Keyed by     | Recorded at                                  |
| --------------------- | --------------------------- | ------------ | -------------------------------------------- |
| LLM completion        | `llm` (input+output tokens) | user, tenant | chat tool loop after each completion         |
| MCP tool call         | `tool` (count)              | token        | MCP server dispatch wrapper                  |
| CourtListener request | `courtlistener` (count)     | user         | `search_case_law` / `verify_citations` tools |
| Document extraction   | `extraction` (count)        | user         | `enqueueExtraction` on upload                |

LLM token usage is read from each provider's response (`usage` on the normalized
`CompleteResult`). A provider that omits usage records zero — never an error.

## Env limits

All limits are positive numbers. **Unset or `0` disables that check.** Read via
`getEnvNumber` (`packages/core/src/core/config.ts`).

| Var                                 | Default | Meaning                                           |
| ----------------------------------- | ------- | ------------------------------------------------- |
| `BUDGET_WINDOW_MINUTES`             | `60`    | Rolling window for LLM, tool, and extraction sums |
| `USER_LLM_TOKEN_BUDGET`             | off     | Max input+output tokens per user in the window    |
| `TENANT_LLM_TOKEN_BUDGET`           | off     | Max input+output tokens per tenant in the window  |
| `MCP_TOKEN_CALL_BUDGET`             | off     | Max tool calls per MCP token in the window        |
| `COURTLISTENER_CALL_BUDGET_PER_MIN` | off     | Max CourtListener calls per user per minute       |
| `EXTRACTION_QUEUE_BUDGET`           | off     | Max extraction jobs per user in the window        |

## Reading the meter

`usage_events` is append-only. Sum it directly for dashboards, e.g. tokens per
tenant today, or tool calls per MCP token. `budget.exceeded` audit rows carry
the `scope`, the `used` total, and the `budget` that was crossed in `metadata`.
