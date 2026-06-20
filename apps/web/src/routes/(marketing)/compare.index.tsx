import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { lazyMarketing } from "../../marketing/lazyMarketing";
import { marketingHead } from "../../marketing/seo";

const Page: (props: object) => ReactNode =
  import.meta.env.VITE_DEPLOYMENT === "cloud"
    ? lazyMarketing(() => import("../../marketing/Compare"))
    : () => null;

export const Route = createFileRoute("/(marketing)/compare/")({
  head: () =>
    marketingHead({
      title: "Compare gitmatter · Harvey, Spellbook, LegalOn & LegalFly alternatives",
      description:
        "Honest side-by-side comparisons of gitmatter with Harvey, Spellbook, LegalOn, and LegalFly — where each leads, and where gitmatter's git-style audit trail, bring-your-own-agent over MCP, and open source change the answer.",
      path: "/compare",
      og: { title: "How gitmatter compares.", eyebrow: "compare" },
    }),
  component: Page,
});
