import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { PageShell } from "@/components/PageShell";
import { TablePager } from "@/components/TablePager";
import { ToolbarTabs } from "@/components/ToolbarTabs";
import { api, type WorkflowDetail } from "../../lib/api";
import { queryKeys } from "../../lib/queries";
import { useColumnSizing } from "../../lib/useColumnSizing";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { useWorkingMatterId } from "../../lib/matters-context";

export const Route = createFileRoute("/_auth/workflows")({ component: Workflows });

type WfTab = "all" | "builtin" | "custom";

type WorkflowRow = { id: string; title: string; type: string; isSystem: boolean };

const columnHelper = createColumnHelper<WorkflowRow>();
const columns = [
  columnHelper.accessor("title", {
    header: "Name",
    size: 360,
    cell: (c) => <span className="block truncate font-medium">{c.getValue()}</span>,
  }),
  columnHelper.accessor("type", {
    header: "Type",
    size: 140,
    cell: (c) => (
      <Badge variant="outline" className="capitalize">
        {c.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor("isSystem", {
    header: "Source",
    size: 140,
    cell: (c) => (
      <span className="text-muted-foreground">{c.getValue() ? "Built-in" : "Custom"}</span>
    ),
  }),
];

function Workflows() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<WfTab>("all");
  const [query, setQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "title", desc: false }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
  const search = useDebouncedValue(query, 300);
  const sort = sorting[0];
  const pageParams = {
    q: search,
    source: tab,
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    sort: sort?.id,
    dir: sort?.desc ? "desc" : "asc",
  } as const;

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [search, sort?.desc, sort?.id, tab]);

  const { data } = useQuery({
    queryKey: queryKeys.workflowsPage(pageParams),
    queryFn: () => api.listWorkflowsPage(pageParams),
    placeholderData: keepPreviousData,
  });
  const workflows = data?.rows ?? [];
  const rowCount = data?.rowCount ?? 0;

  // Selected workflow detail, cached per id — reopening a row is instant.
  const { data: selected } = useQuery({
    queryKey: ["workflow", selectedId],
    queryFn: () => api.getWorkflow(selectedId!),
    enabled: !!selectedId,
  });

  const { columnSizing, onColumnSizingChange } = useColumnSizing("workflows");
  const table = useReactTable({
    data: workflows,
    columns,
    rowCount,
    getRowId: (row) => row.id,
    state: { sorting, pagination, columnSizing },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnSizingChange,
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
  });

  const dialogOpen = creating || !!selectedId;
  const closeDialog = () => {
    setCreating(false);
    setSelectedId(null);
  };

  return (
    <PageShell
      mode="fill"
      bodyClassName="gap-stack"
      header={
        <PageHeader
          title="Workflows"
          action={
            <Button
              variant="outline"
              size="icon-sm"
              className="rounded-full"
              title="New workflow"
              aria-label="New workflow"
              onClick={() => {
                setSelectedId(null);
                setCreating(true);
              }}
            >
              <Plus className="size-4" />
            </Button>
          }
        />
      }
    >
      <ToolbarTabs
        tabs={[
          { id: "all" as const, label: "All" },
          { id: "builtin" as const, label: "Built-in" },
          { id: "custom" as const, label: "Custom" },
        ]}
        active={tab}
        onChange={setTab}
        actions={
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-7 w-48 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        }
      />

      <DataTable
        table={table}
        empty="No workflows here yet."
        onRowClick={(w) => {
          setCreating(false);
          setSelectedId(w.id);
        }}
      />
      <TablePager table={table} />

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {creating ? (
            <CreateWorkflow onCreated={closeDialog} />
          ) : selected ? (
            <EditWorkflow detail={selected} />
          ) : null}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function CreateWorkflow({ onCreated }: { onCreated: () => void }) {
  const qc = useQueryClient();
  const matterId = useWorkingMatterId();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"assistant" | "tabular">("assistant");
  const [promptMd, setPromptMd] = useState("");

  const createMutation = useMutation({
    mutationFn: () => api.createWorkflow({ title: title.trim(), type, promptMd, matterId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.workflows });
      toast.success("Workflow created");
      onCreated();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function create() {
    if (!title.trim() || !promptMd.trim()) return;
    createMutation.mutate();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New workflow</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(["assistant", "tabular"] as const).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={type === t ? "default" : "outline"}
              onClick={() => setType(t)}
            >
              {t}
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Prompt</Label>
          <Textarea rows={6} value={promptMd} onChange={(e) => setPromptMd(e.target.value)} />
        </div>
        <Button onClick={create} disabled={createMutation.isPending} className="self-start">
          {createMutation.isPending ? "Creating…" : "Create"}
        </Button>
      </CardContent>
    </Card>
  );
}

function EditWorkflow({ detail }: { detail: WorkflowDetail }) {
  const qc = useQueryClient();
  const { workflow, blame } = detail;
  const [title, setTitle] = useState(workflow.title);
  const [promptMd, setPromptMd] = useState(workflow.promptMd);
  const readOnly = workflow.isSystem;
  const promptBlame = blame["field/prompt_md"];

  useEffect(() => {
    setTitle(workflow.title);
    setPromptMd(workflow.promptMd);
  }, [workflow.id, workflow.title, workflow.promptMd]);

  const saveMutation = useMutation({
    mutationFn: () => api.updateWorkflow(workflow.id, { title, promptMd }),
    onSuccess: (updated) => {
      qc.setQueryData(["workflow", workflow.id], updated);
      void qc.invalidateQueries({ queryKey: queryKeys.workflows });
      toast.success("Saved — new commit recorded");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {workflow.title}
          {readOnly && <Badge variant="secondary">system (read-only)</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={readOnly} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="flex items-center gap-2">
            Prompt
            {promptBlame && (
              <span className="text-xs font-normal text-muted-foreground">
                last edited by{" "}
                {promptBlame.actorType === "agent" ? (promptBlame.agentLabel ?? "agent") : "you"} ·
                #{promptBlame.seq}
              </span>
            )}
          </Label>
          <Textarea
            rows={8}
            value={promptMd}
            onChange={(e) => setPromptMd(e.target.value)}
            disabled={readOnly}
          />
        </div>
        {!readOnly && (
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="self-start"
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
