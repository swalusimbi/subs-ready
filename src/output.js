// Validate subtitle output before creating or replacing files.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { countCues } from "./srt.js";

function alreadyExists(path) {
  return new Error(`File already exists: ${path}\nChoose another output path or use --force to overwrite it.`);
}

export function assertOutputAvailable(path, force = false) {
  if (!force && existsSync(path)) throw alreadyExists(path);
}

function writeOutput(path, content, force) {
  try {
    // Exclusive creation also protects files created after the initial check.
    writeFileSync(path, content, { encoding: "utf8", flag: force ? "w" : "wx" });
  } catch (error) {
    if (error.code === "EEXIST") throw alreadyExists(path);
    throw error;
  }
}

export function writeSubtitles({ outputPath, srt, force = false, keptJson }) {
  const cueCount = countCues(srt);
  if (cueCount === 0) {
    throw new Error("No usable subtitle cues were found. No output files were written.");
  }

  assertOutputAvailable(outputPath, force);
  if (keptJson) assertOutputAvailable(keptJson.path, force);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeOutput(outputPath, srt, force);
  if (keptJson) writeOutput(keptJson.path, keptJson.content, force);
  return cueCount;
}
