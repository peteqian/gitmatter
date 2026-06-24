import JSZip from "jszip";

// Some Word archives store paths as `word\document.xml`. Keep writes on the
// same path style the archive already uses.
export function getZipEntry(zip: JSZip, pathSlash: string) {
  const direct = zip.file(pathSlash);
  if (direct) return direct;
  return zip.file(pathSlash.replace(/\//g, "\\"));
}

export function setZipEntry(zip: JSZip, pathSlash: string, content: string | Buffer): void {
  const backslash = pathSlash.replace(/\//g, "\\");
  if (!zip.file(pathSlash) && zip.file(backslash)) {
    zip.file(backslash, content);
    return;
  }
  zip.file(pathSlash, content);
}
