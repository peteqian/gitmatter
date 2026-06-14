import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { StateCue } from "@/components/StateCue";
import { ToolbarTabs } from "@/components/ToolbarTabs";
import { api, type MatterListItem } from "../../lib/api";
import { queryKeys } from "../../lib/queries";
import { useColumnSizing } from "../../lib/useColumnSizing";
import { useMatters } from "../../lib/matters-context";

export const Route = createFileRoute("/_auth/matters")({
  component: Matters,
  // ?view filters the list by status (set from the sidebar): all | active | closed.
  validateSearch: (s: Record<string, unknown>): { view?: string } => ({
    view: typeof s.view === "string" ? s.view : undefined,
  }),
});

type Scope = "all" | "mine" | "shared";

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const columnHelper = createColumnHelper<MatterListItem>();
const columns = [
  columnHelper.display({
    id: "select",
    size: 44,
    enableResizing: false,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select row"
      />
    ),
  }),
  columnHelper.accessor((m) => m.matter.name, {
    id: "name",
    header: "Name",
    size: 260,
    cell: (c) => (
      <span className="block truncate font-medium">
        {c.getValue()}
        {c.row.original.matter.status === "closed" && (
          <StateCue tone="muted">
            <span className="ml-2">Closed</span>
          </StateCue>
        )}
      </span>
    ),
  }),
  columnHelper.accessor((m) => m.client.name, {
    id: "client",
    header: "Client",
    size: 180,
    cell: (c) => <span className="text-muted-foreground">{c.getValue()}</span>,
  }),
  columnHelper.accessor((m) => (m.role === "owner" ? "Me" : (m.ownerName ?? "—")), {
    id: "owner",
    header: "Owner",
    size: 140,
    cell: (c) => <span className="text-muted-foreground">{c.getValue()}</span>,
  }),
  columnHelper.accessor((m) => m.memberCount, {
    id: "shared",
    header: "Shared with",
    size: 130,
    cell: (c) => (
      <span className="text-muted-foreground">
        {c.getValue() > 1 ? `${c.getValue()} people` : "Private"}
      </span>
    ),
  }),
  columnHelper.accessor((m) => m.matter.updatedAt, {
    id: "updatedAt",
    header: "Recent activity",
    size: 140,
    cell: (c) => <span className="text-muted-foreground">{fmtDate(c.getValue())}</span>,
  }),
  columnHelper.accessor((m) => m.matter.createdAt, {
    id: "createdAt",
    header: "Created",
    size: 140,
    cell: (c) => <span className="text-muted-foreground">{fmtDate(c.getValue())}</span>,
  }),
];

function Matters() {
  const navigate = useNavigate();
  const { matters, refresh, setCurrent } = useMatters();
  const [creating, setCreating] = useState(false);
  const [scope, setScope] = useState<Scope>("all");
  const [query, setQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);
  const [rowSelection, setRowSelection] = useState({});

  const shown = useMemo(
    () =>
      matters
        .filter((m) =>
          scope === "all" ? true : scope === "mine" ? m.role === "owner" : m.role !== "owner"
        )
        .filter((m) => {
          const q = query.trim().toLowerCase();
          return (
            !q || m.matter.name.toLowerCase().includes(q) || m.client.name.toLowerCase().includes(q)
          );
        }),
    [matters, query, scope]
  );

  const { columnSizing, onColumnSizingChange } = useColumnSizing("matters");
  const table = useReactTable({
    data: shown,
    columns,
    getRowId: (m) => m.matter.id,
    state: { sorting, rowSelection, columnSizing },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnSizingChange,
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="-mb-12 flex min-h-0 flex-1 flex-col gap-stack">
      {/* mike Projects header: serif title + a round add button. */}
      <PageHeader
        title="Matters"
        action={
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-full"
            title="New matter"
            aria-label="New matter"
            onClick={() => setCreating((v) => !v)}
          >
            <Plus className="size-4" />
          </Button>
        }
      />

      <ToolbarTabs
        tabs={[
          { id: "all" as const, label: "All" },
          { id: "mine" as const, label: "Mine" },
          { id: "shared" as const, label: "Shared with me" },
        ]}
        active={scope}
        onChange={setScope}
        actions={
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search matters…"
              className="h-7 w-48 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
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

      <DataTable
        table={table}
        empty={
          matters.length
            ? "No matters match this filter."
            : "No matters yet. Create one to start filing work."
        }
        onRowClick={(m) => navigate({ to: "/matters/$id", params: { id: m.matter.id } })}
      />
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
