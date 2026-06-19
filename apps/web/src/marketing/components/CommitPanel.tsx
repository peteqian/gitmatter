// The signature artifact: a matter's commit history of legal edits, rendered
// as an editorial figure. Mono = the git voice; bronze marks agent-authored
// commits and the accepted side of a diff.
const COMMITS = [
  {
    hash: "a1f4c9",
    author: "M. Reyes",
    agent: false,
    message: "Accept indemnity cap at $2M",
    diff: { field: "liability cap", from: "$5,000,000", to: "$2,000,000" },
  },
  {
    hash: "7b2e10",
    author: "claude",
    agent: true,
    message: "Redline NDA — flag 4 non-standard clauses",
    diff: { field: "term", from: "5 years", to: "3 years" },
  },
];

export default function CommitPanel() {
  return (
    <figure className="m-0">
      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
          <span>matters/acme-acquisition/nda.docx</span>
          <span className="text-bronze">main</span>
        </div>
        <ul className="divide-y divide-border">
          {COMMITS.map((c) => (
            <li key={c.hash} className="flex gap-3 px-4 py-3.5">
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${c.agent ? "bg-bronze" : "border border-muted-foreground/40"}`}
              />
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-sm text-foreground">{c.message}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  <span className="text-bronze">{c.hash}</span> · {c.author}
                  {c.agent && " · agent"}
                </p>
                <p className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                  <span className="text-muted-foreground">{c.diff.field}:</span>
                  <span className="text-destructive line-through">{c.diff.from}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-bronze">{c.diff.to}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
