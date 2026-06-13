import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { JURISDICTIONS } from "@workspace/registry";
import { api } from "../../lib/api";
import { queryKeys } from "../../lib/queries";
import { useWorkingMatterId } from "../../lib/matters-context";

export const Route = createFileRoute("/_auth/contracts")({ component: Contracts });

function Contracts() {
  const router = useRouter();
  const qc = useQueryClient();
  const matterId = useWorkingMatterId();
  const { data: contracts = [] } = useQuery({
    queryKey: queryKeys.contracts,
    queryFn: () => api.listContracts(),
  });
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [creating, setCreating] = useState(false);

  const openCreated = ({ id }: { id: string }) => {
    void qc.invalidateQueries({ queryKey: queryKeys.contracts });
    void router.navigate({ to: "/contracts/$id", params: { id } });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      api.createContract({
        title: title.trim(),
        body,
        jurisdiction: jurisdiction || null,
        matterId,
      }),
    onSuccess: openCreated,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => api.uploadContract(file, undefined, jurisdiction || null, matterId),
    onSuccess: openCreated,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  function create() {
    if (!title.trim() || !body.trim()) return;
    createMutation.mutate();
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) uploadMutation.mutate(file);
  }

  return (
    <div className="flex flex-col gap-section">
      <PageHeader
        title="Contracts"
        description="Redline with tracked changes. Every edit — yours or an agent's — is a commit."
        action={
          <div className="flex items-center gap-2">
            <label className="cursor-pointer rounded-md border px-3 py-1.5 text-sm hover:bg-muted/50">
              {uploadMutation.isPending ? "Uploading…" : "Upload DOCX"}
              <input
                type="file"
                accept=".docx,.doc"
                disabled={uploadMutation.isPending}
                onChange={onUpload}
                className="hidden"
              />
            </label>
            <Button onClick={() => setCreating((v) => !v)}>
              {creating ? "Cancel" : "New contract"}
            </Button>
          </div>
        }
      />

      {creating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New contract</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Acme MSA"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Governing jurisdiction (optional override)</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
              >
                <option value="">Use my default</option>
                {JURISDICTIONS.map((j) => (
                  <option key={j.code} value={j.code}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Body</Label>
              <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <Button
              onClick={create}
              disabled={createMutation.isPending || !title.trim() || !body.trim()}
              className="self-start"
            >
              {createMutation.isPending ? "Creating…" : "Create contract"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {contracts.map((c) => (
          <Link key={c.id} to="/contracts/$id" params={{ id: c.id }}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{c.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {new Date(c.createdAt).toLocaleString()}
              </CardContent>
            </Card>
          </Link>
        ))}
        {!contracts.length && (
          <p className="py-section text-center text-sm text-muted-foreground">
            No contracts yet. Upload one to start a redline.
          </p>
        )}
      </div>
    </div>
  );
}
