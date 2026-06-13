import test from "node:test";
import assert from "node:assert/strict";

import { parseArgs } from "../src/cli.js";

test("parses a bare url", () => {
  const options = parseArgs(["https://x"]);
  assert.equal(options.url, "https://x");
  assert.equal(options.keepJson, false);
  assert.equal(options.requestedLang, undefined);
});

test("a flag before the url does not swallow it", () => {
  const options = parseArgs(["--keep-json", "https://x"]);
  assert.equal(options.url, "https://x");
  assert.equal(options.keepJson, true);
});

test("reads value options in any position", () => {
  const options = parseArgs(["https://x", "--lang", "en", "--video", "v.mp4", "--out", "o.srt"]);
  assert.equal(options.requestedLang, "en");
  assert.equal(options.videoPath, "v.mp4");
  assert.equal(options.explicitOut, "o.srt");
});

test("throws when a value option has no value", () => {
  assert.throws(() => parseArgs(["https://x", "--lang"]), /needs a value/);
});
