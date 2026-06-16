import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/util/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, type Doc, type Folder } from "../../../../lib/data/api";

/**
 * Left pane of the matter workspace — a navigable file explorer over the
 * matter's folders and documents. Clicking a document opens it in the center
 * viewer; uploads and new folders land in the current folder.
 */
export function MatterExplorer({
  matterId,
  canEdit,
  selectedDocId,
  onOpenDoc,
  onCollapse,
}: {
  matterId: string;
  canEdit: boolean;
  selectedDocId: string | null;
  onOpenDoc: (doc: Doc) => void;
  onCollapse: () => void;
}) {
  const qc = useQueryClient();
  const [folderId, setFolderId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: folders = [] } = useQuery({
    queryKey: ["folders", matterId],
    queryFn: () => api.listFolders(matterId),
  });
  const { data: docs = [] } = useQuery({
    queryKey: ["matter-docs", matterId, folderId],
    queryFn: () => api.listMatterDocuments(matterId, folderId),
    refetchInterval: (q) =>
      q.state.data?.some((d) => d.status === "pending" || d.status === "processing") ? 2000 : false,
  });

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadDocument(file, undefined, matterId, folderId),
    onSuccess: () => {
      toast.success("Uploaded — extracting…");
      void qc.invalidateQueries({ queryKey: ["matter-docs", matterId, folderId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const addFolder = useMutation({
    mutationFn: (name: string) => api.createFolder(matterId, name, folderId),
    onSuccess: () => {
      toast.success("Folder added");
      void qc.invalidateQueries({ queryKey: ["folders", matterId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const subfolders = folders.filter((f: Folder) => f.parentFolderId === (folderId ?? null));
  const current = folders.find((f) => f.id === folderId) ?? null;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-xs text-muted-foreground">Explorer</span>
        <div className="flex items-center gap-0.5">
          {canEdit && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.doc"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload.mutate(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                tooltip="Add subfolder"
                onClick={() => {
                  const name = window.prompt("Folder name");
                  if (name?.trim()) addFolder.mutate(name.trim());
                }}
              >
                <FolderPlus className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                tooltip="Upload documents"
                disabled={upload.isPending}
                onClick={() => fileRef.current?.click()}
              >
                {upload.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon-sm" tooltip="Collapse explorer" onClick={onCollapse}>
            <ChevronLeft className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Breadcrumb when inside a subfolder */}
      {current && (
        <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
          <button onClick={() => setFolderId(null)} className="hover:text-foreground">
            All
          </button>
          <span className="text-border">›</span>
          <span className="truncate text-foreground">{current.name}</span>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col py-1">
          {subfolders.map((f) => (
            <button
              key={f.id}
              onClick={() => setFolderId(f.id)}
              className="flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/50"
            >
              <FolderIcon className="size-4 shrink-0 text-bronze" />
              <span className="truncate">{f.name}</span>
            </button>
          ))}
          {docs.map((d: Doc) => (
            <button
              key={d.id}
              onClick={() => onOpenDoc(d)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/50",
                selectedDocId === d.id && "bg-muted"
              )}
            >
              <FileText className="size-4 shrink-0 text-destructive" />
              <span className="min-w-0 flex-1 truncate">{d.title}</span>
              {(d.status === "pending" || d.status === "processing") && (
                <Loader2 className="size-3 shrink-0 animate-spin text-muted-foreground" />
              )}
            </button>
          ))}
          {!subfolders.length && !docs.length && (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">No documents yet.</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
