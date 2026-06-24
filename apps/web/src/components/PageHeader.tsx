import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export type Crumb = { label: string; to?: string; params?: Record<string, string> };

/**
 * Shared page header. The title is either a plain serif `title` or a
 * `breadcrumbs` trail rendered AS the large serif title ("Matters › Acme",
 * earlier crumbs are muted links). The right side takes one or more action
 * `groups` — each group is a cluster (e.g. a frosted icon pill, then primary
 * buttons) spaced apart, so callers compose toolbars without re-building chrome.
 */
export function PageHeader({
  title,
  action,
  actions,
  breadcrumbs,
}: {
  title?: ReactNode;
  /** A single action cluster (back-compat). */
  action?: ReactNode;
  /** Multiple action clusters, spaced apart on the right. */
  actions?: ReactNode[];
  breadcrumbs?: Crumb[];
}) {
  const groups = actions ?? (action ? [action] : []);
  const hasCrumbs = !!breadcrumbs && breadcrumbs.length > 0;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {hasCrumbs ? (
          <h1 className="flex min-w-0 items-center gap-2 text-2xl leading-tight font-medium tracking-tight">
            {breadcrumbs.map((c, i) => (
              <span key={i} className="flex min-w-0 items-center gap-2">
                {i > 0 && <span className="shrink-0 text-border">›</span>}
                {c.to ? (
                  <Link
                    to={c.to}
                    params={c.params}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {c.label || "Untitled"}
                  </Link>
                ) : (
                  <span className="truncate">{c.label || "Untitled"}</span>
                )}
              </span>
            ))}
          </h1>
        ) : (
          <h1 className="truncate text-2xl leading-tight font-medium tracking-tight">{title}</h1>
        )}
      </div>
      {groups.length > 0 && (
        <div className="flex shrink-0 items-center gap-3">
          {groups.map((g, i) => (
            <div key={i} className="flex items-center gap-2">
              {g}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
