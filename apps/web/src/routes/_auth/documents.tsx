import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import Fuse from "fuse.js";
import { ChevronDown, ChevronsUpDown, ChevronUp, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { api, type Doc } from "../../lib/api";
import { queryKeys } from "../../lib/queries";
import { useTableVirtualizer } from "../../lib/useTableVirtualizer";
import { useWorkingMatterId } from "../../lib/matters-context";

export const Route = createFileRoute("/_auth/documents")({
  component: Documents,
  // ?view filters by extraction status (set from the sidebar): all | ready |
  // processing (pending+processing) | failed.
  validateSearch: (s: Record<string, unknown>): { view?: string } => ({
    view: typeof s.view === "string" ? s.view : undefined,
  }),
});

// Map a sidebar view to the doc statuses it shows.
function matchesView(status: Doc["status"], view: string): boolean {
  if (view === "all") return true;
  if (view === "processing") return status === "pending" || status === "processing";
  return status === view;
}

const columnHelper = createColumnHelper<Doc>();

function Documents() {
  const qc = useQueryClient();
  const matterId = useWorkingMatterId();
  const { view = "all" } = Route.useSearch();
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  // Extraction runs in a background worker; poll while anything is in flight.
  const { data: docs = [] } = useQuery({
    queryKey: queryKeys.documents,
    queryFn: () => api.listDocuments(),
    refetchInterval: (q) =>
      q.state.data?.some((d) => d.status === "pending" || d.status === "processing") ? 2000 : false,
  });
  const invalidateDocs = () => qc.invalidateQueries({ queryKey: queryKeys.documents });

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.retryDocument(id),
    onSuccess: () => invalidateDocs(),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Retry failed"),
  });

  const uploadMutation = useMutation({
    mutationFn: (f: File) => api.uploadDocument(f, undefined, matterId),
    // Refresh after each so finished uploads appear as they complete.
    onSuccess: () => invalidateDocs(),
  });

  const accepts = (f: File) => /\.(pdf|docx?)$/i.test(f.name);

  async function uploadFiles(files: File[]) {
    const ok = files.filter(accepts);
    if (!ok.length) {
      if (files.length) toast.error("Only PDF or DOCX files are supported");
      return;
    }
    setUploading(true);
    try {
      // Only files that finish uploading land in the table (server inserts the
      // row after the object is stored).
      for (const f of ok) {
        await uploadMutation.mutateAsync(f);
      }
      toast.success(`Uploaded ${ok.length} file${ok.length > 1 ? "s" : ""} — extracting…`);
    } catch (err) {
      void invalidateDocs();
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file
    void uploadFiles(files);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    void uploadFiles(Array.from(e.dataTransfer.files));
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Title",
        cell: (c) => <span className="font-medium">{c.getValue()}</span>,
      }),
      columnHelper.accessor("fileType", {
        header: "Type",
        cell: (c) => (
          <span className="text-muted-foreground uppercase">{fileTypeLabel(c.getValue())}</span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (c) => <StatusBadge status={c.getValue()} />,
      }),
      columnHelper.accessor("createdAt", {
        header: "Added",
        cell: (c) => (
          <span className="text-muted-foreground">
            {new Date(c.getValue()).toLocaleDateString()}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (c) =>
          c.row.original.status === "failed" ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              title={c.row.original.extractionError ?? undefined}
              onClick={() => retryMutation.mutate(c.row.original.id)}
            >
              Retry
            </Button>
          ) : null,
      }),
    ],
    []
  );

  const fuse = useMemo(
    () => new Fuse(docs, { keys: ["title", "fileType"], threshold: 0.4 }),
    [docs]
  );
  const rows = (query.trim() ? fuse.search(query).map((r) => r.item) : docs).filter((d) =>
    matchesView(d.status, view)
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const tableRows = table.getRowModel().rows;
  const { scrollRef, virtualizer, items, paddingTop, paddingBottom } =
    useTableVirtualizer(tableRows);

  return (
    <div
      className="relative flex flex-col gap-section"
      onDragEnter={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={onDrop}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5 text-sm font-medium text-primary">
          Drop files to upload
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc"
        className="hidden"
        onChange={onPick}
      />
      <PageHeader
        title="Documents"
        description="Upload or paste source documents. Text is extracted to markdown for review and chat."
        action={
          <Button disabled={uploading} onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" />
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        }
      />

      {docs.length > 0 && (
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents…"
        />
      )}

      {docs.length > 0 && (
        <div ref={scrollRef} className="max-h-[70vh] overflow-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => {
                    const dir = header.column.getIsSorted();
                    const canSort = header.column.getCanSort();
                    const Icon = !dir ? ChevronsUpDown : dir === "asc" ? ChevronUp : ChevronDown;
                    return (
                      <TableHead key={header.id}>
                        {canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="-mx-1 flex items-center gap-1 rounded px-1 hover:text-foreground"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <Icon
                              className={cn(
                                "size-3.5",
                                dir ? "text-foreground" : "text-muted-foreground/50"
                              )}
                            />
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {paddingTop > 0 && (
                <tr>
                  <td colSpan={columns.length} style={{ height: paddingTop }} />
                </tr>
              )}
              {items.map((item) => {
                const row = tableRows[item.index]!;
                return (
                  <TableRow key={row.id} data-index={item.index} ref={virtualizer.measureElement}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
              {paddingBottom > 0 && (
                <tr>
                  <td colSpan={columns.length} style={{ height: paddingBottom }} />
                </tr>
              )}
              {!tableRows.length && (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="py-section text-center text-muted-foreground"
                  >
                    No documents match "{query}".
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      {!docs.length && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-section text-center text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
        >
          <Upload className="size-5" />
          Drop files here or click to upload. PDF or DOCX.
        </button>
      )}
    </div>
  );
}

function fileTypeLabel(fileType: string) {
  if (fileType.includes("pdf")) return "PDF";
  if (fileType.includes("word") || fileType.includes("docx") || fileType.includes("doc"))
    return "DOCX";
  if (fileType.includes("markdown") || fileType.includes("md")) return "MD";
  return fileType.split("/").pop() ?? fileType;
}

function StatusBadge({ status }: { status: Doc["status"] }) {
  const map: Record<Doc["status"], { label: string; cls: string }> = {
    pending: { label: "Queued", cls: "bg-muted text-muted-foreground" },
    processing: { label: "Extracting…", cls: "bg-blue-100 text-blue-700" },
    ready: { label: "Ready", cls: "bg-green-100 text-green-700" },
    failed: { label: "Failed", cls: "bg-red-100 text-red-700" },
  };
  const { label, cls } = map[status];
  return <span className={`rounded px-1.5 py-0.5 text-xs ${cls}`}>{label}</span>;
}
