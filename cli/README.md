# gitcounsel CLI

Self-host gitcounsel with **one prerequisite: Docker**. The CLI wraps Docker
Compose so the user never writes YAML. Built to be driven by a human _or_ an AI
agent (every command takes `--json` and prints actionable fixes).

## Install

Grab the binary for your OS from Releases, or build it:

```sh
bun run build         # this platform -> dist/gitcounsel
bun run build:all     # mac (arm64/x64), linux x64, windows x64
```

Drop the binary on PATH as `gitcounsel`.

## Use

```sh
gitcounsel init       # asks: domain, bundled vs external DB; generates secrets
gitcounsel up         # pulls images, starts stack, prints the URL
gitcounsel doctor     # checks Docker + config + DB, prints fixes
gitcounsel down       # stop
gitcounsel update     # pull newer images + restart
gitcounsel logs web   # tail a service
```

Non-interactive (agent / scripted):

```sh
gitcounsel init --yes --domain counsel.firm.com --db external \
  --database-url postgres://… --tls auto
gitcounsel up --json
```

## Choices `init` makes

- **Domain** — default `gitcounsel.local`. A `.local` or bare host gets a Caddy
  internal cert (browsers warn until its root CA is trusted; `doctor` prints the
  step). A public dotted domain gets a real auto cert via Caddy ACME.
- **Database** — `bundled` runs Postgres (pgvector) in a container; `external`
  uses your `DATABASE_URL` (Neon, Supabase, or your own). pgvector is required —
  the app uses vector search.
- **Secrets** — `BETTER_AUTH_SECRET` and `ENCRYPTION_KEY` are generated once and
  preserved across re-runs.

State lives in `~/.gitcounsel` (override with `GITCOUNSEL_HOME`): `.env`,
`Caddyfile`, `compose.yml`, `compose.db.yml`.

## Before release

The web service pulls `ghcr.io/gitcounsel/gitcounsel:latest` (see
`src/templates.ts`). Set up CI to build `infrastructure/Dockerfile.web` and push
that image, or point `GITCOUNSEL_IMAGE` at your registry.
