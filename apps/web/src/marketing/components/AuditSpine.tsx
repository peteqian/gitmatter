import Eyebrow from "@/marketing/components/Eyebrow";
import CommitPanel from "@/marketing/components/CommitPanel";

// The record statement, with the change-history panel as proof beneath it —
// plain words for what "on the record" means.
export default function AuditSpine() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-40 text-center">
      <Eyebrow>a clear record</Eyebrow>
      <h2 className="mt-stack font-heading text-4xl tracking-tight text-balance sm:text-5xl">
        Every change is on the record.
      </h2>
      <p className="mx-auto mt-section max-w-[56ch] text-lg leading-relaxed text-muted-foreground">
        Person or AI, every edit lands in one history — who made it, when, and exactly what changed.
        Open any clause and see how it got there. Read it, share it, or undo it. No black box.
      </p>
      <div className="mx-auto mt-section max-w-md text-left">
        <CommitPanel />
      </div>
    </section>
  );
}
