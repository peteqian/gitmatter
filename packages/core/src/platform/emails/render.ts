import { render } from "@react-email/render";
import type { ReactElement } from "react";

// Render a React Email template once into both the HTML and plain-text bodies, so
// the two never drift. The text version is what the console transport (dev) and
// text-only clients fall back to.
export async function renderEmail(element: ReactElement): Promise<{ html: string; text: string }> {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { html, text };
}
