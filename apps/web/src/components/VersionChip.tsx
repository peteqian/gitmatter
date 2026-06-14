// Small "v{n}" badge shown next to a document with more than one version
// (mike's VersionChip, in Quiet Chambers tones).
export function VersionChip({ n }: { n: number }) {
  if (n <= 1) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      v{n}
    </span>
  );
}
