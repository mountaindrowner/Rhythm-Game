# Burn Bright: The Pixel Riot — 3D

A mobile-first rhythm game built with **Three.js**. Notes fly down a 3D highway toward you while The Pixel Riot play *You Won't Let Me Fall* on a lit-up 3D stage. Tap the four pads (Bass, Vocals, Guitar, Drums) in time with the real recording.

**▶ Play it now: https://mountaindrowner.github.io/Rhythm-Game/** (updates automatically on every push to `main`; add `?autoplay` to watch it play itself)

**Features**

- **HD pixel band (default):** hand-animated pixel-art musicians made with [PixelLab](https://pixellab.ai), standing on the 3D stage. Their playing loops lock to the song's beat, and they do a big move on combo milestones and stumble when you miss. See [docs/ART_PIPELINE.md](docs/ART_PIPELINE.md).
- **More band looks in Settings:** *3D models* (blocky musicians with real joints whose strums and drum hits land exactly on the notes) or *Classic* (the original pixel art).
- **3D venue:** spotlights, LED wall, crowd, and chorus effects (fire jets, lasers, confetti, crowd phone lights, strobe).
- **Game over:** run out of energy and the show stops. *Practice mode* turns it off, and easier difficulties drain less energy per miss.
- **Timing check:** tap along to clicks to measure your phone and headphone delay, then apply it automatically.
- **Accessibility:** a *Reduce flashing* setting softens strobes and camera shake.

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

Developer extras (add to the page address):

- `?autoplay`: the game plays itself perfectly, so you can watch the band and the effects.
- `?view=stage`: a close-up camera on the band, for checking animation.
- Both together: `http://localhost:5173/?autoplay&view=stage`

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
  settings.js         the player's saved preferences
  song/chart.js       loads the note chart, section names and beats
  audio/player.js     plays the recording; the game's master clock
  game/rules.js       the referee: judging, score, combo, energy
  game/input.js       touch + keyboard -> lane pressed / released
  world/scene.js      Three.js renderer, camera, lights
  world/stage.js      3D venue: stage, LED wall, truss, spotlights, crowd
  world/band3d/       the 3D musicians: rig.js (joints + IK), members.js (looks),
                      instruments.js (guitar, bass, mic, drum kit), index.js (animation)
  world/bandHD.js     the HD pixel band (PixelLab sprites), the default look
  world/bandPixel.js  the original pixel-art band (optional look)
  world/showfx.js     chorus effects: pyro, lasers, confetti, crowd lights, strobe
  world/highway.js    lanes, beat lines, 3D note gems, hold trails
  world/effects.js    spark bursts
  ui/hud.js           score/combo/energy text, judgement pop-ups, pads
  ui/calibration.js   the timing check screen
  ui/styles.css       look of menus and HUD
assets/               the song and the sprite art (assets/art/pixellab = HD band)
scripts/              build helpers (itch.io ZIP, PixelLab download + packing)
charts/               the note chart (JSON + CSV)
tests/                automated checks
docs/                 design blueprint, guides, reference images
```

## Status

v0.3 adds the HD pixel band made with PixelLab. v0.2 added the 3D band, chorus effects, game over, the timing check and Settings. It has been checked in headless Chrome only. The automated browser test covers note counts, audio sync, taps, pause/resume, both band looks, game over and the timing check. **It has not been tested on a real iPhone yet**, so do that before calling a release done. See `docs/BURN_BRIGHT_MASTER_BLUEPRINT.md` for the full design vision and roadmap.
