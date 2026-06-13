import test from "node:test";
import assert from "node:assert/strict";

import { stripExtension, sanitizeName } from "../src/paths.js";

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
