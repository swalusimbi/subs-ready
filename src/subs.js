#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const args = process.argv.slice(2);

function usage(exitCode = 0) {
  console.log(`Usage:
  subs-ready <youtube-url> [--video file.mp4] [--out file.srt] [--lang en] [--keep-json]
`);
  process.exit(exitCode);
}

function readOption(name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} needs a value`);
  }
  return value;
}

function hasFlag(name) {
  return args.includes(name);
}

const positional = args.filter((arg, index) => {
  if (arg.startsWith("--")) return false;
  const prev = args[index - 1];
  return !prev?.startsWith("--");
});

const url = positional[0];
if (hasFlag("--help") || hasFlag("-h")) usage(0);
if (!url) usage(1);

const requestedLang = readOption("--lang");
const videoPath = readOption("--video");
const explicitOut = readOption("--out");
const keepJson = hasFlag("--keep-json");

function stripExtension(filePath) {
  const ext = extname(filePath);
  return ext ? filePath.slice(0, -ext.length) : filePath;
}

function sanitizeName(value) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim();
}

function formatTime(ms) {
  ms = Math.max(0, Math.round(ms));
  const hours = Math.floor(ms / 3_600_000);
  ms %= 3_600_000;
  const minutes = Math.floor(ms / 60_000);
  ms %= 60_000;
  const seconds = Math.floor(ms / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

function wrapLine(text) {
  const maxLineLength = 42;
  const lines = [""];

  for (const word of text.split(/\s+/)) {
    const index = lines.length - 1;
    const next = lines[index] ? `${lines[index]} ${word}` : word;

    if (next.length > maxLineLength && lines.length < 2) {
      lines.push(word);
    } else {
      lines[index] = next;
    }
  }

  return lines.join("\n");
}

function wrapText(text) {
  return text.split("\n").map((line) => wrapLine(line.trim())).filter(Boolean).join("\n");
}

function json3EventsToSrt(captionJson) {
  const cues = [];
  const events = (captionJson.events ?? [])
    .filter((event) => event.segs && Number.isFinite(event.tStartMs));

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const text = event.segs.map((segment) => segment.utf8 ?? "").join("").trim();
    if (!text) continue;

    const start = event.tStartMs;
    const nextStart = events[index + 1]?.tStartMs;
    let end = Number.isFinite(event.dDurationMs) ? start + event.dDurationMs : undefined;

    if (!end || end <= start) {
      end = nextStart ? nextStart - 80 : start + 2500;
    }

    cues.push({
      start,
      end: Math.max(start + 900, end),
      text: wrapText(text),
    });
  }

  return cues.map((cue, cueIndex) => {
    return `${cueIndex + 1}\n${formatTime(cue.start)} --> ${formatTime(cue.end)}\n${cue.text}\n`;
  }).join("\n");
}

function json3WordsToSrt(captionJson) {
  const words = [];

  for (const event of captionJson.events ?? []) {
    if (!event.segs || !Number.isFinite(event.tStartMs)) continue;

    for (const segment of event.segs) {
      const text = String(segment.utf8 ?? "").replace(/\s+/g, " ").trim();
      if (!text) continue;

      words.push({
        text,
        start: event.tStartMs + (Number.isFinite(segment.tOffsetMs) ? segment.tOffsetMs : 0),
      });
    }
  }

  words.sort((a, b) => a.start - b.start);

  const cues = [];
  let index = 0;

  while (index < words.length) {
    const start = words[index].start;
    const cueWords = [];
    let lastStart = start;

    while (index < words.length) {
      const word = words[index];
      const nextWord = words[index + 1];
      const candidate = [...cueWords.map((item) => item.text), word.text].join(" ");
      const duration = word.start - start;
      const nextGap = nextWord ? nextWord.start - word.start : 0;
      const shouldClose = duration >= 5200 || candidate.length >= 76 || cueWords.length >= 13;

      cueWords.push(word);
      lastStart = word.start;
      index += 1;

      if (shouldClose || nextGap >= 1200) break;
    }

    const nextStart = words[index]?.start;
    let end = nextStart ? Math.min(nextStart - 80, lastStart + 1400) : lastStart + 1400;
    if (end <= start) end = start + 900;

    cues.push({
      start,
      end,
      text: wrapLine(cueWords.map((word) => word.text).join(" ")),
    });
  }

  return cues.map((cue, cueIndex) => {
    return `${cueIndex + 1}\n${formatTime(cue.start)} --> ${formatTime(cue.end)}\n${cue.text}\n`;
  }).join("\n");
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(`${command} failed:\n${result.stderr || result.stdout}`);
  }

  return result.stdout;
}

function getVideoInfo(videoUrl) {
  const output = run("yt-dlp", ["--dump-json", "--skip-download", videoUrl]);
  return JSON.parse(output);
}

function getTitle(videoUrl) {
  try {
    const info = getVideoInfo(videoUrl);
    return sanitizeName(info.title || "subtitle");
  } catch {
    return "subtitle";
  }
}

function supportsJson3(track) {
  return Array.isArray(track) && track.some((format) => format.ext === "json3");
}

function availableLanguages(info) {
  return {
    manual: Object.keys(info.subtitles ?? {}),
    automatic: Object.keys(info.automatic_captions ?? {}),
  };
}

function findTrack(info, type, lang) {
  const tracks = type === "manual" ? info.subtitles : info.automatic_captions;
  const track = tracks?.[lang];
  return supportsJson3(track) ? { lang, type } : undefined;
}

function chooseTrack(info, preferredLang) {
  if (preferredLang) {
    const exactManual = findTrack(info, "manual", preferredLang);
    if (exactManual) return exactManual;

    const exactAutomatic = findTrack(info, "automatic", preferredLang);
    if (exactAutomatic) return exactAutomatic;
  }

  const manualPreferred = preferredLang ? [preferredLang] : ["en", "en-US", "en-GB", "en-orig"];
  const automaticPreferred = preferredLang ? [preferredLang] : ["en-orig", "en", "en-US", "en-GB"];

  for (const lang of manualPreferred) {
    const track = findTrack(info, "manual", lang);
    if (track) return track;
  }

  for (const lang of automaticPreferred) {
    const track = findTrack(info, "automatic", lang);
    if (track) return track;
  }

  const languages = availableLanguages(info);
  const englishManual = languages.manual.find((lang) => lang.startsWith("en") && findTrack(info, "manual", lang));
  if (englishManual) return { lang: englishManual, type: "manual" };

  const englishAutomatic = languages.automatic.find((lang) => lang.startsWith("en") && findTrack(info, "automatic", lang));
  if (englishAutomatic) return { lang: englishAutomatic, type: "automatic" };

  const manual = languages.manual.find((lang) => findTrack(info, "manual", lang));
  if (manual) return { lang: manual, type: "manual" };

  const automatic = languages.automatic.find((lang) => findTrack(info, "automatic", lang));
  if (automatic) return { lang: automatic, type: "automatic" };

  return undefined;
}

const outputPath = resolve(explicitOut
  ?? (videoPath ? `${stripExtension(videoPath)}.srt` : `${getTitle(url)}.srt`));

const outputDir = dirname(outputPath);
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

const workDir = join(tmpdir(), `subtitle-mvp-${Date.now()}`);
mkdirSync(workDir, { recursive: true });
const outputTemplate = join(workDir, "captions.%(ext)s");
const info = getVideoInfo(url);
const track = chooseTrack(info, requestedLang);

if (!track) {
  const languages = availableLanguages(info);
  throw new Error([
    requestedLang ? `No ${requestedLang} json3 captions were found.` : "No json3 captions were found.",
    `Manual languages: ${languages.manual.join(", ") || "none"}`,
    `Automatic languages: ${languages.automatic.join(", ") || "none"}`,
  ].join("\n"));
}

console.log(`Fetching ${track.type} ${track.lang} captions...`);

run("yt-dlp", [
  "--skip-download",
  track.type === "manual" ? "--write-subs" : "--write-auto-subs",
  "--sub-lang",
  track.lang,
  "--sub-format",
  "json3",
  "-o",
  outputTemplate,
  url,
]);

const jsonPath = join(workDir, `captions.${track.lang}.json3`);
if (!existsSync(jsonPath)) {
  throw new Error(`No ${track.lang} json3 captions were downloaded. Run: yt-dlp --list-subs ${url}`);
}

const captionJson = JSON.parse(readFileSync(jsonPath, "utf8"));
const srt = track.type === "manual" ? json3EventsToSrt(captionJson) : json3WordsToSrt(captionJson);

writeFileSync(outputPath, srt, "utf8");

if (keepJson) {
  const keptJsonPath = `${stripExtension(outputPath)}.${track.lang}.json3`;
  writeFileSync(keptJsonPath, readFileSync(jsonPath));
  console.log(`Kept JSON: ${keptJsonPath}`);
}

rmSync(workDir, { recursive: true, force: true });

console.log(`Wrote SRT: ${outputPath}`);
console.log(`Cues: ${srt.trim() ? (srt.match(/\n\d+\n/g) ?? []).length + 1 : 0}`);
