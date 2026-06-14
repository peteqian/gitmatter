import { EventEmitter } from "node:events";
import type { DocumentStatus } from "@workspace/db/schema";

// In-process pub/sub for document extraction status changes. SSE routes
// subscribe and filter by userId, so the browser learns of pending ->
// processing -> ready/failed transitions without polling. Single web instance
// only: a horizontally-scaled deploy would need Postgres LISTEN/NOTIFY instead.

export type DocStatusEvent = {
  userId: string;
  id: string;
  status: DocumentStatus;
  extractionError: string | null;
};

// One emitter, every open SSE connection adds a listener — lift the default cap.
export const docEvents = new EventEmitter();
docEvents.setMaxListeners(0);

export function emitDocStatus(event: DocStatusEvent): void {
  docEvents.emit("status", event);
}
