import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

// A small, structured spec an agent (or a workflow) hands us to build a Word
// file. JSON in, bytes out — deterministic, no raw OOXML. Keep the block set
// minimal; grow it only when a real deliverable needs more.

export type DocxBlock =
  | { type: "heading"; level?: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  // First row is treated as the header row.
  | { type: "table"; rows: string[][] };

export type DocxSpec = { title: string; blocks: DocxBlock[] };

const HEADINGS = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
} as const;

function renderTable(rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (cells, r) =>
        new TableRow({
          children: cells.map(
            (text) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text, bold: r === 0 })] })],
              })
          ),
        })
    ),
  });
}

function renderBlock(block: DocxBlock): Paragraph | Table {
  if (block.type === "heading") {
    return new Paragraph({ text: block.text, heading: HEADINGS[block.level ?? 2] });
  }
  if (block.type === "table") {
    return renderTable(block.rows);
  }
  return new Paragraph({ children: [new TextRun(block.text)] });
}

// What a tool hands us before validation — fields are optional per block type.
export type LooseDocxBlock = {
  type: "heading" | "paragraph" | "table";
  text?: string;
  level?: number;
  rows?: string[][];
};

/** Coerce loose tool input into a strict DocxSpec, dropping malformed blocks. */
export function buildDocxSpec(title: string, blocks: LooseDocxBlock[]): DocxSpec {
  const out: DocxBlock[] = [];
  for (const b of blocks) {
    if (b.type === "table" && b.rows?.length) out.push({ type: "table", rows: b.rows });
    else if (b.type === "heading" && b.text) {
      const level = b.level === 1 || b.level === 3 ? b.level : 2;
      out.push({ type: "heading", level, text: b.text });
    } else if (b.type === "paragraph" && b.text) out.push({ type: "paragraph", text: b.text });
  }
  return { title, blocks: out };
}

/** Build a .docx from the spec and return its bytes. */
export async function generateDocx(spec: DocxSpec): Promise<Uint8Array> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: spec.title, heading: HeadingLevel.TITLE }),
          ...spec.blocks.map(renderBlock),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}
