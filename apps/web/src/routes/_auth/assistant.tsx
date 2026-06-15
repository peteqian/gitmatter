import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Composer } from "./assistant/-components/Composer";
import { ChatTurns } from "./assistant/-components/ChatTurns";
import { useChatSession } from "./assistant/-components/useChatSession";
import { type ChatAttachment, type ChatDetail } from "../../lib/api";
import { useSession } from "../../lib/auth-client";

// Fresh chat. Resuming a conversation lives at /assistant/$id (assistant.$id.tsx),
// which seeds AssistantView from its loader. Keyed "new" so state starts clean.
export const Route = createFileRoute("/_auth/assistant")({
  component: () => <AssistantView key="new" loaded={null} />,
});

export function AssistantView({ loaded }: { loaded: ChatDetail | null }) {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const s = useChatSession({
    loaded,
    onFirstChat: (id) => void navigate({ to: "/assistant/$id", params: { id }, replace: true }),
  });

  const firstName =
    session?.user.name?.split(" ")[0] || session?.user.email?.split("@")[0] || "there";
  const empty = s.turns.length === 0;

  // A workflow "Use" launch stashes a seed (prompt + document attachments) then
  // navigates here; consume it once on a fresh chat and auto-send.
  const [pendingAutoSend, setPendingAutoSend] = useState(false);
  useEffect(() => {
    if (loaded) return;
    const raw = sessionStorage.getItem("workflowChatSeed");
    if (!raw) return;
    sessionStorage.removeItem("workflowChatSeed");
    try {
      const seed = JSON.parse(raw) as { input: string; attachments: ChatAttachment[] };
      s.setInput(seed.input);
      s.setAttachments(seed.attachments ?? []);
      setPendingAutoSend(true);
    } catch {
      /* ignore malformed seed */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);
  useEffect(() => {
    if (pendingAutoSend && s.input.trim() && !s.busy) {
      setPendingAutoSend(false);
      void s.send();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoSend, s.input, s.busy]);

  const composer = (
    <Composer
      input={s.input}
      setInput={s.setInput}
      model={s.model}
      setModel={s.setModel}
      reasoning={s.reasoning}
      setReasoning={s.setReasoning}
      attachments={s.attachments}
      onAdd={s.addAttachment}
      onRemove={s.removeAttachment}
      busy={s.busy}
      onSend={s.send}
    />
  );

  if (empty) {
    return (
      <div className="mx-auto flex h-full w-full max-w-xl flex-col items-center justify-center gap-section md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
        <h1 className="flex items-center gap-3 font-heading text-4xl font-light tracking-tight">
          <span className="grid size-9 place-items-center rounded-lg bg-primary font-serif text-lg text-primary-foreground">
            g
          </span>
          Hi, {firstName}
        </h1>
        <div className="w-full">{composer}</div>
        <p className="text-sm text-muted-foreground">
          AI can make mistakes. Answers are not legal advice.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-6 px-0">
          {(s.jurisdiction || s.tools.length > 0) && (
            <div className="flex items-center gap-2">
              {s.jurisdiction && <Badge variant="outline">{s.jurisdiction}</Badge>}
              {s.tools.length > 0 && <Badge variant="secondary">{s.tools.length} MCP tools</Badge>}
            </div>
          )}
          <ChatTurns turns={s.turns} busy={s.busy} />
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="flex shrink-0 flex-col gap-2 pt-2">
        {composer}
        <p className="text-center text-xs text-muted-foreground">
          AI can make mistakes. Answers are not legal advice.
        </p>
      </div>
    </div>
  );
}
