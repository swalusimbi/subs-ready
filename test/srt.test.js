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

test("wrapLine balances oversized text across two lines without losing words", () => {
  const long = Array(20).fill("word").join(" ");
  const lines = wrapLine(long).split("\n");
  assert.deepEqual(lines.map((line) => line.length), [49, 49]);
  assert.equal(lines.join(" "), long);
});

test("wrapText reflows existing newlines and repeated whitespace", () => {
  assert.equal(wrapText("  a\n\nb\r\nc\t d  "), "a b c d");
  assert.equal(wrapText(" \n\r\t "), "");
});

test("wrapping keeps text at the width target on one line", () => {
  const text = "a".repeat(20) + " " + "b".repeat(21);
  assert.equal(wrapText(text), text);
});

test("wrapping keeps both lines within the width target when words fit", () => {
  const text = Array(16).fill("word").join(" ");
  const lines = wrapText(text).split("\n");
  assert.deepEqual(lines.map((line) => line.length), [39, 39]);
  assert.equal(lines.join(" "), text);
});

test("wrapping never inserts a blank line before an unbroken long word", () => {
  const longWord = "x".repeat(60);
  assert.equal(wrapText(longWord), longWord);
  assert.equal(wrapText(`${longWord} end`), `${longWord}\nend`);
});

test("wrapping preserves text without spaces", () => {
  const text = "字幕".repeat(30);
  assert.equal(wrapText(text), text);
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

test("json3EventsToSrt reflows multiline captions into two lines with the same timing and text", () => {
  const text = "This is a long subtitle sentence with enough words to require wrapping across lines for readability.\n"
    + "This is another long subtitle sentence with enough words to require wrapping across lines for readability.";
  const srt = json3EventsToSrt({
    events: [{ tStartMs: 1000, dDurationMs: 4000, segs: [{ utf8: text }] }],
  });
  const lines = srt.trim().split("\n");
  assert.equal(countCues(srt), 1);
  assert.equal(lines[1], "00:00:01,000 --> 00:00:05,000");
  assert.equal(lines.slice(2).length, 2);
  assert.equal(lines.slice(2).join(" "), text.replace(/\s+/g, " "));
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

test("json3EventsToSrt preserves short manual cues without introducing overlaps", () => {
  const srt = json3EventsToSrt({
    events: [
      { tStartMs: 0, dDurationMs: 300, segs: [{ utf8: "First" }] },
      { tStartMs: 400, dDurationMs: 300, segs: [{ utf8: "Second" }] },
    ],
  });
  assert.deepEqual(srt.split("\n").filter((line) => line.includes(" --> ")), [
    "00:00:00,000 --> 00:00:00,300",
    "00:00:00,400 --> 00:00:00,700",
  ]);
});

test("json3EventsToSrt preserves overlaps already present in valid manual timing", () => {
  const srt = json3EventsToSrt({
    events: [
      { tStartMs: 0, dDurationMs: 1500, segs: [{ utf8: "First speaker" }] },
      { tStartMs: 500, dDurationMs: 300, segs: [{ utf8: "Second speaker" }] },
    ],
  });
  assert.match(srt, /00:00:00,000 --> 00:00:01,500/);
  assert.match(srt, /00:00:00,500 --> 00:00:00,800/);
});

test("json3EventsToSrt repairs missing or invalid durations using the next event", () => {
  for (const dDurationMs of [undefined, 0, -100, NaN, Infinity]) {
    const srt = json3EventsToSrt({
      events: [
        { tStartMs: 1000, dDurationMs, segs: [{ utf8: "First" }] },
        { tStartMs: 1400, dDurationMs: 300, segs: [{ utf8: "Second" }] },
      ],
    });
    assert.match(srt, /00:00:01,000 --> 00:00:01,320/);
    assert.match(srt, /00:00:01,400 --> 00:00:01,700/);
  }
});

test("json3EventsToSrt repairs closely spaced cues without a negative duration or overlap", () => {
  for (const gap of [1, 30, 80]) {
    const srt = json3EventsToSrt({
      events: [
        { tStartMs: 1000, segs: [{ utf8: "First" }] },
        { tStartMs: 1000 + gap, dDurationMs: 300, segs: [{ utf8: "Second" }] },
      ],
    });
    assert.ok(srt.includes(`00:00:01,000 --> ${formatTime(1000 + gap)}`));
  }
});

test("json3EventsToSrt uses a fallback duration for the final cue only when needed", () => {
  for (const dDurationMs of [undefined, 0, -100, NaN, Infinity]) {
    const srt = json3EventsToSrt({
      events: [{ tStartMs: 1000, dDurationMs, segs: [{ utf8: "Final" }] }],
    });
    assert.match(srt, /00:00:01,000 --> 00:00:03,500/);
  }
});

test("json3EventsToSrt does not infer a negative duration from an earlier or simultaneous event", () => {
  for (const nextStart of [500, 1000]) {
    const srt = json3EventsToSrt({
      events: [
        { tStartMs: 1000, segs: [{ utf8: "First" }] },
        { tStartMs: nextStart, dDurationMs: 300, segs: [{ utf8: "Second" }] },
      ],
    });
    assert.match(srt, /00:00:01,000 --> 00:00:03,500/);
  }
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

test("json3WordsToSrt balances an oversized segment without dropping text", () => {
  const text = Array(20).fill("word").join(" ");
  const srt = json3WordsToSrt({
    events: [{ tStartMs: 0, segs: [{ utf8: text, tOffsetMs: 0 }] }],
  });
  const lines = srt.trim().split("\n");
  assert.equal(countCues(srt), 1);
  assert.equal(lines[1], "00:00:00,000 --> 00:00:01,400");
  assert.deepEqual(lines.slice(2).map((line) => line.length), [49, 49]);
  assert.equal(lines.slice(2).join(" "), text);
});
