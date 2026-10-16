# Adding songs (the chart maker)

The game can turn any song into a playable chart. `scripts/chart/make_chart.py` listens to the MP3, finds every beat, and places notes for all four lanes and all three difficulties. Each song plays in its own **venue**.

## The set list

| Song | Tempo | Venue | Chart |
|---|---|---|---|
| You Won't Let Me Fall | 153 BPM | The Arena (indoors, giant LED wall) | `charts/you_wont_let_me_fall.json` (chart maker, with the original hand-named sections from `charts/you_wont_let_me_fall.sections.json`) |
| You're Not My Plan B | 167 BPM | City Rooftop (night skyline, neon, string lights) | `charts/youre_not_my_plan_b.json` (chart maker) |
| Trust God Anyway | 167 BPM | Sunrise Hill (open-air stage, mountains, festival flags) | `charts/trust_god_anyway.json` (chart maker) |

All three are sung by her (`"vocalist": "singer"`).

## Add a song in 3 steps

You need Python 3 with numpy (`pip install numpy`) and the `ffmpeg` program.

1. **Copy the MP3** into `assets/audio/`, for example `assets/audio/new_song.mp3`.
2. **Make the chart:**
   ```bash
   python3 scripts/chart/make_chart.py assets/audio/new_song.mp3 \
       --id new_song --title "New Song" --vocalist singer --venue rooftop
   ```
   It prints the tempo, the sections and the note counts. It writes `charts/new_song.json` and a picture, `charts/new_song.png`.
3. **Add it to the set list** in `src/song/songs.js`: import the chart and the MP3, then add a line to `SONGS`. Then run `npm run dev`, pick it on the menu, and play it (`?autoplay` plays it for you).

`--vocalist` is `singer` (her), `guitarist` (him) or `duet`. The band animates to match (see `docs/HOW_IT_WORKS.md`). `--venue` is one of the venues in `src/world/venues.js`.

**Big moments (optional, in `songs.js`):** `solo: { section: 'BRIDGE', who: 'guitarist' }` turns that section into a call-and-response solo (`who` is `bassist`, `singer`, `guitarist` or `drummer`). `bigRockEnding: true` adds the Big Rock Ending; use it for songs that end on a big final hit, not a fade-out.

## How it hears the beat (`scripts/chart/`)

| File | What it does |
|---|---|
| `listen.py` | The "ears". It decodes the MP3 and makes a spectrogram (how loud every pitch is, about 86 times a second). It splits **smooth** sounds (voice, chords, bass) from **spiky** ones (drums). It finds **onsets** (moments new sound starts), the **tempo** (how the onsets repeat), every **beat** (a chain of onsets as close to the tempo as possible), and **beat 1** of each bar (kick on 1, snare on 2 and 4, chord changes on 1). |
| `sections.py` | An **energy map**: each 4-bar block is CALM, MEDIUM or BIG compared with the rest of the song. Big parts are choruses, the part before a chorus is a build, and so on. |
| `notes.py` | Places notes on a grid made from the beats. Each lane listens to its own part of the sound: drums to the spiky sound, bass to the smooth sound below 250 Hz, guitar to 250 Hz–2 kHz, vocals to 1–3.5 kHz. Casual and Standard stay on the beat (Standard adds two-lane chords on beats 1 and 3), and Expert adds half-beats. **Density** (since v0.7, after phone play testing): about 1.4 / 2.4 / 4.3 taps per second for Casual / Standard / Expert, down from the original chart's 2.2 / 4.7 / 7.3. |
| `picture.py` | Draws the analysis picture (sections, onset curve, beats, notes). |
| `test_listen.py` | Checks with made-up drum hits at known times: `python3 scripts/chart/test_listen.py`. |

**How accurate is it?** On *You Won't Let Me Fall*, the beats it finds line up with the original chart's beats 100% of the time (within 70 ms). With fake drum hits at exact times, its beats land within 5 ms. Notes follow each lane's part of the mix. No computer can perfectly pull one instrument out of a finished song, so the lanes are "inspired by" their instruments, like the original chart.

## Fixing things by hand

- **The notes feel twice (or half) as fast as the song.** Many songs fit two tempos equally well (167 and 83 BPM, for example). The chart maker looks between 90 and 190 BPM by default. For a slow song, add `--tempo 60-100`.
- **The section names are wrong.** Sections are a best guess from energy (a computer can't hear the lyrics). If you know where the parts start, write them in a small file and pass `--sections`:
  ```json
  [
    {"time": "0:00", "name": "OPENING"},
    {"time": "0:08", "name": "VERSE 1"},
    {"time": "0:31", "name": "CHORUS 1"},
    {"time": "0:54", "name": "VERSE 2"},
    {"time": "2:08", "name": "FINAL CHORUS"},
    {"time": "2:25", "name": "OUTRO"}
  ]
  ```
  ```bash
  python3 scripts/chart/make_chart.py assets/audio/new_song.mp3 --id new_song --title "New Song" --sections my_sections.json
  ```
  The game uses the names for its lights, effects, band moves and how many notes to place, so use the words OPENING, VERSE, BUILD, CHORUS, REFRAIN, BRIDGE, FINAL CHORUS and OUTRO.

## Venues (`src/world/venues.js`)

A venue is a set of colors (sky, haze, light, floor, stage), a screen style, and optionally a **backdrop** and **props**:

- **The Arena:** indoors, dark, with the giant LED wall behind the band.
- **City Rooftop:** a pixel-art night skyline with lit windows, neon and a moon. Also a rooftop wall, a water tower, air-conditioning units, and string lights that twinkle on the beat.
- **Sunrise Hill:** a sunrise sky with clouds, three mountain ranges and birds. Also pine trees, grass, and festival flags that sway.

Outdoor venues use a smaller **banner** screen raised high, so the backdrop shows behind the band. To add a venue, copy one of the entries, give it a new name, and set `venue` in `songs.js` (or `--venue`).
