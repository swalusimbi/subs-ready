#!/usr/bin/env node

// subs-ready: fetch a YouTube caption track with yt-dlp and write a clean .srt.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

import { parseArgs } from "./cli.js";
import { getVideoInfo, downloadCaptions } from "./ytdlp.js";
import { chooseTrack, availableLanguages } from "./tracks.js";
import { json3EventsToSrt, json3WordsToSrt, countCues } from "./srt.js";
import { stripExtension, sanitizeName } from "./paths.js";

function resolveOutputPath({ explicitOut, videoPath }, info) {
  if (explicitOut) return resolve(explicitOut);
  if (videoPath) return resolve(`${stripExtension(videoPath)}.srt`);
  return resolve(`${sanitizeName(info.title || "subtitle")}.srt`);
}

// Show a label with trailing dots while a slow step runs, so the wait is not
// silent. Falls back to a single line when output is not a terminal.
async function withDots(label, task) {
  if (!process.stdout.isTTY) {
    console.log(`${label} ...`);
    return task();
  }

  process.stdout.write(`${label} `);
  const timer = setInterval(() => process.stdout.write("."), 800);
  try {
    return await task();
  } finally {
    clearInterval(timer);
    process.stdout.write("\n");
  }
}

// Turn a YouTube caption language code into a readable name, e.g.
// "en-orig" -> "English", "en-US" -> "American English".
function languageName(code) {
  const base = code.replace(/-orig$/i, "");
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(base);
    if (name && name !== base) return name;
  } catch {
    // Intl could not resolve the code; fall back to the raw value below.
  }
  return base;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const info = await withDots("Reading caption tracks", () => getVideoInfo(options.url));
  const outputPath = resolveOutputPath(options, info);
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const workDir = join(tmpdir(), `subtitle-mvp-${Date.now()}`);
  mkdirSync(workDir, { recursive: true });
  const outputTemplate = join(workDir, "captions.%(ext)s");

  const track = chooseTrack(info, options.requestedLang);

  if (!track) {
    const languages = availableLanguages(info);
    throw new Error([
      options.requestedLang
        ? `Could not find "${options.requestedLang}" captions for this video.`
        : "Could not find any captions for this video.",
      `Available manual languages: ${languages.manual.join(", ") || "none"}`,
      `Available automatic languages: ${languages.automatic.join(", ") || "none"}`,
    ].join("\n"));
  }

  await withDots(`Downloading ${track.type} ${languageName(track.lang)} captions`, () => downloadCaptions(track, outputTemplate, options.url));

  const jsonPath = join(workDir, `captions.${track.lang}.json3`);
  if (!existsSync(jsonPath)) {
    throw new Error(`The ${track.lang} captions could not be downloaded. Try: yt-dlp --list-subs ${options.url}`);
  }

  const captionJson = JSON.parse(readFileSync(jsonPath, "utf8"));
  const srt = track.type === "manual" ? json3EventsToSrt(captionJson) : json3WordsToSrt(captionJson);

  writeFileSync(outputPath, srt, "utf8");

  if (options.keepJson) {
    const keptJsonPath = `${stripExtension(outputPath)}.${track.lang}.json3`;
    writeFileSync(keptJsonPath, readFileSync(jsonPath));
    console.log(`Kept JSON: ${keptJsonPath}`);
  }

  rmSync(workDir, { recursive: true, force: true });

  console.log(`Wrote SRT: ${outputPath}`);
  console.log(`Cues: ${countCues(srt)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
