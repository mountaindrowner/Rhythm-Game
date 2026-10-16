# Next steps (handoff)

_Last updated: v0.11._

## Where things stand
- **v0.11 (owner request: "more pizzazz, like a rock and roll show"):** new menus.
  - The title screen is its own pixel-art **rock show** (`src/ui/menuScene.js`): truss scaffolding with stage lights and beams, an LED wall, speaker stacks, the band jamming, sparks, a crowd with hands up, and a new pixel **RHYTHM RIOT logo** (`src/ui/pixelFont.js`) crackling with electricity. Every few seconds lightning strikes and the band flashes into their Riot versions. The 3D game isn't drawn behind any menu any more.
  - Flow: **START THE SHOW → difficulty → set list** (best stars and score for that difficulty on each song, a chorus **preview** of the picked song, `src/audio/preview.js`) **→ PLAY → loading screen** (a gig poster with the venue, a tip, and an "amp warming up" bar) → the loading screen punches out → the camera **swoops in over the crowd** with "LIVE AT THE ARENA" → the drummer's **4 stick clicks** on the song's own beat (3, 2, 1, ROCK!) → the song.
  - UI titles and buttons use the free **Pixelify Sans** pixel font (embedded, `assets/fonts/`). Pause and results QUIT go back to the set list.
  - Research behind it: `docs/RESEARCH_RHYTHM_GAMES.md` §6.
  - **Ideas:** song previews could drive the title-screen lights in time with the music; unlockable loading-screen art as a reward; a "TAP TO START" splash if the owner wants one.
- **v0.10 (owner requests):** a big floating "RIOT MODE!" sign with TV static under the band; the band transforms into PixelLab **Riot versions** of themselves during Riot Mode; the guitarist's mic stand and singing only appear in songs he sings (all current songs are hers).
- **v0.9.1 iPhone fix:** misses in the first seconds of a song with no notes on screen. Fixes: `highway.warmUp()` draws every kind of note once, hidden, while a song loads (now behind the loading screen), and a **freeze guard** in `rules.js` skips notes that pass during a freeze of more than 0.25 s. **Waiting on the owner to retest on the iPhone.**
- **v0.9: call-and-response solos + Big Rock Endings.** *You Won't Let Me Fall* (guitarist) and *Trust God Anyway* (bassist) have solos in their bridges; *You're Not My Plan B* has none (no bridge found; tell me where a solo spot is and it's one line in `songs.js`). All three songs have a Big Rock Ending.
- **v0.8: Riot Mode + funny failure.** Gold Riot phrases fill the meter; swipe up for ×2 (up to ×8), no energy loss, +30 energy, and a 2.5-second "swipe to save the show" chance when energy runs out. Game over plays a sad trombone and rolls a tumbleweed.
- **v0.7:** gentler charts, a visible ×1–×4 multiplier, EARLY/LATE hints, a timing tip on the results screen, and stars + best scores per song and difficulty (gold stars = Expert full combo).
- **v0.6 / v0.6.1:** three songs and venues (The Arena, City Rooftop, Sunrise Hill); the crowd stretches in 8 rows back along the highway and sways on the beat; the band drifts left and right.
- **Chart maker (built):** `scripts/chart/` finds tempo, beats and downbeats and places notes. **Sections are an energy-based best guess.** If the owner shares where each song's verses and choruses start, re-run with `--sections` (see `docs/ADDING_SONGS.md`).
- **Tempo note:** both newer songs read as about 167 BPM (they also fit 83 BPM). If they feel too fast, re-chart with `--tempo 60-100`.
- **First song's chart:** the chart maker suggests its beats are about 20 ms late. That's inside the Perfect window, but re-charting it would make all three songs consistent.
- **Size:** with three MP3s embedded, the built page is about 19 MB. Lower-bitrate MP3s would shrink it if needed.
- **Names:** the band is **X-ROADS**; the game is called **Rhythm Riot** for now (the owner is still deciding).
- **Band:** the default look is **Retro 16-bit** (64 px PixelLab art) with 41 animations in `assets/art/pixellab-retro/` and Riot versions in `assets/art/pixellab-retro-riot/`. The choreographer `src/world/animBlocks.js` picks grooves by section, switches only on bar lines, and is unit-tested. *Pixel HD*, 3D models and Classic are in Settings.
- **Vocals:** each chart names its lead vocalist (`singer`, `guitarist` or `duet`); the guitarist's mic stand appears only for his songs and duets. **Waiting on the owner:** which upcoming songs are his or duets.
- **Smoothness test (built):** `?fps` and the browser test report the game's own work per frame (about 2 ms). **Still to do: check `?fps` on a real iPhone.**

## Adding more animations
1. Add entries to `assets/art/pixellab-retro/animations.json` (name, block, energy, beats, prompt).
2. With `PIXELLAB_API_KEY` set as an environment secret:
   ```bash
   python3 scripts/pixellab/animate.py assets/art/pixellab-retro
   python3 scripts/pixellab/fetch_and_pack.py --source assets/art/pixellab-retro/source.json
   ```
3. Check the result at `?autoplay&view=stage`, then run the tests. New grooves join their block automatically. Brand-new *blocks* need a rule in `animBlocks.js`.

## Next plan: ridiculous moments (the owner wants the game to be absurd and hilarious)
Ideas to build as special one-off animations plus stage effects. Each can be a new block in the recipe (for example `block: "moment"`) that the choreographer plays like a celebrate:
- **SHRED SOLO (built in v0.9 as the gold-solo reward):** the soloist levitates in flames while lightning strikes.
- **Mad science:** the bassist's lab-coat pocket explodes in green smoke and he comes out with an afro.
- **Stick launch:** the drummer drums so hard a stick flies into the crowd and a fan throws back a baguette.
- **Note that won't end:** the singer holds a note so long the LED wall cracks and the crowd's hair blows back.
- **Riot Mode extras:** Riot Mode is built (v0.8, v0.10); one absurd moment per Riot (giant inflatable duck, confetti cannons, the stage bouncing) is still to do.
- **Crowd surf:** a band member stage-dives and surfs across the crowd during the bridge.
Each needs: a PixelLab animation (or a few), a trigger (a combo, a song section, or a random chance), and a showfx effect.

## Other open items
- **Test on a real iPhone** (audio, touch, frame rate with `?fps`).
- **v0.5.1 drummer fix:** the owner said the drummer barely moved. His grooves were redone with big above-the-kit motion (`"version": 2` in the recipe), and he now stands higher behind a slightly smaller kit. Next time an animation looks timid, measure it first (see `ART_PIPELINE.md`) and redo it the same way.
- **LED wall:** the drummer's head now covers part of the "ROADS" lettering in the gameplay view. Raising the logo on the wall (`drawBandLogo` in `stage.js`) would fix it.
- **Musically accurate note chart:** the current chart was generated automatically from the audio. A note editor would help fix it.
- **Rotate the PixelLab key:** an earlier key was pasted into chat. Make a new one and store it only as an environment secret.
