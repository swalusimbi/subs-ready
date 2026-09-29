// Parse the subs-ready command-line arguments.

const VALUE_OPTIONS = new Map([
  ["--lang", "requestedLang"],
  ["--video", "videoPath"],
  ["--out", "explicitOut"],
]);
const FLAG_OPTIONS = new Map([
  ["--keep-json", "keepJson"],
  ["--force", "force"],
]);

export function usage(exitCode = 0) {
  console.log(`Usage:
  subs-ready <youtube-url> [--video file.mp4] [--out file.srt] [--lang en] [--keep-json] [--force]

  --lang <code>  Use this exact caption language code or fail if unavailable
  --force        Overwrite existing output files (empty captions are always rejected)
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
