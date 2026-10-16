# How Rhythm Riot works

This is a guided tour, in the order that makes the most sense to learn it. Every source file also starts with a plain-English comment explaining its job.

## 1. The big idea: one clock rules everything

A rhythm game has one job: make what you **see** and what you **hear** line up with what you **tap**.

The trick is that there is exactly **one clock**: the audio hardware's clock (`AudioContext.currentTime`, read in `src/audio/player.js`). Every frame, the game asks "what time is it in the song?" and then:

- puts every note at the position it *should* be at that time,
- judges taps against that time,
- picks each musician's pose for that time.

Nothing moves "a bit each frame." Everything is recalculated from the clock, so even if the phone stutters, the notes jump back to the right place and never drift from the music.

Two kinds of time appear in the code:

| Name | Meaning |
|---|---|
| `songTime` | seconds since the MP3 started (what `charts/song_chart.json` uses) |
| `t` (game time) | seconds since you pressed Start = `songTime + LEAD` (LEAD is the 4-beat count-in) |

## 2. The game loop (`src/main.js`)

`frame()` runs about 60 times a second:

1. Read the clock: `t = player.time`.
2. Ask the referee for anything that happened on its own, like a note going past unhit: `perf.update(t)` returns **events**.
3. Hand each event to `handle(e)`, which tells the band, highway, sparks and HUD to react.
4. Update the 3D world for time `t` (stage lights, band poses, note positions).
5. Draw: `renderer.render(scene, camera)`.

Taps take a shortcut: `input.js` calls `perf.press(lane, t)` the instant your finger lands, and the result goes through the same `handle(e)`.

**Events** are small objects like `{ type: 'hit', grade: 'perfect', lane: 2 }`. The referee doesn't know about graphics, and the graphics don't know the rules. They only talk through events, which keeps each file simple.

## 3. The referee (`src/game/rules.js`)

- **Judging:** when you press a lane, find the closest unhit note in that lane. If it's within 45 ms it's PERFECT, within 97 ms GREAT, within 175 ms GOOD. With no note nearby it's a WRONG NOTE.
- **Misses:** in `update()`, any note more than 174 ms past the line without a hit is a MISS.
- **Holds:** hitting a long note's head starts a hold. Releasing early is HOLD LOST; holding to the end gives +150.
- **Score, combo, energy:** all the numbers come from `src/config.js`.

Try it: change `WINDOWS.perfect` in `config.js` to `0.08` and the game becomes much more forgiving. Run `npm test` to see which rules tests notice.

## 4. Songs and charts (`src/song/songs.js`, `src/song/chart.js`, `charts/`)

**The set list** is `songs.js`: each song has a chart, an MP3 and a venue. `chart.js` keeps the **current song** in `SONG`. Picking a song on the menu calls `selectSong(id)`, which swaps what's in `SONG` and tells everyone who signed up with `onSongChange()`:

- the audio player loads that recording (decoded songs are remembered, so switching back is instant),
- the stage changes venue (`stage.setVenue`),
- the bands learn who sings lead, the 3D band rebuilds its music cues, and the HUD shows the new title.

New charts are made by the chart maker, `scripts/chart/make_chart.py`. It finds the beats in the MP3 and places the notes. See `docs/ADDING_SONGS.md`.

Each note in the JSON looks like `{ "time": 12.35, "lane": 2, "tier": 1, "hold": 0, "role": "guitar-strum" }`.

- `tier` is the easiest difficulty the note appears in: Casual plays tier 0, Standard plays 0–1, Expert plays 0–2.
- `sections` name the parts of the song (VERSE 1, CHORUS 1…). The stage lights use them.
- `beats` are the real detected beat times. The scrolling beat lines and the band's groove follow them.

You can open `charts/song_chart.csv` in a spreadsheet to look at the first song's notes. For chart-maker songs, open the picture next to the chart (for example `charts/trust_god_anyway.png`).

## 5. The 3D world (`src/world/`)

**Three.js basics:** a **Scene** holds **Meshes**. A Mesh is a **Geometry** (a shape: box, plane, cylinder) plus a **Material** (its color, texture or glow). A **Camera** looks at the scene and the **Renderer** draws it onto the `<canvas>`.

The world's coordinates:

```text
        y (up)
        |
        |      stage is far away, at negative z (about -17)
        |     /
        |    /  notes start here and travel toward +z
        |   /
        +--------- x (right)    lanes are at x = -1.6, -0.5, 0.5, 1.6
       /
      z (toward you)            the hit line is at z = 0, the camera at z = 4.4
```

