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

export function videoInfoArgs(videoUrl) {
  return ["--dump-json", "--skip-download", "--no-playlist", "--", videoUrl];
}

export function captionDownloadArgs(track, outputTemplate, infoPath) {
  return [
    "--skip-download",
    "--no-playlist",
    "--load-info-json",
    infoPath,
    track.type === "manual" ? "--write-subs" : "--write-auto-subs",
    "--sub-lang",
    track.lang,
    "--sub-format",
    "json3",
    "-o",
    outputTemplate,
  ];
}

export async function getVideoInfo(videoUrl) {
  const raw = await run("yt-dlp", videoInfoArgs(videoUrl));
  return { info: JSON.parse(raw), raw };
}

export async function downloadCaptions(track, outputTemplate, infoPath) {
  await run("yt-dlp", captionDownloadArgs(track, outputTemplate, infoPath));
}
