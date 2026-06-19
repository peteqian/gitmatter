import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { lazyMarketing } from "../../marketing/lazyMarketing";
import { marketingHead } from "../../marketing/seo";

const Page: (props: object) => ReactNode =
  import.meta.env.VITE_DEPLOYMENT === "cloud"
    ? lazyMarketing(() => import("../../marketing/Security"))
    : () => null;

export const Route = createFileRoute("/(marketing)/security")({
  head: () =>
    marketingHead({
      title: "Security · gitmatter",
      description:
        "gitmatter's security model: self-host the whole stack, encrypted keys, and a full git-style audit trail of every change.",
      path: "/security",
    }),
  component: Page,
});
