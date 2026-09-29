import test from "node:test";
import assert from "node:assert/strict";

import { parseArgs } from "../src/cli.js";

test("parses a bare url", () => {
  const options = parseArgs(["https://x"]);
  assert.equal(options.url, "https://x");
  assert.equal(options.keepJson, false);
  assert.equal(options.force, false);
  assert.equal(options.requestedLang, undefined);
});

test("force is a flag before or after the url", () => {
  for (const args of [["--force", "https://x"], ["https://x", "--force"]]) {
    const options = parseArgs(args);
    assert.equal(options.url, "https://x");
    assert.equal(options.force, true);
  }
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

test("accepts equals syntax and preserves equals signs inside values", () => {
  const options = parseArgs(["--lang=fr", "https://x?v=id", "--out=dir/a=b.srt", "--video=my video.mp4"]);
  assert.equal(options.url, "https://x?v=id");
  assert.equal(options.requestedLang, "fr");
  assert.equal(options.explicitOut, "dir/a=b.srt");
  assert.equal(options.videoPath, "my video.mp4");
});

test("rejects unknown options before or after the url", () => {
  for (const flag of ["--otu", "--unknown=value", "-x"]) {
    for (const args of [[flag, "https://x"], ["https://x", flag]]) {
      assert.throws(() => parseArgs(args), /Unknown option .*subs-ready --help/);
    }
  }
});

test("rejects extra urls and stray positional arguments", () => {
  for (const extra of ["https://second", "chosen.srt"]) {
    assert.throws(() => parseArgs(["https://x", extra]), /Unexpected argument .*exactly one YouTube URL/);
  }
});

test("rejects missing and empty values for every value option", () => {
  for (const flag of ["--lang", "--video", "--out"]) {
    for (const tail of [[], [""], ["--force"], ["-h"], ["--"]]) {
      assert.throws(() => parseArgs(["https://x", flag, ...tail]), /needs a value/);
    }
    assert.throws(() => parseArgs(["https://x", `${flag}=`]), /needs a value/);
  }
});

test("rejects repeated value options including mixed syntax", () => {
  for (const flag of ["--lang", "--video", "--out"]) {
    assert.throws(() => parseArgs(["https://x", flag, "first", `${flag}=second`]), /may only be supplied once/);
    assert.throws(() => parseArgs(["https://x", `${flag}=first`, flag, "second"]), /may only be supplied once/);
  }
});

test("rejects values attached to boolean flags", () => {
  for (const flag of ["--force", "--keep-json"]) {
    assert.throws(() => parseArgs(["https://x", `${flag}=false`]), /does not accept a value/);
  }
});

test("requires a url when only options are supplied", () => {
  for (const args of [["--force"], ["--lang=fr"], ["--out", "out.srt"]]) {
    assert.throws(() => parseArgs(args), /A YouTube URL is required/);
  }
});

test("allows a dash-prefixed path with equals syntax", () => {
  assert.equal(parseArgs(["https://x", "--out=-captions.srt"]).explicitOut, "-captions.srt");
});

test("the option terminator ends option parsing", () => {
  assert.equal(parseArgs(["--force", "--", "https://x"]).force, true);
  assert.throws(() => parseArgs(["https://x", "--", "--force"]), /Unexpected argument/);
  assert.throws(() => parseArgs(["https://x", "--", "--help"]), /Unexpected argument/);
});
