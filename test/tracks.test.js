import test from "node:test";
import assert from "node:assert/strict";

import { supportsJson3, availableLanguages, findTrack, chooseTrack } from "../src/tracks.js";

const json3 = [{ ext: "json3" }];

test("supportsJson3 detects a json3 format", () => {
  assert.equal(supportsJson3(json3), true);
  assert.equal(supportsJson3([{ ext: "vtt" }]), false);
  assert.equal(supportsJson3(undefined), false);
});

test("availableLanguages lists manual and automatic codes", () => {
  const info = { subtitles: { en: json3 }, automatic_captions: { en: json3, fr: json3 } };
  assert.deepEqual(availableLanguages(info), { manual: ["en"], automatic: ["en", "fr"] });
  assert.deepEqual(availableLanguages({}), { manual: [], automatic: [] });
});

test("findTrack returns a track only when json3 exists", () => {
  const info = { subtitles: { en: json3, de: [{ ext: "vtt" }] } };
  assert.deepEqual(findTrack(info, "manual", "en"), { lang: "en", type: "manual" });
  assert.equal(findTrack(info, "manual", "de"), undefined);
  assert.equal(findTrack(info, "automatic", "en"), undefined);
});

test("chooseTrack prefers manual English", () => {
  assert.deepEqual(chooseTrack({ subtitles: { en: json3 } }), { lang: "en", type: "manual" });
});

test("chooseTrack falls back to automatic English", () => {
  assert.deepEqual(chooseTrack({ automatic_captions: { en: json3 } }), { lang: "en", type: "automatic" });
});

test("chooseTrack prefers manual over automatic for the same language", () => {
  const info = { subtitles: { en: json3 }, automatic_captions: { en: json3 } };
  assert.deepEqual(chooseTrack(info), { lang: "en", type: "manual" });
});

test("chooseTrack honors a requested language", () => {
  assert.deepEqual(chooseTrack({ subtitles: { fr: json3 } }, "fr"), { lang: "fr", type: "manual" });
  assert.deepEqual(chooseTrack({ automatic_captions: { de: json3 } }, "de"), { lang: "de", type: "automatic" });
});

test("chooseTrack does not substitute another language for a missing request", () => {
  const info = { subtitles: { en: json3 }, automatic_captions: { es: json3 } };
  assert.equal(chooseTrack(info, "fr"), undefined);
});

test("chooseTrack rejects a requested language with no usable format", () => {
  const info = {
    subtitles: { fr: [{ ext: "vtt" }], en: json3 },
    automatic_captions: { fr: [{ ext: "srv3" }], es: json3 },
  };
  assert.equal(chooseTrack(info, "fr"), undefined);
});

test("chooseTrack prefers manual captions for an explicit language", () => {
  const info = { subtitles: { fr: json3 }, automatic_captions: { fr: json3 } };
  assert.deepEqual(chooseTrack(info, "fr"), { lang: "fr", type: "manual" });
});

test("chooseTrack uses automatic captions when the requested manual track is unusable", () => {
  const info = { subtitles: { fr: [{ ext: "vtt" }], en: json3 }, automatic_captions: { fr: json3 } };
  assert.deepEqual(chooseTrack(info, "fr"), { lang: "fr", type: "automatic" });
});

test("chooseTrack requires an exact language code including regional variants", () => {
  const info = { subtitles: { "en-US": json3 } };
  assert.equal(chooseTrack(info, "en"), undefined);
  assert.deepEqual(chooseTrack(info, "en-US"), { lang: "en-US", type: "manual" });
  assert.deepEqual(chooseTrack(info), { lang: "en-US", type: "manual" });
});

test("chooseTrack falls back to any available track", () => {
  assert.deepEqual(chooseTrack({ subtitles: { es: json3 } }), { lang: "es", type: "manual" });
});

test("chooseTrack returns undefined when nothing is usable", () => {
  assert.equal(chooseTrack({}), undefined);
  assert.equal(chooseTrack({ subtitles: { en: [{ ext: "vtt" }] } }), undefined);
});
