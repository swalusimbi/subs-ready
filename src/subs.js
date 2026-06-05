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

function main() {
  const options = parseArgs(process.argv.slice(2));

  const info = getVideoInfo(options.url);
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
      options.requestedLang ? `No ${options.requestedLang} json3 captions were found.` : "No json3 captions were found.",
      `Manual languages: ${languages.manual.join(", ") || "none"}`,
      `Automatic languages: ${languages.automatic.join(", ") || "none"}`,
    ].join("\n"));
  }

  console.log(`Fetching ${track.type} ${track.lang} captions...`);
  downloadCaptions(track, outputTemplate, options.url);

  const jsonPath = join(workDir, `captions.${track.lang}.json3`);
  if (!existsSync(jsonPath)) {
    throw new Error(`No ${track.lang} json3 captions were downloaded. Run: yt-dlp --list-subs ${options.url}`);
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

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
