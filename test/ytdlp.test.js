import test from "node:test";
import assert from "node:assert/strict";

import { videoInfoArgs, captionDownloadArgs } from "../src/ytdlp.js";

test("video info command scopes extraction to a single video and ends option parsing", () => {
  assert.deepEqual(videoInfoArgs("https://youtu.be/example"), [
    "--dump-json",
    "--skip-download",
    "--no-playlist",
    "--",
    "https://youtu.be/example",
  ]);
});

test("caption download command reuses cached info JSON for manual tracks", () => {
  assert.deepEqual(
    captionDownloadArgs({ lang: "en", type: "manual" }, "/tmp/captions.%(ext)s", "/tmp/info.json"),
    [
      "--skip-download",
      "--no-playlist",
      "--load-info-json",
      "/tmp/info.json",
      "--write-subs",
      "--sub-lang",
      "en",
      "--sub-format",
      "json3",
      "-o",
      "/tmp/captions.%(ext)s",
    ],
  );
});

test("caption download command reuses cached info JSON for automatic tracks", () => {
  assert.deepEqual(
    captionDownloadArgs({ lang: "en-orig", type: "automatic" }, "/tmp/captions.%(ext)s", "/tmp/info.json"),
    [
      "--skip-download",
      "--no-playlist",
      "--load-info-json",
      "/tmp/info.json",
      "--write-auto-subs",
      "--sub-lang",
      "en-orig",
      "--sub-format",
      "json3",
      "-o",
      "/tmp/captions.%(ext)s",
    ],
  );
});
