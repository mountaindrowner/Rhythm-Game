# Burn Bright: The Pixel Riot — notes for Claude

Mobile-first rhythm game (Vite + Three.js). The owner is learning to code through this project, so explain changes in plain language and keep code commented for a beginner.

**Read first:** `docs/NEXT_STEPS.md` (current status and plan), then `docs/HOW_IT_WORKS.md` (code tour) and `docs/ART_PIPELINE.md` (PixelLab art). The full design vision is in `docs/BURN_BRIGHT_MASTER_BLUEPRINT.md`.

## Branches
- `main`: the live 3D remake. Every push runs tests and publishes to https://mountaindrowner.github.io/Rhythm-Game/
- `original`: the game as originally handed over. Never change it.

## Commands
- `npm install`, then `npm run dev` (play locally; `?autoplay&view=stage` shows the band up close)
- `npm test` (rules unit tests); `npm run build && npm run test:browser` (headless-Chrome checks)
- Run both before pushing. Look at screenshots and short video captures for any visual change, not just test results.

## Rules that must not break
- The song plays from the MP3 embedded in the single built `index.html` (no separate asset files; that caused itch.io 404s). Audio unlocks inside the Start tap (iPhone).
- Lane order is fixed: 0 Bass (green), 1 Vocals (gold), 2 Guitar (blue), 3 Drums (red).
- Characters follow the blueprint's descriptions: the singer is always modestly dressed (full-length sleeved band tee, no bare midriff); the drummer is always clean-shaven; the bassist has only light stubble.

## PixelLab
- API key: read it from the `PIXELLAB_API_KEY` environment variable. Never commit it and never ask for it in chat.
- The sandbox must allow `api.pixellab.ai`. Use spritesheet downloads from that host; `backblaze.pixellab.ai` is blocked and not needed.
- The MCP endpoint is `https://api.pixellab.ai/mcp` (JSON-RPC over HTTP with a Bearer token).
