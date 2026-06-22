import type { ReactNode } from "react";
import { cn } from "@/lib/util/utils";

/** Lifecycle cue: tinted 6px dot + label — quieter than a filled badge (DESIGN.md). */
export function StateCue({ tone, children }: { tone: "bronze" | "muted"; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "bronze" ? "bg-bronze" : "bg-muted-foreground/50"
        )}
      />
      {children}
    </span>
  );
}
