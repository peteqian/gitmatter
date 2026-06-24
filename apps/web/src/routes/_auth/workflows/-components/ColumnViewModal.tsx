import { Streamdown } from "streamdown";
import type { Column } from "@/lib/data/api";
import { formatIcon, formatLabel } from "./columnFormats";
import { WorkflowModal } from "./WorkflowModal";

interface Props {
  column: Column;
  onClose: () => void;
}

export function ColumnViewModal({ column, onClose }: Props) {
  const format = column.format ?? "text";
  const FormatIcon = formatIcon(format);
  return (
    <WorkflowModal
      open
      onClose={onClose}
      breadcrumbs={["Workflows", column.name]}
      primaryAction={{ label: "Close", onClick: onClose }}
      cancelAction={false}
    >
      <div className="flex flex-col gap-4 py-1">
        <ColumnField label="Column title">{column.name}</ColumnField>
        <ColumnField label="Format">
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
            <FormatIcon className="h-3.5 w-3.5 text-muted-foreground" />
            {formatLabel(format)}
          </span>
        </ColumnField>
        {column.tags && column.tags.length > 0 ? (
          <ColumnField label="Tags">
            <TagList tags={column.tags} />
          </ColumnField>
        ) : null}
        <ColumnField label="Prompt">
          <div className="text-sm leading-relaxed text-foreground/80">
            <Streamdown>{column.prompt || "_No prompt defined._"}</Streamdown>
          </div>
        </ColumnField>
      </div>
    </WorkflowModal>
  );
}

function ColumnField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-muted-foreground">{label}</p>
      {typeof children === "string" ? (
        <p className="text-sm text-foreground">{children}</p>
      ) : (
        children
      )}
    </div>
  );
}

function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
