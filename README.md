# Subtitle MVP

Small local tool for creating `.srt` subtitle files from YouTube caption tracks.

This MVP deliberately leaves out Whisper. It first tries the fast path:

```text
YouTube URL -> yt-dlp JSON captions -> clean SRT
```

## What It Does

- Downloads YouTube automatic captions with `yt-dlp`
- Uses the `json3` caption format so word-level timing can be regrouped
- Rebuilds captions into cleaner, non-overlapping `.srt` cues
- Writes the subtitle file beside your downloaded video when `--video` is provided

## What It Does Not Do Yet

- It does not transcribe videos with Whisper
- It does not perform forced alignment against an external transcript
- It does not download the video itself
- It does not fix recognition errors from YouTube automatic captions

## Usage

Generate a subtitle file beside your downloaded video:

```powershell
npm run subs -- "https://www.youtube.com/watch?v=VIDEO_ID" --video "my-video.mp4"
```

That writes:

```text
my-video.srt
```

You can also choose the output path:

```powershell
npm run subs -- "https://www.youtube.com/watch?v=VIDEO_ID" --out "subtitles.srt"
```

## Options

```text
--video <path>     Use the video filename as the subtitle filename
--out <path>       Write the SRT to a specific path
--lang <code>      Caption language, default: en-orig
--keep-json        Keep the downloaded json3 caption file
```

## Requirements

- Node.js
- yt-dlp available on PATH

## Notes

This works best when YouTube exposes automatic captions for the video. If no caption track exists, the current MVP stops there. A future version can add Whisper transcription as a fallback and forced alignment when a clean transcript is available.
