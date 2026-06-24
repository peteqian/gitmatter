// Brand tokens for transactional emails, mirroring DESIGN.md. Email clients do
// not understand oklch(), so the warm-paper / counsel-ink palette is expressed
// here as the closest sRGB hex. One bronze accent for state; destructive tokens
// for the account-deletion email only.
export const palette = {
  ink: "#15181e", // Counsel Ink — primary text, primary button (matches the logo box)
  inkSoft: "#6f6b62", // Soft Ink — secondary text, footnotes, timestamps
  paper: "#faf9f5", // Warm Paper — message background (ivory, never white)
  card: "#fffdf9", // Raised Paper — the card surface
  sunken: "#f3f1ea", // Sunken Paper — the link fallback well
  hairline: "#e7e3da", // Hairline — the only border weight
  bronze: "#9a6a3b", // Quiet Bronze — single accent, state cues only
  bronzeTint: "#efe6d6", // Bronze Wash
  danger: "#b23a2a", // destructive
  dangerSurface: "#f7ece9", // destructive-surface
} as const;

// Serif (Newsreader) for identity/headings, sans (Geist) for operational text —
// the Serif Earns It rule. Both fall back to web-safe stacks since most email
// clients ignore @font-face.
export const fonts = {
  serif: "'Newsreader', Georgia, 'Times New Roman', serif",
  sans: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
} as const;
