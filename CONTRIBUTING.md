# Contributing to subs-ready

subs-ready is a zero-dependency Node.js CLI that turns YouTube auto-captions into
clean `.srt` files. Bug reports, fixes, docs and features are all welcome.

## Prerequisites

- [Node.js](https://nodejs.org) 18 or newer
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) on your PATH

## Getting started

```sh
git clone https://github.com/swalusimbi/subs-ready.git
cd subs-ready
npm link
```

There are no dependencies to install. `npm link` points the global `subs-ready`
command at your checkout so you can test from anywhere. You can also run it
directly:

```sh
node src/subs.js "https://www.youtube.com/watch?v=VIDEO_ID"
```

## Project layout

The CLI is split into focused modules under `src/`:

- `subs.js`: entry point and orchestration
- `cli.js`: argument parsing
- `ytdlp.js`: yt-dlp command wrappers
- `tracks.js`: caption track selection
- `srt.js`: json3 to SRT conversion
- `paths.js`: filename helpers

## Tests

Run the suite with:

```sh
npm test
```

It uses Node's built-in test runner, so there is nothing extra to install. The
tests cover the pure logic (`srt`, `tracks`, `cli`, `paths`). The yt-dlp and
file-writing paths are not unit tested, so if you change those, verify with a
real run against a video. CI runs `npm test` on every pull request.

## Style

- Keep it zero-dependency. Reach for Node built-ins and yt-dlp before adding a
  package.
- Match the surrounding code: two-space indent, ES modules, small focused
  functions.
- Leave unrelated files untouched.

## Submitting a pull request

1. Fork the repo and create a branch for your change.
2. Add or update tests for anything you change.
3. Run `npm test` and confirm it passes.
4. Open a pull request against `main`.
5. Fill in the pull request template so reviewers know what changed and how you
   tested it.

A maintainer will review and merge. Thanks for contributing.
