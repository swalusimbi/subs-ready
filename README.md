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
- Falls back to English automatic captions, then to any available track when no language is specified
- Reflows each cue into at most two balanced lines, targeting 42 characters per line
- Writes the `.srt` beside your downloaded video, to a path you choose, or named after the video title

Manual captions keep valid start and end times, including cues shorter than a
second. Missing or invalid durations are repaired using the next event's start,
with an 80 ms gap when there is room. If the next event does not start later or
there is no next event, the fallback duration is 2.5 seconds.

Existing line breaks are reflowed across the whole cue. Wrapping preserves all
words and does not change cue timing. Oversized cues and long unbroken words can
exceed the 42-character target so text is never truncated or split inside a word.

## Install

`subs-ready` is a self-contained Node.js CLI with zero npm dependencies, built on
top of `yt-dlp`. Clone the repo, then link the command from inside it:

```sh
npm link
```

You can now run `subs-ready` from any directory. These commands are identical on
macOS, Linux, and Windows; only the prerequisites below install differently per OS.

## Usage

Show all options, defaults and examples:

```sh
subs-ready --help
```

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

Existing output files are protected by default. To replace them explicitly:

```sh
subs-ready "https://www.youtube.com/watch?v=VIDEO_ID" --out "subtitles.srt" --force
```

This also applies to raw captions saved with `--keep-json`. If the captions
contain no usable cues, the command fails without writing output files, even
with `--force`.

List usable caption languages before choosing one:

```sh
subs-ready "https://www.youtube.com/watch?v=VIDEO_ID" --list-langs
subs-ready "https://www.youtube.com/watch?v=VIDEO_ID" --lang fr
```

The list shows exact language codes and readable names, grouped by manual and
automatic captions. Only tracks supported by this tool are listed. Listing
fetches track information and exits without downloading captions or writing
files, even when output options are supplied. It shows all usable languages
regardless of `--lang`. If no usable tracks exist, it reports that and exits
successfully.

## Options

```text
--video <path>     Name the subtitle file after this video file
--out <path>       Write the SRT to a specific path
--lang <code>      Caption language code (default: best English track)
--list-langs       List usable caption languages and exit without writing files
--keep-json        Keep the raw json3 caption file alongside the SRT
--force            Overwrite existing output files
-h, --help         Show options, defaults and examples
```

By default, the SRT is named after the video title in the current folder.
`--video` uses the supplied video's directory and filename with an `.srt`
extension. `--out` takes precedence when both output options are supplied.

`--lang` requires an exact caption language code, such as `fr` or `en-US`.
Manual captions are preferred over automatic captions for that code. If no
usable track matches, the command fails and lists usable alternatives without
downloading captions or writing output files.

Options with values accept both `--lang fr` and `--lang=fr` syntax. Each value
option may be supplied once. Pass exactly one URL and quote paths containing
spaces. Unknown options, missing values and extra arguments fail before any
caption tracks are fetched. For a path starting with `-`, use `--out=-name.srt`
or prefix the path with `./`.

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
