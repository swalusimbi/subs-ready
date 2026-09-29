#!/usr/bin/env node

// subs-ready: fetch a YouTube caption track with yt-dlp and write a clean .srt.

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

import { parseArgs, languageName, formatLanguages } from "./cli.js";
import { getVideoInfo, downloadCaptions } from "./ytdlp.js";
import { chooseTrack, availableLanguages } from "./tracks.js";
import { json3EventsToSrt, json3WordsToSrt } from "./srt.js";
import { stripExtension, sanitizeName } from "./paths.js";
import { assertOutputAvailable, writeSubtitles } from "./output.js";

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

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const info = await withDots("Reading caption tracks", () => getVideoInfo(options.url));
  if (options.listLangs) {
    console.log(formatLanguages(info));
    return;
  }

  const outputPath = resolveOutputPath(options, info);
  assertOutputAvailable(outputPath, options.force);

  const track = chooseTrack(info, options.requestedLang);

  if (!track) {
    const languages = availableLanguages(info);
    throw new Error([
      options.requestedLang
        ? `Could not find "${options.requestedLang}" captions for this video.`
        : "Could not find any captions for this video.",
      `Available manual languages: ${languages.manual.join(", ") || "none"}`,
      `Available automatic languages: ${languages.automatic.join(", ") || "none"}`,
      ...(languages.manual.length || languages.automatic.length
        ? ["Choose a listed language with --lang <code>."]
        : []),
    ].join("\n"));
  }

  const keptJsonPath = options.keepJson ? `${stripExtension(outputPath)}.${track.lang}.json3` : undefined;
  if (keptJsonPath) assertOutputAvailable(keptJsonPath, options.force);

  const workDir = mkdtempSync(join(tmpdir(), "subs-ready-"));
  try {
    const outputTemplate = join(workDir, "captions.%(ext)s");
    await withDots(`Downloading ${track.type} ${languageName(track.lang)} captions`, () => downloadCaptions(track, outputTemplate, options.url));

    const jsonPath = join(workDir, `captions.${track.lang}.json3`);
    if (!existsSync(jsonPath)) {
      throw new Error(`The ${track.lang} captions could not be downloaded. Try: yt-dlp --list-subs ${options.url}`);
    }

    const rawCaptions = readFileSync(jsonPath, "utf8");
    const captionJson = JSON.parse(rawCaptions);
    const srt = track.type === "manual" ? json3EventsToSrt(captionJson) : json3WordsToSrt(captionJson);
    const cueCount = writeSubtitles({
      outputPath,
      srt,
      force: options.force,
      keptJson: keptJsonPath ? { path: keptJsonPath, content: rawCaptions } : undefined,
    });

    if (keptJsonPath) console.log(`Kept JSON: ${keptJsonPath}`);
    console.log(`Wrote SRT: ${outputPath}`);
    console.log(`Cues: ${cueCount}`);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
