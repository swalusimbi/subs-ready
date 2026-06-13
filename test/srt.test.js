import test from "node:test";
import assert from "node:assert/strict";

import { formatTime, wrapLine, wrapText, countCues, json3EventsToSrt, json3WordsToSrt } from "../src/srt.js";

test("formatTime renders an SRT timestamp", () => {
  assert.equal(formatTime(0), "00:00:00,000");
  assert.equal(formatTime(1500), "00:00:01,500");
  assert.equal(formatTime(3661500), "01:01:01,500");
  assert.equal(formatTime(-100), "00:00:00,000");
});

test("wrapLine keeps short text on one line", () => {
  assert.equal(wrapLine("hello world"), "hello world");
});

test("wrapLine breaks long text into at most two lines", () => {
  const long = Array(20).fill("word").join(" ");
  assert.equal(wrapLine(long).split("\n").length, 2);
});

test("wrapText drops blank lines", () => {
  assert.equal(wrapText("a\n\nb"), "a\nb");
});

test("countCues counts the timestamp arrows", () => {
  assert.equal(countCues(""), 0);
  assert.equal(countCues("x --> y\nz --> w"), 2);
});

test("json3EventsToSrt keeps manual timing", () => {
  const json = {
    events: [
      { tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: "Hello" }] },
      { tStartMs: 2000, dDurationMs: 1500, segs: [{ utf8: "World" }] },
    ],
  };
  const srt = json3EventsToSrt(json);
  assert.equal(countCues(srt), 2);
  assert.match(srt, /00:00:00,000 --> 00:00:01,000/);
  assert.ok(srt.includes("Hello"));
  assert.ok(srt.includes("World"));
});

test("json3EventsToSrt skips empty cues", () => {
  const json = {
    events: [
      { tStartMs: 0, segs: [{ utf8: "" }] },
      { tStartMs: 1000, dDurationMs: 500, segs: [{ utf8: "Hi" }] },
    ],
  };
  const srt = json3EventsToSrt(json);
  assert.equal(countCues(srt), 1);
  assert.ok(srt.includes("Hi"));
});

test("json3WordsToSrt groups words into cues", () => {
  const json = {
    events: [
      { tStartMs: 0, segs: [{ utf8: "Hello", tOffsetMs: 0 }, { utf8: " world", tOffsetMs: 500 }] },
    ],
  };
  const srt = json3WordsToSrt(json);
  assert.equal(countCues(srt), 1);
  assert.ok(srt.includes("Hello world"));
});

test("json3WordsToSrt handles no events", () => {
  assert.equal(json3WordsToSrt({}), "");
  assert.equal(countCues(json3WordsToSrt({})), 0);
});
