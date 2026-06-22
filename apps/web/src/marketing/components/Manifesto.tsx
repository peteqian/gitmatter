import Eyebrow from "@/marketing/components/Eyebrow";

// The control thesis. Left-rail label + a right stack of three pillars — a
// distinct layout from the full-width sections, so hierarchy reads at a glance.
// No boxes; hairline rules and big serif numerals carry the rhythm.
const POINTS = [
  {
    n: "01",
    title: "Set up in minutes",
    body: "Install it on your own computer or server and add your AI account. No consultants, no IT project — you're running in minutes.",
  },
  {
    n: "02",
    title: "Run the work as steps",
    body: "Review, pull out, and draft contract terms as simple, repeatable steps. The AI does the work; you stay in charge and approve what counts.",
  },
  {
    n: "03",
    title: "Keep a full record",
    body: "Every change is saved with the person, the time, and the exact before and after. Read it, share it, or undo it — nothing is hidden.",
  },
];

export default function Manifesto() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-32">
      <div className="grid gap-section lg:grid-cols-[0.6fr_1.4fr] lg:gap-24">
        <div className="flex flex-col gap-stack lg:sticky lg:top-24 lg:self-start">
          <Eyebrow>why firms choose it</Eyebrow>
          <h2 className="max-w-[14ch] font-heading text-4xl tracking-tight text-balance">
            Easy to run. Nothing slips by.
          </h2>
        </div>
        <div className="flex flex-col">
          {POINTS.map((p, i) => (
            <div
              key={p.n}
              className={`grid gap-4 py-8 sm:grid-cols-[auto_1fr] sm:gap-8 ${i > 0 ? "border-t border-border" : ""}`}
            >
              <span className="font-heading text-3xl text-bronze/60">{p.n}</span>
              <div className="flex flex-col gap-2">
                <h3 className="font-heading text-2xl tracking-tight">{p.title}</h3>
                <p className="max-w-[52ch] leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
