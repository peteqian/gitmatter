import { Outlet, createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "../../lib/auth-client";

// Mirror of _auth: a guest-only layout. A logged-in visitor has no business on
// the marketing/login/signup pages, so bounce them to the app home. Session is
// resolved client-side, so the redirect runs in the component (see _auth).
export const Route = createFileRoute("/_unauth")({ component: UnauthLayout });

function UnauthLayout() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && session) {
      void router.navigate({ to: "/assistant" });
    }
  }, [isPending, session, router]);

  if (isPending || session) return <div className="min-h-dvh bg-background" />;
  return <Outlet />;
}
