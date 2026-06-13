import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { useForm } from "@tanstack/react-form";
import Fuse from "fuse.js";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { StateCue } from "@/components/StateCue";
import { api, type Client } from "../../lib/api";
import { queryKeys } from "../../lib/queries";
import { useTableVirtualizer } from "../../lib/useTableVirtualizer";
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
  columnHelper.accessor("name", {
    header: "Name",
    cell: (c) => <span className="font-medium">{c.getValue()}</span>,
  }),
  columnHelper.accessor("type", {
    header: "Type",
    cell: (c) => <span className="text-muted-foreground capitalize">{c.getValue()}</span>,
  }),
  columnHelper.accessor("clientNumber", {
    header: "Client no.",
    cell: (c) => <span className="text-muted-foreground">{c.getValue() ?? "—"}</span>,
  }),
  columnHelper.accessor("status", {
    header: "Status",
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

  const fuse = useMemo(
    () => new Fuse(clients, { keys: ["name", "type", "clientNumber"], threshold: 0.4 }),
    [clients]
  );
  const rows = (query.trim() ? fuse.search(query).map((r) => r.item) : clients).filter(
    (c) => view === "all" || c.status === view
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const tableRows = table.getRowModel().rows;
  const { scrollRef, virtualizer, items, paddingTop, paddingBottom } =
    useTableVirtualizer(tableRows);

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title="Clients"
        description="The firm's client directory. Open a matter under a client to start work."
        action={
          <Button onClick={() => setCreating((v) => !v)}>
            {creating ? "Cancel" : "New client"}
          </Button>
        }
      />

      {creating && <CreateClient onCreated={() => setCreating(false)} />}

      {clients.length > 0 && (
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients…"
        />
      )}

      {clients.length > 0 && (
        <div ref={scrollRef} className="max-h-[70vh] overflow-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => {
                    const dir = header.column.getIsSorted();
                    const Icon = !dir ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;
                    return (
                      <TableHead key={header.id}>
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="-mx-1 flex items-center gap-1 rounded px-1 hover:text-foreground"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <Icon
                            className={cn(
                              "size-3.5",
                              dir ? "text-foreground" : "text-muted-foreground/50"
                            )}
                          />
                        </button>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {paddingTop > 0 && (
                <tr>
                  <td colSpan={columns.length} style={{ height: paddingTop }} />
                </tr>
              )}
              {items.map((item) => {
                const row = tableRows[item.index]!;
                return (
                  <TableRow
                    key={row.id}
                    data-index={item.index}
                    ref={virtualizer.measureElement}
                    onClick={() => setSelected(row.original)}
                    className="cursor-pointer"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td colSpan={columns.length} style={{ height: paddingBottom }} />
                </tr>
              )}
              {!tableRows.length && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-section text-center text-muted-foreground"
                  >
                    No clients match "{query}".
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
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
