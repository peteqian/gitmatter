// External links for the marketing site, kept in one place so the GitHub repo
// URL (not finalized yet) is a single swap. mike is credited in the README, not
// on the marketing page.
export const SITE = {
  url: "https://gitmatter.com", // production origin — canonical/OG/sitemap base
  github: "https://github.com/your-org/gitmatter", // TODO: real repo URL
  docs: "/docs",
  email: "contact@gitmatter.com", // single contact address for legal/privacy/security
  get contact() {
    return `mailto:${this.email}`;
  },
};
