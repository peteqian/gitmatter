import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api, type WorkflowShare } from "@/lib/data/api";
import { useSession } from "@/lib/auth/auth-client";
import { cn } from "@/lib/util/utils";
import { EmailPillInput } from "./EmailPillInput";
import { WorkflowModal } from "./WorkflowModal";

interface Props {
  workflowId: string;
  workflowName: string;
  onClose: () => void;
}

export function WorkflowShareModal({ workflowId, workflowName, onClose }: Props) {
  const { data: session } = useSession();
  const shareForm = useWorkflowShareForm(workflowId, session?.user.email);

  return (
    <WorkflowModal
      open
      onClose={onClose}
      breadcrumbs={["Workflows", workflowName, "People"]}
      primaryAction={{
        label: shareForm.saving ? "Sharing..." : "Share",
        onClick: () => void shareForm.share(),
        disabled: shareForm.saving || shareForm.pendingEmails.length === 0,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-6 py-1">
        <ShareInviteSection shareForm={shareForm} />
        <ShareAccessToggle checked={shareForm.allowEdit} onChange={shareForm.setAllowEdit} />
        <ShareListSection
          loading={shareForm.loading}
          shares={shareForm.existingShares}
          onRemove={shareForm.removeShare}
        />
      </div>
    </WorkflowModal>
  );
}

function useWorkflowShareForm(workflowId: string, userEmail?: string | null) {
  const ownEmail = userEmail?.trim().toLowerCase() ?? null;
  const [pendingEmails, setPendingEmails] = useState<string[]>([]);
  const [allowEdit, setAllowEdit] = useState(false);
  const [existingShares, setExistingShares] = useState<WorkflowShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);

    api
      .listWorkflowShares(workflowId)
      .then((shares) => {
        if (active) setExistingShares(shares);
      })
      .catch(() => {
        if (active) setError("Unable to load current shares.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [workflowId]);

  async function removeShare(shareId: string) {
    const previousShares = existingShares;
    setExistingShares((shares) => shares.filter((share) => share.id !== shareId));

    try {
      await api.deleteWorkflowShare(workflowId, shareId);
    } catch {
      setExistingShares(previousShares);
      setError("Unable to remove this person.");
    }
  }

  async function share() {
    const emails = ownEmail
      ? pendingEmails.filter((email) => email.trim().toLowerCase() !== ownEmail)
      : pendingEmails;
    if (emails.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      const updatedShares = await api.shareWorkflow(workflowId, { emails, allowEdit });
      setExistingShares(updatedShares);
      setPendingEmails([]);
    } catch (err) {
      setError(getShareError(err));
    } finally {
      setSaving(false);
    }
  }

  async function validateEmail(email: string) {
    if (ownEmail && email.trim().toLowerCase() === ownEmail) {
      return "You cannot share a workflow with yourself.";
    }
    return null;
  }

  return {
    allowEdit,
    error,
    existingShares,
    loading,
    pendingEmails,
    saving,
    removeShare,
    setAllowEdit,
    setPendingEmails,
    share,
    validateEmail,
  };
}

function getShareError(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  return "Unable to share this workflow. Please try again.";
}

function ShareInviteSection({ shareForm }: { shareForm: ReturnType<typeof useWorkflowShareForm> }) {
  return (
    <section className="space-y-3">
      <EmailPillInput
        emails={shareForm.pendingEmails}
        onChange={shareForm.setPendingEmails}
        validate={shareForm.validateEmail}
        placeholder="Add people by email..."
        autoFocus
      />
      {shareForm.error ? (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {shareForm.error}
        </div>
      ) : null}
    </section>
  );
}

function ShareAccessToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <span className="text-xs font-medium text-muted-foreground">
        Allow editing by share recipients
      </span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200",
          checked ? "bg-foreground" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </section>
  );
}

function ShareListSection({
  loading,
  shares,
  onRemove,
}: {
  loading: boolean;
  shares: WorkflowShare[];
  onRemove: (shareId: string) => void;
}) {
  return (
    <section className="min-h-0 flex-1">
      <p className="mb-2 text-xs font-medium text-muted-foreground">People with access</p>
      {loading ? <ShareListSkeleton /> : <ShareList shares={shares} onRemove={onRemove} />}
    </section>
  );
}

function ShareListSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2].map((item) => (
        <div key={item} className="flex items-center justify-between">
          <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function ShareList({
  shares,
  onRemove,
}: {
  shares: WorkflowShare[];
  onRemove: (shareId: string) => void;
}) {
  if (shares.length === 0) return <p className="text-sm text-muted-foreground">None</p>;

  return (
    <div className="space-y-1">
      {shares.map((share) => (
        <div key={share.id} className="flex items-center justify-between py-1">
          <span className="truncate text-sm text-foreground">{share.sharedWithEmail}</span>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {share.allowEdit ? "Can edit" : "Read-only"}
            </span>
            <button
              type="button"
              onClick={() => onRemove(share.id)}
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
