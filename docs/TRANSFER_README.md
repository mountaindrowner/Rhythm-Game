# Burn Bright — Transfer Package

**Start here:** `BURN_BRIGHT_MASTER_BLUEPRINT.md` (the complete 12,000+ word master game design and coding handoff).

## Important files

- `source/Burn_Bright_BB7_Premium_Art_Pass.html` — latest source snapshot, fully embedded/standalone.
- `source/Burn_Bright_BB5_OFFLINE_PLAY.html` — earlier audio-safe baseline **the user explicitly confirmed worked on itch.io**.
- `source/Burn_Bright_BB7_Premium_Art_Pass_ITCH_IO.zip` — BB7 itch.io packaging example.
- `audio/You Wont Let Me Fall.mp3` — the original user-supplied music. **Do not republish without appropriate rights.**
- `charts/song_chart.json` — full audio-relative timings, roles, beats, sections, difficulty tiers.
- `charts/song_chart.csv` — tabular version for inspection/editing.
- `art/burn_bright_clean_atlas.png` — **canonical cleaned 7×4 sprite sheet**, 240×314 frame cells.
- `art/pixel_rock_band_animation_sprite_sheet_RAW.png` — raw original generated visual reference **NOT directly grid-safe**.
- `references/` — real screenshots, motion comparison and visual checks.

## How to use in another AI session

1. Upload this ZIP and ask the AI to read the `.md` first.
2. Ask it to inspect the actual BB7 HTML, BB5 fallback and chart JSON.
3. Preserve embedded MP3 / Web Audio iPhone unlock. Never resurrect external MP3 404.
4. Require real browser functional checks and full-motion sprite inspection.
5. Deploy by packaging root `index.html` into an itch.io HTML5 ZIP, then test actual hosted iPhone Safari.

**Caution:** Some assets are independently AI-generated or derived from the user's recording. Ownership/distribution rights need to be verified. The current production target is *one accurate, expressive, playable song* — not a large song library yet.
