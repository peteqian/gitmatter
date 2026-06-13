import { Badge } from "@/components/ui/badge";

/** Actor cue: bronze marks agent-authored commits (DESIGN.md audit-trail rule). */
export function ActorBadge({
  actorType,
  agentLabel,
}: {
  actorType: string;
  agentLabel?: string | null;
}) {
  const agent = actorType === "agent";
  return (
    <Badge variant="secondary" className={agent ? "bg-bronze-tint text-bronze" : undefined}>
      {agent ? (agentLabel ?? "agent") : "you"}
    </Badge>
  );
}