| File | What it builds |
|---|---|
| `scene.js` | renderer, camera (widens on narrow phones), basic lights, fog for depth |
| `stage.js` | stage platform, drum riser, LED wall (a canvas drawn as a texture), truss, speakers, 4 moving spotlights with visible beams, where the crowd stands (staggered rows that thin out toward you), floating haze; `setVenue()` re-dresses it |
| `venues.js` | the venues: colors, LED screen style, a pixel-art backdrop painted on a canvas (city skyline, sunrise), and props (string lights, trees, flags) |
| `crowd.js` | the pixel-art fans, all drawn as one object (*instancing*); they cheer harder as the music gets bigger |
| `band3d/`, `bandPixel.js` | the musicians (below) |
| `showfx.js` | chorus effects: fire jets, lasers, confetti, crowd lights |
| `highway.js` | road, lane strips, beat lines, hit line, targets, **note gems** and **hold trails** |
| `effects.js` | spark particles |

**Note positions:** a note due at time `n.time` sits at `z = -(n.time - t) × NOTE_SPEED`. That one line is the whole highway.

**Object pools:** the song has up to 1,091 notes, but only about 30 are on screen at once. So `highway.js` makes 90 gem meshes up front and reuses them each frame for whichever notes are visible. This is much faster than creating and deleting objects.

## 6. The band (`src/world/band3d/`)

The musicians are built from boxes (a "low-poly" style) with real joints. Read the files in this order:

1. **`rig.js`: the skeleton.** A tree of joints (hips → spine → chest → shoulder → elbow → hand). Rotating a joint moves everything below it.
2. **IK ("inverse kinematics"), also in `rig.js`.** Instead of picking shoulder and elbow angles by hand, we say *"put the hand here"* and `solveTwoBone()` works out the angles using the law of cosines from school geometry. That's how a hand lands on the guitar strings or a stick lands on the snare.
3. **`instruments.js`: the props.** Guitar and bass bodies are a 2D outline (`THREE.Shape`) pushed into 3D (`ExtrudeGeometry`). The drum kit is cylinders and cones, plus a pixel-art flame drawn on a canvas for the kick drum.
4. **`members.js`: the looks.** Each musician follows the character descriptions in the blueprint: the bassist's backwards cap, glasses and lab coat; the singer's ponytail, hoops and sleeved band tee; the guitarist's buzz cut and cross necklace; the clean-shaven drummer with wavy hair.
5. **`index.js`: the animation.** This is the interesting part.

**How the band stays in time:** for each musician we look up the previous and next chart note for their instrument (`lastIndex()`, a binary search). Then:

- **Strumming** (`strumCurve`) sweeps the hand across the strings so it crosses them exactly at each note, alternating down and up.
- **Drumming** (`liftCurve`) puts the stick on the drum exactly at each hit and lifts it in between. The right hand plays the snare on the backbeat, the left plays the hi-hat, and the right foot plays the kick pedal.
- **Singing** opens the mouth on vocal notes and raises the mic. A new hand gesture starts with each vocal phrase.

Reactions are layered on top:

| Priority | When | What you see |
|---|---|---|
| 1 | game over | everyone slumps |
| 2 | you missed their lane | slump, head shake, hand drops |
| 3 | you hit their note | small bounce; **every 25 in a row the whole band does a big move** (guitar necks up, singer points at the sky, drummer crashes the cymbals) |
| 4 | the chart has a note | they play it |
| 5 | always | head-nods and knee bounces on the beat |

The singer's ponytail is a tiny physics simulation: a spring pushed around by her head's movement.

**The pixel bands** (`bandSprites.js` + `bandArt.js`) use sprite sheets made with PixelLab (see `docs/ART_PIPELINE.md`). Each musician is a flat plane in the 3D world that shows one cell of their sheet. All sprites use the same pixel size. The drum kit is a separate sprite drawn in front of the drummer, and the guitarist's mic stand is a *prop* standing beside him.

**The animation blocks** (`animBlocks.js`, used by the Retro band, the default). Each musician has a library of about 10 animations sorted into blocks: idle, groove, sing, accent, mistake, celebrate and bow. A small **choreographer** decides, every frame, which animation and which frame to show:

