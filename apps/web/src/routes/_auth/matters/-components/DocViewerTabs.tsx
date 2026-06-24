import { useQuery } from "@tanstack/react-query";
import { FileText, X } from "lucide-react";
import { cn } from "@/lib/util/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { DocxView } from "../../documents/-components/DocxView";
import { api } from "../../../../lib/data/api";

export type DocTab = { docId: string; title: string };

/**
 * The center pane of the matter workspace — a Chrome-style strip of open
 * documents over a viewer. Documents open here from the explorer (left) or from
 * the assistant's generated-document cards (right).
 */
export function DocViewerTabs({
  tabs,
  activeId,
  onSwitch,
  onClose,
}: {
  tabs: DocTab[];
  activeId: string | null;
  onSwitch: (docId: string) => void;
  onClose: (docId: string) => void;
}) {
  const active = tabs.find((t) => t.docId === activeId) ?? null;
  return (
    <div className="flex min-w-0 flex-1 flex-col border-e border-border">
      {/* Tab strip */}
      <div className="flex h-10 shrink-0 [scrollbar-width:none] items-end overflow-x-auto border-b border-border [&::-webkit-scrollbar]:hidden">
        {tabs.length === 0 ? (
          <span className="self-center px-4 text-xs text-muted-foreground">Document Viewer</span>
        ) : (
          tabs.map((tab) => {
            const isActive = tab.docId === activeId;
            return (
              <div
                key={tab.docId}
                onClick={() => onSwitch(tab.docId)}
                className={cn(
                  "group flex h-full max-w-[240px] shrink-0 cursor-pointer items-center gap-1.5 border-e border-border px-3 transition-colors",
                  isActive ? "bg-muted" : "bg-card hover:bg-muted/50"
                )}
              >
                <FileText className="size-3.5 shrink-0 text-destructive" />
                <span
                  className={cn(
                    "truncate text-xs",
                    isActive ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {tab.title}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.docId);
                  }}
                  className="shrink-0 text-muted-foreground/60 transition-colors hover:text-foreground"
                  title="Close tab"
                  aria-label="Close tab"
                >
                  <X className="size-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/30">
        {active ? (
          <DocPane key={active.docId} docId={active.docId} />
        ) : (
          <div className="flex h-full items-center justify-center px-8">
            <div className="space-y-3 text-center">
              <p className="font-serif text-xl text-foreground">
                Click a document to display it here.
              </p>
              <p className="font-serif text-base text-muted-foreground">
                Open files from the Explorer, or open documents the assistant creates.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Renders one document — DOCX (tracked changes), PDF, or extracted text. */
function DocPane({ docId }: { docId: string }) {
  const { data } = useQuery({
    queryKey: ["document", docId],
    queryFn: () => api.getDocumentDetail(docId),
  });

  if (!data) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="min-h-0 w-full flex-1" />
      </div>
    );
  }

  const { document: doc } = data;
  const isDocx = doc.fileType === "docx" && !!doc.currentVersionId;
  const isPdf = doc.fileType.includes("pdf") && !!doc.currentVersionId;

  if (isPdf) {
    return (
      <iframe
        title={doc.title}
        src={`${api.documentDownloadUrl(docId)}?inline=1`}
        className="min-h-0 flex-1 border-0"
      />
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="p-6">
        {isDocx ? (
          <DocxView url={api.documentDownloadUrl(docId)} versionToken={doc.currentVersionId} />
        ) : doc.markdown ? (
          <pre className="max-w-[70ch] font-serif text-base leading-relaxed whitespace-pre-wrap">
            {doc.markdown}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">
            {doc.status === "ready" ? "No text extracted." : "Text is still being extracted…"}
          </p>
        )}
      </div>
    </ScrollArea>
  );
}
