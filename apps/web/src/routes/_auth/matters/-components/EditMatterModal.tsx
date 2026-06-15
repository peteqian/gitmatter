import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { JURISDICTIONS } from "@workspace/registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { api, type Matter } from "../../../../lib/api";

const selectClass = "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm";

/** Typeable, debounced client picker. Searches clients server-side as you type
 *  and reports the chosen client's id + name back up. */
function ClientCombobox({
  clientId,
  clientName,
  onPick,
}: {
  clientId: string;
  clientName: string;
  onPick: (id: string, name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 250);

  const { data } = useQuery({
    queryKey: ["client-search", debounced],
    queryFn: () => api.listClientsPage({ page: 1, pageSize: 20, q: debounced }),
    enabled: open,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="h-9 w-full justify-between font-normal">
            <span className="truncate">{clientName || "Select client…"}</span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent align="start" className="w-(--anchor-width) gap-0 overflow-hidden p-0">
        <div className="flex items-center gap-1.5 border-b border-border px-2 py-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients…"
            className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {!data && [0, 1, 2].map((i) => <Skeleton key={i} className="mx-2 my-1.5 h-4 w-40" />)}

          {data?.rows.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onPick(c.id, c.name);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted"
            >
              <Check
                className={cn("size-4 shrink-0", c.id === clientId ? "opacity-100" : "opacity-0")}
              />
              <span className="block min-w-0 flex-1 truncate text-sm text-foreground">
                {c.name}
              </span>
            </button>
          ))}

          {data && data.rows.length === 0 && (
            <p className="px-2 py-3 text-center text-sm text-muted-foreground">No clients found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Edit a matter's core details: client, name, number, practice area, governing
 *  jurisdiction. Owner-only (the trigger is gated upstream). */
export function EditMatterModal({
  matter,
  open,
  onOpenChange,
  canClose,
  onSaved,
}: {
  matter: Matter;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canClose: boolean;
  onSaved: () => void;
}) {
  const [clientId, setClientId] = useState(matter.clientId);
  const [clientName, setClientName] = useState("");
  const [name, setName] = useState(matter.name);
  const [matterNumber, setMatterNumber] = useState(matter.matterNumber ?? "");
  const [practiceArea, setPracticeArea] = useState(matter.practiceArea ?? "");
  const [jurisdiction, setJurisdiction] = useState(matter.jurisdiction ?? "");

  // Seed the picker's display name for the matter's current client.
  const { data: currentClient } = useQuery({
    queryKey: ["client", matter.clientId],
    queryFn: () => api.getClient(matter.clientId),
    enabled: open,
  });

  // Reset the form whenever a different matter (or fresh data) opens.
  useEffect(() => {
    if (!open) return;
    setClientId(matter.clientId);
    setClientName(currentClient?.client.name ?? "");
    setName(matter.name);
    setMatterNumber(matter.matterNumber ?? "");
    setPracticeArea(matter.practiceArea ?? "");
    setJurisdiction(matter.jurisdiction ?? "");
  }, [open, matter, currentClient]);

  const save = useMutation({
    mutationFn: () =>
      api.updateMatter(matter.id, {
        clientId,
        name: name.trim(),
        matterNumber: matterNumber.trim() || null,
        practiceArea: practiceArea.trim() || null,
        jurisdiction: jurisdiction || null,
      }),
    onSuccess: () => {
      toast.success("Matter updated");
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed"),
  });

  const close = useMutation({
    mutationFn: () => api.closeMatter(matter.id),
    onSuccess: () => {
      toast.success("Matter closed");
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit matter</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Client</Label>
            <ClientCombobox
              clientId={clientId}
              clientName={clientName}
              onPick={(id, n) => {
                setClientId(id);
                setClientName(n);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Matter name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Matter number</Label>
            <Input value={matterNumber} onChange={(e) => setMatterNumber(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Practice area</Label>
            <Input value={practiceArea} onChange={(e) => setPracticeArea(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Jurisdiction</Label>
            <select
              className={selectClass}
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            >
              <option value="">System default (US)</option>
              {JURISDICTIONS.map((j) => (
                <option key={j.code} value={j.code}>
                  {j.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {canClose && matter.status === "active" ? (
            <Button
              variant="outline"
              className="text-destructive"
              disabled={close.isPending}
              onClick={() => close.mutate()}
            >
              Close matter
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              disabled={!name.trim() || !clientId || save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
