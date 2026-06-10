import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { api, type Doc } from "../lib/api";

export const Route = createFileRoute("/documents")({ component: Documents });

function Documents() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [title, setTitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () =>
    api
      .listDocuments()
      .then(setDocs)
      .catch(() => {});
  useEffect(() => {
    void refresh();
  }, []);

  async function create() {
    if (!title.trim() || !markdown.trim()) return;
    setBusy(true);
    try {
      await api.createDocument({ title: title.trim(), markdown });
      setTitle("");
      setMarkdown("");
      await refresh();
      toast.success("Document added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 pt-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Add document</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Paste contract text or markdown. File upload + extraction comes later.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="NDA.md"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="md">Content</Label>
            <Textarea
              id="md"
              rows={10}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
            />
          </div>
          <Button
            onClick={create}
            disabled={busy || !title.trim() || !markdown.trim()}
            className="self-start"
          >
            {busy ? "Adding…" : "Add document"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your documents ({docs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between border-b pb-2">
                <span>{d.title}</span>
                <span className="text-muted-foreground">
                  {new Date(d.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
            {!docs.length && <li className="text-muted-foreground">No documents yet.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
