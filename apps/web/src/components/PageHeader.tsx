import type { ReactNode } from "react";

/**
 * Shared page header: serif title, optional description, optional right-aligned
 * action. Keeps the editorial look consistent across every route.
 */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-stack">
      <div className="flex flex-col gap-1">
        {/* Display step (DESIGN.md): one per screen; serif comes from the base h1 style. */}
        <h1 className="text-[2rem] leading-[1.15] font-medium tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </div>
  );
}
