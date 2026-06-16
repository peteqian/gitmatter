import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api, type MatterMember, type MatterRole } from "@/lib/data/api";
import { useSession } from "@/lib/auth/auth-client";
import {
  Select,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

const ROLES: MatterRole[] = ["editor", "viewer", "owner"];

export function PeopleModal({
  matterId,
  matterName,
  canManage,
  open,
  onOpenChange,
}: {
  matterId: string;
  matterName: string;
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MatterRole>("editor");

  const { data: people = [] } = useQuery({
    queryKey: ["matter-people", matterId],
    queryFn: () => api.getMatterPeople(matterId),
    enabled: open,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["matter-people", matterId] });

  const add = useMutation({
    mutationFn: () => api.addMemberByEmail(matterId, email.trim(), role),
    onSuccess: () => {
      setEmail("");
      void invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to add"),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => api.removeMember(matterId, userId),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to remove"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
            {matterName} <span className="text-border">›</span>{" "}
            <span className="text-foreground">People</span>
          </DialogTitle>
        </DialogHeader>

        {canManage && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) add.mutate();
            }}
          >
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3">
              <UserPlus className="size-4 shrink-0 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Add by email…"
                className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Select value={role} onValueChange={(v) => setRole(v as MatterRole)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Choose a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {ROLES.map((r: MatterRole) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button
              type="submit"
              size="icon"
              title="Add person"
              aria-label="Add person"
              disabled={add.isPending || !email.trim()}
            >
              <UserPlus className="size-4" />
            </Button>
          </form>
        )}

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">People with Access</p>
          <ul className="flex flex-col divide-y divide-border">
            {people.map((m: MatterMember) => (
              <li key={m.userId} className="flex items-center justify-between py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">
                    {(m.name || m.email).slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">
                      {m.name || m.email}
                      {m.userId === session?.user.id && (
                        <span className="text-muted-foreground"> (You)</span>
                      )}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">{m.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground capitalize">{m.role}</span>
                  {canManage && m.role !== "owner" && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      title="Remove person"
                      aria-label="Remove person"
                      onClick={() => remove.mutate(m.userId)}
                      disabled={remove.isPending}
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            {people.length} {people.length === 1 ? "person" : "people"} with access.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
