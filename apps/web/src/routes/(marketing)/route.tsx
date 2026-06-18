import type { ComponentType, ReactNode } from "react";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { lazyMarketing } from "../../marketing/lazyMarketing";

// Pathless route group for the public marketing site (/, /pricing, /about).
// Cloud only: a local/self-host build redirects every marketing URL to login,
// and the static ternary below leaves the chunk out of that build entirely.
export const Route = createFileRoute("/(marketing)")({
  beforeLoad: ({ context }) => {
    // Local/self-host has no marketing site: send logged-in visitors straight to
    // the app and everyone else to login — one hop (the _unauth guard would
    // otherwise bounce a logged-in user a second time).
    if (import.meta.env.VITE_DEPLOYMENT !== "cloud") {
      throw redirect({ to: context.session ? "/assistant" : "/login" });
    }
  },
  component: MarketingRoot,
});

const Layout: ComponentType<{ children: ReactNode }> =
  import.meta.env.VITE_DEPLOYMENT === "cloud"
    ? lazyMarketing(() => import("../../marketing/MarketingLayout"))
    : () => null;

function MarketingRoot() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
