import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { assertOutputAvailable, writeSubtitles } from "../src/output.js";
import { json3EventsToSrt, json3WordsToSrt } from "../src/srt.js";

const srt = "1\n00:00:00,000 --> 00:00:01,000\nHello\n";

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "subs-ready-output-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return {
    dir,
    outputPath: join(dir, "video.srt"),
    keptJson: { path: join(dir, "video.en.json3"), content: '{"events":[]}' },
  };
}

test("writes valid subtitles and optional raw captions to a new folder", (t) => {
  const { dir } = fixture(t);
  const outputPath = join(dir, "nested", "video.srt");
  const keptJson = { path: join(dir, "nested", "video.en.json3"), content: "raw captions" };
  assert.equal(writeSubtitles({ outputPath, srt, keptJson }), 1);
  assert.equal(readFileSync(outputPath, "utf8"), srt);
  assert.equal(readFileSync(keptJson.path, "utf8"), keptJson.content);
});

test("refuses to replace existing subtitles and explains how to proceed", (t) => {
  const { outputPath, keptJson } = fixture(t);
  writeFileSync(outputPath, "Edited subtitles");
  assert.throws(() => writeSubtitles({ outputPath, srt, keptJson }), (error) => {
    assert.ok(error.message.includes(outputPath));
    assert.match(error.message, /another output path or use --force/);
    return true;
  });
  assert.equal(readFileSync(outputPath, "utf8"), "Edited subtitles");
  assert.equal(existsSync(keptJson.path), false);
});

test("checks the JSON destination before writing subtitles", (t) => {
  const { outputPath, keptJson } = fixture(t);
  writeFileSync(keptJson.path, "Saved raw captions");
  assert.throws(() => writeSubtitles({ outputPath, srt, keptJson }), /File already exists/);
  assert.equal(existsSync(outputPath), false);
  assert.equal(readFileSync(keptJson.path, "utf8"), "Saved raw captions");
});

test("force replaces existing subtitles and raw captions", (t) => {
  const { outputPath, keptJson } = fixture(t);
  writeFileSync(outputPath, "Old subtitles");
  writeFileSync(keptJson.path, "Old captions");
  assert.equal(writeSubtitles({ outputPath, srt, keptJson, force: true }), 1);
  assert.equal(readFileSync(outputPath, "utf8"), srt);
  assert.equal(readFileSync(keptJson.path, "utf8"), keptJson.content);
});

test("empty manual and automatic captions preserve existing files even with force", (t) => {
  const { outputPath, keptJson } = fixture(t);
  writeFileSync(outputPath, "Edited subtitles");
  writeFileSync(keptJson.path, "Saved raw captions");
  for (const convert of [json3EventsToSrt, json3WordsToSrt]) {
    for (const captions of [{ events: [] }, { events: [{ tStartMs: 0, segs: [{ utf8: " \n" }] }] }]) {
      assert.throws(() => writeSubtitles({
        outputPath, srt: convert(captions), keptJson, force: true,
      }), /No usable subtitle cues/);
      assert.equal(readFileSync(outputPath, "utf8"), "Edited subtitles");
      assert.equal(readFileSync(keptJson.path, "utf8"), "Saved raw captions");
    }
  }
});

test("empty captions create no files or output directories", (t) => {
  const { dir } = fixture(t);
  const outputPath = join(dir, "nested", "video.srt");
  for (const force of [false, true]) {
    assert.throws(() => writeSubtitles({ outputPath, srt: "", force }), /No usable subtitle cues/);
    assert.equal(existsSync(join(dir, "nested")), false);
  }
});

test("a file appearing after the initial check is protected", (t) => {
  const { outputPath } = fixture(t);
  assertOutputAvailable(outputPath);
  writeFileSync(outputPath, "Another process wrote this");
  assert.throws(() => writeSubtitles({ outputPath, srt }), /File already exists/);
  assert.equal(readFileSync(outputPath, "utf8"), "Another process wrote this");
});
