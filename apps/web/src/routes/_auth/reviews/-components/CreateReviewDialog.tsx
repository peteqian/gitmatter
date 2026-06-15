import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, FileText, Folder, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api, type Column, type Doc } from "@/lib/api";
import { queryKeys } from "@/lib/queries";
import { useMatters } from "@/lib/matters-context";
import { formatShortDate } from "@/lib/format";

const COLUMN_FORMATS = [
  { value: "", label: "Free text" },
  { value: "yes_no", label: "Yes / No" },
  { value: "currency", label: "Currency" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "percentage", label: "Percentage" },
  { value: "tag", label: "Tag" },
  { value: "bulleted_list", label: "Bulleted list" },
] as const;

const NO_TEMPLATE = "none";

export function CreateReviewDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const qc = useQueryClient();
  const { matters } = useMatters();

  const { data: docs = [] } = useQuery({
    queryKey: queryKeys.documents,
    queryFn: () => api.listDocuments(),
  });
  const { data: workflows = [] } = useQuery({
    queryKey: ["workflows"],
    queryFn: () => api.listWorkflows(),
  });
  const tabularWorkflows = workflows.filter((w) => w.type === "tabular");

  const [title, setTitle] = useState("");
  const [workflowId, setWorkflowId] = useState(NO_TEMPLATE);
  const [underMatter, setUnderMatter] = useState(false);
  const [matterId, setMatterId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [columns, setColumns] = useState<Column[]>([{ index: 0, name: "", prompt: "" }]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset the form whenever the dialog reopens.
  useEffect(() => {
    if (!open) return;
    setTitle("");
    setWorkflowId(NO_TEMPLATE);
    setUnderMatter(false);
    setMatterId("");
    setSelected(new Set());
    setColumns([{ index: 0, name: "", prompt: "" }]);
  }, [open]);

  const toggleDoc = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const allChecked = docs.length > 0 && docs.every((d) => selected.has(d.id));
  const selectAll = () =>
    setSelected((s) => {
      if (allChecked) {
        const n = new Set(s);
        docs.forEach((d) => n.delete(d.id));
        return n;
      }
      return new Set([...s, ...docs.map((d) => d.id)]);
    });

  function setCol(i: number, patch: Partial<Column>) {
    setColumns((cols) => cols.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map((f) => api.uploadDocument(f, undefined, underMatter ? matterId : undefined))
      );
      void qc.invalidateQueries({ queryKey: queryKeys.documents });
      setSelected((s) => new Set([...s, ...uploaded.map((d) => d.id)]));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const createMutation = useMutation({
    mutationFn: (d: Parameters<typeof api.createReview>[0]) => api.createReview(d),
    onSuccess: ({ id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.reviews });
      onOpenChange(false);
      onCreated(id);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function create() {
    const cols = columns
      .filter((c) => c.name.trim() && c.prompt.trim())
      .map((c, i) => ({ ...c, index: i }));
    if (!title.trim() || !selected.size || !cols.length) {
      return toast.error("Need a title, at least one document, and one column");
    }
    if (underMatter && !matterId) return toast.error("Select a matter");
    createMutation.mutate({
      title: title.trim(),
      columnsConfig: cols,
      documentIds: [...selected],
      matterId: underMatter ? matterId : undefined,
    });
  }

  const canCreate = !!title.trim() && (!underMatter || !!matterId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
        {/* Breadcrumb header */}
        <div className="flex items-center gap-1.5 border-b border-border px-6 py-4 text-sm text-muted-foreground">
          <span>Tabular reviews</span>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">New tabular review</span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-section overflow-y-auto px-6 py-5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Review name"
            autoFocus
            className="w-full bg-transparent font-serif text-2xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />

          {/* Workflow template */}
          <div className="flex flex-col gap-field">
            <Label>Workflow template</Label>
            <Select value={workflowId} onValueChange={(v) => setWorkflowId(v as string)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TEMPLATE}>No template — start from scratch</SelectItem>
                {tabularWorkflows.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Create under a matter */}
          <div className="flex flex-col gap-field">
            <label className="flex w-fit items-center gap-2.5">
              <Switch
                checked={underMatter}
                onCheckedChange={(c) => {
                  setUnderMatter(c);
                  if (!c) setMatterId("");
                }}
              />
              <span className="text-sm">Create under a matter</span>
            </label>
            {underMatter && (
              <Select value={matterId} onValueChange={(v) => setMatterId(v as string)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select matter…" />
                </SelectTrigger>
                <SelectContent>
                  {matters.map((m) => (
                    <SelectItem key={m.matter.id} value={m.matter.id}>
                      {m.matter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Document directory — scrolls internally past a few rows */}
          <div className="flex flex-col gap-field">
            <Label>Select documents</Label>
            <div className="flex flex-col overflow-hidden rounded-lg border border-border">
              <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2 text-sm text-muted-foreground">
                <span>Documents</span>
                {docs.length > 0 && (
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {allChecked ? "Clear all" : "Select all"}
                  </button>
                )}
              </div>
              <div className="max-h-56 overflow-y-auto">
                {docs.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-muted-foreground">No documents yet.</p>
                ) : (
                  docs.map((d, i) => (
                    <DocRow
                      key={d.id}
                      doc={d}
                      checked={selected.has(d.id)}
                      onToggle={() => toggleDoc(d.id)}
                      topBorder={i > 0}
                    />
                  ))
                )}

                {matters.length > 0 && (
                  <>
                    <div className="border-t border-border px-3 py-2 text-sm text-muted-foreground">
                      Matters
                    </div>
                    {matters.map((m) => (
                      <MatterFolder
                        key={m.matter.id}
                        matterId={m.matter.id}
                        name={m.matter.name}
                        selected={selected}
                        onToggle={toggleDoc}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Columns */}
          <div className="flex flex-col gap-2">
            <Label>Columns</Label>
            <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
              {columns.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    className="w-40"
                    placeholder="Name"
                    value={c.name}
                    onChange={(e) => setCol(i, { name: e.target.value })}
                  />
                  <Input
                    className="flex-1"
                    placeholder="Extraction prompt"
                    value={c.prompt}
                    onChange={(e) => setCol(i, { prompt: e.target.value })}
                  />
                  <select
                    className="h-9 w-32 rounded-md border border-input bg-background px-2 text-sm"
                    value={c.format ?? ""}
                    onChange={(e) => setCol(i, { format: e.target.value || undefined })}
                  >
                    {COLUMN_FORMATS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() =>
                setColumns((cols) => [...cols, { index: cols.length, name: "", prompt: "" }])
              }
            >
              + Add column
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.doc"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {uploading ? "Uploading…" : "Upload"}
          </Button>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={create}
              disabled={!canCreate || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DocRow({
  doc,
  checked,
  onToggle,
  indent = false,
  topBorder = true,
}: {
  doc: Doc;
  checked: boolean;
  onToggle: () => void;
  indent?: boolean;
  topBorder?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/50 ${topBorder ? "border-t border-border" : ""} ${indent ? "pl-9" : ""}`}
    >
      <Checkbox checked={checked} onChange={onToggle} aria-label={`Select ${doc.title}`} />
      <FileText className="size-4 shrink-0 text-bronze" />
      <span className="min-w-0 flex-1 truncate">{doc.title}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{formatShortDate(doc.createdAt)}</span>
    </label>
  );
}

// Lazy-loads its documents only when expanded.
function MatterFolder({
  matterId,
  name,
  selected,
  onToggle,
}: {
  matterId: string;
  name: string;
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["matter-documents", matterId],
    queryFn: () => api.listMatterDocuments(matterId),
    enabled: open,
  });

  return (
    <div className="border-t border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted/50"
      >
        <ChevronRight
          className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
        />
        <Folder className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-start">{name}</span>
      </button>
      {open &&
        (isLoading ? (
          <p className="px-9 py-2 text-xs text-muted-foreground">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="px-9 py-2 text-xs text-muted-foreground">No documents.</p>
        ) : (
          docs.map((d) => (
            <DocRow
              key={d.id}
              doc={d}
              checked={selected.has(d.id)}
              onToggle={() => onToggle(d.id)}
              indent
            />
          ))
        ))}
    </div>
  );
}
