import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { queryKeys } from "../../lib/queries";
import { MatterChatWorkspace } from "./matters/-components/MatterChatWorkspace";

// Resume a matter-scoped conversation. Fetched client-side (react-query) rather
// than in a route loader — a loader fetches with a relative URL that fails under
// SSR/hard-reload (same pattern as /assistant/$id).
export const Route = createFileRoute("/_auth/matters_/$id_/assistant_/$chatId")({
  component: ResumeMatterChat,
});

function ResumeMatterChat() {
  const { id, chatId } = Route.useParams();
  // MatterChatWorkspace seeds its turns from `loaded` at mount (keyed by chatId),
  // so wait for the fetch before mounting it.
  const { data: loaded, isPending } = useQuery({
    queryKey: queryKeys.chat(chatId),
    queryFn: () => api.getChat(chatId).catch(() => null),
  });
  if (isPending) return null;
  return <MatterChatWorkspace key={chatId} matterId={id} loaded={loaded ?? null} />;
}
