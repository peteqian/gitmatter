import { SITE } from "@/marketing/site";

// Cloud-only marketing About page: what gitmatter is, in plain language any
// lawyer can read. Credits mikeoss as the inspiration; the one honest delta is
// the simpler self-hosted stack with no third-party auth.
export default function About() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-section px-6 py-section">
      <header className="flex flex-col gap-stack">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          About
        </span>
        <h1 className="font-heading text-4xl tracking-tight text-balance">
          Legal AI that keeps a clear record.
        </h1>
        <p className="text-lg text-muted-foreground">
          gitmatter helps you review, pull out, and draft contract terms with AI — and keeps a full
          record of every change. Person or AI, each edit is saved with who made it, when, and
          exactly what changed, all in one place.
        </p>
      </header>

      <section className="flex flex-col gap-stack">
        <h2 className="font-heading text-2xl tracking-tight">Built in the open</h2>
        <p className="text-muted-foreground">
          You can install gitmatter yourself on your own computer or server and connect the AI
          account your firm already uses. Your documents stay yours — never kept or used to train
          anyone's model.
        </p>
        <p className="text-muted-foreground">
          The source lives on{" "}
          <a
            href={SITE.github}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            GitHub
          </a>
          .
        </p>
      </section>

      <section className="flex flex-col gap-stack">
        <h2 className="font-heading text-2xl tracking-tight">Built on mikeoss</h2>
        <p className="text-muted-foreground">
          gitmatter is built on the approach of{" "}
          <a
            href="https://mikeoss.com"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            mikeoss
          </a>
          , with full credit to the original. The difference is how it runs: a simple stack you host
          yourself, with no third-party vendor in your sign-in, and a git-style record behind every
          change.
        </p>
      </section>
    </div>
  );
}
