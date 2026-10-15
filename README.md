# Burn Bright: The Pixel Riot

A mobile-first, portrait HTML5 rhythm game. Four lanes (Bass, Vocals, Guitar, Drums) are played to the real recording of *You Won't Let Me Fall*, with a four-piece pixel-art band performing on stage.

**Play:** open `index.html` in a browser. It is fully self-contained (song, chart and sprite atlas are embedded), so it works offline and needs no server.

Controls: tap the four bottom pads, or use `D F J K` / `1 2 3 4` on a keyboard. Hold for long notes. `Esc` pauses.

## Repository layout

| Path | What it is |
|---|---|
| `index.html` | Current playable build (BB7 Premium Art Pass) |
| `builds/` | Version snapshots: BB7 standalone, BB7 itch.io ZIP (`index.html` at root), and BB5 Offline Play — the last build confirmed working on itch.io/iPhone |
| `docs/BURN_BRIGHT_MASTER_BLUEPRINT.md` | Full game design, art direction, technical spec and roadmap. **Read this before changing the game.** |
| `docs/TRANSFER_README.md` | Original handoff-bundle notes |
| `assets/audio/` | Source recording of *You Won't Let Me Fall* (148.44 s, ~152 BPM) |
| `assets/art/` | Clean 7×4 sprite atlas (240×314 cells; rows: bassist, singer, guitarist, drummer), contact sheet, and the raw (not grid-safe) generated sheet |
| `charts/` | Tiered note chart (JSON + CSV): Casual 331, Standard 697, Expert 1,091 notes |
| `references/` | Screenshots and motion/visual QA references |

## Publishing to itch.io

Upload `builds/Burn_Bright_BB7_Premium_Art_Pass_ITCH_IO.zip` as an HTML5 project, set the viewport to about 400×800, enable mobile support, then test the live page in Safari on a real iPhone. Check the build label on the menu to confirm the right version is live.

## Status

Checked in headless Chromium: the menu loads, all three difficulties load the expected note counts, the embedded recording decodes and plays, the game clock tracks the audio, pause freezes the clock, and the page makes no external requests or errors. **BB7 has not yet been confirmed on a physical iPhone via itch.io**; BB5 has. See section 14 of the blueprint for known issues and section 17 for the roadmap.
