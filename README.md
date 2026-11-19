# Cover Forge — GTA-style cover art maker

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Kyamii21/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Kyamii21/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your own photos and a caption into GTA-style
poster cover art, exported as a PNG to share. Entry for the make.fun
[gta6-cover-art-01](https://make.fun/bounty/gta6-cover-art-01) bounty.

## What it does

- **Any photo**: add photos by file picker or drag-and-drop; they are read
  on your machine and never uploaded.
- **Multi-panel posters**: single, duo, trio, quad and hero layouts with
  comic-style gutters and slanted dividers. Click a panel to select it,
  drag to reposition its photo, scroll or slide to zoom and crop.
- **Colour grades**: Vice Sunset, Neon Nights, Duotone, Mono Ink and Clean,
  painted with canvas filters and light washes, plus film grain and
  vignette sliders.
- **Poster lettering**: four caption styles — Sunset Block, Neon Sign,
  Chrome and Retro Serif — auto-fitted, wrapped, top or bottom.
- **One-click export**: PNG at 1080×1080, 1080×1350 or 1920×1080.

Everything is original: no game logos, artwork or fonts. The app is plain
static files under `app/` and runs with the network off — serve it with any
static file server and open `index.html`.

## Layout of this repository

- `app/` — the web app (`index.html`, `studio.css`, `studio.js`,
  `cover-renderer.js`, `grades.js`, `lettering.js`, sample photos).
- `screenshots/` — renders of the app and the covers it exports.
- `main.ts` — copies `app/` and `screenshots/` to the output directory and
  writes `dossier.json` with `buildDossier` from `vendor/makefun-app.ts`.
- `vendor/makefun-app.ts` — the make.fun kit library, unchanged.
