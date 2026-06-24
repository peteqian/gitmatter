import { describe, expect, test } from "vite-plus/test";
import { parseCitations } from "../src/ai/citations.js";

describe("parseCitations", () => {
  test("splits prose from a trailing citations block", () => {
    const raw =
      'The NDA is mutual [1].\n<CITATIONS>[{"ref":1,"doc_id":"doc-9","quotes":["both parties"]}]</CITATIONS>';
    const { text, citations } = parseCitations(raw);
    expect(text).toBe("The NDA is mutual [1].");
    expect(citations).toEqual([{ ref: 1, doc_id: "doc-9", quotes: ["both parties"] }]);
  });

  test("no block -> text unchanged, no citations", () => {
    const { text, citations } = parseCitations("Just an answer.");
    expect(text).toBe("Just an answer.");
    expect(citations).toEqual([]);
  });

  test("malformed block is stripped, citations empty", () => {
    const { text, citations } = parseCitations("Answer.\n<CITATIONS>not json</CITATIONS>");
    expect(text).toBe("Answer.");
    expect(citations).toEqual([]);
  });

  test("drops entries missing a ref", () => {
    const raw = '<CITATIONS>[{"ref":1,"cluster_id":5},{"doc_id":"x"}]</CITATIONS>';
    const { citations } = parseCitations(raw);
    expect(citations).toEqual([{ ref: 1, cluster_id: 5 }]);
  });
});
