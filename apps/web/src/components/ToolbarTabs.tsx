import { cn } from "@/lib/utils";

// mike-style thin tab bar: underlined active tab on the left, optional actions
// on the right. Lighter and denser than the shadcn Tabs primitive — used for
// the matter workspace and list pages.
export type ToolbarTab<T extends string> = { id: T; label: string };

export function ToolbarTabs<T extends string>({
  tabs,
  active,
  onChange,
  actions,
}: {
  tabs: ToolbarTab<T>[];
  active: T;
  onChange: (id: T) => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex h-10 items-center border-b border-border">
      <div className="flex flex-1 items-center gap-5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative h-10 shrink-0 text-sm whitespace-nowrap transition-colors",
              active === tab.id
                ? "font-medium text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground"
                : "font-normal text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
