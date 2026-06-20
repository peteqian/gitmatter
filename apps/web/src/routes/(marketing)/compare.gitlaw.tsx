import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { lazyMarketing } from "../../marketing/lazyMarketing";
import { marketingHead } from "../../marketing/seo";

const Page: (props: object) => ReactNode =
  import.meta.env.VITE_DEPLOYMENT === "cloud"
    ? lazyMarketing(() => import("../../marketing/CompareGitlaw"))
    : () => null;

export const Route = createFileRoute("/(marketing)/compare/gitlaw")({
  head: () =>
    marketingHead({
      title: "gitmatter vs git.law · git.law alternative compared",
      description:
        "An honest comparison of gitmatter and git.law — both bring version control to legal documents. git.law leads on all-in-one drafting, templates, and eSign for SMEs; gitmatter is open source and adds a git-style audit trail, bring-your-own-agent over MCP, bring-your-own-key, and legal-team workflows.",
      path: "/compare/gitlaw",
      og: { title: "gitmatter vs git.law", eyebrow: "git.law alternative" },
    }),
  component: Page,
});
