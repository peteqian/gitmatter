import { type ReactNode, useEffect, useState } from "react";
import { api, type WorkflowListItem } from "@/lib/data/api";
import { WorkflowModal } from "./WorkflowModal";
import { WorkflowPickerPanel } from "./WorkflowPickerPanel";

interface WorkflowPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (workflow: WorkflowListItem) => Promise<void> | void;
  workflowType: WorkflowListItem["type"];
  breadcrumbs: ReactNode[];
  primaryLabel?: string;
  selectingLabel?: string;
  selecting?: boolean;
  closeOnSelect?: boolean;
  initialWorkflowId?: string;
  disabledWorkflow?: (workflow: WorkflowListItem) => boolean;
}

export function WorkflowPickerModal({
  open,
  onClose,
  onSelect,
  workflowType,
  breadcrumbs,
  primaryLabel = "Use",
  selectingLabel,
  selecting = false,
  closeOnSelect = true,
  initialWorkflowId,
  disabledWorkflow,
}: WorkflowPickerModalProps) {
  const picker = useWorkflowPicker({ open, workflowType, initialWorkflowId });

  const selectionDisabled =
    !picker.selected ||
    selecting ||
    (picker.selected ? (disabledWorkflow?.(picker.selected) ?? false) : true);
  const resolvedPrimaryLabel = selecting && selectingLabel ? selectingLabel : primaryLabel;

  function handleClose() {
    picker.reset();
    onClose();
  }

  async function handleSelect() {
    if (!picker.selected || selectionDisabled) return;
    await onSelect(picker.selected);
    if (closeOnSelect) handleClose();
  }

  return (
    <WorkflowModal
      open={open}
      onClose={handleClose}
      size={picker.selected ? "xl" : "lg"}
      breadcrumbs={breadcrumbs}
      primaryAction={{
        label: resolvedPrimaryLabel,
        onClick: () => void handleSelect(),
        disabled: selectionDisabled,
      }}
    >
      <WorkflowPickerPanel
        workflows={picker.workflows}
        selected={picker.selected}
        onSelect={picker.setSelected}
        search={picker.search}
        onSearchChange={picker.setSearch}
        loading={picker.loading}
        workflowType={workflowType}
        previewMode={workflowType === "tabular" ? "columns" : "prompt"}
        disabledWorkflow={disabledWorkflow}
      />
    </WorkflowModal>
  );
}

interface UseWorkflowPickerArgs {
  open: boolean;
  workflowType: WorkflowListItem["type"];
  initialWorkflowId?: string;
}

function useWorkflowPicker({ open, workflowType, initialWorkflowId }: UseWorkflowPickerArgs) {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<WorkflowListItem | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    reset();
    setLoading(true);
    api
      .listWorkflows()
      .then((allWorkflows) => {
        if (cancelled) return;
        const visibleWorkflows = allWorkflows.filter(
          (workflow) => workflow.type === workflowType && !workflow.hidden
        );
        setWorkflows(visibleWorkflows);
        if (initialWorkflowId) {
          setSelected(
            visibleWorkflows.find((workflow) => workflow.id === initialWorkflowId) ?? null
          );
        }
      })
      .catch(() => {
        if (!cancelled) setWorkflows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialWorkflowId, open, workflowType]);

  function reset() {
    setSelected(null);
    setSearch("");
  }

  return {
    workflows,
    loading,
    selected,
    setSelected,
    search,
    setSearch,
    reset,
  };
}
