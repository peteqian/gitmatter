import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@workspace/db/client";
import { chatMessages, chats } from "@workspace/db/schema";
import type { Citation } from "../ai/citations.js";

type TurnContent = { text: string; toolCalls?: Array<{ tool: string; input: unknown }> };

/**
 * Append one user→assistant turn to a conversation (append-only). Creates the
 * chat when `chatId` is omitted (first turn), titling it from the message; on
 * later turns it appends with the next sequence number. Returns the chat id so
 * the caller threads subsequent turns into the same conversation.
 */
export async function persistChat(
  userId: string,
  turn: {
    message: string;
    finalText: string;
    toolCalls: Array<{ tool: string; input: unknown }>;
    citations?: Citation[];
  },
  chatId?: string
): Promise<string> {
  let id = chatId;
  if (!id) {
    const [chat] = await db
      .insert(chats)
      .values({ userId, title: turn.message.slice(0, 60) })
      .returning();
    id = chat!.id;
  }

  // Next sequence number after whatever's already in this chat.
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${chatMessages.seq}), 0)` })
    .from(chatMessages)
    .where(eq(chatMessages.chatId, id));
  const base = Number(row?.max ?? 0);

  await db.insert(chatMessages).values([
    {
      chatId: id,
      seq: base + 1,
      actorType: "user",
      actorId: userId,
      role: "user",
      content: { text: turn.message },
    },
    {
      chatId: id,
      seq: base + 2,
      actorType: "agent",
      role: "assistant",
      content: { text: turn.finalText, toolCalls: turn.toolCalls },
      annotations: turn.citations?.length ? { citations: turn.citations } : null,
    },
  ]);
  await db.update(chats).set({ updatedAt: new Date() }).where(eq(chats.id, id));
  return id;
}

/** List a user's conversations, most recently updated first. */
export async function listChats(
  userId: string
): Promise<Array<{ id: string; title: string | null; updatedAt: Date }>> {
  return db
    .select({ id: chats.id, title: chats.title, updatedAt: chats.updatedAt })
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt))
    .limit(100);
}

export type ChatTurn = {
  role: "user" | "assistant";
  text: string;
  toolCalls?: Array<{ tool: string; input: unknown }>;
  citations?: Citation[];
};

/** Load one conversation (ordered turns) — scoped to its owner. */
export async function getChat(
  userId: string,
  chatId: string
): Promise<{ id: string; title: string | null; turns: ChatTurn[] } | null> {
  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));
  if (!chat) return null;

  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.chatId, chatId))
    .orderBy(chatMessages.seq);

  const turns = rows.map((m) => {
    const content = m.content as TurnContent;
    const annotations = m.annotations as { citations?: Citation[] } | null;
    return {
      role: m.role,
      text: content.text,
      toolCalls: content.toolCalls,
      citations: annotations?.citations,
    };
  });
  return { id: chat.id, title: chat.title, turns };
}
