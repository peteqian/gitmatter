import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { api, type Column, type Doc } from "../../lib/api";
import { queryKeys } from "../../lib/queries";
import { useWorkingMatterId } from "../../lib/matters-context";

export const Route = createFileRoute("/_auth/reviews")({ component: Reviews });

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

function Reviews() {
  const router = useRouter();
  const { data: reviews = [] } = useQuery({
    queryKey: queryKeys.reviews,
    queryFn: () => api.listReviews(),
  });
  const { data: docs = [] } = useQuery({
    queryKey: queryKeys.documents,
    queryFn: () => api.listDocuments(),
  });
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const shown = reviews.filter((r) =>
    (r.title ?? "").toLowerCase().includes(query.trim().toLowerCase())
  );
  const allChecked = shown.length > 0 && shown.every((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="flex flex-col gap-stack">
      <PageHeader
        title="Tabular reviews"
        action={
          <Button
            variant="outline"
            size="icon-sm"
            className="rounded-full"
            title="New review"
            aria-label="New review"
            onClick={() => setCreating((v) => !v)}
          >
            <Plus className="size-4" />
          </Button>
        }
      />

      {creating && (
        <CreateReview
          docs={docs}
          onCreated={(id) => router.navigate({ to: "/reviews/$id", params: { id } })}
        />
      )}

      <div className="flex h-10 items-center justify-end border-b border-border">
        <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2.5">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reviews…"
            className="h-7 w-48 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allChecked}
                  onChange={() =>
                    setSelected(allChecked ? new Set() : new Set(shown.map((r) => r.id)))
                  }
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r) => (
              <TableRow
                key={r.id}
                data-state={selected.has(r.id) ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => router.navigate({ to: "/reviews/$id", params: { id: r.id } })}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(r.id)}
                    onChange={() => toggle(r.id)}
                    aria-label={`Select ${r.title}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell className="text-muted-foreground">{r.documentIds.length}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
              </TableRow>
            ))}
            {!shown.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                  No reviews yet. Start one from a contract or ask the assistant.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CreateReview({ docs, onCreated }: { docs: Doc[]; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const matterId = useWorkingMatterId();
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [columns, setColumns] = useState<Column[]>([{ index: 0, name: "", prompt: "" }]);

  function setCol(i: number, patch: Partial<Column>) {
    setColumns((cols) => cols.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  const createMutation = useMutation({
    mutationFn: (d: Parameters<typeof api.createReview>[0]) => api.createReview(d),
    onSuccess: ({ id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.reviews });
      onCreated(id);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  function create() {
    const cols = columns
      .filter((c) => c.name.trim() && c.prompt.trim())
      .map((c, i) => ({ ...c, index: i }));
    if (!title.trim() || !selected.length || !cols.length) {
      return toast.error("Need a title, at least one document, and one column");
    }
    createMutation.mutate({
      title: title.trim(),
      columnsConfig: cols,
      documentIds: selected,
      matterId,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New review</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-stack">
        <div className="flex flex-col gap-field">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Q3 NDAs" />
        </div>

        <div className="flex flex-col gap-field">
          <Label>Documents</Label>
          {!docs.length && (
            <p className="text-sm text-muted-foreground">
              No documents.{" "}
              <Link to="/documents" className="underline">
                Add one first
              </Link>
              .
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {docs.map((d) => {
              const on = selected.includes(d.id);
              return (
                <Button
                  key={d.id}
                  type="button"
                  size="sm"
                  variant={on ? "default" : "outline"}
                  onClick={() =>
                    setSelected((s) => (on ? s.filter((x) => x !== d.id) : [...s, d.id]))
                  }
                >
                  {d.title}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Columns</Label>
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

        <Button onClick={create} disabled={createMutation.isPending} className="self-start">
          {createMutation.isPending ? "Creating…" : "Create review"}
        </Button>
      </CardContent>
    </Card>
  );
}
