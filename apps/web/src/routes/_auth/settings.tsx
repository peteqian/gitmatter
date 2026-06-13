import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { JURISDICTIONS, toolsFor } from "@workspace/registry";
import { api, type LlmProvider, type ProviderKeyStatus } from "../../lib/api";

export const Route = createFileRoute("/_auth/settings")({ component: Settings });

function Settings() {
  return (
    <div className="flex max-w-2xl flex-col gap-section">
      <PageHeader
        title="Settings"
        description="Jurisdiction, your LLM keys, and agent connections."
      />
      <JurisdictionCard />
      <ProviderKeys />
      <ConnectAgent />
    </div>
  );
}

function JurisdictionCard() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
  });
  const saved = data?.jurisdiction ?? "";
  // Local draft shows the pick immediately; cleared once the server confirms and
  // the query reflects the new value.
  const [draft, setDraft] = useState<string | null>(null);
  const jurisdiction = draft ?? saved;

  const saveMutation = useMutation({
    mutationFn: (next: string) => api.setSettings(next || null),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["settings"] });
      setDraft(null);
      toast.success("Jurisdiction updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function save(next: string) {
    setDraft(next);
    saveMutation.mutate(next);
  }

  const effective = saved || "US";
  const tools = toolsFor(effective);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default jurisdiction</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Dictates which legal tools are available. Individual contracts can override this.
        </p>
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
          value={jurisdiction}
          onChange={(e) => save(e.target.value)}
        >
          <option value="">System default (US)</option>
          {JURISDICTIONS.map((j) => (
            <option key={j.code} value={j.code}>
              {j.label}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <span className="text-muted-foreground">Tools for {effective}:</span>
          {tools.map((t) => (
            <Badge key={t.name} variant="outline" className="font-mono text-xs">
              {t.name}
            </Badge>
          ))}
          {!tools.length && <span className="text-muted-foreground">none</span>}
        </div>
      </CardContent>
    </Card>
  );
}

const PROVIDER_META: Record<LlmProvider, { label: string; placeholder: string; note?: string }> = {
  anthropic: { label: "Claude (Anthropic)", placeholder: "sk-ant-…" },
  openai: { label: "OpenAI", placeholder: "sk-…" },
  gemini: { label: "Google Gemini", placeholder: "AIza…" },
  openrouter: {
    label: "OpenRouter",
    placeholder: "sk-or-…",
    note: "Zero data retention by default — the safest out-of-the-box choice.",
  },
};

function ProviderKeys() {
  const { data } = useQuery({
    queryKey: ["keys"],
    queryFn: () => api.getKeys(),
  });
  const providers = data?.providers ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM provider keys</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-stack">
        <p className="text-sm text-muted-foreground">
          Bring your own key for any provider. Encrypted at rest, used to run chat and cell
          extraction. Your key overrides any server key; pick the model per chat or review.
        </p>
        {providers.map((p) => (
          <ProviderRow key={p.provider} status={p} />
        ))}
      </CardContent>
    </Card>
  );
}

