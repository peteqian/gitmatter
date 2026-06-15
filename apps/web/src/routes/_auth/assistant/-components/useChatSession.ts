import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type ChatAttachment, type ChatDetail, type Citation } from "../../../../lib/api";
import { useSelectedModel, useSelectedReasoning } from "../../../../lib/useSelectedModel";
import { queryKeys } from "../../../../lib/queries";
import { type ToolRun } from "./ThinkingTrace";

export type Turn = {
  role: "user" | "assistant";
  text: string;
  reasoning?: string;
  reasoningMs?: number;
  reasoningStreaming?: boolean;
  tools?: ToolRun[];
  documents?: Array<{ id: string; title: string; download: string }>;
  citations?: Citation[];
};

/**
 * The assistant chat engine — conversation state plus the streaming send loop —
 * shared by the global assistant (single column) and the matter workspace
 * (3-pane). Routing differs, so the first-turn-of-a-new-chat navigation is left
 * to the caller via `onFirstChat`; `matterId` scopes a new chat to a matter.
 */
export function useChatSession({
  loaded,
  matterId,
  onFirstChat,
}: {
  loaded: ChatDetail | null;
  matterId?: string;
  onFirstChat?: (chatId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  // Seed from the loaded conversation (callers key the view by chat, so this
  // runs fresh per conversation — no reset effect needed).
  const [turns, setTurns] = useState<Turn[]>(() =>
    (loaded?.turns ?? []).map((t) => ({
      role: t.role,
      text: t.text,
      tools: t.toolCalls?.map((tc) => ({ name: tc.tool, done: true })),
      citations: t.citations,
    }))
  );
  const [tools, setTools] = useState<string[]>([]);
  const [jurisdiction, setJurisdiction] = useState<string>("");
  const [model, setModel] = useSelectedModel();
  const [reasoning, setReasoning] = useSelectedReasoning();
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [chatId, setChatId] = useState<string | undefined>(loaded?.id);
  // Aborts an in-flight stream so navigating away (or unmounting) doesn't leave
  // the reader loop and its captured setState closures running in the background.
  const streamAbort = useRef<AbortController | null>(null);
  useEffect(() => () => streamAbort.current?.abort(), []);

  const addAttachment = (a: ChatAttachment) =>
    setAttachments((prev) =>
      prev.some((p) => p.kind === a.kind && p.id === a.id) ? prev : [...prev, a]
    );
  const removeAttachment = (a: ChatAttachment) =>
    setAttachments((prev) => prev.filter((p) => !(p.kind === a.kind && p.id === a.id)));

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    const sent = attachments;
    setAttachments([]);
    // Append the user turn plus an empty assistant turn that fills in as it streams.
    setTurns((t) => [...t, { role: "user", text: message }, { role: "assistant", text: "" }]);

    // Update the trailing assistant turn in place as deltas arrive.
    const patchLast = (patch: Partial<Turn>) =>
      setTurns((t) => {
        const copy = [...t];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") copy[copy.length - 1] = { ...last, ...patch };
        return copy;
      });

    let acc = "";
    let racc = "";
    let rStart = 0;
    let answered = false;
    const toolRuns: ToolRun[] = [];
    const markToolsDone = () => {
      if (toolRuns.some((t) => !t.done)) {
        toolRuns.forEach((t) => (t.done = true));
        patchLast({ tools: [...toolRuns] });
      }
    };

    const controller = new AbortController();
    streamAbort.current = controller;
    try {
      await api.streamChat(
        message,
        {
          model: model || undefined,
          attachments: sent.length ? sent : undefined,
          reasoning: reasoning ?? undefined,
          chatId,
          // Only meaningful when creating a new chat; ignored once chatId exists.
          matterId: chatId ? undefined : matterId,
        },
        {
          onReasoning: (delta) => {
            if (!rStart) rStart = Date.now();
            racc += delta;
            patchLast({ reasoning: racc, reasoningStreaming: true });
          },
          onText: (delta) => {
            // First answer token ends the thinking phase and any running tools.
            if (!answered && racc) {
              answered = true;
              patchLast({ reasoningStreaming: false, reasoningMs: Date.now() - rStart });
            }
            markToolsDone();
            acc += delta;
            patchLast({ text: acc });
          },
          onTool: (name) => {
            toolRuns.forEach((t) => (t.done = true));
            toolRuns.push({ name, done: false });
            patchLast({ tools: [...toolRuns] });
          },
          onDone: (r) => {
            markToolsDone();
            // Only set the thinking duration here if the answer never streamed
            // (reasoning-only) — otherwise keep the time-to-first-token captured above.
            patchLast({
              text: r.text || acc,
              reasoningStreaming: false,
              ...(!answered && rStart ? { reasoningMs: Date.now() - rStart } : {}),
              documents: r.documents,
              citations: r.citations,
            });
            setTools(r.tools);
            setJurisdiction(r.jurisdiction);
            // Drop the cached snapshot so resuming this chat refetches the server
            // copy with these new turns, not a stale one.
            queryClient.removeQueries({ queryKey: queryKeys.chat(r.chatId) });
            // First turn of a new chat: adopt its id, refresh the (scoped) list,
            // and let the caller reflect it in the URL.
            if (!chatId) {
              setChatId(r.chatId);
              void queryClient.invalidateQueries({
                queryKey: matterId ? queryKeys.matterChats(matterId) : queryKeys.chats,
              });
              onFirstChat?.(r.chatId);
            }
          },
          onError: (msg) => toast.error(msg),
        },
        controller.signal
      );
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    } finally {
      if (streamAbort.current === controller) streamAbort.current = null;
      setBusy(false);
    }
  }

  return {
    input,
    setInput,
    turns,
    tools,
    jurisdiction,
    model,
    setModel,
    reasoning,
    setReasoning,
    attachments,
    setAttachments,
    addAttachment,
    removeAttachment,
    busy,
    chatId,
    send,
  };
}
