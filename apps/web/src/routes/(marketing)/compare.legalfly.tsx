import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { lazyMarketing } from "../../marketing/lazyMarketing";
import { marketingHead } from "../../marketing/seo";

const Page: (props: object) => ReactNode =
  import.meta.env.VITE_DEPLOYMENT === "cloud"
    ? lazyMarketing(() => import("../../marketing/CompareLegalfly"))
    : () => null;

export const Route = createFileRoute("/(marketing)/compare/legalfly")({
  head: () =>
    marketingHead({
      title: "gitmatter vs LegalFly · LegalFly alternative compared",
      description:
        "An honest comparison of gitmatter and LegalFly. LegalFly leads on automatic anonymisation and built-in legal research; gitmatter adds a git-style audit trail, bring-your-own-agent over MCP, and a fully open-source backend you can self-host.",
      path: "/compare/legalfly",
      og: { title: "gitmatter vs LegalFly", eyebrow: "legalfly alternative" },
    }),
  component: Page,
});
