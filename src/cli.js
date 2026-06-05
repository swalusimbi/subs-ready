// Parse the subs-ready command-line arguments.

// Options that consume the following argument as their value. Everything else
// is a valueless flag, so the argument after it can still be the positional URL.
const VALUE_OPTIONS = ["--lang", "--video", "--out"];

export function usage(exitCode = 0) {
  console.log(`Usage:
  subs-ready <youtube-url> [--video file.mp4] [--out file.srt] [--lang en] [--keep-json]
`);
  process.exit(exitCode);
}

function readOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} needs a value`);
  }
  return value;
}

function hasFlag(args, name) {
  return args.includes(name);
}

export function parseArgs(args) {
  if (hasFlag(args, "--help") || hasFlag(args, "-h")) usage(0);

  const positional = args.filter((arg, index) => {
    if (arg.startsWith("--")) return false;
    const prev = args[index - 1];
    return !VALUE_OPTIONS.includes(prev);
  });

  const url = positional[0];
  if (!url) usage(1);

  return {
    url,
    requestedLang: readOption(args, "--lang"),
    videoPath: readOption(args, "--video"),
    explicitOut: readOption(args, "--out"),
    keepJson: hasFlag(args, "--keep-json"),
  };
}
