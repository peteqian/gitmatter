import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

// Shared full-page fallback for the root route's notFound / error boundaries.
// Kept dependency-light (no providers, no queries) so it renders even when the
// app shell or a loader has blown up.
export function ErrorState({
  code,
  title,
  message,
  onRetry,
}: {
  code: string;
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-sm font-medium text-muted-foreground">{code}</p>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      <div className="mt-2 flex gap-2">
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        <Button render={<Link to="/">Go home</Link>} />
      </div>
    </div>
  );
}
