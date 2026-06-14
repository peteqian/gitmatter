import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ToolbarTabs } from "@/components/ToolbarTabs";
import { api, type WorkflowDetail } from "../../lib/api";
import { useWorkingMatterId } from "../../lib/matters-context";

export const Route = createFileRoute("/_auth/workflows")({ component: Workflows });

type WfTab = "all" | "builtin" | "custom";

function Workflows() {
  const { data: items = [] } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => api.listWorkflows(),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<WfTab>("all");
  const [query, setQuery] = useState("");

  // Selected workflow detail, cached per id — reopening a row is instant.
  const { data: selected } = useQuery({
    queryKey: ["workflow", selectedId],
    queryFn: () => api.getWorkflow(selectedId!),
    enabled: !!selectedId,
  });

  const shown = items
    .filter((w) => (tab === "all" ? true : tab === "builtin" ? w.isSystem : !w.isSystem))
    .filter((w) => w.title.toLowerCase().includes(query.trim().toLowerCase()));

  const dialogOpen = creating || !!selectedId;
  const closeDialog = () => {
    setCreating(false);
    setSelectedId(null);
  };

  return (
    <div className="flex flex-col gap-stack">
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

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((w) => (
              <TableRow
                key={w.id}
                className="cursor-pointer"
                onClick={() => {
                  setCreating(false);
                  setSelectedId(w.id);
                }}
              >
                <TableCell />
                <TableCell className="font-medium">{w.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {w.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {w.isSystem ? "Built-in" : "Custom"}
                </TableCell>
              </TableRow>
            ))}
            {!shown.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                  No workflows here yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {creating ? (
            <CreateWorkflow onCreated={closeDialog} />
          ) : selected ? (
            <EditWorkflow detail={selected} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
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
      void qc.invalidateQueries({ queryKey: ["workflows"] });
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
      void qc.invalidateQueries({ queryKey: ["workflows"] });
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
