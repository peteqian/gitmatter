import { SharePeopleDialog, clientShareSource } from "@/components/SharePeopleDialog";

// Client "People with access" — a thin wrapper over the shared SharePeopleDialog
// (also used by matters, documents, and reviews).
export function ClientPeopleModal({
  clientId,
  clientName,
  canManage,
  open,
  onOpenChange,
}: {
  clientId: string;
  clientName: string;
  canManage: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <SharePeopleDialog
      source={clientShareSource(clientId, clientName, canManage)}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
