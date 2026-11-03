import test from "node:test";
import assert from "node:assert/strict";

import { resolve } from "node:path";
import { stripExtension, sanitizeName, resolveOutputPath } from "../src/paths.js";

test("stripExtension removes the final extension", () => {
  assert.equal(stripExtension("video.mp4"), "video");
  assert.equal(stripExtension("a.b.mp4"), "a.b");
  assert.equal(stripExtension("dir/file.srt"), "dir/file");
});

test("stripExtension leaves names without an extension", () => {
  assert.equal(stripExtension("noext"), "noext");
});

test("sanitizeName replaces illegal characters and collapses spaces", () => {
  assert.equal(sanitizeName("a/b:c"), "a b c");
  assert.equal(sanitizeName("  hello   world  "), "hello world");
  assert.equal(sanitizeName("a<>b"), "a b");
});

test("resolveOutputPath falls back to subtitle.srt when title sanitizes to empty", () => {
  assert.equal(resolveOutputPath({}, { title: "???" }), resolve("subtitle.srt"));
  assert.equal(resolveOutputPath({}, {}), resolve("subtitle.srt"));
  assert.equal(resolveOutputPath({ videoPath: "clip.mp4" }, { title: "Ignored" }), resolve("clip.srt"));
  assert.equal(resolveOutputPath({ explicitOut: "custom.srt", videoPath: "clip.mp4" }, {}), resolve("custom.srt"));
});
