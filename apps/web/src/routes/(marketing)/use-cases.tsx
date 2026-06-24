import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { lazyMarketing } from "../../marketing/lazyMarketing";
import { marketingHead } from "../../marketing/seo";

const Page: (props: object) => ReactNode =
  import.meta.env.VITE_DEPLOYMENT === "cloud"
    ? lazyMarketing(() => import("../../marketing/UseCases"))
    : () => null;

export const Route = createFileRoute("/(marketing)/use-cases")({
  head: () =>
    marketingHead({
      title: "Use cases · gitmatter — AI contract redline, extraction, drafting & audit trail",
      description:
        "AI contract redline, clause and tabular extraction, and document generation on a git-style audit trail. Connect ChatGPT or Claude over MCP and run it on your own LLM key with zero data retention.",
      path: "/use-cases",
      og: { title: "The legal work you already do — on the record.", eyebrow: "use cases" },
    }),
  component: Page,
});
