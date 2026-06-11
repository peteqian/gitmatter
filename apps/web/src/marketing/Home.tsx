import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

// Cloud-only marketing landing. Bundled solely when DEPLOYMENT=cloud (see
// routes/_unauth/index.tsx). Stub for now — real page lands in the next step.
export default function Home() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-6rem)] max-w-2xl flex-col items-center justify-center gap-section text-center">
      <div className="flex flex-col gap-stack">
        <h1 className="font-heading text-4xl tracking-tight">
          The audited legal backend any AI agent plugs into.
        </h1>
        <p className="text-lg text-muted-foreground">
          Version-controlled legal review — contract redline, tabular extraction, and document
          generation, where every change is a commit with author, message, and blame.
        </p>
      </div>
      <div className="flex gap-3">
        <Link to="/signup">
          <Button size="lg">Get started</Button>
        </Link>
        <Link to="/login">
          <Button size="lg" variant="outline">
            Log in
          </Button>
        </Link>
      </div>
    </div>
  );
}
