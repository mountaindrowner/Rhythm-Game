# How Burn Bright 3D works

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

## 4. The chart (`src/song/chart.js` + `charts/song_chart.json`)

Each note in the JSON looks like `{ "time": 12.35, "lane": 2, "tier": 1, "hold": 0, "role": "guitar-strum" }`.

- `tier` is the easiest difficulty the note appears in: Casual plays tier 0, Standard plays 0–1, Expert plays 0–2.
- `sections` name the parts of the song (VERSE 1, CHORUS 1…). The stage lights use them.
- `beats` are the real detected beat times. The scrolling beat lines and the band's groove follow them.

You can open `charts/song_chart.csv` in a spreadsheet to look at the notes.

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
| `stage.js` | stage platform, drum riser, LED wall (a canvas drawn as a texture), truss, speakers, 4 moving spotlights with visible beams, 140 crowd members drawn as one object (*instancing*), floating haze |
| `band.js` | the musicians (below) |
| `highway.js` | road, lane strips, beat lines, hit line, targets, **note gems** and **hold trails** |
| `effects.js` | spark particles |

**Note positions:** a note due at time `n.time` sits at `z = -(n.time - t) × NOTE_SPEED`. That one line is the whole highway.

**Object pools:** the song has up to 1,091 notes, but only about 30 are on screen at once. So `highway.js` makes 90 gem meshes up front and reuses them each frame for whichever notes are visible. This is much faster than creating and deleting objects.

## 6. The band (`src/world/band.js`)

The musicians are 2D pixel art standing in a 3D world, a style sometimes called "HD-2D." Each one is a flat plane showing one cell of `assets/art/burn_bright_clean_atlas.png` (7 poses × 4 musicians). Changing pose just slides which cell the plane shows.

Poses are chosen every frame by priority:

1. **Mistake** (you missed their lane): stumble pose, red flash, then recover.
2. **Your hit:** big accent pose, a colored ring bursts from their feet, and a little squash-and-stretch.
3. **Music cue:** the chart has a note for their instrument right now, so they play it, whether or not you hit it. This keeps the band in time with the song.
4. **Groove:** alternate poses on the beat.

## 7. Audio and iPhones (`src/audio/player.js`)

Two hard-won rules from the original project:

1. **iPhones only allow sound after a tap.** `player.start()` is called directly from the Start button and unlocks audio before doing anything slow.
2. **No separate MP3 file.** The song is embedded inside `index.html` when you build, so itch.io can never fail to find it (that caused "HTTP 404" in the original).

Pausing suspends the audio system, which freezes the music and the clock together, so the notes stay in sync after resuming.

## 8. Building (`vite.config.js`)

[Vite](https://vite.dev) is the build tool.

- `npm run dev` serves the game while you edit and reloads instantly.
- `npm run build` bundles everything into **one** `dist/index.html`. The `vite-plugin-singlefile` plugin embeds the code, CSS, MP3, PNG and chart inside it. `scripts/package-itch.mjs` then zips it for itch.io.

## 9. Ideas for your first changes

| Try this | Where |
|---|---|
| Make notes faster or slower | `TRAVEL` in `src/config.js` |
| Move the camera | `CAMERA.position` / `CAMERA.lookAt` in `src/config.js` |
| Change lane colors | `LANES` in `src/config.js` |
| Change the chorus light colors | `MOODS` in `src/world/stage.js` |
| Make the crowd bigger | `crowdCount` in `src/world/stage.js` |
| Change the LED wall graphics | `drawLed()` in `src/world/stage.js` |
| Make the band stand somewhere else | `LAYOUT` in `src/world/band.js` |

Run `npm run dev`, make the change, save, and watch the browser update.
