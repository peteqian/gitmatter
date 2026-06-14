import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { Loader2, RotateCcw, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { TablePager } from "@/components/TablePager";
import { api, type Doc } from "../../lib/api";
import { queryKeys } from "../../lib/queries";
import { useColumnSizing } from "../../lib/useColumnSizing";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { useWorkingMatterId } from "../../lib/matters-context";

export const Route = createFileRoute("/_auth/documents")({
  component: Documents,
  // ?view filters by extraction status (set from the sidebar): all | ready |
  // processing (pending+processing) | failed.
  validateSearch: (s: Record<string, unknown>): { view?: string } => ({
    view: typeof s.view === "string" ? s.view : undefined,
  }),
});

const columnHelper = createColumnHelper<Doc>();

function Documents() {
  const qc = useQueryClient();
  const router = useRouter();
  const matterId = useWorkingMatterId();
  const { view = "all" } = Route.useSearch();
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
  const [rowSelection, setRowSelection] = useState({});
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const search = useDebouncedValue(query, 300);
  const sort = sorting[0];
  const pageParams = {
    q: search,
    status: view,
    page: pagination.pageIndex,
    pageSize: pagination.pageSize,
    sort: sort?.id,
    dir: sort?.desc ? "desc" : "asc",
  } as const;

  useEffect(() => {
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, [search, sort?.desc, sort?.id, view]);

  // Extraction runs in a background worker; poll while anything is in flight.
  const { data, isPending } = useQuery({
    queryKey: queryKeys.documentsPage(pageParams),
    queryFn: () => api.listDocumentsPage(pageParams),
    placeholderData: keepPreviousData,
    refetchInterval: (q) =>
      q.state.data?.rows.some((d) => d.status === "pending" || d.status === "processing")
        ? 2000
        : false,
  });
  const docs = data?.rows ?? [];
  const rowCount = data?.rowCount ?? 0;
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
      setPagination((current) => ({ ...current, pageIndex: 0 }));
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
      columnHelper.display({
        id: "select",
        size: 44,
        enableResizing: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select row"
          />
        ),
      }),
      columnHelper.accessor("title", {
        header: "Title",
        size: 360,
        cell: (c) => <span className="block truncate font-medium">{c.getValue()}</span>,
      }),
      columnHelper.accessor("fileType", {
        header: "Type",
        size: 90,
        cell: (c) => (
          <span className="text-muted-foreground uppercase">{fileTypeLabel(c.getValue())}</span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        size: 110,
        cell: (c) => <StatusBadge status={c.getValue()} />,
      }),
      columnHelper.accessor("createdAt", {
        header: "Added",
        size: 130,
        cell: (c) => (
          <span className="text-muted-foreground">
            {new Date(c.getValue()).toLocaleDateString()}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        size: 64,
        enableResizing: false,
        cell: (c) =>
          c.row.original.status === "failed" ? (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              title={
                c.row.original.extractionError
                  ? `Retry — ${c.row.original.extractionError}`
                  : "Retry"
              }
              aria-label="Retry extraction"
              onClick={(e) => {
                e.stopPropagation();
                retryMutation.mutate(c.row.original.id);
              }}
            >
              <RotateCcw className="size-4" />
            </Button>
          ) : null,
      }),
    ],
    []
  );

  const { columnSizing, onColumnSizingChange } = useColumnSizing("documents");

  const table = useReactTable({
    data: docs,
    columns,
    rowCount,
    getRowId: (row) => row.id,
    state: { sorting, pagination, rowSelection, columnSizing },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onColumnSizingChange,
    manualFiltering: true,
    manualPagination: true,
    manualSorting: true,
    enableRowSelection: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
  });
  const showTable = docs.length > 0 || rowCount > 0 || query.trim().length > 0 || view !== "all";

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col gap-stack"
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
        action={
          <Button disabled={uploading} onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" />
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        }
      />

      {showTable && (
        <div className="flex h-10 items-center justify-end border-b border-border">
          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2.5">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents…"
              className="h-7 w-48 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      )}

      {showTable && (
        <>
          <DataTable
            table={table}
            onRowClick={(doc) => router.navigate({ to: "/documents/$id", params: { id: doc.id } })}
            empty={query.trim() ? `No documents match "${query}".` : "No documents in this view."}
          />
          <TablePager table={table} />
        </>
      )}
      {isPending ? (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : (
        !showTable && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border py-section text-center text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground"
          >
            <Upload className="size-5" />
            Drop files here or click to upload. PDF or DOCX.
          </button>
        )
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
    failed: { label: "Failed", cls: "bg-destructive-surface text-destructive" },
  };
  const { label, cls } = map[status];
  return <span className={`rounded px-1.5 py-0.5 text-xs ${cls}`}>{label}</span>;
}
