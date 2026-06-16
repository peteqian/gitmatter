import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/util/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { api, type ChatEdit } from "../../../../lib/data/api";

const STATUS_VARIANT: Record<ChatEdit["status"], "outline" | "secondary" | "destructive"> = {
  pending: "outline",
  accepted: "secondary",
  rejected: "destructive",
};

/**
 * Tracked changes the assistant proposed in a turn, grouped under a collapsible
 * header and rendered as Accept/Reject/View cards — the in-chat mirror of the
 * document page's tracked-changes list. Status is held locally so Accept/Reject
 * reflect instantly; the document page is the source of truth on reload.
 */
export function ChatEditCards({ edits }: { edits: ChatEdit[] }) {
  // Local status overlay so resolving a card updates it in place.
  const [status, setStatus] = useState<Record<string, ChatEdit["status"]>>({});
  const statusOf = (e: ChatEdit) => status[e.changeId] ?? e.status;

  const resolve = useMutation({
    mutationFn: (v: { edit: ChatEdit; decision: "accept" | "reject" }) =>
      api.resolveEdit(v.edit.documentId, v.edit.changeId, v.decision),
    onSuccess: (_d, v) =>
      setStatus((s) => ({
        ...s,
        [v.edit.changeId]: v.decision === "accept" ? "accepted" : "rejected",
      })),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  // Accept/reject every still-pending change in this group at once. Scoped to
  // the group's change ids (one batch per document) so other turns are untouched.
  const resolveAll = useMutation({
    mutationFn: async (decision: "accept" | "reject") => {
      const pending = edits.filter((e) => statusOf(e) === "pending");
      const byDoc = new Map<string, string[]>();
      for (const e of pending)
        byDoc.set(e.documentId, [...(byDoc.get(e.documentId) ?? []), e.changeId]);
      await Promise.all([...byDoc].map(([docId, ids]) => api.resolveBatch(docId, ids, decision)));
      return { decision, ids: pending.map((e) => e.changeId) };
    },
    onSuccess: ({ decision, ids }) =>
      setStatus((s) => {
        const next = { ...s };
        for (const id of ids) next[id] = decision === "accept" ? "accepted" : "rejected";
        return next;
      }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (!edits.length) return null;
  const pending = edits.filter((e) => statusOf(e) === "pending").length;
  const busy = resolve.isPending || resolveAll.isPending;
  const label = pending
    ? `${edits.length} tracked change${edits.length > 1 ? "s" : ""}`
    : `${edits.length} resolved tracked change${edits.length > 1 ? "s" : ""}`;

  return (
    <Collapsible defaultOpen className="not-prose mb-4 rounded-md border">
      <div className="flex items-center gap-2 pr-2">
        <CollapsibleTrigger className="group flex flex-1 items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/50">
          {label}
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-aria-expanded:rotate-180" />
        </CollapsibleTrigger>
        {pending > 0 && (
          <>
            <Button size="xs" disabled={busy} onClick={() => resolveAll.mutate("accept")}>
              Accept all
            </Button>
            <Button
              size="xs"
              variant="outline"
              disabled={busy}
              onClick={() => resolveAll.mutate("reject")}
            >
              Reject all
            </Button>
          </>
        )}
      </div>
      <CollapsibleContent className="flex flex-col gap-2 p-3 pt-0">
        {edits.map((e) => {
          const st = statusOf(e);
          return (
            <Card key={e.changeId}>
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between gap-2">
                  {e.reason && <span className="text-sm font-medium">{e.reason}</span>}
                  <Badge variant={STATUS_VARIANT[st]} className="ml-auto capitalize">
                    {st}
                  </Badge>
                </div>
                <div className="rounded-md border bg-muted/30 px-2 py-1.5 text-sm break-words">
                  {e.deletedText && (
                    <span className="bg-red-500/15 text-red-700 line-through dark:text-red-400">
                      {e.deletedText}
                    </span>
                  )}{" "}
                  {e.insertedText && (
                    <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                      {e.insertedText}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {st === "pending" ? (
                    <>
                      <Button
                        size="xs"
                        disabled={busy}
                        onClick={() => resolve.mutate({ edit: e, decision: "accept" })}
                      >
                        Accept
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={busy}
                        onClick={() => resolve.mutate({ edit: e, decision: "reject" })}
                      >
                        Reject
                      </Button>
                    </>
                  ) : (
                    <Button size="xs" variant="outline" disabled>
                      {st === "accepted" ? "Accepted" : "Rejected"}
                    </Button>
                  )}
                  <Link
                    to="/documents/$id"
                    params={{ id: e.documentId }}
                    className={cn(buttonVariants({ size: "xs", variant: "ghost" }), "ml-auto")}
                  >
                    View
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
