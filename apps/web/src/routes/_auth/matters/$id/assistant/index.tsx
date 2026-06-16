import { createFileRoute } from "@tanstack/react-router";
import { MatterChatWorkspace } from "@/routes/_auth/matters/-components/MatterChatWorkspace";

// Fresh matter-scoped chat. Resuming lives at /matters/$id/assistant/$chatId.
// Keyed "new" so state starts clean when navigating between chats.
export const Route = createFileRoute("/_auth/matters/$id/assistant/")({
  component: NewMatterChat,
});

function NewMatterChat() {
  const { id } = Route.useParams();
  return <MatterChatWorkspace key="new" matterId={id} loaded={null} />;
}
