import Eyebrow from "@/marketing/components/Eyebrow";

// The audit-spine statement — text only. The artifacts above already show the
// diffs and blame; here we just say what they mean.
export default function AuditSpine() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <Eyebrow>the audit spine</Eyebrow>
      <h2 className="mt-stack font-heading text-4xl tracking-tight text-balance">
        Every change is a commit with blame.
      </h2>
      <p className="mx-auto mt-stack max-w-[56ch] text-lg leading-relaxed text-muted-foreground">
        Human or agent, every edit lands in one history — author, message, and a field-level diff
        you can read, cite, and revert. Open any clause and see exactly who wrote it, when, and why.
        No black box.
      </p>
    </section>
  );
}
