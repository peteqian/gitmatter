import { XMLBuilder, XMLParser } from "fast-xml-parser";

export type XNode = Record<string, unknown>;

export const ATTR_KEY = ":@";
export const TEXT_KEY = "#text";

export function createParser() {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    preserveOrder: true,
    trimValues: false,
    parseAttributeValue: false,
    processEntities: true,
  });
}

export function createBuilder() {
  return new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    preserveOrder: true,
    suppressEmptyNode: false,
    processEntities: true,
  });
}

export function elName(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  for (const key of Object.keys(node as XNode)) {
    if (key === ATTR_KEY || key === TEXT_KEY) continue;
    return key;
  }
  return null;
}

export function isTextNode(node: unknown): node is { [TEXT_KEY]: string } {
  if (!node || typeof node !== "object") return false;
  const obj = node as XNode;
  return TEXT_KEY in obj && elName(node) === null;
}

export function elChildren(node: unknown): XNode[] {
  const name = elName(node);
  if (!name) return [];
  const value = (node as XNode)[name];
  return Array.isArray(value) ? (value as XNode[]) : [];
}

export function setChildren(node: XNode, children: XNode[]): void {
  const name = elName(node);
  if (!name) return;
  node[name] = children;
}

export function elAttrs(node: unknown): Record<string, string> {
  if (!node || typeof node !== "object") return {};
  const attrs = (node as XNode)[ATTR_KEY];
  return (attrs as Record<string, string>) ?? {};
}

export function makeEl(
  name: string,
  children: XNode[] = [],
  attrs?: Record<string, string>
): XNode {
  const el: XNode = { [name]: children };
  if (attrs) {
    const attrObj: Record<string, string> = {};
    for (const [k, v] of Object.entries(attrs)) {
      attrObj[`@_${k}`] = v;
    }
    el[ATTR_KEY] = attrObj;
  }
  return el;
}

export function makeText(s: string): XNode {
  return { [TEXT_KEY]: s };
}

export function cloneNode<T>(node: T): T {
  return JSON.parse(JSON.stringify(node)) as T;
}

export function getTextContent(wtEl: XNode): string {
  let out = "";
  for (const child of elChildren(wtEl)) {
    if (isTextNode(child)) out += String(child[TEXT_KEY] ?? "");
  }
  return out;
}

export function findBody(doc: XNode[]): XNode[] | null {
  for (const top of doc) {
    if (elName(top) !== "w:document") continue;
    for (const child of elChildren(top)) {
      if (elName(child) === "w:body") return elChildren(child);
    }
  }
  return null;
}

export function replaceBody(doc: XNode[], bodyChildren: XNode[]): void {
  for (const top of doc) {
    if (elName(top) !== "w:document") continue;
    for (const child of elChildren(top)) {
      if (elName(child) === "w:body") setChildren(child, bodyChildren);
    }
  }
}

export function maxTrackedId(doc: XNode[]): number {
  let max = 0;

  function visit(node: unknown) {
    const name = elName(node);
    if (!name) return;
    if (name === "w:ins" || name === "w:del") {
      const raw = elAttrs(node)["@_w:id"];
      if (raw != null) {
        const id = parseInt(String(raw), 10);
        if (Number.isFinite(id) && id > max) max = id;
      }
    }
    for (const child of elChildren(node)) visit(child);
  }

  for (const top of doc) visit(top);
  return max;
}

export function ensureXmlDeclaration(xml: string): string {
  if (xml.startsWith("<?xml")) return xml;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${xml}`;
}
