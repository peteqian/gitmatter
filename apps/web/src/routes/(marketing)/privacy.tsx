import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { lazyMarketing } from "../../marketing/lazyMarketing";
import { marketingHead } from "../../marketing/seo";

const Page: (props: object) => ReactNode =
  import.meta.env.VITE_DEPLOYMENT === "cloud"
    ? lazyMarketing(() => import("../../marketing/Privacy"))
    : () => null;

export const Route = createFileRoute("/(marketing)/privacy")({
  head: () =>
    marketingHead({
      title: "Privacy · gitmatter",
      description:
        "How gitmatter handles your data: zero data retention, your own LLM key, self-hostable end to end.",
      path: "/privacy",
    }),
  component: Page,
});
