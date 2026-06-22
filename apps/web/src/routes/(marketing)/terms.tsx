import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { lazyMarketing } from "../../marketing/lazyMarketing";
import { marketingHead } from "../../marketing/seo";

const Page: (props: object) => ReactNode =
  import.meta.env.VITE_DEPLOYMENT === "cloud"
    ? lazyMarketing(() => import("../../marketing/Terms"))
    : () => null;

export const Route = createFileRoute("/(marketing)/terms")({
  head: () =>
    marketingHead({
      title: "Terms · gitmatter",
      description: "Terms of service for gitmatter.",
      path: "/terms",
    }),
  component: Page,
});
