import { HeadContent, Link, Scripts, createRootRoute } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MattersProvider } from "../lib/matters-context";
import { queryClient } from "../lib/query";
import { getServerSession } from "../lib/session";

import appCss from "@/styles/globals.css?url";

// Authed-only chrome, lazy-loaded so its weight (base-ui Popover, lucide icons,
// the chats query, sonner) leaves the shared entry chunk. The logged-out / login
// path — the cold-load case — then ships none of it, cutting hydration work
// (faster TTI/INP). On authed pages these load in parallel after first paint.
const AppSidebar = lazy(() =>
  import("../components/AppSidebar").then((m) => ({ default: m.AppSidebar }))
);
const Toaster = lazy(() => import("@/components/ui/sonner").then((m) => ({ default: m.Toaster })));

export const Route = createRootRoute({
  // Resolve the session on the server so every route's beforeLoad (and the
  // shell below) can render the correct logged-in/out chrome in the SSR HTML,
  // instead of a blank screen that only fills in after client hydration.
  // Session changes (login/logout) do a full reload, so this stays accurate
  // for the lifetime of the loaded app.
  beforeLoad: async () => ({ session: await getServerSession() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "gitcounsel" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1 className="text-lg font-medium">404</h1>
      <p className="text-muted-foreground">The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
});

function Shell({ children }: { children: React.ReactNode }) {
  // Server-resolved (see root beforeLoad): known during SSR, so the shell
  // renders real chrome in the server HTML — no blank-screen wait.
  const { session } = Route.useRouteContext();

  // Logged out: bare chrome (no sidebar, no MattersProvider). Access control
  // for protected routes lives in the _auth pathless layout, not here.
  if (!session) {
    return (
      <div className="min-h-dvh bg-background">
        <header className="flex h-12 items-center justify-end gap-3 px-4 text-sm">
          <Link to="/login" className="text-muted-foreground hover:text-foreground">
            Log in
          </Link>
          <Link to="/signup" className="text-muted-foreground hover:text-foreground">
            Sign up
          </Link>
        </header>
        <main className="container mx-auto px-6 pt-page pb-12">{children}</main>
      </div>
    );
  }

  return (
    <MattersProvider>
      <div className="flex h-dvh bg-background">
        <Suspense
          fallback={
            <div className="my-2 ml-2 h-[calc(100dvh-1.5rem)] w-14 shrink-0 rounded-2xl glass-panel md:my-3 md:ml-3 md:w-64" />
          }
        >
          <AppSidebar session={session} />
        </Suspense>
        <main className="h-dvh flex-1 overflow-y-auto">
          <div className="container mx-auto flex h-full flex-col px-6 pt-page pb-12">
            {children}
          </div>
        </main>
      </div>
    </MattersProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Shell>{children}</Shell>
          </TooltipProvider>
        </QueryClientProvider>
        <Suspense fallback={null}>
          <Toaster />
        </Suspense>
        <Scripts />
      </body>
    </html>
  );
}
