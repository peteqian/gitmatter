import { SITE } from "./site";

// Build a full SEO head for a public marketing page: unique title + description,
// a canonical URL, and Open Graph / Twitter cards. Paths are absolute ("/about");
// canonical and OG URLs derive from SITE.url. og:image is the 1200x630 og.png
// share banner, paired with a summary_large_image card.
export function marketingHead(opts: { title: string; description: string; path: string }) {
  const url = `${SITE.url}${opts.path === "/" ? "" : opts.path}`;
  const image = `${SITE.url}/og.png`;
  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "gitmatter" },
      { property: "og:title", content: opts.title },
      { property: "og:description", content: opts.description },
      { property: "og:url", content: url },
      { property: "og:image", content: image },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: opts.title },
      { name: "twitter:description", content: opts.description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}
