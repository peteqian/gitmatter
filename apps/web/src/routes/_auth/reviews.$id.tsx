import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ActorBadge } from "@/components/ActorBadge";
import { CommitHistory } from "@/components/CommitHistory";
import { ModelPicker } from "@/components/ModelPicker";
import { api, type Blame, type Cell } from "../../lib/api";
import { queryKeys } from "../../lib/queries";
import { useTableVirtualizer } from "../../lib/useTableVirtualizer";
import { useSelectedModel } from "../../lib/useSelectedModel";

export const Route = createFileRoute("/_auth/reviews/$id")({ component: ReviewView });

const FLAG_COLOR: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
  grey: "bg-muted-foreground/50",
};

function ReviewView() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const reviewKey = ["review", id];
  const { data } = useQuery({ queryKey: reviewKey, queryFn: () => api.getReview(id) });
  const { data: docs = [] } = useQuery({
    queryKey: queryKeys.documents,
    queryFn: () => api.listDocuments(),
  });
  const { data: history = [] } = useQuery({
    queryKey: ["review-history", id],
    queryFn: () => api.history(id),
  });
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [model, setModel] = useSelectedModel();

  const runMutation = useMutation({
    mutationFn: (v: { documentId: string; columnIndex: number }) =>
      api.runCell(id, v.documentId, v.columnIndex, model || undefined),
    onSuccess: (updated) => {
      qc.setQueryData(reviewKey, updated);
      void qc.invalidateQueries({ queryKey: ["review-history", id] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Run failed"),
  });

  const review = data?.review;
  const cells = data?.cells;
  const docTitle = (docId: string) => docs.find((d) => d.id === docId)?.title ?? docId.slice(0, 8);
  const cellOf = (docId: string, col: number): Cell | undefined =>
    cells?.find((c) => c.documentId === docId && c.columnIndex === col);

  async function run(documentId: string, columnIndex: number) {
    const key = `${documentId}:${columnIndex}`;
    setRunning((s) => new Set(s).add(key));
    try {
      // Errors surface via the mutation's onError toast; swallow so runAll continues.
      await runMutation.mutateAsync({ documentId, columnIndex }).catch(() => {});
    } finally {
      setRunning((s) => {
        const n = new Set(s);
        n.delete(key);
        return n;
      });
    }
  }

  async function runAll() {
    if (!review) return;
    for (const docId of review.documentIds) {
      for (const col of review.columnsConfig) {
        await run(docId, col.index);
      }
    }
  }

  // Each document is a row; the columns are a fixed "Document" label plus one
  // per configured extraction column. Cell rendering reads run state through
  // the table meta so column identity stays stable across runs.
  const tableData = useMemo<ReviewRow[]>(
    () => (review?.documentIds ?? []).map((docId) => ({ docId, title: docTitle(docId) })),
    // docTitle depends on docs; recompute when either changes.
    [review, docs] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const columns = useMemo<ColumnDef<ReviewRow>[]>(() => {
    const cols: ColumnDef<ReviewRow>[] = [
      {
        id: "document",
        header: "Document",
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
      },
    ];
    for (const col of review?.columnsConfig ?? []) {
      cols.push({
        id: `col-${col.index}`,
        header: col.name,
        cell: ({ row, table }) => {
          const meta = table.options.meta as ReviewMeta;
          const key = `${row.original.docId}:${col.index}`;
          return (
            <ReviewCell
              cell={meta.cellOf(row.original.docId, col.index)}
              busy={meta.running.has(key)}
              onRun={() => meta.run(row.original.docId, col.index)}
            />
          );
        },
      });
    }
    return cols;
  }, [review]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    meta: { run, running, cellOf } satisfies ReviewMeta,
  });

  const tableRows = table.getRowModel().rows;
  // Cells can be tall (multi-line summaries); estimate generously, measured per row.
  const { scrollRef, virtualizer, items, paddingTop, paddingBottom } = useTableVirtualizer(
    tableRows,
    72
  );

  if (!data || !review)
    return (
      <div className="grid gap-6 pt-6 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-72 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );

  return (
    <div className="grid gap-6 pt-6 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h1 className="text-2xl tracking-tight">{review.title}</h1>
          <div className="flex items-center gap-2">
            <ModelPicker value={model} onChange={setModel} />
            <a href={api.reviewExportUrl(id, "csv")}>
              <Button size="sm" variant="outline">
                CSV
              </Button>
            </a>
            <a href={api.reviewExportUrl(id, "xlsx")}>
              <Button size="sm" variant="outline">
                XLSX
              </Button>
            </a>
            <Button size="sm" onClick={runAll}>
              Run all cells
            </Button>
          </div>
        </div>

        <div ref={scrollRef} className="max-h-[70vh] overflow-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={header.id === "document" ? "w-40" : undefined}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
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
                      <TableCell key={cell.id} className="align-top">
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
            </TableBody>
          </Table>
        </div>
      </div>

      <aside>
        <h2 className="mb-2 text-sm font-semibold">History</h2>
        <CommitHistory commits={history} />
      </aside>
    </div>
  );
}

type ReviewRow = { docId: string; title: string };

type ReviewMeta = {
  run: (docId: string, columnIndex: number) => void;
  running: Set<string>;
  cellOf: (docId: string, columnIndex: number) => Cell | undefined;
};

// One matrix cell: extraction result with a flag dot + blame, or a Run button.
function ReviewCell({ cell, busy, onRun }: { cell?: Cell; busy: boolean; onRun: () => void }) {
  if (!cell?.content)
    return (
      <Button size="xs" variant="outline" disabled={busy} onClick={onRun}>
        {busy ? "Running…" : "Run"}
      </Button>
    );
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-2">
        <span
          className={`mt-1.5 size-2 shrink-0 rounded-full ${FLAG_COLOR[cell.content.flag] ?? "bg-muted-foreground/50"}`}
        />
        <span className="text-sm">{cell.content.summary}</span>
      </div>
      <div className="flex items-center gap-2">
        {cell.blame && <BlamePopover blame={cell.blame} />}
        <Button size="xs" variant="ghost" disabled={busy} onClick={onRun}>
          {busy ? "…" : "Re-run"}
        </Button>
      </div>
    </div>
  );
}

function BlamePopover({ blame }: { blame: Blame }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            blame #{blame.seq}
          </button>
        }
      />
      <PopoverContent className="w-64 text-xs">
        <div className="flex items-center gap-2">
          <ActorBadge actorType={blame.actorType} agentLabel={blame.agentLabel} />
          <span className="font-mono">{blame.op}</span>
        </div>
        <p className="mt-1">{blame.message}</p>
        <p className="mt-0.5 text-muted-foreground">{new Date(blame.createdAt).toLocaleString()}</p>
      </PopoverContent>
    </Popover>
  );
}