| When | What the choreographer does |
|---|---|
| In the menus | the idle loop |
| Verses / choruses | a *calm* / *hype* groove; about one phrase in three it swaps in a variation (the singer points, the drummer twirls a stick...). Grooves change **only on bar lines** (every 4 beats) |
| You miss their note | a mistake starts **immediately**, stretched to finish exactly where the next loop starts |
| Every 25 in a row, or a finished long note | an accent, which waits for the current loop to end (under a second) |
| Every 100 in a row | the whole band celebrates |
| End of the song | celebrate, then bow |
| Game over | frozen mid-stumble |

Why it looks smooth: every animation starts and ends on the same standing pose (the *hub*), and switches only happen where a loop restarts, which is on that pose. Loops are tied to the song's beats (a 2-beat loop restarts every second beat), so the band always moves in time. The "random" choices come from a hash of the bar number, so the same moment of the song always gets the same move, which makes problems easy to reproduce. `tests/unit/animBlocks.test.js` checks all of these rules.

**Who sings?** Each chart says who sings lead (`"vocalist"` in `charts/song_chart.json`: `singer`, `guitarist` or `duet`). In her songs the guitarist sings backing vocals at his mic in some chorus phrases. In his songs he sings through every vocal section. In duets they share. The **HD band** has no blocks, so it uses the older three rows: *play* loops every 2 beats, *accent* plays on big moments and *mistake* plays on misses.

**The classic pixel band** (`bandPixel.js`) is the original 2D art, kept as an option in Settings.

## 7. Big concert effects (`src/world/showfx.js`)

When a chorus starts: a strobe flash, all four fire jets, and confetti from the truss. During choruses the fire jets fire on each bar, lasers sweep the crowd, the LED wall turns to flames, the truss lights chase, and the crowd holds up phone lights (also during the bridge). Fire and confetti are particles (see `Particles` in `effects.js`): lots of dots that each have a position, speed, color and lifetime.

## 8. Game over, settings and the timing check

- **Game over** (`failGame()` in `main.js`): when energy reaches 0, the music slows down and fades out like a tape machine losing power (`player.powerDown()`), the band slumps, and the results screen says SHOW'S OVER. Practice mode turns this off. `ENERGY.drain` in `config.js` makes Casual and Standard more forgiving.
- **Settings** (`settings.js`) are saved in the browser, so they're remembered next time.
- **Timing check** (`ui/calibration.js`): every phone and headphone adds a small delay (Bluetooth can add 150 ms or more). The game plays clicks and you tap along. The median gap between click and tap becomes your *tap offset*, and the referee then judges each tap that much earlier. The screen flashes only when **you** tap, not on the click, so your eyes don't do the timing for you.

## 9. Audio and iPhones (`src/audio/player.js`)

Two hard-won rules from the original project:

1. **iPhones only allow sound after a tap.** `player.start()` is called directly from the Start button and unlocks audio before doing anything slow.
2. **No separate MP3 file.** The song is embedded inside `index.html` when you build, so itch.io can never fail to find it (that caused "HTTP 404" in the original).

Pausing suspends the audio system, which freezes the music and the clock together, so the notes stay in sync after resuming.

## 10. Building (`vite.config.js`)

[Vite](https://vite.dev) is the build tool.

- `npm run dev` serves the game while you edit and reloads instantly.
- `npm run build` bundles everything into **one** `dist/index.html`. The `vite-plugin-singlefile` plugin embeds the code, CSS, MP3, PNG and chart inside it. `scripts/package-itch.mjs` then zips it for itch.io.

## 11. Ideas for your first changes

| Try this | Where |
|---|---|
| Make notes faster or slower | `TRAVEL` in `src/config.js` |
| Move the camera | `CAMERA.position` / `CAMERA.lookAt` in `src/config.js` |
| Change lane colors | `LANES` in `src/config.js` |
| Change the chorus light colors | `MOODS` in `src/world/stage.js` |
| Make the crowd bigger | `crowdCount` in `src/world/stage.js` |
| Change the LED wall graphics | `drawLed()` in `src/world/stage.js` |
| Move a 3D musician | `place(...)` calls in `src/world/band3d/index.js` |
| Change an outfit color | `buildBody({...})` calls in `src/world/band3d/members.js` |
| Make strums bigger | `strum * 0.2` in `animateStringed()` (`band3d/index.js`) |
| Make Casual more or less forgiving | `ENERGY.drain` in `src/config.js` |
| Change the fire jet positions | `PYRO_X` in `src/world/showfx.js` |

Run `npm run dev`, make the change, save, and watch the browser update. Open `http://localhost:5173/?autoplay&view=stage` to watch the band up close while you tweak them.
