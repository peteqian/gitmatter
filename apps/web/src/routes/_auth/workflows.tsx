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
import { api, type WorkflowDetail } from "../../lib/api";
import { useWorkingMatterId } from "../../lib/matters-context";

export const Route = createFileRoute("/_auth/workflows")({ component: Workflows });

function Workflows() {
  const { data: items = [] } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => api.listWorkflows(),
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Selected workflow detail, cached per id — reopening a row is instant.
  const { data: selected } = useQuery({
    queryKey: ["workflow", selectedId],
    queryFn: () => api.getWorkflow(selectedId!),
    enabled: !!selectedId,
  });

  return (
    <div className="grid gap-stack lg:grid-cols-[1fr_1.4fr]">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h1 className="text-2xl tracking-tight">Workflows</h1>
          <Button
            size="sm"
            onClick={() => {
              setCreating(true);
              setSelectedId(null);
            }}
          >
            New
          </Button>
        </div>
        {/* Hairline-divided rows — no box per item (DESIGN.md). */}
        <ul className="flex flex-col divide-y divide-border">
          {items.map((w) => (
            <li key={w.id}>
              <button
                className="-mx-2 w-[calc(100%+1rem)] rounded-md px-2 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
                onClick={() => {
                  setCreating(false);
                  setSelectedId(w.id);
                }}
              >
                <span className="flex items-center gap-2">
                  {w.title}
                  <Badge variant="outline">{w.type}</Badge>
                  {w.isSystem && <Badge variant="secondary">system</Badge>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        {creating && <CreateWorkflow onCreated={() => setCreating(false)} />}
        {!creating && selected && <EditWorkflow detail={selected} />}
        {!creating && !selected && (
          <p className="pt-2 text-muted-foreground">Select a workflow or create one.</p>
        )}
      </div>
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
