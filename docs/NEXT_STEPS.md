# Next steps (handoff)

_Last updated: v0.6.1._

## Where things stand
- **v0.6.1:** the crowd now stretches in 8 rows from the stage all the way back along the note highway (fewer people by the stage, big close fans beside the highway), and every fan sways on the beat. The pixel band wanders slowly left and right.
- **v0.6: three songs and venues.** The menu has a song picker. *You Won't Let Me Fall* plays in **The Arena**, *You're Not My Plan B* on a **City Rooftop** at night, and *Trust God Anyway* on **Sunrise Hill**. All three are sung by her. Venues live in `src/world/venues.js`; outdoor ones use a raised banner screen so the backdrop shows behind the band.
- **Chart maker (built):** `scripts/chart/` finds tempo, beats and downbeats (checked: 100% beat agreement with the first song's chart, and within 5 ms on test hits) and places notes with the same rhythm rules as the first chart. **Sections are an energy-based best guess.** If the owner shares where each song's verses and choruses start (from the lyrics), re-run with `--sections` (see `docs/ADDING_SONGS.md`).
- **Tempo note:** both new songs read as about 167 BPM. They also fit 83 BPM (half speed). The faster grid matched the drums best and plays like the first song. If they feel too fast, re-chart with `--tempo 60-100`.
- **First song's chart:** the chart maker suggests its beats are about 20 ms late. That's inside the Perfect window, but re-timing it (or re-charting it with the chart maker) would make all three songs consistent.
- **Size:** with three MP3s embedded, the built page is about 19 MB. Fine on Wi-Fi; on mobile data the first load takes a while. Lower-bitrate MP3s would shrink it if needed.
- **Names:** the band is **X-ROADS**; the game is called **Rhythm Riot** for now (the owner is still deciding).
- **Live:** v0.5. The default band is now **Retro 16-bit** (64 px PixelLab art), which the owner chose. Players who had another look saved get Retro once (`LOOK_VERSION` in `settings.js`) and can switch back in Settings. *Pixel HD*, 3D models and Classic are still there.
- **Animation blocks (built):** 41 Retro animations (16 frames each, all starting and ending on the standing "hub" pose) in `assets/art/pixellab-retro/`. The recipe is `animations.json`. The choreographer `src/world/animBlocks.js` picks grooves by section (calm verses, hype choruses), varies them by phrase, switches only on bar lines, plays mistakes instantly and accents on the next loop, and ends the song with celebrate then bow. Unit-tested in `tests/unit/animBlocks.test.js`.
- **Vocals:** the guitarist has a mic stand (a PixelLab prop) and a `sing` animation. Each chart names its lead vocalist (`"vocalist"`: `singer`, `guitarist` or `duet`). The current song is `singer`, so he sings backing vocals in some chorus phrases. **Waiting on the owner:** which upcoming songs are hers, his, or duets.
- **Crowd:** six staggered rows, packed by the stage and thinning toward the camera, with sprites handed out so neighbours look different (`stage.js`).
- **Smoothness test (built):** `?fps` and the browser test report the game's own work per frame. It is about 0.3 ms update + 1.7 ms render call, well under a phone's 16.7 ms. Headless Chrome's fps (about 10) is meaningless because it renders in software. **Still to do: check `?fps` on a real iPhone.**
- `GAME_DESIGN.md` §9 still has 5 open questions for the owner (Riot Mode trigger, solo rotation, how rare rare moments are, anything off-brand, the band's inside jokes).

## Adding more animations
1. Add entries to `assets/art/pixellab-retro/animations.json` (name, block, energy, beats, prompt).
2. With `PIXELLAB_API_KEY` set as an environment secret:
   ```bash
   python3 scripts/pixellab/animate.py assets/art/pixellab-retro
   python3 scripts/pixellab/fetch_and_pack.py --source assets/art/pixellab-retro/source.json
   ```
3. Check the result at `?autoplay&view=stage`, then run the tests. New grooves join their block automatically. Brand-new *blocks* need a rule in `animBlocks.js`.

## Plan 1: Riot Mode (next big gameplay step)
From `GAME_DESIGN.md` §3: a Riot meter filled by gold Riot notes, held notes and Perfect streaks; tap all four pads to unleash 8 bars of double score, no energy loss, maximum effects, and one ridiculous moment. Add a visible ×1 to ×4 multiplier badge at the same time.

## Plan 2: ridiculous moments (the owner wants the game to be absurd and hilarious)
Ideas to build as special one-off animations plus stage effects. Each can be a new block in the recipe (for example `block: "moment"`) that the choreographer plays like a celebrate:
- **SHRED SOLO:** at a big combo, the guitarist solos so hard he levitates, the guitar catches fire, and the camera zooms in.
- **Mad science:** the bassist's lab-coat pocket explodes in green smoke and he comes out with an afro.
- **Stick launch:** the drummer drums so hard a stick flies into the crowd and a fan throws back a baguette.
- **Note that won't end:** the singer holds a note so long the LED wall cracks and the crowd's hair blows back.
- **Riot mode:** a power-up where everything doubles (giant inflatable duck, confetti cannons, the stage bouncing).
- **Crowd surf:** a band member stage-dives and surfs across the crowd during the bridge.
Each needs: a PixelLab animation (or a few), a trigger (a combo, a song section, or a random chance), and a showfx effect.

## Other open items
- **Test on a real iPhone** (audio, touch, frame rate with `?fps`).
- **Different stages and backgrounds** (the owner's idea for later): the venue is all in `stage.js`, so a second venue could be a new function chosen per song.
- **v0.5.1 drummer fix:** the owner said the drummer barely moved. His grooves were redone with big above-the-kit motion (`"version": 2` in the recipe), and he now stands higher behind a slightly smaller kit. Next time an animation looks timid, measure it first (see `ART_PIPELINE.md`) and redo it the same way.
- **LED wall:** the drummer's head now covers part of the "ROADS" lettering in the gameplay view. Raising the logo on the wall (`drawBandLogo` in `stage.js`) would fix it.
- **Musically accurate note chart:** the current chart was generated automatically from the audio. A note editor would help fix it.
- **Rotate the PixelLab key:** an earlier key was pasted into chat. Make a new one and store it only as an environment secret.
