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

async function buildDocx(title: string, paragraphs: string[]): Promise<Buffer> {
  return Buffer.from(
    await generateDocx(
      buildDocxSpec(
        title,
        paragraphs.map((text) => ({ type: "paragraph", text }))
      )
    )
  );
}

async function acceptAllChanges(bytes: Buffer, changeIds: Array<string | undefined>) {
  return resolveTrackedChange(
    bytes,
    changeIds.filter((id): id is string => !!id),
    "accept"
  );
}

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

  test("applies multiple non-overlapping edits in one paragraph", async () => {
    const bytes = await buildDocx("Batch", ["The buyer pays cash and the seller ships goods."]);
    const result = await applyTrackedEdits(
      bytes,
      [
        {
          find: "buyer",
          replace: "customer",
          context_before: "The ",
          context_after: " pays",
        },
        {
          find: "seller",
          replace: "vendor",
          context_before: "and the ",
          context_after: " ships",
        },
      ],
      { author: "tester" }
    );

    expect(result.errors).toHaveLength(0);
    expect(result.changes).toHaveLength(2);

    const accepted = await acceptAllChanges(
      result.bytes,
      result.changes.flatMap((change) => [change.delId, change.insId])
    );
    const text = await extractDocxBodyText(accepted.bytes);
    expect(text).toContain("The customer pays cash and the vendor ships goods.");
  });

  test("applies an insertion-only edit when context places the cursor", async () => {
    const bytes = await buildDocx("Insert", ["Alpha beta gamma."]);
    const result = await applyTrackedEdits(
      bytes,
      [
        {
          find: "",
          replace: " inserted",
          context_before: "Alpha",
          context_after: " beta",
        },
      ],
      { author: "tester" }
    );

    expect(result.errors).toHaveLength(0);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]!.deletedText).toBe("");
    expect(result.changes[0]!.insertedText).toBe(" inserted");
    expect(result.changes[0]!.delId).toBeUndefined();
    expect(result.changes[0]!.insId).toBeDefined();

    const accepted = await acceptAllChanges(result.bytes, [result.changes[0]!.insId]);
    const text = await extractDocxBodyText(accepted.bytes);
    expect(text).toContain("Alpha inserted beta gamma.");
  });

  test("edits paragraphs inside tables", async () => {
    const bytes = Buffer.from(
      await generateDocx(
        buildDocxSpec("Table", [
          {
            type: "table",
            rows: [
              ["Term", "Value"],
              ["Governing law", "Delaware"],
            ],
          },
        ])
      )
    );

    const result = await applyTrackedEdits(
      bytes,
      [
        {
          find: "Delaware",
          replace: "New York",
          context_before: "Governing law\n",
          context_after: "",
        },
      ],
      { author: "tester" }
    );

    expect(result.errors).toHaveLength(0);
    const accepted = await acceptAllChanges(
      result.bytes,
      result.changes.flatMap((change) => [change.delId, change.insId])
    );
    const text = await extractDocxBodyText(accepted.bytes);
    expect(text).toContain("Governing law");
    expect(text).toContain("New York");
    expect(text).not.toContain("Delaware");
  });

  test("reports an ambiguous match when repeated text has no unique context", async () => {
    const bytes = await buildDocx("Ambiguous", ["Fee due.", "Fee due."]);
    const result = await applyTrackedEdits(
      bytes,
      [{ find: "Fee due.", replace: "Payment due.", context_before: "", context_after: "" }],
      { author: "tester" }
    );

    expect(result.changes).toHaveLength(0);
    expect(result.errors).toEqual([
      {
        index: 0,
        reason:
          'Ambiguous match for find="Fee due.". Add longer context_before / context_after so the anchor is unique.',
      },
    ]);
  });

  test("reports a missing match without changing the document", async () => {
    const bytes = await buildDocx("Missing", ["The agreement starts today."]);
    const result = await applyTrackedEdits(
      bytes,
      [{ find: "termination fee", replace: "break fee", context_before: "", context_after: "" }],
      { author: "tester" }
    );

    expect(result.changes).toHaveLength(0);
    expect(result.errors[0]?.index).toBe(0);
    expect(result.errors[0]?.reason).toContain('Could not locate find="termination fee"');
    expect(await extractDocxBodyText(result.bytes)).toContain("The agreement starts today.");
  });

  test("rejects empty edits and insertion-only edits without context", async () => {
    const bytes = await buildDocx("Invalid", ["Alpha beta gamma."]);
    const result = await applyTrackedEdits(
      bytes,
      [
        { find: "", replace: "", context_before: "", context_after: "" },
        { find: "", replace: " inserted", context_before: "", context_after: "" },
      ],
      { author: "tester" }
    );

    expect(result.changes).toHaveLength(0);
    expect(result.errors).toEqual([
      { index: 0, reason: "Empty edit." },
      { index: 1, reason: "Pure insertion requires context_before or context_after." },
    ]);
  });

  test("rejects edits whose find text spans paragraphs", async () => {
    const bytes = await buildDocx("Boundary", ["First paragraph.", "Second paragraph."]);
    const result = await applyTrackedEdits(
      bytes,
      [
        {
          find: "paragraph.\nSecond",
          replace: "paragraph. Updated second",
          context_before: "First ",
          context_after: " paragraph.",
        },
      ],
      { author: "tester" }
    );

    expect(result.changes).toHaveLength(0);
    expect(result.errors[0]?.reason).toContain("spans a paragraph boundary");
  });

  test("applies the first overlapping edit and reports the second one", async () => {
    const bytes = await buildDocx("Overlap", ["Alpha beta gamma delta."]);
    const result = await applyTrackedEdits(
      bytes,
      [
        {
          find: "Alpha beta",
          replace: "Alpha BETA",
          context_before: "",
          context_after: " gamma",
        },
        {
          find: "beta gamma",
          replace: "BETA gamma",
          context_before: "Alpha ",
          context_after: " delta",
        },
      ],
      { author: "tester" }
    );

    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]!.deletedText).toBe("beta");
    expect(result.errors).toEqual([
      { index: 1, reason: "Overlaps a previous edit in the same paragraph." },
    ]);
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
