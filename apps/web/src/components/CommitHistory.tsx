import { ActorBadge } from "@/components/ActorBadge";
import type { Blame } from "../lib/data/api";

/**
 * Shared git-style audit trail for any artifact (reviews, contracts, …). A quiet
 * bronze-dotted timeline: each commit shows who, what op, sequence, when, and the
 * message. Hairline rail, no card per commit (DESIGN.md).
 */
export function CommitHistory({
  commits,
  currentUserId,
}: {
  commits: Blame[];
  currentUserId?: string | null;
}) {
  if (!commits.length) {
    return <p className="py-2 text-xs text-muted-foreground">No commits yet.</p>;
  }
  return (
    <ol className="flex flex-col">
      {commits.map((c, i) => (
        <li key={c.id} className="flex gap-3 pb-4 last:pb-0">
          {/* Timeline rail: a node, and a connector to the next commit. */}
          <div className="flex flex-col items-center">
            <span className="mt-1 size-2 shrink-0 rounded-full bg-bronze ring-2 ring-background" />
            {i < commits.length - 1 && <span className="w-px flex-1 bg-border" />}
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <ActorBadge
                actorType={c.actorType}
                agentLabel={c.agentLabel}
                actorId={c.actorId}
                actorName={c.actorName}
                currentUserId={currentUserId}
              />
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                {c.op}
              </span>
              <span className="font-mono text-muted-foreground">#{c.seq}</span>
              <span
                className="ms-auto shrink-0 text-muted-foreground"
                title={new Date(c.createdAt).toLocaleString()}
              >
                {relativeTime(c.createdAt)}
              </span>
            </div>
            {c.message && <p className="mt-1 break-words">{c.message}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

// Compact relative time ("just now", "5m", "3h", "2d"), falling back to a date.
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
