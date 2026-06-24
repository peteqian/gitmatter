import {
  cloneNode,
  elChildren,
  elName,
  getTextContent,
  makeEl,
  makeText,
  type XNode,
} from "./xml.js";

export interface RunSlot {
  childIndex: number;
  runProperties: XNode | null;
  textNodes: { wtEl: XNode; text: string; paraStart: number; paraEnd: number }[];
}

export interface Flattened {
  paraText: string;
  charRun: Int32Array;
  charTextNode: Int32Array;
  charOffset: Int32Array;
  runs: RunSlot[];
}

export function buildRun(
  runProperties: XNode | null,
  text: string,
  tagName: "w:t" | "w:delText"
): XNode {
  const children: XNode[] = [];
  if (runProperties) children.push(cloneNode(runProperties));

  const segments = text.split("\n");
  for (let i = 0; i < segments.length; i++) {
    if (i > 0) children.push(makeEl("w:br", []));
    const segment = segments[i];
    if (segment.length > 0) {
      children.push(makeEl(tagName, [makeText(segment)], { "xml:space": "preserve" }));
    }
  }

  return makeEl("w:r", children);
}

export function flattenParagraph(paraChildren: XNode[]): Flattened {
  const runs: RunSlot[] = [];
  let paraText = "";
  const charRunArr: number[] = [];
  const charTextNodeArr: number[] = [];
  const charOffsetArr: number[] = [];

  function processRun(runElement: XNode, topChildIndex: number) {
    const runChildren = elChildren(runElement);
    let runProperties: XNode | null = null;
    const textNodes: RunSlot["textNodes"] = [];

    for (const runChild of runChildren) {
      const name = elName(runChild);
      if (name === "w:rPr") {
        runProperties = runChild;
        continue;
      }
      if (name !== "w:t") continue;

      const text = getTextContent(runChild);
      const start = paraText.length;
      textNodes.push({
        wtEl: runChild,
        text,
        paraStart: start,
        paraEnd: start + text.length,
      });

      const runIndex = runs.length;
      const textNodeIndex = textNodes.length - 1;
      paraText += text;
      for (let i = 0; i < text.length; i++) {
        charRunArr.push(runIndex);
        charTextNodeArr.push(textNodeIndex);
        charOffsetArr.push(i);
      }
    }

    runs.push({ childIndex: topChildIndex, runProperties, textNodes });
  }

  for (let i = 0; i < paraChildren.length; i++) {
    const child = paraChildren[i];
    const name = elName(child);
    if (name === "w:r") {
      processRun(child, i);
      continue;
    }
    if (name !== "w:ins") continue;

    for (const inner of elChildren(child)) {
      if (elName(inner) === "w:r") processRun(inner, i);
    }
  }

  return {
    paraText,
    charRun: Int32Array.from(charRunArr),
    charTextNode: Int32Array.from(charTextNodeArr),
    charOffset: Int32Array.from(charOffsetArr),
    runs,
  };
}
