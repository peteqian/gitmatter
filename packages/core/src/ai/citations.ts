// Citations contract for in-app chat. The model appends a single machine-readable
// block at the very end of its reply; we parse it out, store it, and strip it
// from the prose the user sees. Inline [N] markers stay in the prose and map to
// the parsed entries by `ref`.

export type Citation = {
  ref: number;
  // A gitcounsel document artifact the claim is grounded in.
  doc_id?: string;
  quotes?: string[];
  // A CourtListener opinion (US case law).
  cluster_id?: number;
  opinion_id?: number;
};

export const CITATIONS_INSTRUCTION = `When your answer relies on a document or a case, cite it. Put inline markers like [1], [2] in your prose, then append ONE block at the very end, on its own line:
<CITATIONS>[{"ref":1,"doc_id":"<document id>","quotes":["short supporting quote"]}, {"ref":2,"cluster_id":123,"opinion_id":456}]</CITATIONS>
Use doc_id for gitcounsel documents and cluster_id/opinion_id for case law from search_case_law. Omit the block entirely if you cited nothing. Never mention the block itself.`;

const CITATIONS_RE = /<CITATIONS>([\s\S]*?)<\/CITATIONS>\s*$/;

/**
 * Split a reply into display text + parsed citations. If there's no block (or it
 * doesn't parse), returns the original text and an empty list — never throws.
 */
export function parseCitations(raw: string): { text: string; citations: Citation[] } {
  const m = raw.match(CITATIONS_RE);
  if (!m || m.index === undefined) return { text: raw, citations: [] };

  let citations: Citation[] = [];
  try {
    const parsed: unknown = JSON.parse(m[1]!.trim());
    if (Array.isArray(parsed)) {
      citations = parsed.filter(
        (c): c is Citation => !!c && typeof (c as Citation).ref === "number"
      );
    }
  } catch {
    // Malformed block — drop it but still strip it from the prose.
  }
  return { text: raw.slice(0, m.index).trimEnd(), citations };
}
