# Rhythm Riot (working title) starring X-ROADS: notes for Claude

Mobile-first rhythm game (Vite + Three.js). The band is **X-ROADS** ("Crossroads"). **Rhythm Riot** is a working title for the game. The old names "Burn Bright" and "The Pixel Riot" are retired; they only survive in internal identifiers such as the settings storage key and the test hook. The owner is learning to code through this project, so explain changes in plain language and keep code commented for a beginner.

**Read first:** `docs/NEXT_STEPS.md` (current status and plan), `docs/GAME_DESIGN.md` (gameplay, Riot Mode, ridiculous moments), then `docs/HOW_IT_WORKS.md` (code tour), `docs/ADDING_SONGS.md` (chart maker, set list, venues), `docs/RESEARCH_RHYTHM_GAMES.md` (how other rhythm games do it) and `docs/ART_PIPELINE.md` (PixelLab art). The full design vision is in `docs/BURN_BRIGHT_MASTER_BLUEPRINT.md`.

## Branches
- `main`: the live 3D remake. Every push runs tests and publishes to https://mountaindrowner.github.io/Rhythm-Game/
- `original`: the game as originally handed over. Never change it.

## Commands
- `npm install`, then `npm run dev` (play locally; `?autoplay&view=stage` shows the band up close)
- `npm test` (rules unit tests); `npm run build && npm run test:browser` (headless-Chrome checks)
- Run both before pushing. Look at screenshots and short video captures for any visual change, not just test results.

## Rules that must not break
- Songs play from MP3s embedded in the single built `index.html` (no separate asset files; that caused itch.io 404s). Audio unlocks inside a tap (iPhone): every menu button wakes it, and `player.load()` runs inside the PLAY tap. New songs: chart them with `scripts/chart/make_chart.py` and add them to `src/song/songs.js`.
- Lane order is fixed: 0 Bass (green), 1 Vocals (gold), 2 Guitar (blue), 3 Drums (red).
- Characters follow the blueprint's descriptions: the singer is always modestly dressed (full-length sleeved band tee, no bare midriff); the drummer is always clean-shaven; the bassist has only light stubble.

## PixelLab
- API key: read it from the `PIXELLAB_API_KEY` environment variable. Never commit it and never ask for it in chat.
- The sandbox must allow `api.pixellab.ai`. Use spritesheet downloads from that host; `backblaze.pixellab.ai` is blocked and not needed.
- The MCP endpoint is `https://api.pixellab.ai/mcp` (JSON-RPC over HTTP with a Bearer token).
