# Next steps (handoff)

_Last updated: v0.4._

## Where things stand
- **Names:** the band is **X-ROADS**; the game is called **Rhythm Riot** for now (the owner is still deciding).
- **Live:** v0.4. The default band is still the "HD" PixelLab band (128 px). Settings → Band look also offers **Retro 16-bit**, 3D models and Classic.
- **Retro 16-bit** (64 px): the owner likes it and is **trying it in-game before approving**. It has no drawn animations yet; `bandSprites.js` adds code-driven bob, sway, bounce and wobble so it still moves. Its IDs are in `assets/art/pixellab-retro/source.json`. **Don't build its animation library until the owner approves.**
- **New in v0.4:** glass UI, a PixelLab crowd (8 back-view fans with cheer animations, one instanced draw call, `crowd.js`), a version badge on every menu, `perf.js` (automatic resolution + `?fps`), and `docs/GAME_DESIGN.md` (Riot Mode, solos, ridiculous moments; waiting on the owner's feedback to the questions in §9).
- `bandSprites.js` already sizes any art style automatically (one shared pixel size, set from the tallest musician), so switching looks only needs new assets.

## To repack the retro band (the art is already committed)
```bash
export PIXELLAB_API_KEY=...   # set as an environment secret, not in chat
python3 scripts/pixellab/fetch_and_pack.py --source assets/art/pixellab-retro/source.json --allow-missing
npm run dev                   # open ?autoplay&view=stage
```
(`--allow-missing` uses the idle pose wherever animations don't exist yet.)

## Plan 1: lots of smooth animations ("animation blocks")
The goal: fluid, never choppy. Approach:
1. **More frames:** 16 per animation (PixelLab `animate_character`, v3 or pixminimax; about 2 generations per 64 px animation).
2. **Locked to the music:** loops last a whole number of beats (for example, 16 frames per 2 beats). The play-loop timing in `bandSprites.js` already works this way.
3. **Seamless switches:** every animation starts and ends on the same neutral (idle) pose. Use PixelLab's custom start/end frame options so loops close cleanly. Switch animations only on bar lines.
4. **Animation blocks per musician:** grooves (verse / chorus intensity), 3–4 playing variations (pick a different one each bar), big moves for combo milestones, 2–3 different stumbles, and specials (intro, bridge mood, final chorus, bow or celebration).
5. **A recipe list:** one data file listing every animation (name, block, prompt, frames, beats). A script generates whatever's missing and then packs. `bandSprites.js` grows into a small state machine that picks animations from the blocks.

## Plan 2: ridiculous moments (the owner wants the game to be absurd and hilarious)
Ideas to build as special one-off animations plus stage effects:
- **SHRED SOLO:** at a big combo, the guitarist solos so hard he levitates, the guitar catches fire, and the camera zooms in.
- **Mad science:** the bassist's lab-coat pocket explodes in green smoke and he comes out with an afro.
- **Stick launch:** the drummer drums so hard a stick flies into the crowd and a fan throws back a baguette.
- **Note that won't end:** the singer holds a note so long the LED wall cracks and the crowd's hair blows back.
- **Riot mode:** a power-up where everything doubles (giant inflatable duck, confetti cannons, the stage bouncing).
- **Crowd surf:** a band member stage-dives and surfs across the crowd during the bridge.
Each needs: a PixelLab animation (or a few), a trigger (a combo, a song section, or a random chance), and a showfx effect.

## Other open items
- **Test on a real iPhone** (audio, touch, frame rate).
- **Musically accurate note chart:** the current chart was generated automatically from the audio. A note editor would help fix it.
- **Rotate the PixelLab key:** an earlier key was pasted into chat. Make a new one and store it only as an environment secret.
