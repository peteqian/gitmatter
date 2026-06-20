import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { lazyMarketing } from "../../marketing/lazyMarketing";
import { marketingHead } from "../../marketing/seo";

const Page: (props: object) => ReactNode =
  import.meta.env.VITE_DEPLOYMENT === "cloud"
    ? lazyMarketing(() => import("../../marketing/CompareLegalon"))
    : () => null;

export const Route = createFileRoute("/(marketing)/compare/legalon")({
  head: () =>
    marketingHead({
      title: "gitmatter vs LegalOn · LegalOn alternative compared",
      description:
        "An honest comparison of gitmatter and LegalOn. LegalOn leads on pre-built attorney-written playbooks for in-house review; gitmatter adds a git-style audit trail, bring-your-own-agent over MCP, bring-your-own-key, open source, and no seat minimum.",
      path: "/compare/legalon",
      og: { title: "gitmatter vs LegalOn", eyebrow: "legalon alternative" },
    }),
  component: Page,
});
