// Convert YouTube json3 caption data into clean SRT text.

const MAX_LINE_LENGTH = 42;

export function formatTime(ms) {
  ms = Math.max(0, Math.round(ms));
  const hours = Math.floor(ms / 3_600_000);
  ms %= 3_600_000;
  const minutes = Math.floor(ms / 60_000);
  ms %= 60_000;
  const seconds = Math.floor(ms / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
}

export function wrapLine(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= MAX_LINE_LENGTH) return normalized;

  // Prefer two balanced lines at a word boundary. Oversized cues keep all text
  // and their original timing, so the width target is deliberately soft.
  let splitAt = -1;
  let smallestDifference = Infinity;
  for (let index = normalized.indexOf(" "); index !== -1; index = normalized.indexOf(" ", index + 1)) {
    const difference = Math.abs(index - (normalized.length - index - 1));
    if (difference < smallestDifference) {
      splitAt = index;
      smallestDifference = difference;
    }
  }

  if (splitAt === -1) return normalized;
  return `${normalized.slice(0, splitAt)}\n${normalized.slice(splitAt + 1)}`;
}

export function wrapText(text) {
  return wrapLine(text);
}

function cuesToSrt(cues) {
  return cues.map((cue, cueIndex) => {
    return `${cueIndex + 1}\n${formatTime(cue.start)} --> ${formatTime(cue.end)}\n${cue.text}\n`;
  }).join("\n");
}

// Each cue has exactly one timestamp line, so the arrow count is the cue count.
export function countCues(srt) {
  return (srt.match(/ --> /g) ?? []).length;
}

// Manual captions: keep YouTube's timing, only reflow the text.
export function json3EventsToSrt(captionJson) {
  const cues = [];
  const events = (captionJson.events ?? [])
    .filter((event) => event.segs && Number.isFinite(event.tStartMs));

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const text = event.segs.map((segment) => segment.utf8 ?? "").join("").trim();
    if (!text) continue;

    const start = event.tStartMs;
    const nextStart = events[index + 1]?.tStartMs;
    let end = Number.isFinite(event.dDurationMs) ? start + event.dDurationMs : undefined;

    if (!Number.isFinite(end) || end <= start) {
      end = start + 2500;
      if (nextStart > start) {
        // Leave a gap where possible without making a short cue end before it starts.
        end = nextStart - start > 80 ? nextStart - 80 : nextStart;
      }
    }

    cues.push({
      start,
      end,
      text: wrapText(text),
    });
  }

  return cuesToSrt(cues);
}

// Automatic captions: rebuild non-overlapping cues from word-level timing.
export function json3WordsToSrt(captionJson) {
  const words = [];

  for (const event of captionJson.events ?? []) {
    if (!event.segs || !Number.isFinite(event.tStartMs)) continue;

    for (const segment of event.segs) {
      const text = String(segment.utf8 ?? "").replace(/\s+/g, " ").trim();
      if (!text) continue;

      words.push({
        text,
        start: event.tStartMs + (Number.isFinite(segment.tOffsetMs) ? segment.tOffsetMs : 0),
      });
    }
  }

  words.sort((a, b) => a.start - b.start);

  const cues = [];
  let index = 0;

  while (index < words.length) {
    const start = words[index].start;
    const cueWords = [];
    let lastStart = start;

    while (index < words.length) {
      const word = words[index];
      const nextWord = words[index + 1];
      const candidate = [...cueWords.map((item) => item.text), word.text].join(" ");
      const duration = word.start - start;
      const nextGap = nextWord ? nextWord.start - word.start : 0;
      const shouldClose = duration >= 5200 || candidate.length >= 76 || cueWords.length >= 13;

      cueWords.push(word);
      lastStart = word.start;
      index += 1;

      if (shouldClose || nextGap >= 1200) break;
    }

    const nextStart = words[index]?.start;
    let end = nextStart ? Math.min(nextStart - 80, lastStart + 1400) : lastStart + 1400;
    if (end <= start) end = start + 900;

    cues.push({
      start,
      end,
      text: wrapLine(cueWords.map((word) => word.text).join(" ")),
    });
  }

  return cuesToSrt(cues);
}
