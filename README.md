# Neon Vice Cover Forge — GTA-Style Cover Art Maker

[![Bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/Kyamii21/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/Kyamii21/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline, single-page web app that turns **your own photo** into a bold,
multi-panel, GTA-inspired poster cover. Your photo is read locally in the
browser (FileReader) and is **never uploaded** — the app makes zero network
requests and works from `file://` or any static host.

## What it does

- **8 multi-panel layouts** — Classic Grid 4, Hero + 3, Diagonal Split,
  Triptych, Comic Strip, Big Left, Mosaic 6, Single Hero — with adjustable
  border width and colour.
- **9 named poster grades** — Poster Comic, Sunset Vice, Neon Nights,
  Teal & Orange, Golden Hour, Bubblegum Pop, Midnight Ink, Desert Heat,
  Mono Print — built on a real canvas pipeline: contrast/saturation,
  posterize (2–12 levels), duotone gradient-map, Sobel ink-edge overlay
  (adjustable strength), optional halftone dots, film grain and vignette.
- **8 lettering styles** — Stacked Block (two-line), Sticker Pop,
  Block Shadow, Italic Speed, Hollow Outline, Chrome gradient, Neon Glow,
  Arched — with subtitle line, title size and vertical position controls.
- **Per-panel editing** — drag to reposition, scroll/pinch to zoom,
  double-click to reset a panel.
- **8 sample photos** — two bundled kit photos (pier, boulevard) plus six
  original procedurally-drawn scenes (sunset beach, neon street, desert
  road, marina, skyline, boardwalk).
- **One-click shuffle** for a random layout + grade + lettering combo.
- **PNG export** at 1080×1080, 1080×1350 and 1920×1080.

## Run it

Open `app/index.html` in Chrome, or serve the folder:

```bash
node serve.ts   # then open http://localhost:8080
```

Screenshot/shot mode for previews:
`?shot=cover&photo=skyline&caption=NEON%20VICE&layout=Hero%20%2B%203&grade=Sunset%20Vice&lettering=Stacked%20Block`
renders just the full-bleed cover; `?shot=editor&photo=...&caption=...`
shows the editor with a photo loaded.

## Fonts & originality

All lettering is rendered with two bundled SIL OFL 1.1 fonts
(Noto Sans Display Black, Liberation Sans Bold Italic — see
`app/fonts/LICENSE.txt`). No Rockstar Games logos, artwork or fonts are
used; the design is original.
