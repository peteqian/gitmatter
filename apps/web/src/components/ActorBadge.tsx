import { Badge } from "@/components/ui/badge";

/** Actor cue: bronze marks agent-authored commits (DESIGN.md audit-trail rule). */
export function ActorBadge({
  actorType,
  agentLabel,
  actorId,
  actorName,
  currentUserId,
}: {
  actorType: string;
  agentLabel?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  currentUserId?: string | null;
}) {
  const agent = actorType === "agent";
  // Name the actor so a shared artifact's audit distinguishes collaborators;
  // only the viewer's own commits read "you".
  const label = agent
    ? (agentLabel ?? "agent")
    : actorId && actorId === currentUserId
      ? "you"
      : (actorName ?? "you");
  return (
    <Badge variant="secondary" className={agent ? "bg-bronze-tint text-bronze" : undefined}>
      {label}
    </Badge>
  );
}
