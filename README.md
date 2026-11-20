# Neon Vice Cover Forge

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Kyamii21/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Kyamii21/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

A GTA 6-style cover art maker that runs fully offline in the browser.
Drop in your own photos (or use the eight built-in Vice City scenes),
pick a multi-panel poster layout, dial in a sunset or neon colour
grade, stamp on bold caption lettering, and export a PNG ready to post.

## What it does

- **Your photos, your panels** — upload any photo from your machine
  (it never leaves the browser), assign one photo per panel or fill
  every panel with the same shot, then drag to position and scroll or
  pinch to zoom each panel.
- **8 poster layouts** — Solo, Duo Vertical, Duo Horizontal, Triptych,
  Big + Two, Quad Grid, Hero + Strip and Diagonal Bands, all with the
  thick dark gutters of a game-cover collage.
- **9 colour grades** — Vice Sunset, Neon Nights, Poster Comic,
  Duotone Heat, Halftone Pop, Golden Hour, Miami Teal, Noir Ink and
  Vaporwave, each a preset over an adjustable pipeline: posterize
  (2–12 levels), Sobel ink outlines, duotone, halftone dots, film
  grain, vignette, saturation and contrast.
- **8 lettering styles** — Blockbuster, Neon Glow, Chrome, Comic Pop,
  Stencil, Script Italic, Sunset Gradient and Outline Ghost, with a
  two-line caption and a subtitle.
- **Post-ready export** — PNG at 1080×1080, 1080×1350 or 1920×1080,
  plus a Shuffle button that remixes layout, grade, lettering and
  photos in one click.

## Run it

Any static file server works; the repo ships one:

```
node serve.ts        # then open http://localhost:8080/
```

## Hand it in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

copies `app/` and `screenshots/` to the output directory and writes
`dossier.json`. Screenshots are regenerated with
`node take-screenshots.mjs` (headless Chrome via CDP, driven by
`shots.json`); the sample scenes under `app/samples/` are drawn by
`gen-samples.py`.

Fonts under `app/fonts/` are Noto Sans Display and Liberation Sans /
Serif, shipped under the SIL Open Font License. All artwork is
original — no game logos, artwork or fonts.
