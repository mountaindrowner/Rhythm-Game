# Next steps (handoff)

_Last updated: v0.3 plus the retro-look exploration._

## Where things stand
- **Live:** v0.3. The default band is the "HD" PixelLab band (128 px); the 3D-models and classic looks are in Settings.
- **Chosen new look: Retro 16-bit** (64 px, chunky SNES-style pixels). All four musicians plus a matching drum kit (#5 of 16 candidates) are generated in PixelLab; their IDs are in `assets/art/pixellab-retro/source.json`. They have **no animations yet**. The owner was about to give final approval from preview screenshots (band lineup, in-game, close-up).
- `bandHD.js` already sizes any art style automatically (one shared pixel size, set from the tallest musician), so switching looks only needs new assets.

## To preview the retro band in-game
```bash
export PIXELLAB_API_KEY=...   # set as an environment secret, not in chat
python3 scripts/pixellab/fetch_and_pack.py --source assets/art/pixellab-retro/source.json --allow-missing
npm run dev                   # open ?autoplay&view=stage
```
(`--allow-missing` uses the idle pose wherever animations don't exist yet.)

## Plan 1: lots of smooth animations ("animation blocks")
The goal: fluid, never choppy. Approach:
1. **More frames:** 16 per animation (PixelLab `animate_character`, v3 or pixminimax; about 2 generations per 64 px animation).
2. **Locked to the music:** loops last a whole number of beats (for example, 16 frames per 2 beats). The play-loop timing in `bandHD.js` already works this way.
3. **Seamless switches:** every animation starts and ends on the same neutral (idle) pose. Use PixelLab's custom start/end frame options so loops close cleanly. Switch animations only on bar lines.
4. **Animation blocks per musician:** grooves (verse / chorus intensity), 3–4 playing variations (pick a different one each bar), big moves for combo milestones, 2–3 different stumbles, and specials (intro, bridge mood, final chorus, bow or celebration).
5. **A recipe list:** one data file listing every animation (name, block, prompt, frames, beats). A script generates whatever's missing and then packs. `bandHD.js` grows into a small state machine that picks animations from the blocks.

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
