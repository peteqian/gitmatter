"use client";

import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import type { ComponentProps } from "react";
import { Streamdown } from "streamdown";

const plugins = { cjk, code, math, mermaid };

export type StreamdownRendererProps = ComponentProps<typeof Streamdown>;

// Default export so it can be React.lazy()'d. Bundles Streamdown plus the
// markdown/mermaid/math/code plugins into an on-demand chunk, keeping that
// stack out of the shared baseline chunk loaded on every page.
export default function StreamdownRenderer(props: StreamdownRendererProps) {
  return <Streamdown plugins={plugins} {...props} />;
}
