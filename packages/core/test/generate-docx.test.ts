import { describe, expect, test } from "vite-plus/test";
import { buildDocxSpec, generateDocx } from "../src/content/docx/generate.js";
import { extractDocxBodyText } from "../src/content/docx/trackedChanges.js";

describe("generateDocx", () => {
  test("renders title, headings, paragraphs, and table cells", async () => {
    const spec = buildDocxSpec("Engagement Letter", [
      { type: "heading", text: "Scope", level: 1 },
      { type: "paragraph", text: "We will advise on the merger." },
      {
        type: "table",
        rows: [
          ["Item", "Fee"],
          ["Diligence", "$5,000"],
        ],
      },
    ]);
    const bytes = Buffer.from(await generateDocx(spec));

    // Valid .docx is a zip — starts with the "PK" magic.
    expect(bytes.subarray(0, 2).toString("latin1")).toBe("PK");

    const text = await extractDocxBodyText(bytes);
    expect(text).toContain("Engagement Letter");
    expect(text).toContain("Scope");
    expect(text).toContain("We will advise on the merger.");
    expect(text).toContain("Diligence");
    expect(text).toContain("$5,000");
  });

  test("buildDocxSpec drops malformed blocks", () => {
    const spec = buildDocxSpec("T", [
      { type: "heading" }, // no text -> dropped
      { type: "table", rows: [] }, // empty -> dropped
      { type: "paragraph", text: "kept" },
    ]);
    expect(spec.blocks).toHaveLength(1);
    expect(spec.blocks[0]).toEqual({ type: "paragraph", text: "kept" });
  });
});
