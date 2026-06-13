import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { StateCue } from "@/components/StateCue";
import { api } from "../../lib/api";
import { queryKeys } from "../../lib/queries";
import { useMatters } from "../../lib/matters-context";

export const Route = createFileRoute("/_auth/matters")({
  component: Matters,
  // ?view filters the list by status (set from the sidebar): all | active | closed.
  validateSearch: (s: Record<string, unknown>): { view?: string } => ({
    view: typeof s.view === "string" ? s.view : undefined,
  }),
});

function Matters() {
  const { matters, refresh, setCurrent } = useMatters();
  const { view = "all" } = Route.useSearch();
  const [creating, setCreating] = useState(false);

  const shown = view === "all" ? matters : matters.filter((m) => m.matter.status === view);

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title="Matters"
        description="Engagements you're staffed on. New work files under the matter you pick here."
        action={
          <Button onClick={() => setCreating((v) => !v)}>
            {creating ? "Cancel" : "New matter"}
          </Button>
        }
      />

      {creating && (
        <CreateMatter
          onCreated={(id) => {
            setCreating(false);
            refresh();
            setCurrent(id);
          }}
        />
      )}

      {/* Quiet rows over hairlines — lawyers scan by name; no card grid (DESIGN.md). */}
      <div className="flex flex-col divide-y divide-border">
        {shown.map(({ matter, client, role }) => (
          <Link
            key={matter.id}
            to="/matters/$id"
            params={{ id: matter.id }}
            className="-mx-3 flex items-center justify-between gap-4 rounded-md px-3 py-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-semibold">{matter.name}</span>
              <span className="truncate text-sm text-muted-foreground">
                {client.name}
                {matter.practiceArea && ` · ${matter.practiceArea}`}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              {matter.status === "closed" && <StateCue tone="muted">Closed</StateCue>}
              {!matter.conflictCleared && <StateCue tone="bronze">Conflicts pending</StateCue>}
              <span className="text-xs font-medium text-muted-foreground capitalize">{role}</span>
            </div>
          </Link>
        ))}
        {!shown.length && (
          <p className="py-section text-center text-sm text-muted-foreground">
            {matters.length
              ? "No matters match this filter."
              : "No matters yet. Create one to start filing work."}
          </p>
        )}
      </div>
    </div>
  );
}

function CreateMatter({ onCreated }: { onCreated: (id: string) => void }) {
  const { data: clients = [] } = useQuery({
    queryKey: queryKeys.clients,
    queryFn: () => api.listClients(),
  });
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [matterNumber, setMatterNumber] = useState("");
  const [practiceArea, setPracticeArea] = useState("");
  const [adverse, setAdverse] = useState("");
  const [conflicts, setConflicts] = useState<string[] | null>(null);

  const createMutation = useMutation({
    mutationFn: (d: Parameters<typeof api.createMatter>[0]) => api.createMatter(d),
    onSuccess: (m) => {
      toast.success("Matter created");
      onCreated(m.id);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const adverseParties = () =>
    adverse
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  async function check() {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return toast.error("Pick a client first");
    const { matches } = await api.checkConflicts({
      clientName: client.name,
      adverseParties: adverseParties(),
    });
    setConflicts(matches);
    toast[matches.length ? "warning" : "success"](
      matches.length ? `${matches.length} possible conflict(s)` : "No conflicts found"
    );
  }

  function create() {
    if (!clientId) return toast.error("Pick a client");
    if (!name.trim()) return toast.error("Matter name is required");
    createMutation.mutate({
      clientId,
      name: name.trim(),
      matterNumber: matterNumber.trim() || undefined,
      practiceArea: practiceArea.trim() || undefined,
      adverseParties: adverseParties(),
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New matter</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-stack">
        <div className="grid gap-stack sm:grid-cols-2">
          <div className="flex flex-col gap-field">
            <Label>Client</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-2.5 text-sm"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {!clients.length && (
              <p className="text-xs text-muted-foreground">
                No clients yet —{" "}
                <Link to="/clients" className="underline">
                  add one
                </Link>{" "}
                first.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-field">
            <Label>Matter name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Series A financing"
            />
          </div>
          <div className="flex flex-col gap-field">
            <Label>Matter number (optional)</Label>
            <Input
              value={matterNumber}
              onChange={(e) => setMatterNumber(e.target.value)}
              placeholder="M-2024-014"
            />
          </div>
          <div className="flex flex-col gap-field">
            <Label>Practice area (optional)</Label>
            <Input
              value={practiceArea}
              onChange={(e) => setPracticeArea(e.target.value)}
              placeholder="Corporate"
            />
          </div>
        </div>

        <div className="flex flex-col gap-field">
          <Label>Adverse parties (optional, comma-separated)</Label>
          <Input
            value={adverse}
            onChange={(e) => setAdverse(e.target.value)}
            placeholder="Beta LLC, Gamma Inc"
          />
        </div>

        {conflicts !== null && (
          <div
            className={
              conflicts.length
                ? "rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
                : "rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground"
            }
          >
            {conflicts.length ? (
              <>
                <p className="font-medium">Possible conflicts — review before proceeding:</p>
                <ul className="mt-1 list-inside list-disc">
                  {conflicts.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </>
            ) : (
              "No conflicts found."
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={check} disabled={!clientId}>
            Check conflicts
          </Button>
          <Button onClick={create} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Creating…" : "Create matter"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
