// Helpers for turning titles and paths into safe subtitle filenames.

import { extname, resolve } from "node:path";

export function stripExtension(filePath) {
  const ext = extname(filePath);
  return ext ? filePath.slice(0, -ext.length) : filePath;
}

export function sanitizeName(value) {
  return String(value ?? "").replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim();
}

export function resolveOutputPath({ explicitOut, videoPath }, info = {}) {
  if (explicitOut) return resolve(explicitOut);
  if (videoPath) return resolve(`${stripExtension(videoPath)}.srt`);
  const safeTitle = sanitizeName(info.title) || "subtitle";
  return resolve(`${safeTitle}.srt`);
}
