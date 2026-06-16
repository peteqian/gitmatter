import { createFileRoute } from "@tanstack/react-router";
import { WorkflowDetailPage } from "@/routes/_auth/workflows/-components/WorkflowDetailPage";

export const Route = createFileRoute("/_auth/workflows/assistant/$id")({
  component: AssistantWorkflowDetail,
});

function AssistantWorkflowDetail() {
  const { id } = Route.useParams();
  return <WorkflowDetailPage id={id} />;
}
