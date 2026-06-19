import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SITE } from "@/marketing/site";
import Eyebrow from "@/marketing/components/Eyebrow";

// Closing call to action — editorial, left-aligned, calm.
export default function CTASection() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <Eyebrow>get started</Eyebrow>
      <h2 className="mt-stack max-w-[18ch] font-heading text-4xl tracking-tight text-balance sm:text-5xl">
        Start in your own assistant.
      </h2>
      <p className="mt-stack max-w-[50ch] leading-relaxed text-muted-foreground">
        Connect the AI client you already use and put an audited legal engine behind it. Free to
        self-host.
      </p>
      <div className="mt-section flex flex-wrap items-center gap-3">
        <Link to="/signup">
          <Button size="lg">Get started</Button>
        </Link>
        <a href={SITE.docs}>
          <Button size="lg" variant="outline">
            Read the docs
          </Button>
        </a>
      </div>
    </section>
  );
}
