# gitmatter agent plugins

One-step installers that wire an AI coding agent to gitmatter's hosted MCP server
at `https://gitmatter.com/api/mcp` (StreamableHTTP transport, OAuth — no token to
copy). The agent acts as **your** gitmatter account; every action is recorded in
your audit history.

| Directory | Agent        | Manifest                     | MCP config                              |
| --------- | ------------ | ---------------------------- | --------------------------------------- |
| `claude/` | Claude Code  | `.claude-plugin/plugin.json` | `.mcp.json` (`type: "http"`)            |
| `codex/`  | OpenAI Codex | `.codex-plugin/plugin.json`  | `.mcp.json` (`type: "streamable-http"`) |

The two agents use different `.mcp.json` shapes, so each plugin is self-contained.

## Claude Code

This repo doubles as a Claude Code plugin marketplace (`.claude-plugin/marketplace.json`
at the repo root).

```bash
claude plugin marketplace add peteqian/gitmatter
claude plugin install gitmatter@gitmatter
claude plugin enable gitmatter
```

The plugin ships disabled (`defaultEnabled: false`) because it connects to an
external service over OAuth — enable it explicitly, then approve the gitmatter
sign-in the first time the agent calls a tool.

## OpenAI Codex

Codex self-serve plugin publishing is not open yet, so the `codex/` plugin is a
scaffold for when it lands. Until then, connect with the CLI (OAuth, no token):

```bash
codex mcp add gitmatter --url https://gitmatter.com/api/mcp
codex mcp login gitmatter
```

gitmatter supports OAuth Dynamic Client Registration, so `codex mcp login` opens a
browser approval and needs no client secret.

See [docs/ai-agents/connect-an-agent](../docs/ai-agents/connect-an-agent.mdx) for the
full setup, including the static-token path for self-hosted instances.