function ProviderRow({ status }: { status: ProviderKeyStatus }) {
  const qc = useQueryClient();
  const meta = PROVIDER_META[status.provider];
  const [key, setKey] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["keys"] });

  const saveMutation = useMutation({
    mutationFn: () => api.setKey(status.provider, key.trim()),
    onSuccess: () => {
      setKey("");
      void invalidate();
      toast.success(`${meta.label} key saved`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const removeMutation = useMutation({
    mutationFn: () => api.deleteKey(status.provider),
    onSuccess: () => {
      void invalidate();
      toast.success(`${meta.label} key removed`);
    },
  });

  function save() {
    if (!key.trim()) return;
    saveMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-field border-t border-border pt-stack first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2">
        <Label className="flex-1">{meta.label}</Label>
        {status.source === "user" ? (
          <Badge variant="secondary">your key</Badge>
        ) : status.source === "env" ? (
          <Badge variant="outline">server key</Badge>
        ) : (
          <Badge variant="outline">not set</Badge>
        )}
      </div>
      {meta.note && <p className="text-xs text-muted-foreground">{meta.note}</p>}
      <div className="flex gap-2">
        <Input
          type="password"
          placeholder={meta.placeholder}
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <Button onClick={save} disabled={saveMutation.isPending || !key.trim()}>
          Save
        </Button>
        {status.hasUserKey && (
          <Button variant="ghost" onClick={() => removeMutation.mutate()}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

const CONNECT_TABS = ["ChatGPT", "Claude", "Claude Code", "Codex"] as const;
type ConnectTab = (typeof CONNECT_TABS)[number];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="mt-1 block rounded bg-muted p-2 text-xs break-all whitespace-pre-wrap">
      {children}
    </code>
  );
}

function ConnectAgent() {
  const qc = useQueryClient();
  const { data: tokens = [] } = useQuery({
    queryKey: ["tokens"],
    queryFn: () => api.listTokens(),
  });
  const [label, setLabel] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [tab, setTab] = useState<ConnectTab>("ChatGPT");

  const mcpUrl = typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : "/api/mcp";
  const usesOAuth = tab === "ChatGPT" || tab === "Claude";

  const invalidate = () => qc.invalidateQueries({ queryKey: ["tokens"] });

  const mintMutation = useMutation({
    mutationFn: () => api.mintToken(label.trim() || "default"),
    onSuccess: ({ token }) => {
      setFresh(token);
      setLabel("");
      void invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => api.revokeToken(id),
    onSuccess: () => invalidate(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect an agent</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          gitcounsel exposes an MCP server at <code className="text-xs">{mcpUrl}</code>. Connect
          your own AI client — every action it takes is recorded in the same commit history,
          attributed as an agent. It can drive product features but never your account settings.
        </p>

        {/* Client tabs */}
        <div className="flex flex-wrap gap-1.5">
          {CONNECT_TABS.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={tab === t ? "default" : "outline"}
              onClick={() => setTab(t)}
            >
              {t}
            </Button>
          ))}
        </div>

        {/* Per-client guide */}
        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
          {tab === "ChatGPT" && (
            <div className="flex flex-col gap-1">
              <p className="font-medium">ChatGPT — Developer Mode (paid plans)</p>
              <p className="text-muted-foreground">
                Settings → Connectors → add a custom connector with the server URL below. ChatGPT
                runs the OAuth login and approval page — no token to paste. Needs the server on
                public HTTPS.
              </p>
              <Code>{mcpUrl}</Code>
            </div>
          )}
          {tab === "Claude" && (
            <div className="flex flex-col gap-1">
              <p className="font-medium">Claude Desktop / web — custom connector</p>
              <p className="text-muted-foreground">
                Add a connector with the URL below for the OAuth login + approval. Prefer a static
                token instead? Mint one below and use the{" "}
                <code className="text-xs">mcp-remote</code> bridge with an{" "}
                <code className="text-xs">Authorization: Bearer</code> header.
              </p>
              <Code>{mcpUrl}</Code>
            </div>
          )}
          {tab === "Claude Code" && (
            <div className="flex flex-col gap-1">
              <p className="font-medium">Claude Code CLI — static token</p>
              <p className="text-muted-foreground">Mint a token below, then run:</p>
              <Code>{`claude mcp add --transport http gitcounsel ${mcpUrl} \\\n  --header "Authorization: Bearer <token>"`}</Code>
            </div>
          )}
          {tab === "Codex" && (
            <div className="flex flex-col gap-1">
              <p className="font-medium">Codex CLI — static token</p>
              <p className="text-muted-foreground">
                Mint a token below, set <code className="text-xs">GITCOUNSEL_TOKEN</code>, then add
                to <code className="text-xs">~/.codex/config.toml</code>:
              </p>
              <Code>{`[mcp_servers.gitcounsel]\nurl = "${mcpUrl}"\nbearer_token_env_var = "GITCOUNSEL_TOKEN"`}</Code>
            </div>
          )}
        </div>

        {/* Static token minting — used by Claude Code, Codex, and the Claude token fallback */}
        {!usesOAuth || tab === "Claude" ? (
          <div className="flex flex-col gap-3 border-t border-border pt-stack">
            <div className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="label">New token label</Label>
                <Input
                  id="label"
                  placeholder="claude-desktop"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <Button onClick={() => mintMutation.mutate()} disabled={mintMutation.isPending}>
                {mintMutation.isPending ? "Minting…" : "Mint token"}
              </Button>
            </div>

            {fresh && (
              <div className="rounded-md border border-bronze/40 bg-bronze-tint p-3 text-sm">
                <p className="font-medium">Copy this token now — it won't be shown again:</p>
                <Code>{fresh}</Code>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label>Active tokens</Label>
              <ul className="flex flex-col gap-1.5 text-sm">
                {tokens
                  .filter((t) => !t.revokedAt)
                  .map((t) => (
                    <li key={t.id} className="flex items-center justify-between border-b pb-1.5">
                      <span>
                        {t.label}{" "}
                        <span className="text-muted-foreground">
                          ·{" "}
                          {t.lastUsedAt
                            ? `used ${new Date(t.lastUsedAt).toLocaleDateString()}`
                            : "never used"}
                        </span>
                      </span>
                      <Button size="xs" variant="ghost" onClick={() => revokeMutation.mutate(t.id)}>
                        Revoke
                      </Button>
                    </li>
                  ))}
                {!tokens.filter((t) => !t.revokedAt).length && (
                  <li className="text-muted-foreground">No active tokens.</li>
                )}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            ChatGPT connects over OAuth — no token needed here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
