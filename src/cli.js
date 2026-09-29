// Command-line arguments and terminal messages.

import { availableLanguages } from "./tracks.js";

const VALUE_OPTIONS = new Map([
  ["--lang", "requestedLang"],
  ["--video", "videoPath"],
  ["--out", "explicitOut"],
]);
const FLAG_OPTIONS = new Map([
  ["--keep-json", "keepJson"],
  ["--force", "force"],
  ["--list-langs", "listLangs"],
]);

export function usage(exitCode = 0) {
  console.log(`Turn YouTube captions into a readable .srt subtitle file.

Usage:
  subs-ready <youtube-url> [options]

Options:
  --video <path>  Write beside this video using its filename with .srt
  --out <path>    Write to this path; takes precedence over --video
  --lang <code>   Use this exact language code or fail if unavailable
  --list-langs    List usable manual and automatic caption languages
  --keep-json     Save raw captions alongside the SRT
  --force         Allow existing output files to be overwritten
  -h, --help      Show this help and exit

Defaults:
  Write <video title>.srt in the current folder.
  Prefer manual English captions, then automatic English captions.
  Fall back to any usable track when English is unavailable.
  With --lang, prefer manual captions for that code, then automatic captions.
  Existing files are protected. Empty captions fail even with --force.

--list-langs fetches track information and exits without writing files.
It lists all usable languages regardless of --lang or output options.
Value options accept both --lang fr and --lang=fr. Quote paths with spaces.

Examples:
  subs-ready "https://www.youtube.com/watch?v=VIDEO_ID"
  subs-ready "https://www.youtube.com/watch?v=VIDEO_ID" --video "my video.mp4"
  subs-ready "https://www.youtube.com/watch?v=VIDEO_ID" --out "captions.srt"
  subs-ready "https://www.youtube.com/watch?v=VIDEO_ID" --list-langs
  subs-ready "https://www.youtube.com/watch?v=VIDEO_ID" --lang fr
`);
  process.exit(exitCode);
}

export function parseArgs(args) {
  if (args.length === 0) usage(1);

  const options = {
    url: undefined,
    requestedLang: undefined,
    videoPath: undefined,
    explicitOut: undefined,
    keepJson: false,
    force: false,
    listLangs: false,
  };
  let optionsEnded = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!optionsEnded && arg === "--") {
      optionsEnded = true;
      continue;
    }
    if (!optionsEnded && (arg === "--help" || arg === "-h")) usage(0);

    if (!optionsEnded && arg.startsWith("-")) {
      const equalsIndex = arg.indexOf("=");
      const name = equalsIndex === -1 ? arg : arg.slice(0, equalsIndex);
      if (VALUE_OPTIONS.has(name)) {
        const key = VALUE_OPTIONS.get(name);
        if (options[key] !== undefined) {
          throw new Error(`${name} may only be supplied once.`);
        }
        const value = equalsIndex === -1 ? args[index + 1] : arg.slice(equalsIndex + 1);
        if (!value || (equalsIndex === -1 && value.startsWith("-"))) {
          throw new Error(`${name} needs a value. Use ${name}=<value> or ${name} <value>.`);
        }
        options[key] = value;
        if (equalsIndex === -1) index += 1;
      } else if (FLAG_OPTIONS.has(name)) {
        if (equalsIndex !== -1) throw new Error(`${name} does not accept a value.`);
        options[FLAG_OPTIONS.get(name)] = true;
      } else {
        throw new Error(`Unknown option "${name}". Run subs-ready --help for usage.`);
      }
      continue;
    }

    if (options.url !== undefined) {
      throw new Error(`Unexpected argument "${arg}". Provide exactly one YouTube URL.`);
    }
    options.url = arg;
  }

  if (!options.url) throw new Error("A YouTube URL is required. Run subs-ready --help for usage.");
  return options;
}

// Keep the exact code in listings even when variants share a readable name.
export function languageName(code) {
  const base = code.replace(/-orig$/i, "");
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(base);
    if (name && name !== base) return name;
  } catch {
    // Unknown codes are still useful as arguments to --lang.
  }
  return base;
}

export function formatLanguages(info) {
  const languages = availableLanguages(info);
  const lines = ["Usable caption languages:"];
  for (const [type, codes] of Object.entries(languages)) {
    lines.push(`\n${type === "manual" ? "Manual" : "Automatic"} captions:`);
    lines.push(...(codes.length
      ? [...codes].sort().map((code) => `  ${code} (${languageName(code)})`)
      : ["  none"]));
  }
  lines.push(languages.manual.length || languages.automatic.length
    ? "\nChoose a language with --lang <code>."
    : "\nNo usable caption tracks were found for this video.");
  return lines.join("\n");
}
