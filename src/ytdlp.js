// Thin wrappers around the yt-dlp command-line tool.

import { spawn } from "node:child_process";

export function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });

    child.on("error", (error) => {
      if (error.code === "ENOENT") {
        reject(new Error(`${command} was not found on your PATH. Install it and try again (see Requirements in the README).`));
      } else {
        reject(new Error(`Could not run ${command}: ${error.message}`));
      }
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`${command} failed:\n${stderr || stdout}`));
      } else {
        resolve(stdout);
      }
    });
  });
}

export async function getVideoInfo(videoUrl) {
  const output = await run("yt-dlp", ["--dump-json", "--skip-download", videoUrl]);
  return JSON.parse(output);
}

export async function downloadCaptions(track, outputTemplate, url) {
  await run("yt-dlp", [
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
