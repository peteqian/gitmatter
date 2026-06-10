# gitcounsel

Git-philosophy legal review platform. Every mutation — by a human in the UI or by Claude over MCP — is a **commit**: author, message, field-level diff, and per-field/cell **blame**. Linear history per artifact.

Three review surfaces (contract redline, tabular review, workflows) unified by one audit/commit spine, and **MCP both directions**: gitcounsel exposes its own MCP server (Claude drives it) and consumes external legal MCP servers (CourtListener, MarkItDown).

> Heavily inspired by [mikeoss](https://mikeoss.com). gitcounsel adapts mikeoss's review/workflow surfaces and ports several of its libraries (DOCX tracked changes, tabular cell extraction, encrypted key storage, the Anthropic tool loop), then adds the git-style audit spine and bidirectional MCP that mikeoss does not have.

## Stack

- **Monorepo** — Bun workspaces + Vite+ (`apps/web`, `packages/*`, `services/*`)
- **Frontend** — TanStack Start (Vite, Bun), shadcn/ui
- **Backend** — Hono mounted behind TanStack's `/api/$` catch-all (single process)
- **DB** — Postgres (pgvector installed, embeddings deferred) + Drizzle
- **Auth** — better-auth (email/password)
- **LLM** — Anthropic, bring-your-own key (encrypted at rest)
- **MCP** — `@modelcontextprotocol/sdk` (server + client, Streamable HTTP)
- **Deploy** — docker-compose: web + postgres + courtlistener-mcp + markitdown (Python sidecar)

## Develop

```bash
bun install
docker compose up -d postgres      # Postgres with pgvector
cd packages/db && bun run migrate  # apply schema
bun run dev                        # vp run -r dev -> web on :4280
```

Copy `.env.example` to `.env` and fill in secrets.

## Tooling (Vite+)

This repo uses [Vite+](https://viteplus.dev) (`vp`) as the unified toolchain — it
replaces Turbo, ESLint, Prettier, and Vitest config. Root `vite.config.ts` holds
shared `lint`/`fmt`/`test`/`run` settings; each app keeps its own
`apps/<app>/vite.config.ts` for build/dev/plugins. Apps are discovered from the
`workspaces` globs in root `package.json` — no separate app registry.

**`vp run <task>` vs bare `vp <command>` — this trips people up:**

- `vp run build` — task runner. Fans out to every package's `build` script across
  the workspace. **Use this at the repo root.**
- `vp build` — builds **the current package only**. Run it **inside an app dir**
  (`cd apps/web && vp build`). At the repo root it fails with
  `Cannot resolve entry module index.html` — the root is not an app.

```bash
bun run build            # root: vp run -r build (all packages)   <- safe default
vp run -F web build      # root: only the web app
cd apps/web && vp build  # build a single app from its own dir

vp lint                  # oxlint, whole repo
vp fmt                   # oxfmt, whole repo
vp test                  # vitest, whole repo
vp check                 # fmt + lint + typecheck together
```

## Connect Claude (MCP)

gitcounsel exposes an MCP server at `/api/mcp` (Streamable HTTP). In **Settings → Connect Claude**, mint an access token, then:

```bash
# Claude CLI
claude mcp add --transport http gitcounsel http://localhost:4280/api/mcp \
  --header "Authorization: Bearer <token>"
```

For **Claude Desktop / Cowork**, add a custom connector with URL `http://localhost:4280/api/mcp` and header `Authorization: Bearer <token>`.

The token maps to your gitcounsel account; everything Claude does is recorded in the same commit log, attributed as an agent. Tools exposed (15): reviews (`list_reviews`, `get_review`, `create_review`, `run_cell`), contracts (`list_contracts`, `get_contract`, `create_contract`, `propose_contract_edit`, `resolve_contract_edit`), workflows (`list_workflows`, `read_workflow`, `write_workflow`), and audit (`query_history`, `diff`, `blame`).

## Consumed MCP + chat

The in-app **Chat** (your Anthropic key) also _consumes_ external MCP servers — gitcounsel acts as an MCP client. Two are seeded:

- **CourtListener** (`services/courtlistener-mcp`, a Bun MCP server we ship) — `search_case_law`, `verify_citations`. Set `COURTLISTENER_API_TOKEN`.
- **MarkItDown** (Microsoft, Python sidecar) — `convert_to_markdown`. No auth, so it runs **internal-network-only** (never published to the host).

## Full stack (Docker)

```bash
docker compose up --build
```

Runs `web` + `postgres` (pgvector) + `courtlistener-mcp` + `markitdown` (internal only). The web image applies the schema (`drizzle-kit push`) on boot, then serves.

## Storage note

Documents/contracts currently store **markdown/text in Postgres** (no binary uploads yet). When file upload (PDF/DOCX → MarkItDown extraction) lands, original binaries go to **Cloudflare R2** (S3-compatible); R2 is not wired yet.
