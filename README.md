# Burn Bright: The Pixel Riot — 3D

A mobile-first rhythm game built with **Three.js**. Notes fly down a 3D highway toward you while The Pixel Riot play *You Won't Let Me Fall* on a lit-up 3D stage. Tap the four pads (Bass, Vocals, Guitar, Drums) in time with the real recording.

> **New here? Start with [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md)** for a guided tour of the code, and [docs/GITHUB_GUIDE.md](docs/GITHUB_GUIDE.md) for how branches, commits and GitHub Actions fit together.

## Branches

| Branch | What's on it |
|---|---|
| `main` | **This 3D remake.** All new work happens here. |
| `original` | The game exactly as it was handed over (BB5 + BB7 builds, 2D Canvas). Frozen for reference. |

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install        # once: downloads Three.js and the build tools
npm run dev        # starts the game at http://localhost:5173 and reloads as you edit
```

Controls: tap the pads, or `D F J K` on a keyboard. Hold for long notes. `Esc` pauses.

## Build it for itch.io

```bash
npm run build
```

This makes two files:

- `dist/index.html`: the whole game in **one file** (code, song, art and chart embedded). Double-click it to play offline.
- `dist/burn-bright-itch.zip`: upload this to itch.io as an HTML5 game (viewport about 400×800, mobile friendly on).

## Test it

```bash
npm test                 # checks the scoring/timing rules
npm run test:browser     # plays the built game in headless Chrome
```

GitHub runs both automatically on every push (see the **Actions** tab), then publishes the game to GitHub Pages.

## Project layout

```text
index.html            page skeleton: canvas, HUD, pads, menus
src/
  main.js             the conductor: builds everything, runs the game loop
  config.js           every tunable number (timing, scoring, camera, colors)
  song/chart.js       loads the note chart, section names and beats
  audio/player.js     plays the recording; the game's master clock
  game/rules.js       the referee: judging, score, combo, energy
  game/input.js       touch + keyboard -> lane pressed / released
  world/scene.js      Three.js renderer, camera, lights
  world/stage.js      3D venue: stage, LED wall, truss, spotlights, crowd
  world/band.js       the four musicians and their poses
  world/highway.js    lanes, beat lines, 3D note gems, hold trails
  world/effects.js    spark bursts
  ui/hud.js           score/combo/energy text, judgement pop-ups, pads
  ui/styles.css       look of menus and HUD
assets/               the song and the sprite art
charts/               the note chart (JSON + CSV)
tests/                automated checks
docs/                 design blueprint, guides, reference images
```

## Status

v0.1, the first 3D version. It has been checked in headless Chrome only: the 3D scene renders, all difficulties load the right note counts, the embedded song plays, the clock stays in sync, and pause/resume work. **It has not been tested on a real iPhone yet**, so do that before calling a release done. See `docs/BURN_BRIGHT_MASTER_BLUEPRINT.md` for the full design vision and roadmap.
