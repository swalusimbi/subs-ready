# subs-ready

Turn YouTube auto-captions into clean, readable `.srt` subtitle files.

YouTube's automatic captions come as a stream of word-level timing rather than
finished subtitle cues. `subs-ready` uses that timing to build clean, well-paced
subtitle cues, giving you a readable `.srt` file you can use or edit right away.

Run it in any folder:

```sh
subs-ready "https://www.youtube.com/watch?v=VIDEO_ID"
```

You get a `.srt` named after the video, ready to use.

## What it does

- Rebuilds automatic captions into clean, non-overlapping cues
- Prefers manual English captions when YouTube provides them, and preserves their original timing
- Falls back to English automatic captions, then to any available track
- Wraps lines to a readable width (~42 characters, at most two lines per cue)
- Writes the `.srt` beside your downloaded video, to a path you choose, or named after the video title

## Install

`subs-ready` is a self-contained Node.js CLI with zero npm dependencies, built on
top of `yt-dlp`. Clone the repo, then link the command from inside it:

```sh
npm link
```

You can now run `subs-ready` from any directory. These commands are identical on
macOS, Linux, and Windows; only the prerequisites below install differently per OS.

## Usage

Subtitle file named after the video, written to the current folder:

```sh
subs-ready "https://www.youtube.com/watch?v=VIDEO_ID"
```

Write it beside a video you've downloaded (reuses the video's filename):

```sh
subs-ready "https://www.youtube.com/watch?v=VIDEO_ID" --video "my-video.mp4"
```

That writes `my-video.srt`.

Choose an explicit output path:

```sh
subs-ready "https://www.youtube.com/watch?v=VIDEO_ID" --out "subtitles.srt"
```

## Options

```text
--video <path>     Name the subtitle file after this video file
--out <path>       Write the SRT to a specific path
--lang <code>      Preferred caption language (default: best English track)
--keep-json        Keep the raw json3 caption file alongside the SRT
```

## Requirements

- [Node.js](https://nodejs.org) 18 or newer
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) available on your PATH

Install `yt-dlp` with your platform's package manager:

```sh
# macOS (Homebrew)
brew install yt-dlp

# Linux (pipx, works on any distro)
pipx install yt-dlp

# Windows (winget, or: scoop install yt-dlp)
winget install yt-dlp
```

## License

[MIT](LICENSE)
