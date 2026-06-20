import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SITE } from "@/marketing/site";
import Eyebrow from "@/marketing/components/Eyebrow";
import CTASection from "@/marketing/components/CTASection";

// Cloud-only marketing page mapping the work people search for — contract
// redline, extraction, drafting, audit trail, connect-your-agent, your-own-key —
// onto what gitmatter does. Headings carry the search terms; copy stays plain
// enough for any lawyer to read.
const USE_CASES = [
  {
    tag: "Contract redline",
    title: "AI contract redline and review.",
    body: "Mark up agreements against your own playbook. The AI flags risky or off-standard clauses and suggests new wording, so the first pass is done before you open the file. Every suggestion lands as a change you can accept, reject, or trace back.",
    who: "For commercial and transactional lawyers drowning in first-pass review.",
  },
  {
    tag: "Data extraction",
    title: "Clause and tabular data extraction.",
    body: "Pull dates, parties, amounts, and key clauses out of a stack of contracts into a clean table. No copy-paste. Each value links back to the exact spot it came from, so the source is one click away.",
    who: "For due-diligence and contract-intake teams working at volume.",
  },
  {
    tag: "Drafting",
    title: "AI legal document generation.",
    body: "Draft agreements and standard documents from your templates and prior work. The AI fills the routine parts; you keep judgment on the rest. Every draft is saved with who asked for what and when.",
    who: "For teams that draft the same kinds of documents over and over.",
  },
  {
    tag: "Audit trail",
    title: "Audit trail and version control for legal documents.",
    body: "Every change — by a person in the UI or by an AI agent — is a commit with an author, a message, a field-level diff, and blame, all in one history. Open any clause and see exactly how it got there. Built for client-data duties, eDiscovery, and supervision rules.",
    who: "For general counsel, risk, and compliance who must show their work.",
  },
  {
    tag: "Bring your own agent",
    title: "Connect ChatGPT or Claude over MCP.",
    body: "Plug the AI client your firm already uses into gitmatter as an MCP connector. The agent drives the tools; gitmatter does the work and records every action. No new chatbot to learn, no second login.",
    who: "For firms already standardized on ChatGPT, Claude Desktop, or Claude web.",
  },
  {
    tag: "Bring your own key",
    title: "Your own LLM key, zero data retention.",
    body: "Run gitmatter's own features on your firm's LLM key — Claude, Gemini, OpenAI, or OpenRouter — stored encrypted and configured so nothing is kept or used for training. Privacy concerns are the top reason firms stall on AI; this is the answer.",
    who: "For firms blocked on AI by confidentiality and data-privacy rules.",
  },
];

export default function UseCases() {
  return (
    <div className="flex flex-col">
      <header className="mx-auto flex max-w-3xl flex-col gap-stack px-6 pt-section pb-24 text-center">
        <Eyebrow>what you can do</Eyebrow>
        <h1 className="font-heading text-4xl tracking-tight text-balance sm:text-5xl">
          The legal work you already do — on the record.
        </h1>
        <p className="mx-auto max-w-[56ch] text-lg leading-relaxed text-muted-foreground">
          Redline, extract, and draft with AI. Connect the assistant your firm already pays for, run
          it on your own key, and keep a full record of every change — who, what, and when.
        </p>
      </header>

      <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-24 sm:grid-cols-2 md:gap-16">
        {USE_CASES.map((u) => (
          <section key={u.tag} className="flex flex-col gap-3 border-t border-border pt-6">
            <span className="text-xs font-medium tracking-[0.2em] text-bronze uppercase">
              {u.tag}
            </span>
            <h2 className="font-heading text-2xl tracking-tight">{u.title}</h2>
            <p className="leading-relaxed text-muted-foreground">{u.body}</p>
            <p className="mt-1 text-sm text-muted-foreground/80">{u.who}</p>
          </section>
        ))}
      </div>

      <section className="mx-auto max-w-7xl px-6 pb-8">
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-8">
          <Link to="/compare/harvey">
            <Button variant="outline">Compare with Harvey</Button>
          </Link>
          <a href={SITE.docs}>
            <Button variant="outline">Read the docs</Button>
          </a>
        </div>
      </section>

      <CTASection />
    </div>
  );
}
