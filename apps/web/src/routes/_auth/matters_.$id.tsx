import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  FolderPlus,
  MessageSquarePlus,
  MoreHorizontal,
  Search,
  TableProperties,
  Upload,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PageHeader } from "@/components/PageHeader";
import { StateCue } from "@/components/StateCue";
import { ToolbarTabs } from "@/components/ToolbarTabs";
import { VersionChip } from "@/components/VersionChip";
import { PeopleModal } from "@/components/PeopleModal";
import { api, type Doc, type Folder } from "../../lib/api";
import { useChats } from "../../lib/queries";
import { useSession } from "../../lib/auth-client";
import { useMatters } from "../../lib/matters-context";

export const Route = createFileRoute("/_auth/matters_/$id")({ component: MatterWorkspace });

type Tab = "documents" | "chats" | "reviews";

function MatterWorkspace() {
  const { id } = useParams({ from: "/_auth/matters_/$id" });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: session } = useSession();
  const { refresh: refreshMatters, setCurrent } = useMatters();
  const [tab, setTab] = useState<Tab>("documents");
  const [peopleOpen, setPeopleOpen] = useState(false);

  // New Chat / New Review file under this matter — set it working, then route out.
  const openInMatter = (to: "/assistant" | "/reviews") => {
    setCurrent(id);
    void navigate({ to });
  };

  const { data: matter, isError: notFound } = useQuery({
    queryKey: ["matter", id],
    queryFn: () => api.getMatter(id),
  });
  const { data: members = [] } = useQuery({
    queryKey: ["matter-people", id],
    queryFn: () => api.getMatterPeople(id),
  });

  const closeMutation = useMutation({
    mutationFn: () => api.closeMatter(id),
    onSuccess: () => {
      toast.success("Matter closed");
      void qc.invalidateQueries({ queryKey: ["matter", id] });
      refreshMatters();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  if (notFound)
    return (
      <p className="text-muted-foreground">
        Matter not found, or you don't have access.{" "}
        <Link to="/matters" className="underline">
          Back to matters
        </Link>
      </p>
    );
  if (!matter) return null;

  const myRole = members.find((m) => m.userId === session?.user.id)?.role;
  const isOwner = myRole === "owner";

  return (
    <div className="flex flex-col gap-stack">
      {/* mike Image #1: inline "Matters › Name" trail + two action groups —
          a frosted icon pill (search / people / …) and New Chat / New Review. */}
      <PageHeader
        breadcrumbs={[{ label: "Matters", to: "/matters" }, { label: matter.name }]}
        actions={[
          <div key="icons" className="flex items-center gap-0.5 rounded-full glass-panel p-1">
            <Button
              variant="ghost"
              size="icon-sm"
              title="Search"
              aria-label="Search"
              onClick={() => setTab("documents")}
            >
              <Search className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="People"
              aria-label="People"
              onClick={() => setPeopleOpen(true)}
            >
              <Users className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" title="More" aria-label="More">
                    <MoreHorizontal className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={!matter.conflictCleared}>
                  {matter.conflictCleared ? "Conflicts cleared" : "Conflicts pending"}
                </DropdownMenuItem>
                {isOwner && matter.status === "active" && (
                  <DropdownMenuItem onClick={() => closeMutation.mutate()}>
                    Close matter
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>,
          <div key="create" className="flex items-center gap-0.5 rounded-full glass-panel p-1">
            <Button
              variant="ghost"
              size="icon-sm"
              title="New chat"
              aria-label="New chat"
              onClick={() => openInMatter("/assistant")}
            >
              <MessageSquarePlus className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              title="New review"
              aria-label="New review"
              onClick={() => openInMatter("/reviews")}
            >
              <TableProperties className="size-4" />
            </Button>
          </div>,
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        {matter.matterNumber && <Badge variant="secondary">No. {matter.matterNumber}</Badge>}
        <Badge variant="outline" className="capitalize">
          {matter.status}
        </Badge>
        {matter.conflictCleared ? (
          <StateCue tone="muted">Conflicts cleared</StateCue>
        ) : (
          <StateCue tone="bronze">Conflicts pending</StateCue>
        )}
      </div>

      <ToolbarTabs
        tabs={[
          { id: "documents" as const, label: "Documents" },
          { id: "chats" as const, label: "Assistant Chats" },
          { id: "reviews" as const, label: "Tabular Reviews" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "documents" && <DocumentsTab matterId={id} canEdit={myRole !== "viewer"} />}
      {tab === "chats" && <ChatsTab matterId={id} />}
      {tab === "reviews" && <ReviewsTab matterId={id} />}

      <PeopleModal
        matterId={id}
        matterName={matter.name}
        canManage={isOwner}
        open={peopleOpen}
        onOpenChange={setPeopleOpen}
      />
    </div>
  );
}

function fmtBytes(b: number | null): string {
  if (b == null) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DocumentsTab({ matterId, canEdit }: { matterId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const [folderId, setFolderId] = useState<string | null>(null); // null = root
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: folders = [] } = useQuery({
    queryKey: ["folders", matterId],
    queryFn: () => api.listFolders(matterId),
  });
  const { data: docs = [] } = useQuery({
    queryKey: ["matter-docs", matterId, folderId],
    queryFn: () => api.listMatterDocuments(matterId, folderId),
  });

  const invalidateDocs = () =>
    qc.invalidateQueries({ queryKey: ["matter-docs", matterId, folderId] });

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadDocument(file, undefined, matterId, folderId),
    onSuccess: () => {
      toast.success("Uploaded");
      void invalidateDocs();
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

  const rootFolders = folders.filter((f: Folder) => f.parentFolderId === (folderId ?? null));
  const filtered = docs.filter((d: Doc) => d.title.toLowerCase().includes(search.toLowerCase()));
  const current = folders.find((f) => f.id === folderId) ?? null;

  return (
    <div className="flex flex-col gap-stack">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <button onClick={() => setFolderId(null)} className="hover:text-foreground">
            All documents
          </button>
          {current && (
            <>
              <span className="text-border">›</span>
              <span className="text-foreground">{current.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-2.5">
            <Search className="size-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="h-8 w-40 bg-transparent text-sm outline-none"
            />
          </div>
          {canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const name = window.prompt("Folder name");
                  if (name?.trim()) addFolder.mutate(name.trim());
                }}
              >
                <FolderPlus className="size-4" /> Add Subfolder
              </Button>
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" /> Add Documents
              </Button>
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
            </>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filtered.length > 0 && filtered.every((d) => selected.has(d.id))}
                  onChange={() =>
                    setSelected((s) =>
                      filtered.every((d) => s.has(d.id))
                        ? new Set()
                        : new Set(filtered.map((d) => d.id))
                    )
                  }
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rootFolders.map((f) => (
              <TableRow key={f.id} className="cursor-pointer" onClick={() => setFolderId(f.id)}>
                <TableCell />
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    <FolderPlus className="size-4 text-bronze" /> {f.name}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">Folder</TableCell>
                <TableCell className="text-muted-foreground">—</TableCell>
                <TableCell className="text-muted-foreground">—</TableCell>
                <TableCell className="text-muted-foreground">{fmtDate(f.createdAt)}</TableCell>
                <TableCell />
              </TableRow>
            ))}
            {filtered.map((d: Doc) => (
              <TableRow key={d.id} data-state={selected.has(d.id) ? "selected" : undefined}>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(d.id)}
                    onChange={() =>
                      setSelected((s) => {
                        const n = new Set(s);
                        if (n.has(d.id)) n.delete(d.id);
                        else n.add(d.id);
                        return n;
                      })
                    }
                    aria-label={`Select ${d.title}`}
                  />
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <FileText className="size-4 text-destructive" /> {d.title}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground uppercase">{d.fileType}</TableCell>
                <TableCell className="text-muted-foreground">{fmtBytes(d.sizeBytes)}</TableCell>
                <TableCell>
                  <VersionChip n={1} />
                </TableCell>
                <TableCell className="text-muted-foreground">{fmtDate(d.createdAt)}</TableCell>
                <TableCell>
                  <DocStatusCue status={d.status} />
                </TableCell>
              </TableRow>
            ))}
            {!rootFolders.length && !filtered.length && (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No documents yet. {canEdit && "Add documents to get started."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DocStatusCue({ status }: { status: Doc["status"] }) {
  if (status === "ready") return <span className="text-muted-foreground">Ready</span>;
  if (status === "failed")
    return <span className="text-xs font-medium text-destructive">Failed</span>;
  return <StateCue tone="bronze">{status === "processing" ? "Extracting" : "Queued"}</StateCue>;
}

function ChatsTab({ matterId }: { matterId: string }) {
  const navigate = useNavigate();
  const { setCurrent } = useMatters();
  const { data: chats = [] } = useChats();

  const startChat = () => {
    setCurrent(matterId);
    void navigate({ to: "/assistant" });
  };

  return (
    <div className="flex flex-col gap-stack">
      <div className="flex justify-end">
        <Button size="sm" onClick={startChat}>
          <MessageSquarePlus className="size-4" /> New Chat
        </Button>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {chats.map((ch) => (
          <li key={ch.id}>
            <Link
              to="/assistant/$id"
              params={{ id: ch.id }}
              className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/40"
            >
              <span className="truncate">{ch.title || "Untitled chat"}</span>
              <span className="text-xs text-muted-foreground">{fmtDate(ch.updatedAt)}</span>
            </Link>
          </li>
        ))}
        {!chats.length && (
          <li className="px-4 py-12 text-center text-muted-foreground">No chats yet.</li>
        )}
      </ul>
    </div>
  );
}

function ReviewsTab({ matterId }: { matterId: string }) {
  const navigate = useNavigate();
  const { setCurrent } = useMatters();
  const { data: reviews = [] } = useQuery({
    queryKey: ["reviews"],
    queryFn: () => api.listReviews(),
  });

  const newReview = () => {
    setCurrent(matterId);
    void navigate({ to: "/reviews" });
  };

  return (
    <div className="flex flex-col gap-stack">
      <div className="flex justify-end">
        <Button size="sm" onClick={newReview}>
          <TableProperties className="size-4" /> New Review
        </Button>
      </div>
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {reviews.map((r) => (
          <li key={r.id}>
            <Link
              to="/reviews/$id"
              params={{ id: r.id }}
              className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-muted/40"
            >
              <span className="truncate">{r.title || "Untitled review"}</span>
              <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span>
            </Link>
          </li>
        ))}
        {!reviews.length && (
          <li className="px-4 py-12 text-center text-muted-foreground">No reviews yet.</li>
        )}
      </ul>
    </div>
  );
}
