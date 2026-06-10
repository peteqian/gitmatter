import { db } from "@workspace/db/client";
import { chatMessages, chats } from "@workspace/db/schema";
import type { Citation } from "../ai/citations.js";

/** Persist a single-turn conversation (append-only). Returns the chat id. */
export async function persistChat(
  userId: string,
  turn: {
    message: string;
    finalText: string;
    toolCalls: Array<{ tool: string; input: unknown }>;
    citations?: Citation[];
  }
): Promise<string> {
  const [chat] = await db
    .insert(chats)
    .values({ userId, title: turn.message.slice(0, 60) })
    .returning();
  await db.insert(chatMessages).values([
    {
      chatId: chat!.id,
      seq: 1,
      actorType: "user",
      actorId: userId,
      role: "user",
      content: { text: turn.message },
    },
    {
      chatId: chat!.id,
      seq: 2,
      actorType: "agent",
      role: "assistant",
      content: { text: turn.finalText, toolCalls: turn.toolCalls },
      annotations: turn.citations?.length ? { citations: turn.citations } : null,
    },
  ]);
  return chat!.id;
}
