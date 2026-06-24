// Boxed inline form error. Single home for the destructive-surface recipe;
// colors come from the --destructive-surface / --destructive-border tokens so
// the look stays consistent and theme-aware. Renders nothing when empty.
export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive-border bg-destructive-surface px-3 py-2 text-sm text-destructive"
    >
      {children}
    </p>
  );
}
