# Subs Ready

Create clean `.srt` subtitle files from YouTube caption tracks.

`subs-ready` fetches available YouTube captions with `yt-dlp`, chooses the best English track by default and writes a cleaned subtitle file for your downloaded video.

## Features

- Prefers manual English captions when YouTube provides them
- Falls back to English automatic captions
- Preserves manual caption timing
- Rebuilds automatic captions into cleaner, non-overlapping cues
- Writes the subtitle file beside your downloaded video when `--video` is provided

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
--lang <code>      Preferred caption language, default: best English track
--keep-json        Keep the downloaded json3 caption file
```

## Requirements

- Node.js
- yt-dlp available on PATH
