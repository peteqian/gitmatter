import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useForm } from "@tanstack/react-form";
import Fuse from "fuse.js";
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
import { api, type Client } from "../../lib/api";
import { queryKeys } from "../../lib/queries";
import { useColumnSizing } from "../../lib/useColumnSizing";
import { ClientDialog } from "../../components/ClientDialog";

export const Route = createFileRoute("/_auth/clients")({
  component: Clients,
  // ?view filters by status (set from the sidebar): all | active | inactive.
  validateSearch: (s: Record<string, unknown>): { view?: string } => ({
    view: typeof s.view === "string" ? s.view : undefined,
  }),
});

const columnHelper = createColumnHelper<Client>();
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
  columnHelper.accessor("name", {
    header: "Name",
    size: 280,
    cell: (c) => <span className="block truncate font-medium">{c.getValue()}</span>,
  }),
  columnHelper.accessor("type", {
    header: "Type",
    size: 120,
    cell: (c) => <span className="text-muted-foreground capitalize">{c.getValue()}</span>,
  }),
  columnHelper.accessor("clientNumber", {
    header: "Client no.",
    size: 140,
    cell: (c) => <span className="text-muted-foreground">{c.getValue() ?? "—"}</span>,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    size: 120,
    cell: (c) =>
      c.getValue() === "inactive" ? (
        <StateCue tone="muted">Inactive</StateCue>
      ) : (
        <StateCue tone="bronze">Active</StateCue>
      ),
  }),
];

function Clients() {
  const { view = "all" } = Route.useSearch();
  const { data: clients = [] } = useQuery({
    queryKey: queryKeys.clients,
    queryFn: () => api.listClients(),
  });
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);
  const [sorting, setSorting] = useState<SortingState>([{ id: "name", desc: false }]);
  const [rowSelection, setRowSelection] = useState({});

  const fuse = useMemo(
    () => new Fuse(clients, { keys: ["name", "type", "clientNumber"], threshold: 0.4 }),
    [clients]
  );
  const rows = (query.trim() ? fuse.search(query).map((r) => r.item) : clients).filter(
    (c) => view === "all" || c.status === view
  );

  const { columnSizing, onColumnSizingChange } = useColumnSizing("clients");

  const table = useReactTable({
    data: rows,
    columns,
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
      <PageHeader
        title="Clients"
        action={
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-full"
            title="New client"
            aria-label="New client"
            onClick={() => setCreating((v) => !v)}
          >
            <Plus className="size-4" />
          </Button>
        }
      />

      {creating && <CreateClient onCreated={() => setCreating(false)} />}

      {clients.length > 0 && (
        <>
          <div className="flex h-10 items-center justify-end border-b border-border">
            <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2.5">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients…"
                className="h-7 w-48 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <DataTable
            table={table}
            onRowClick={(client) => setSelected(client)}
            empty={`No clients match "${query}".`}
          />
        </>
      )}
      {!clients.length && (
        <p className="py-section text-center text-sm text-muted-foreground">
          No clients yet. Add one to open your first matter.
        </p>
      )}

      <ClientDialog client={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function CreateClient({ onCreated }: { onCreated: () => void }) {
  const qc = useQueryClient();
  const createMutation = useMutation({
    mutationFn: (d: { name: string; type: "organization" | "individual"; clientNumber?: string }) =>
      api.createClient(d),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.clients });
      toast.success("Client created");
      onCreated();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });
  const form = useForm({
    defaultValues: {
      name: "",
      type: "organization" as "organization" | "individual",
      clientNumber: "",
    },
    onSubmit: ({ value }) =>
      createMutation
        .mutateAsync({
          name: value.name.trim(),
          type: value.type,
          clientNumber: value.clientNumber.trim() || undefined,
        })
        // Error already surfaced via the mutation's onError toast.
        .catch(() => {}),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New client</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => (value.trim() ? undefined : "Name is required"),
            }}
          >
            {(field) => (
              <div className="flex flex-col gap-field">
                <Label htmlFor={field.name}>Name</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Acme Corp"
                />
                {field.state.meta.isTouched && field.state.meta.errors[0] && (
                  <p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          </form.Field>

          <div className="grid grid-cols-2 gap-stack">
            <form.Field name="type">
              {(field) => (
                <div className="flex flex-col gap-field">
                  <Label htmlFor={field.name}>Type</Label>
                  <select
                    id={field.name}
                    className="h-9 rounded-md border border-input bg-background px-2.5 text-sm"
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(e.target.value as "organization" | "individual")
                    }
                  >
                    <option value="organization">Organization</option>
                    <option value="individual">Individual</option>
                  </select>
                </div>
              )}
            </form.Field>

            <form.Field name="clientNumber">
              {(field) => (
                <div className="flex flex-col gap-field">
                  <Label htmlFor={field.name}>Client number (optional)</Label>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="2024-001"
                  />
                </div>
              )}
            </form.Field>
          </div>

          <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button type="submit" disabled={!canSubmit} className="self-start">
                {isSubmitting ? "Creating…" : "Create client"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </CardContent>
    </Card>
  );
}
