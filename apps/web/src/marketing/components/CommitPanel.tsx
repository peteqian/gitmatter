// The signature artifact: a document's change history, in plain terms a lawyer
// reads at a glance — who changed what, when, and the exact before/after. A
// bronze dot marks a change the AI made; the rest is the firm's own people.
const CHANGES = [
  {
    when: "Today, 2:14 PM",
    author: "M. Reyes",
    ai: false,
    message: "Accepted liability cap at $2M",
    edit: { field: "Liability cap", from: "$5,000,000", to: "$2,000,000" },
  },
  {
    when: "Today, 1:58 PM",
    author: "AI assistant",
    ai: true,
    message: "Reviewed NDA — flagged 4 unusual terms",
    edit: { field: "Term", from: "5 years", to: "3 years" },
  },
];

export default function CommitPanel() {
  return (
    <figure className="m-0">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Acme Acquisition · NDA.docx</span>
          <span className="text-bronze">Change history</span>
        </div>
        <ul className="divide-y divide-border">
          {CHANGES.map((c) => (
            <li key={c.when} className="flex gap-3 px-4 py-3.5">
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${c.ai ? "bg-bronze" : "border border-muted-foreground/40"}`}
              />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-sm text-foreground">{c.message}</p>
                <p className="text-xs text-muted-foreground">
                  {c.author}
                  {c.ai && " · AI"} · {c.when}
                </p>
                <p className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">{c.edit.field}:</span>
                  <span className="text-destructive line-through">{c.edit.from}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-bronze">{c.edit.to}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
