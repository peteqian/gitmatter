import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Theme switcher for the sidebar footer. next-themes persists the choice and
// toggles the `.dark` class on <html>; the Sun/Moon swap is CSS-driven so it
// needs no mount guard. `open` mirrors the sidebar's expanded/collapsed state.
export function ModeToggle({ open }: { open: boolean }) {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title="Toggle theme"
        aria-label="Toggle theme"
        className={cn(
          "flex h-9 items-center gap-3 rounded-md px-2.5 text-left text-sm font-medium",
          "text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60",
          open ? "w-full" : "size-9 justify-center px-0"
        )}
      >
        <span className="relative grid size-4 shrink-0 place-items-center">
          <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-4 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
        </span>
        {open && <span className="flex-1">Theme</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-32">
        <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
