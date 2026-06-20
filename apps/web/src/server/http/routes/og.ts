import { Hono } from "hono";
import { renderOgImage } from "../../og/image.js";

// Public, unauthenticated OG image endpoint. Marketing <head> tags point
// og:image / twitter:image here with ?title= and ?eyebrow=, so each page gets a
// share banner with its own headline. Inputs are length-clamped; the renderer
// only draws text, so there is no injection surface.
export const ogRoute = new Hono();

ogRoute.get("/api/og", async (c) => {
  const title = (c.req.query("title") ?? "Audited legal AI any agent plugs into").slice(0, 120);
  const eyebrow = c.req.query("eyebrow")?.slice(0, 40);
  try {
    const res = await renderOgImage({ title, eyebrow });
    res.headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400, immutable");
    return res;
  } catch {
    // Font CDN or render failure: fall back to the static banner rather than 500,
    // so a crawler still gets a valid image.
    return c.redirect("/og.png", 302);
  }
});
