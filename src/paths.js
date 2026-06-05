// Helpers for turning titles and paths into safe subtitle filenames.

import { extname } from "node:path";

export function stripExtension(filePath) {
  const ext = extname(filePath);
  return ext ? filePath.slice(0, -ext.length) : filePath;
}

export function sanitizeName(value) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim();
}
