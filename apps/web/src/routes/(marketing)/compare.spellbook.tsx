import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { lazyMarketing } from "../../marketing/lazyMarketing";
import { marketingHead } from "../../marketing/seo";

const Page: (props: object) => ReactNode =
  import.meta.env.VITE_DEPLOYMENT === "cloud"
    ? lazyMarketing(() => import("../../marketing/CompareSpellbook"))
    : () => null;

export const Route = createFileRoute("/(marketing)/compare/spellbook")({
  head: () =>
    marketingHead({
      title: "gitmatter vs Spellbook · Spellbook alternative compared",
      description:
        "An honest comparison of gitmatter and Spellbook. Spellbook leads on in-Word drafting and clause benchmarking; gitmatter adds a git-style audit trail, bring-your-own-agent over MCP, bring-your-own-key, open source, and no seat minimum.",
      path: "/compare/spellbook",
      og: { title: "gitmatter vs Spellbook", eyebrow: "spellbook alternative" },
    }),
  component: Page,
});
