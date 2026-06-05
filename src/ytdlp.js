// Thin wrappers around the yt-dlp command-line tool.

import { spawnSync } from "node:child_process";

export function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    if (result.error.code === "ENOENT") {
      throw new Error(`${command} was not found on your PATH. Install it and try again (see Requirements in the README).`);
    }
    throw new Error(`Could not run ${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${command} failed:\n${result.stderr || result.stdout}`);
  }

  return result.stdout;
}

export function getVideoInfo(videoUrl) {
  const output = run("yt-dlp", ["--dump-json", "--skip-download", videoUrl]);
  return JSON.parse(output);
}

export function downloadCaptions(track, outputTemplate, url) {
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
}
