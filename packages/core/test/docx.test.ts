import { describe, expect, test } from "vite-plus/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  applyTrackedEdits,
  extractDocxBodyText,
  extractTrackedChangeIds,
  resolveTrackedChange,
} from "../src/content/docx/trackedChanges.js";
import { buildDocxSpec, generateDocx } from "../src/content/docx/generate.js";

const fixture = (): Buffer =>
  readFileSync(fileURLToPath(new URL("./fixtures/single-paragraph.docx", import.meta.url)));

describe("docx tracked-changes engine", () => {
  test("extractDocxBodyText reads paragraph text", async () => {
    const text = await extractDocxBodyText(fixture());
    expect(text).toContain("Walking on imported air");
  });

  test("applyTrackedEdits inserts a w:ins/w:del pair", async () => {
    const result = await applyTrackedEdits(
      fixture(),
      [{ find: "imported", replace: "global", context_before: "", context_after: "" }],
      { author: "tester" }
    );
    expect(result.errors).toHaveLength(0);
    expect(result.changes).toHaveLength(1);
    const applied = result.changes[0]!;
    expect(applied.deletedText).toBe("imported");
    expect(applied.insertedText).toBe("global");

    const ids = await extractTrackedChangeIds(result.bytes);
    expect(ids.some((i) => i.kind === "ins")).toBe(true);
    expect(ids.some((i) => i.kind === "del")).toBe(true);
  });

  test("accepting a change finalizes the insertion", async () => {
    const proposed = await applyTrackedEdits(
      fixture(),
      [{ find: "imported", replace: "global", context_before: "", context_after: "" }],
      { author: "tester" }
    );
    const applied = proposed.changes[0]!;
    const wIds = [applied.delId, applied.insId].filter((x): x is string => !!x);
    const { bytes, found } = await resolveTrackedChange(proposed.bytes, wIds, "accept");
    expect(found).toBe(true);
    const text = await extractDocxBodyText(bytes);
    expect(text).toContain("global");
    expect(text).not.toContain("imported");
  });

  test("rejecting a change restores the original", async () => {
    const proposed = await applyTrackedEdits(
      fixture(),
      [{ find: "imported", replace: "global", context_before: "", context_after: "" }],
      { author: "tester" }
    );
    const applied = proposed.changes[0]!;
    const wIds = [applied.delId, applied.insId].filter((x): x is string => !!x);
    const { bytes } = await resolveTrackedChange(proposed.bytes, wIds, "reject");
    const text = await extractDocxBodyText(bytes);
    expect(text).toContain("imported");
    expect(text).not.toContain("exported");
  });

  // A phrase that repeats in several paragraphs can only be anchored uniquely by
  // context that lives in a NEIGHBOURING paragraph (e.g. the heading above it).
  // The matcher must search the whole document, not one paragraph at a time.
  test("anchors a repeated phrase using cross-paragraph context", async () => {
    const repeated = "Lorem ipsum sit amet.";
    const spec = buildDocxSpec("Report", [
      { type: "heading", text: "Abstract", level: 1 },
      { type: "paragraph", text: repeated },
      { type: "heading", text: "Discussion", level: 1 },
      { type: "paragraph", text: `${repeated} ${repeated}` },
    ]);
    const bytes = Buffer.from(await generateDocx(spec));

    const result = await applyTrackedEdits(
      bytes,
      [
        {
          find: repeated,
          replace: "The quick brown fox.",
          context_before: "Abstract\n",
          context_after: "\nDiscussion",
        },
      ],
      { author: "tester" }
    );

    expect(result.errors).toHaveLength(0);
    expect(result.changes).toHaveLength(1);
    // The shared trailing "." is left untouched, so only the differing run moves.
    expect(result.changes[0]!.insertedText).toBe("The quick brown fox");

    // Only the Abstract occurrence is replaced; the two in Discussion survive.
    const accepted = await resolveTrackedChange(
      result.bytes,
      [result.changes[0]!.delId, result.changes[0]!.insId].filter((x): x is string => !!x),
      "accept"
    );
    const text = await extractDocxBodyText(accepted.bytes);
    expect(text).toContain("The quick brown fox.");
    expect(text.split(repeated).length - 1).toBe(2);
  });
});
