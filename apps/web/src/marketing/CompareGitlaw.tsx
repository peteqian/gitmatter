import ComparePage, { type CompareRow } from "@/marketing/components/ComparePage";

// Cloud-only comparison for "git.law alternative" intent. git.law is the closest
// in spirit — open source, version control for legal documents — so this page is
// careful and factual, not disparaging. git.law leads on all-in-one drafting,
// templates, and built-in eSign for startups/SMEs; gitmatter leads on the
// git-style audit spine, bring-your-own-agent over MCP, and bring-your-own-key.
// Facts reflect public positioning as of mid-2026.
const ROWS: CompareRow[] = [
  { point: "Contract drafting and review", gitmatter: true, them: true },
  { point: "Version control for legal documents", gitmatter: true, them: true },
  {
    point: "Lawyer-vetted template library",
    gitmatter: false,
    them: true,
  },
  {
    point: "Built-in electronic signature",
    gitmatter: false,
    them: true,
    note: "git.law eSign",
  },
  {
    point: "Free tier for startups, freelancers, and SMEs",
    gitmatter: false,
    them: true,
  },
  {
    point: "Field-level diff and blame on every change",
    gitmatter: true,
    them: false,
  },
  {
    point: "Bring your own agent — drive it from ChatGPT or Claude over MCP",
    gitmatter: true,
    them: false,
  },
  {
    point: "Bring your own LLM key — Claude, Gemini, OpenAI, OpenRouter",
    gitmatter: true,
    them: false,
  },
  { point: "Tabular extraction across many contracts", gitmatter: true, them: false },
  {
    point: "Built for legal teams — Client, Matter, and staffed roles",
    gitmatter: true,
    them: false,
  },
  {
    point: "Open source — self-host on your own server",
    gitmatter: true,
    them: false,
    note: "no public source found for git.law",
  },
];

export default function CompareGitlaw() {
  return (
    <ComparePage
      competitor="git.law"
      eyebrow="git.law alternative"
      title="How gitmatter compares to git.law."
      intro={
        <>
          git.law and gitmatter share an idea — bringing version control to legal documents. git.law
          is an all-in-one app for startups and SMEs: draft from templates, collaborate, and e-sign
          in one place. gitmatter is an open-source backend built for legal teams — your own AI
          agent drives it over MCP, on your own key, with an audit trail behind every change.
        </>
      }
      rows={ROWS}
      pickThemTitle="Pick git.law when"
      pickThemBody="You're a startup, freelancer, or SME who wants one free app to draft from templates, negotiate, and e-sign — end to end."
      pickUsBody="You're a legal team that needs your own AI agent to drive the work over MCP, on your own key, with a full audit trail across every matter."
    />
  );
}
