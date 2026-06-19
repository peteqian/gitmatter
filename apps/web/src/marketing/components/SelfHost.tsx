import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/marketing/site";
import Eyebrow from "@/marketing/components/Eyebrow";

// Self-host band: warm editorial, full-bleed sunken paper with hairline rules —
// not a generic dark SaaS block. Unapologetic, restrained.
const POINTS = [
  {
    title: "Run it yourself",
    body: "Self-host the whole stack with one Docker command. No cloud lock-in.",
  },
  {
    title: "Your key, your provider",
    body: "Bring your own LLM key — Claude, Gemini, OpenAI, OpenRouter — stored encrypted.",
  },
  {
    title: "Zero data retention",
    body: "Configured so your documents never train anyone's model. Auditable end to end.",
  },
];

export default function SelfHost() {
  return (
    <section className="border-y border-border bg-secondary/60">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <Eyebrow>open source, self-hostable</Eyebrow>
        <h2 className="mt-stack max-w-[16ch] font-heading text-4xl tracking-tight text-balance">
          Own the whole stack.
        </h2>
        <div className="mt-12 grid gap-10 sm:grid-cols-3 md:gap-16">
          {POINTS.map((p) => (
            <div key={p.title} className="flex flex-col gap-1 border-t border-border pt-4">
              <h3 className="font-heading text-lg tracking-tight">{p.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-section flex flex-wrap gap-3">
          <a href={SITE.github} target="_blank" rel="noreferrer">
            <Button size="lg">
              <GitBranch />
              Star on GitHub
            </Button>
          </a>
          <a href={SITE.docs}>
            <Button size="lg" variant="outline">
              Read the docs
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
