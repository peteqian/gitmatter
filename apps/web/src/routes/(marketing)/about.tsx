import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { lazyMarketing } from "../../marketing/lazyMarketing";
import { marketingHead } from "../../marketing/seo";

const Page: (props: object) => ReactNode =
  import.meta.env.VITE_DEPLOYMENT === "cloud"
    ? lazyMarketing(() => import("../../marketing/About"))
    : () => null;

export const Route = createFileRoute("/(marketing)/about")({
  head: () =>
    marketingHead({
      title: "About · gitmatter",
      description:
        "Why we built an audited, open-source legal backend — every change a commit with author, message, and blame.",
      path: "/about",
    }),
  component: Page,
});
