import BrandMark from "@/components/BrandMark";

// Brand wordmark: the bronze commit-node mark (matching the favicon) leading the
// serif name. The node is the git/audit signature — a commit in the history.
export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark className="size-4 text-bronze" />
      <span className="font-heading text-xl font-semibold tracking-tight">gitmatter</span>
    </span>
  );
}
