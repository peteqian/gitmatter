import { type ComponentType, type ReactNode, Suspense, lazy } from "react";

// Suspense wrapper for a lazily-loaded marketing component. Always pair it with
// a static `import.meta.env.VITE_DEPLOYMENT === "cloud"` ternary at the call
// site (see routes/(marketing)/*). In a local build that branch is statically
// dead, the import() lands in dead code, and Rollup drops the whole marketing/
// chunk — the folder never reaches a self-host bundle.
export function lazyMarketing<P extends object>(
  load: () => Promise<{ default: ComponentType<P> }>
): (props: P) => ReactNode {
  const C = lazy(load);
  return (props: P) => (
    <Suspense fallback={null}>
      <C {...props} />
    </Suspense>
  );
}
