import Eyebrow from "@/marketing/components/Eyebrow";

// Two audiences, one product. Anyone can use it with the AI chatbot they
// already pay for. Technical teams can connect their own tools over MCP.
const FLOWS = [
  {
    tag: "For anyone",
    title: "Use your AI chatbot.",
    body: "Connect the AI assistant you already pay for — like ChatGPT or Claude — and run your legal work through it. Nothing technical to learn.",
  },
  {
    tag: "For technical teams",
    title: "Or connect over MCP.",
    body: "Developers can plug gitmatter's tools into their own AI setup over MCP and automate the work — with the same clear record behind every change.",
  },
];

export default function BothDirections() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <Eyebrow>works for everyone</Eyebrow>
      <h2 className="mt-stack max-w-[22ch] font-heading text-3xl tracking-tight text-balance sm:text-4xl">
        Easy for anyone. Open for builders.
      </h2>
      <div className="mt-12 grid gap-12 sm:grid-cols-2 md:gap-16">
        {FLOWS.map((f) => (
          <div key={f.tag} className="flex flex-col gap-3 border-t border-border pt-6">
            <span className="text-xs font-medium tracking-[0.2em] text-bronze uppercase">
              {f.tag}
            </span>
            <h3 className="font-heading text-xl tracking-tight">{f.title}</h3>
            <p className="leading-relaxed text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
