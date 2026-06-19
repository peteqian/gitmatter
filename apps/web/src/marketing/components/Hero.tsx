import { Link } from "@tanstack/react-router";
import { GitBranch, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE } from "@/marketing/site";
import Eyebrow from "@/marketing/components/Eyebrow";
import CommitPanel from "@/marketing/components/CommitPanel";

// Editorial hero: left-aligned serif display + the commit-panel figure as proof.
// Calm, unapologetic, no AI sparkle — the artifact carries the pitch.
export default function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-section px-6 pt-24 pb-24 sm:pt-32 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
      <div className="flex flex-col gap-6">
        <Eyebrow>open source · audited legal AI</Eyebrow>
        <h1 className="font-heading text-6xl leading-[1.02] tracking-tight text-balance sm:text-7xl">
          The audited legal backend any AI agent plugs into.
        </h1>
        <p className="max-w-[48ch] text-lg leading-relaxed text-muted-foreground">
          Contract redline, extraction, and drafting on a git-style audit spine — every change is a
          commit with author, message, and blame.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link to="/signup">
            <Button size="lg">Get started</Button>
          </Link>
          <a href={SITE.github} target="_blank" rel="noreferrer">
            <Button size="lg" variant="outline">
              <GitBranch />
              View on GitHub
              <Star className="text-bronze" />
            </Button>
          </a>
        </div>
      </div>
      <CommitPanel />
    </section>
  );
}
