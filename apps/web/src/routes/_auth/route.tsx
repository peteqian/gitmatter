import { Outlet, createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "../../lib/auth-client";

// Pathless layout that gates every route nested under it. Session is resolved
// client-side, so the guard runs in the component (a beforeLoad check would
// wrongly redirect logged-in users on SSR/hard-refresh, before cookies load).
export const Route = createFileRoute("/_auth")({ component: AuthLayout });

function AuthLayout() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      // Read the live path at redirect time. The router's selected location can
      // lag during a navigation transition, capturing the previous route.
      const next = window.location.pathname + window.location.search;
      void router.navigate({ to: "/login", search: { next } });
    }
  }, [isPending, session, router]);

  if (isPending || !session) return <div className="min-h-dvh bg-background" />;
  return <Outlet />;
}
