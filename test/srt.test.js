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
