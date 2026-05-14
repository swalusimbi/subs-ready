import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { tmpdir } from "node:os";

const args = process.argv.slice(2);

function usage(exitCode = 0) {
  console.log(`Usage:
  npm run subs -- <youtube-url> [--video file.mp4] [--out file.srt] [--lang en-orig] [--keep-json]
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

const lang = readOption("--lang") ?? "en-orig";
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

function wrapText(text) {
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

function json3ToSrt(captionJson) {
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
      text: wrapText(cueWords.map((word) => word.text).join(" ")),
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

function getTitle(videoUrl) {
  try {
    const title = run("yt-dlp", ["--print", "title", "--skip-download", videoUrl]).trim();
    return sanitizeName(title || "subtitle");
  } catch {
    return "subtitle";
  }
}

const outputPath = resolve(explicitOut
  ?? (videoPath ? `${stripExtension(videoPath)}.srt` : `${getTitle(url)}.srt`));

const outputDir = dirname(outputPath);
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

const workDir = join(tmpdir(), `subtitle-mvp-${Date.now()}`);
mkdirSync(workDir, { recursive: true });
const outputTemplate = join(workDir, "captions.%(ext)s");

console.log(`Fetching ${lang} captions...`);

run("yt-dlp", [
  "--skip-download",
  "--write-auto-subs",
  "--sub-lang",
  lang,
  "--sub-format",
  "json3",
  "-o",
  outputTemplate,
  url,
]);

const jsonPath = join(workDir, `captions.${lang}.json3`);
if (!existsSync(jsonPath)) {
  throw new Error(`No ${lang} json3 captions were downloaded. Try --lang en or run: yt-dlp --list-subs ${url}`);
}

const captionJson = JSON.parse(readFileSync(jsonPath, "utf8"));
const srt = json3ToSrt(captionJson);

writeFileSync(outputPath, srt, "utf8");

if (keepJson) {
  const keptJsonPath = `${stripExtension(outputPath)}.${lang}.json3`;
  writeFileSync(keptJsonPath, readFileSync(jsonPath));
  console.log(`Kept JSON: ${keptJsonPath}`);
}

rmSync(workDir, { recursive: true, force: true });

console.log(`Wrote SRT: ${outputPath}`);
console.log(`Cues: ${srt.trim() ? (srt.match(/\n\d+\n/g) ?? []).length + 1 : 0}`);
