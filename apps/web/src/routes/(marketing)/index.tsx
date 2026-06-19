import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { lazyMarketing } from "../../marketing/lazyMarketing";
import { marketingHead } from "../../marketing/seo";

const Page: (props: object) => ReactNode =
  import.meta.env.VITE_DEPLOYMENT === "cloud"
    ? lazyMarketing(() => import("../../marketing/Home"))
    : () => null;

export const Route = createFileRoute("/(marketing)/")({
  head: () =>
    marketingHead({
      title: "gitmatter — audited legal AI any agent plugs into",
      description:
        "Contract redline, extraction, and drafting on a git-style audit spine — every change a commit with author, message, and blame. Open source, self-hostable, bring your own agent and LLM key.",
      path: "/",
    }),
  component: Page,
});
