import * as mammoth from "mammoth";

// mammoth ships markdown conversion at runtime but omits it from its type defs.
const convertToMarkdown = (
  mammoth as unknown as {
    convertToMarkdown: (input: { buffer: Buffer }) => Promise<{ value: string }>;
  }
).convertToMarkdown;

// File-type helpers. Lawyers upload PDF + DOCX; we normalize to markdown for
// LLM context (tabular reviews, chat). DOCX is extracted in-process via mammoth;
// PDF is sent to the docling-serve sidecar (mammoth can't read PDF).

export type SupportedFileType = "pdf" | "docx" | "doc";

export function fileTypeFromName(name: string): SupportedFileType | null {
  const ext = name.toLowerCase().split(".").pop();
  if (ext === "pdf" || ext === "docx" || ext === "doc") return ext;
  return null;
}

/** Extract markdown from a document's bytes. */
export async function extractMarkdown(bytes: Buffer, fileType: SupportedFileType): Promise<string> {
  if (fileType === "docx" || fileType === "doc") {
    const { value } = await convertToMarkdown({ buffer: bytes });
    return value;
  }
  return extractPdfViaDocling(bytes);
}

async function extractPdfViaDocling(bytes: Buffer): Promise<string> {
  const url = process.env.DOCLING_URL || "http://localhost:5001/v1/convert/source";
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      options: { to_formats: ["md"] },
      file_sources: [{ base64_string: bytes.toString("base64"), filename: "doc.pdf" }],
    }),
  });
  if (!res.ok) throw new Error(`docling-serve responded ${res.status}`);
  const data = (await res.json()) as { document?: { md_content?: string } };
  return data.document?.md_content ?? "";
}
