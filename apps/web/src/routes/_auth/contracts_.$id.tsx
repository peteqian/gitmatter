import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CommitHistory } from "@/components/CommitHistory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DocxView } from "@/components/DocxView";
import { api, type ContractDetail, type ContractEdit } from "../../lib/api";

export const Route = createFileRoute("/_auth/contracts_/$id")({ component: ContractView });

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  accepted: "secondary",
  rejected: "destructive",
};

function ContractView() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const contractKey = ["contract", id];
  const { data } = useQuery({ queryKey: contractKey, queryFn: () => api.getContract(id) });
  const { data: history = [] } = useQuery({
    queryKey: ["contract-history", id],
    queryFn: () => api.contractHistory(id),
  });
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [reason, setReason] = useState("");

  // Both mutations return the updated contract; seed it into the cache and
  // refresh the blame history.
  const onEdited = (updated: ContractDetail) => {
    qc.setQueryData(contractKey, updated);
    void qc.invalidateQueries({ queryKey: ["contract-history", id] });
  };

  const proposeMutation = useMutation({
    mutationFn: () => api.proposeEdit(id, { find, replace, reason: reason || undefined }),
    onSuccess: (updated) => {
      onEdited(updated);
      setFind("");
      setReplace("");
      setReason("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const resolveMutation = useMutation({
    mutationFn: (v: { edit: ContractEdit; decision: "accept" | "reject" }) =>
      api.resolveEdit(id, v.edit.changeId, v.decision),
    onSuccess: onEdited,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (!data)
    return (
      <div className="grid gap-6 pt-6 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );

  const { contract, edits } = data;
  const pending = edits.filter((e) => e.status === "pending");
  const isDocx = !!contract.currentVersionId;

  return (
    <div className="grid gap-6 pt-6 lg:grid-cols-[1fr_300px]">
      <div className="flex min-w-0 flex-col gap-4">
        <h1 className="text-2xl tracking-tight">{contract.title}</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isDocx ? "Document (tracked changes)" : "Current text"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isDocx ? (
              <DocxView url={api.contractDocxUrl(id)} versionToken={contract.currentVersionId} />
            ) : (
              // Legal text gets the serif and a readable measure — it is the hero (DESIGN.md).
              <pre className="max-w-[70ch] font-serif text-base leading-relaxed whitespace-pre-wrap">
                {contract.body}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Propose tracked change</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Find (exact text in the contract)</Label>
              <Input value={find} onChange={(e) => setFind(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Replace with</Label>
              <Input value={replace} onChange={(e) => setReplace(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Reason (optional)</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <Button
              onClick={() => find && proposeMutation.mutate()}
              disabled={proposeMutation.isPending || !find}
              className="self-start"
            >
              {proposeMutation.isPending ? "Proposing…" : "Propose edit"}
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Tracked changes ({pending.length} pending)</h2>
          {edits.map((e) => (
            <Card key={e.id}>
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANT[e.status]}>{e.status}</Badge>
                  {e.blame && (
                    <span className="text-xs text-muted-foreground">
                      by{" "}
                      <span className={e.blame.actorType === "agent" ? "text-bronze" : undefined}>
                        {e.blame.actorType === "agent" ? (e.blame.agentLabel ?? "agent") : "you"}
                      </span>{" "}
                      · #{e.blame.seq}
                    </span>
                  )}
                </div>
                <div className="text-sm">
                  <span className="bg-red-500/15 text-red-700 line-through dark:text-red-400">
                    {e.deletedText}
                  </span>{" "}
                  <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                    {e.insertedText}
                  </span>
                </div>
                {e.reason && <p className="text-xs text-muted-foreground">{e.reason}</p>}
                {e.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="xs"
                      onClick={() => resolveMutation.mutate({ edit: e, decision: "accept" })}
                    >
                      Accept
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => resolveMutation.mutate({ edit: e, decision: "reject" })}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {!edits.length && <p className="text-sm text-muted-foreground">No proposed changes.</p>}
        </div>
      </div>

      <aside>
        <h2 className="mb-2 text-sm font-semibold">History</h2>
        <CommitHistory commits={history} />
      </aside>
    </div>
  );
}
