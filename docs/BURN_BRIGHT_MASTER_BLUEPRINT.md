# BURN BRIGHT: THE PIXEL RIOT
## Master Game Design, Art Direction, Technical Specification, and AI Development Handoff

**Document edition:** 1.0 — based on the project through **BB7 Premium Art Pass**, October 14, 2026  
**Project identity:** *Burn Bright* (game title), *The Pixel Riot* (in-world band / series identity)  
**Flagship playable song:** *You Won't Let Me Fall*  
**Intended reader:** another AI coding assistant, game developer, artist, audio/chart designer, or project owner rebuilding and expanding this game.  
**Document type:** authoritative *project vision and continuation brief*, not a chronological changelog.  
**Status legend:** **CURRENT** means present in the inspected BB7 source; **REQUIRED** means approved design intent; **FUTURE** means a proposal, not a delivered feature; **VERIFY** means a current behavior that needs additional testing/refinement.

> **Essential handoff:** Build a vibrant, mobile-first, four-lane, music-driven, retro-pixel rhythm game featuring a four-person early-2000s Christian alternative-rock band. The stage must contain visibly *articulated*, distinct musicians whose playing, singing, drumming, successful hits, mistakes, and recovery are synchronized with real recorded music. Four huge thumb-friendly pads drive the gameplay, with timing grades, holds, scoring, combos, health, section progression, polished visual effects, and three difficulties. The current implementation is a self-contained portrait HTML5/Canvas game, with an embedded copy of the user-provided song, embedded sprite atlas, and embedded chart. It is meant to run on desktop and — critically — **Safari on an actual iPhone through itch.io**. Preserve what works; rebuild the internal structure and art where necessary to make it feel like a genuinely finished game.

---

# 1. How to use this handoff

A new coding AI should read this entire document **before touching implementation**. Treat the following as the source-of-truth priority, in descending order:

1. **The user's approved vision and character descriptions documented here.** These are not free-floating artistic suggestions.
2. **The working packaged build, particularly the BB5 embedded-audio architecture**, which the user explicitly confirmed as working on itch.io. BB6 and BB7 add presentation work; they are later source snapshots, not separately user-validated releases.
3. **The latest BB7 source** for current controls, data shape, artwork, and rendering; examine actual code before replacing it.
4. **The real MP3 and chart JSON** for the flagship song. They are source material, not examples to recreate approximately.
5. **The clean sprite atlas** and original generated art as visual references. Validate frame extraction by looking at the full body and instrument, not by assuming an image generator returned a uniform grid.
6. This document's future recommendations. Do not mistake aspirations or proposed changes for existing functionality.

A successful new instance should begin by checking the files, running the game, inspecting screenshots *and a short animation recording*, then make incremental, measurable upgrades. **A static screenshot, valid HTML syntax, and a passing “starts playing” test do not establish that an animation looks convincing or that iPhone deployment works.** That distinction has been one of the largest lessons of this project.

**Non-negotiable preservation rules:**

- Keep the **recorded song playback working**; do not silently substitute synthesized backing tracks.
- Keep a **single-file/offline-safe distribution option**, or an equally robust deployment that has been tested on real hosting. The game previously broke because the MP3 URL returned HTTP 404.
- Keep **four instrument lanes in a fixed order**: Bass, Vocals, Guitar, Drums.
- Keep the game **portrait-oriented, designed for touch first**, with an approximate 400×800 logical game canvas.
- Keep every member recognizable, modestly dressed, and consistent with the specific character brief.
- Keep **genuinely different sprite poses and meaningful performance reactions**. Minor swaying of a flat image is inadequate.
- Differentiate confirmed behavior from untested implementation or planned additions.

---

# 2. High concept and player fantasy

## 2.1 Elevator pitch

*Burn Bright: The Pixel Riot* is a colorful pixel-art concert rhythm game where the player performs with a four-member rock band. On a phone held upright, notes descend down a perspective highway toward four large pads. Each lane corresponds to one performer and musical role: the bassist, lead vocalist, guitarist/co-vocalist, and drummer. Players tap or hold in time with a real rock recording while animated musicians react to the music, the player's accuracy, missed notes, and milestones.

The experience should feel like **playing along with an actual energetic early-2000s Christian alternative-rock performance**, rendered as a stylish handheld-era game with the richness and visual ambition of a modern indie pixel-art title.

## 2.2 The core fantasy

The player is not an abstract cursor hitting four buttons. They are the band’s performance coordinator, carrying the show through a song. Their timing should appear to **drive the band's energy**, and the band’s animation should be an essential part of the reward loop:

- Good hits produce musical confidence, instrument action, crowds, lights, and bursts of color.
- Consecutive accurate hits make the performance *feel larger*.
- Wrong inputs and missed notes make the corresponding musician physically falter, then recover.
- Big choruses become visibly more powerful than verses.
- The band should feel like four individuals, not four copies of the same bouncing sprite.

## 2.3 Musical identity

The inspiration is early-2000s alternative rock / accessible Christian rock: guitar-driven, melodically anthemic, fast, emotionally sincere, energetic without grimness. The reference *feel* includes the era of bands such as Switchfoot and Skillet; the game must have its own visual identity and original/authorized audio, not copied artwork or songs.

The supplied flagship track *You Won't Let Me Fall* has an energetic female lead, a substantial electric-guitar presence, strong rhythmic drums, bass, chantable refrains, and lyrics about trust, endurance, mercy, and Jesus. The band can have a Christian-rock identity without every menu, item, or interface element becoming an overt sermon. The feel is passionate, inviting, exuberant and fun.

## 2.4 The visual target, refined through development

The initial concept used **classic monochrome Game Boy-like pixel graphics**. That was a direction for *pixel clarity and nostalgia*, not a permanent restriction to four green shades. The user later approved increasingly rich color and repeatedly requested a cleaner, more cohesive presentation.

**Final art direction:** modern polished pixel art with retro handheld/16-bit ancestry, evocative arcade color, dark concert environments, sharp full-body sprites, legible neon instrument colors, warm amber spotlights, cool blue stage light, dark purple/navy structure, and restraint in visual clutter. The interface must read at iPhone size. Characters must be distinct at small scales. Blur, illegible microtype, randomly mixed stylistic effects, and pasted-together promotional graphics are not desirable.

## 2.5 Experience boundaries

This is not currently:

- a 3D free-roaming band simulator;
- a music-generation product in which each button creates the whole song in real time;
- a Guitar Hero/Rock Band clone in branding or copied visual assets;
- a complex character RPG, dating game, or management simulator;
- a framework-dependent app requiring native installation;
- a rhythm game that plays only synthesized placeholder sounds while ignoring the uploaded recording.

The focus is **one excellent, fully playable song performance**, then a reusable system for future songs and venues.

---

# 3. Canonical band, roles and character designs

The band consists of four adult performers. The following distinctions were specified through multiple rounds of correction and should be preserved, even during a wholesale re-art.

## 3.1 Bassist — the scientist

**Role:** Bass lane (lane 0); plays electric bass.  
**Identity:** Caucasian man, roughly in his thirties, slim / lean build; wry “mad scientist meets rock musician” energy.  
**Key visual identifiers:**

- Backwards ball cap.
- Glasses.
- Light stubble (allowed and intentional for *this* character).
- Open lab coat layered over a black rock/band T-shirt, ideally with subtle science/atom iconography.
- Jeans and sneakers.
- Electric bass guitar; green/dark body in the established art.
- Slightly oddball, clever, approachable stage posture.
- Slim, *not* bulky, muscular, or stocky.

**Animation personality:** controlled, playful bass grooving; alternate fretting positions and visibly moving picking/plucking hand; occasional ducking stance or dramatic bass-neck lift; lab coat tails and cap provide personality. Mistake: startled grimace, wrong-note reaction, temporary collapse of confident stance, recovery back into the groove.

**Avoid:** identifying him as lead guitarist; losing the lab coat/cap/glasses; making him heavily muscular; depicting a static bass while only his torso rocks.

## 3.2 Female lead vocalist

**Role:** Vocal lane (lane 1); primary singer, carries the biggest melodic emphasis.  
**Identity:** Latina woman, in her twenties, confident, adventurous, lively, capable, with a beat-'em-up heroine sort of attitude.  
**Key visual identifiers:**

- Ponytail (it can have energetic motion; keep the hairstyle consistent from frame to frame).
- Hoop earrings.
- Cool **sleeved** band T-shirt; the user **specifically requested conservative, non-sexualized clothing**.
- Cargo/adventure-style pants or other practical early-2000s rockwear, sneakers, and optional tied overshirt/jacket.
- Handheld microphone.
- Strong posture and exciting facial expression, but respectful silhouette/proportions.
- Cool rock-band apparel, not revealing clothing or sexualized posing.

**Animation personality:** singing with mouth visibly opening, raising or extending an arm, pointing toward the crowd, gripping the mic, leaning into a chorus, belting a held note, recovering from a vocal mistake. Ponytail should move naturally but not be the only animated element.

**Avoid:** sleeveless clothing, exaggerated anatomy, revealing outfits, purely decorative static singer, permanently open-mouth one-frame animation.

## 3.3 Guitarist / secondary male vocalist

**Role:** Guitar lane (lane 2); electric lead/rhythm guitarist and potential secondary vocalist.  
**Identity:** Latino man in his twenties, medium build, early-2000s classic-rock/Christian-alt-rock frontman vibe.  
**Key visual identifiers:**

- Short buzzed haircut, not an extremely militaristic shave.
- Oversized-era rockwear, **but with a somewhat better-fitting/tighter T-shirt than the earliest concept**; do not make him appear fat or too broad.
- Casual jeans/cargo trousers and sneakers.
- Electric guitar, often represented as dark red/crimson.
- Confident, easygoing rock stage presence; potentially a subtle necklace/accessory.
- Normal/medium build; neither scrawny nor bulky.

**Animation personality:** clearly recognizable strum-down/strum-up actions, left-hand fret changes, guitar angle shifts, head nod, planted wide stance, energetic accented strums, occasional guitar-neck raise. Mistake: visible struggle/fumbled chord, hand stopping, slouch, reaction and return to playing.

**Avoid:** simply rotating the entire guitarist PNG while the two hands and the guitar remain rigid. This was explicitly called out as failed animation in earlier builds.

## 3.4 Drummer — Brazilian Latino, clean-shaven

**Role:** Drums lane (lane 3), visually behind the front-line musicians.  
**Identity:** Brazilian Latino man; warmer/more Brazilian-Latino appearance instead of default Caucasian facial features; youthful adult; attractive but normal human proportions.  
**Key visual identifiers:**

- **Absolutely no facial hair** — the user corrected this multiple times.
- Wavy medium-ish hair combed/swept back, not excessively long.
- A modest/ordinary **sleeved** band T-shirt.
- Bigger overall frame than the bassist and perhaps somewhat broader than the guitarist, but **not jacked**, overly buff, bodybuilder-like or caricatureishly stocky.
- A natural, relatively healthy/broad build rather than huge arms.
- A red/dark-red drum kit with prominent central bass drum, cymbals, sticks. Fire/flame or band emblem on kick is acceptable.
- Expressive face, clean-shaven jaw, appropriate warmer medium complexion. Ethnicity is represented respectfully through the selected character design, not stereotyped props.

**Animation personality:** alternating left/right drumstick attacks, stick height changes, tom/cymbal/snare strikes, occasional both-sticks-raised flourish or crash. The **drum kit stays grounded**, while hands/arms/sticks do the bulk of visible movement. Mistake: drummer freezes, ducks, looks frustrated or covers his face briefly, then resumes playing. Avoid the entire kit swaying like a paper cutout.

## 3.5 Shared wardrobe and identity

All four members belong to the *same* band and visual world: early-2000s alternative Christian-rock style, casual jeans/cargos, sneakers, layered shirts, realistic adult proportions, modest attire, confident stage energy. Clothing should not look like mismatched fantasy/modern streetwear generations; the game’s character sheet should make sense as a coordinated 2000s alt-rock group.

**Band name:** *The Pixel Riot*.  
**Game title / marquee:** *Burn Bright*.  
**Band roster order on stage, roughly:** scientist bassist left; lead singer front/center; drummer center/rear; male guitarist right.  
**The *logical lane* order does not equal drawing order.** The drummer must render behind the other three.

---

# 4. Branding and art bible

## 4.1 Brand statement

**BURN BRIGHT** is bold, alive, legible and memorable. **THE PIXEL RIOT** identifies the band, stage show or tour. The visual system should suggest a small but exciting pixel-rock concert, with rich lighting and authentic instrument silhouettes.

The current start/menu label is `THE PIXEL RIOT · BB7 · PREMIUM ART PASS`. Future releases can carry a build identifier, but a production presentation should place the fictional brand first and build metadata in a discreet secondary position.

## 4.2 Palette and lane identity

The most important semantic colors are assigned consistently to instruments:

| Lane | Role | Current implementation color | Meaning |
|---|---|---|---|
| 0 | Bass | `#63FF79` / bright green | Groovy, grounded, foundational |
| 1 | Vocals / VOX | `#FFBE3B` / golden amber | Melodic, warm, human |
| 2 | Guitar | `#4BBDFF` / bright cyan-blue | Electric, crisp, active |
| 3 | Drums | `#FF5B5B` / red-coral | Strong impact, explosive rhythm |

Complementary environment colors: deep navy/near-black, dark plum/purple, warm cream, stage amber, muted lavender-blue, with occasional saturated neon color and limited white glints. Reserve strongly contrasting color for **notes, hit line, controls, status and critical feedback**, not the entire background.

**Readability principle:** Color alone is not enough. Notes and pads must also be distinguished by lane position, labels, icons and consistent alignment.

## 4.3 Pixel-art grammar

- Prefer deliberate clustered pixel shapes and clean outlines, rather than low-resolution photos with random pixelation.
- Keep a stable perceived pixel density across character portraits, stage art, notes, icons and typography.
- Use nearest-neighbor upscaling for sprites; avoid smoothing individual pixel edges during gameplay.
- Do not stretch sprite frames inconsistently between poses: every frame needs common anchor/pivot/feet alignment.
- High detail is welcome, but at the scale of a ~115×175 displayed musician, silhouette wins over tiny details.
- Use limited glow/bloom through Canvas effects; avoid washing out the pixel edges.
- Make backgrounds supportive: performers and notes are always more important than decorative banners.

## 4.4 Stage composition

The established portrait composition has three primary zones:

1. **Upper HUD** for game title, song name/BPM, life, score, combo and pause.
2. **Stage viewport** with truss, lit banner, venue atmosphere, drums/speakers/crowd and four rendered musicians. Stage lighting pulses according to beat/sections and stronger moments.
3. **Perspective highway and touch deck** with four colored lanes, moving notes, hit line and bottom pads.

In BB7 the stage includes a dark truss, lit marquee/band banner, side speakers, moving warm/cool spotlights, stage deck, dynamic crowd silhouettes and layered sprites. It is drawn programmatically over/with embedded stage assets. The banner and spotlights should not obscure the performers’ faces.

## 4.5 Stage changes with music

- **Opening:** smaller lights, preparation/build-up.
- **Verses:** controlled movement and lighting; preserve visual rhythm and note readability.
- **Builds/pre-choruses:** rising light motion and crowd energy.
- **Choruses:** brighter, fuller stage pulses, bigger gestures/accents, potentially better crowd motion.
- **Bridge:** distinct mood/lighting and different musician behavior.
- **Final chorus/outro:** climactic staging without obscuring notes.

The current code already responds to detected beats and to section names; a polished version should develop a designed lighting script per section rather than relying entirely on sine waves and generic brightness.

## 4.6 UI/UX consistency

The menu, pause, result, HUD, instrument pads, note effects, difficulty chips and calibration slider must all look like **one game**. Avoid the previous patchwork of mismatched bevels, fonts and saturated colors. The BB6/BB7 attempts moved toward a consistent dark purple/premium-pixel-rock design with cream text, orange-gold accents, rounded controls, and generous mobile tap targets.

Future polished assets might include a proper pixel logo, distinct instrument icons, small stage/venue motifs, reusable UI 9-slice panels, a coherent pixel-font hierarchy, and dedicated results art. These are **desired refinements**, not necessarily all pre-rendered art assets in BB7.

---

# 5. Gameplay loop

## 5.1 Player journey

1. Load a compact portrait start menu.
2. See game title, band identity, current song, approximate BPM, control summary, and difficulty choices.
3. Choose **Casual**, **Standard** or **Expert**.
4. Optionally adjust touch-timing offset.
5. Tap **START THE SHOW**; browser audio unlock occurs directly within the tap handler.
6. The game prepares/decodes the recorded MP3; show an understandable loading message.
7. A four-beat musical count-in precedes playback. Players anticipate the first notes.
8. Real song audio starts; a four-lane highway scrolls notes toward the judgement line.
9. Tap/hold the matching bottom instrument pad exactly as its note reaches the line; simultaneous notes require multiple fingers (or multiple keyboard keys).
10. Successful hits create grade feedback, points, combo and on-stage animation accents. Misses/incorrect presses produce a distinct mistake pose, loss of combo, life-meter impact and clear visual messaging.
11. Progress through verses, builds, choruses, bridge and outro. Music and visuals reinforce section identity.
12. At song completion, display a headline/grade, final score, max combo, weighted accuracy, counts, and replay/menu options.

## 5.2 Lane-to-musician mapping

**This mapping must not change accidentally:**

| Index | Pad label | Keyboard | Instrument | Stage performer | Suggested icon |
|---|---|---|---|---|---|
| `0` | BASS | `D`, `1` | Bass guitar | Scientist bassist (left) | bass clef or bass guitar |
| `1` | VOX | `F`, `2` | Female lead voice | Latina singer (center front) | microphone or music note |
| `2` | GUITAR | `J`, `3` | Electric guitar | Latino guitarist (right) | guitar/lightning |
| `3` | DRUMS | `K`, `4` | Drum kit | Brazilian drummer (center rear) | drumsticks/drum |

Additional desktop arrow-key aliases exist in the BB7 code. The dominant input scheme remains **four large touch pads**.

## 5.3 Rhythm highway

The four lanes taper toward the top to create a guitar-hero-style 2.5D perspective. Notes spawn/read ahead and move toward a clear near-bottom judgement line. A correctly timed tap is based on **audio time**, not guessed frame speed. Beat-grid cross-lines move toward the player to communicate tempo and depth.

The perspective treatment can be implemented via ordinary HTML Canvas polygons; genuine WebGL/Three.js is optional, not a prerequisite. A lightweight Canvas game was chosen because it performs well on phones, renders predictably, and ships easily as an HTML5 file.

## 5.4 Normal notes and holds

- **Tap:** press a specific lane close enough to note timestamp; resolve to Perfect/Great/Good or Miss.
- **Hold:** press at the start of a sustained note and keep the same lane held until its tail; successful completion earns an additional bonus.
- **Simultaneous notes/chords:** multiple notes may share a timestamp across lanes. Multitouch should allow chord input.
- **Difficulty:** tiers control which events are present. Harder charts increase rhythmic subdivisions, layering and chord density, not simply scrolling speed.
- **Accuracy:** hits are judged against the original song's timebase plus calibration offset.

## 5.5 The four pads

Large, always visible thumb-target controls along the bottom of the portrait screen. They are saturated in green, amber, cyan and red, and have symbols plus readable role labels. Interactions should immediately light up / depress the corresponding pad and produce a colored pulse at the hit line. Pad hitboxes should tolerate typical thumb offsets and should support simultaneous finger touches, finger release and press-and-hold. The current listener accepts tap input across the lower region rather than requiring a precise press directly on the drawn rectangle.

Make sure iOS navigation bars/home-indicator safe areas do not cover the pads. CSS viewport constraints and the itch.io iframe can behave differently between desktop, embedded portrait, and physical Safari.

## 5.6 Feedback philosophy

A good rhythm game feels responsive even before it becomes difficult. Make every meaningful input *legible*:

- Accurate tap: note resolves, visual burst, stage movement, a clear grade near the actual play area, life/combo feedback.
- Perfect: particularly crisp/warm bright response, extra particles, perhaps crowd accent.
- Great: positive but less dominant.
- Good: subtle success, no ambiguity about accepted timing.
- Wrong/miss: instant recognizable red/falter animation and readable message; **not merely a lost number**.
- Hold: tail follows the lane, release feedback, lost-hold explanation, and appropriate character reaction.
- Streak/combo threshold: heightened crowd reaction/lighting that does **not** occlude incoming notes.

Visual excitement must not compromise **readability**. Avoid screen-shake so strong that timing becomes harder.

---

# 6. Scoring, health, and failure behavior

This section separates current code from ideal future tuning.

## 6.1 Current timing windows (CURRENT)

A note is eligible when `abs(note.time - (songGameTime + touchOffset)) < 0.175` seconds.

| Result | Absolute timing difference | Current base points before combo bonus |
|---|---:|---:|
| PERFECT | less than 45 ms | 300 |
| GREAT | 45 ms up to below 97 ms | 180 |
| GOOD | 97 ms up to below 175 ms | 90 |
| MISS | outside the window / becomes late | 0 |

The precise difference is evaluated in seconds from the same Web Audio clock as the music. The current miss detection is slightly beyond 174 ms late. There is no separate early-miss deletion; too-early inputs can count as wrong presses, while the upcoming note can subsequently be missed.

## 6.2 Current combo-based scoring (CURRENT)

- PERFECT: `300 + min(200, combo * 2)`.
- GREAT: `180 + min(130, combo)`.
- GOOD: `90 + min(80, combo)`.
- Completed hold bonus: `+150`.
- Wrong inputs and normal misses reset combo; combo milestones occur at multiples of **25**, triggering “crowd on fire” style feedback.
- `maxCombo` tracks the longest consecutive hit streak.

These are the present prototype values. A future balancing pass should normalize difficulty scores, verify exploit resistance (spam input), and make the score display/leaderboard comparability coherent. Do not change them inadvertently during a visual refactor.

## 6.3 Current life/energy meter (CURRENT)

- Starting energy: **85/100**.
- PERFECT: `+1.15` energy, capped at 100.
- GREAT: `+0.65` energy.
- GOOD: `+0.15` energy.
- Natural missed note: loss includes `-2.1` and an additional mistake-state penalty from `markMistake` (`-1`), so effective loss is greater than the simple missed-note amount.
- Wrong press: `-2` energy (with per-lane suppression of repeated immediate wrong-press events).
- Hold lost: the code charges `-4` and then a mistake-state penalty (`-1`).
- Successful hold completion restores `+1` energy.

**Design issue to resolve:** these stacked penalties are partially accidental implementation details. Consolidate them into explicit, documented penalty values before balancing.

**Important distinction:** the prototype currently selects a results headline based on end-of-song energy; it does **not clearly implement an immediate game-over upon energy reaching zero**. Do not advertise a fail-out/loss screen as completed without verifying or building it. A future design may add failure, practice protection, recovery opportunities and explicit continue behavior, but that requires product approval.

## 6.4 Results (CURRENT)

- Headline based on energy: `HEADLINER!` (80+), `NICE SET!` (48–79.99), `KEEP ROCKING!` (below 48).
- Final score.
- Maximum combo.
- Perfect count.
- Good/Great combined count.
- Missed count including extra wrong presses.
- Approximate **weighted accuracy** using `round((perfect + great*0.85 + good*0.65) / total * 100)`. This is not simply raw hit percentage. Future output should label the formula accurately or change it consistently.
- Replay and main-menu buttons.

A more polished future results design could add full Perfect/Great/Good/Miss breakdown, note accuracy histogram, rank, progress graph, new record tracking, unlocked art or applause. These are not yet confirmed gameplay systems.

---

# 7. Flagship song: *You Won't Let Me Fall*

## 7.1 Source and character

The project owner supplied the real recording as `You Won't Let Me Fall.mp3`. This is the flagship playable track, **not synthesized imitation**. Its musical identity: fast, uplifting, guitar-driven alternative rock, female lead vocal, energetic bass/drums, soaring chorus with themes of trusting God in difficulty, not backing down, and being held by Jesus. The song includes verses, repeated refrain/chorus, a bridge and an extended final outro.

The user wants playable notes assigned musically to different band roles. Instrument-specific lane events should represent actual or plausible musical cues; they should not merely be random button patterns.

## 7.2 Inspected metadata (CURRENT)

| Property | Value |
|---|---|
| Song title | `You Won't Let Me Fall` |
| Duration | **148.44 seconds** (~2:28.4) |
| Estimated tempo | **~152 BPM** |
| Detected beat landmarks | **380** entries |
| First detected beat | ~0.163 s |
| Audio/chart clock origin | `0.0 s` at start of original MP3 |
| Four-beat lead-in | `4 × 60/152 = 1.578947... s` (metadata says ~1.59 s) |
| Scroll lead-in/travel | `1.84 s` from visible horizon to hit line |
| Timings | Seconds relative to the original MP3, with playback offset added by engine |
| Source chart | `song_chart.json` and `song_chart.csv` |
| Track sourcing | User-supplied recording; publishing rights must be confirmed independently |

The BPM is estimated from the recording, not a manually certified production tempo map. If another AI adds real charts for this or future songs, be prepared for subtle variations, pickups and human/production timing differences.

## 7.3 Sections and approximate timestamps

The existing chart contains these section labels. Use them for game UI, animation choreography and lighting, but treat boundaries as **analysis-derived**, subject to manual verification against the track:

| Begins at audio time | Section |
|---:|---|
| 0:00 | OPENING |
| 0:13 | VERSE 1 |
| 0:28 | BUILD |
| 0:34 | CHORUS 1 |
| 0:54 | REFRAIN |
| 1:03 | VERSE 2 |
| 1:19 | BUILD 2 |
| 1:25 | CHORUS 2 |
| 1:47 | BRIDGE |
| 2:00 | FINAL CHORUS |
| 2:14 | OUTRO |

## 7.4 Difficulty charts (CURRENT)

| Difficulty | Included note tiers | Total notes | Bass | Vocals | Guitar | Drums | Holds |
|---|---|---:|---:|---:|---:|---:|---:|
| Casual | tier 0 only | **331** | 48 | 24 | 94 | 165 | 3 |
| Standard | tiers 0 + 1 | **697** | 133 | 118 | 185 | 261 | 21 |
| Expert | tiers 0 + 1 + 2 | **1,091** | 182 | 148 | 294 | 467 | 21 |

There are **1,091 unique chart event records** spread across tiers 0/1/2, including **21 holds** in the full data. The `tier` property is the *minimum difficulty* at which a note appears. Harder modes add notes to the easier chart rather than replacing the chart with unrelated data. The counts were checked against `song_chart.json`, not estimated.

## 7.5 Current event semantics and limitations

The chart was generated by **beat/onset analysis and instrument-inspired heuristics**. It is musically anchored but **not** a faithful transcription from isolated instrument stems. It can put some notes on beats where a given instrument’s action is less clear than another instrument’s. Manual refinement is still needed, especially vocal entrances, fills, syncopation, long notes, complex transitions and the bridge/final chorus.

For future chart quality:

- Bass notes should follow bass attacks/root changes where identifiable.
- Drum notes should favor kick, snare and prominent tom/cymbal moments, with the backbeat articulated correctly.
- Guitar notes should follow audible strums/picks/chord attacks, not every shared frequency peak.
- Vocal notes should correspond to vocal phrase onset/strong syllabic attacks, with holds for sustained lines. Do not map every syllable mechanically if it feels unplayable.
- Casual should prioritize primary groove, clear accents, and playable pacing for first-time phone users.
- Standard should reward comfortably playable alternation and occasional simultaneous hits.
- Expert should align with real musical intricacy, fills and syncopated subdivisions; do not confuse visual density with musical accuracy.
- Sections should have deliberate energy arcs; a chorus should be engaging without becoming indiscriminate note spam.

## 7.6 Recording versus procedural synths

There were two distinct audio eras:

**Earlier proof of concept:** an approximately **85-second, 138 BPM** self-synthesized rock tune, called *New Horizon*, with generated drums/bass/guitar/pad/vocal-like synthesizer leads. The first V1/V2/V3 code contains synthesis functions for it. No live singer was included.

**Current playable flagship:** *You Won't Let Me Fall*, about **148.44 seconds, ~152 BPM**, played from an **embedded MP3** through Web Audio. **This is the active mode and must be preserved.**

BB7 still contains a `soundEvents()` function and oscillator/synth helper functions from earlier prototypes. That legacy synthesis code is largely vestigial in the recorded-song mode: `audioSetup()` decodes and plays `SONG_SRC`; `tickAudio()` is currently empty and `accent(lane)` intentionally does not overdub live notes. A new AI must not read the mere presence of synth functions as evidence that the current song is being synthesized. These functions may be removed during refactoring only after checking nothing else depends on them.

---

# 8. Song import and chart-authoring pipeline

The original concept included the possibility of making the game work with **any user-provided song**, not just the flagship recording. A reusable import path is a natural next capability.

## 8.1 Audio ingest

Accept a recording (e.g., MP3/WAV/M4A where browser/tooling supports it). Decode to a PCM waveform for analysis; record exact duration, channel count, sample rate and silence/pickup. Do not assume time zero is the first strong beat. If embedding music, use the original permitted file or a carefully verified conversion, not an unexplained lower-quality transcode.

## 8.2 Timing analysis

1. Estimate tempo(s) / predominant BPM with onset envelope and beat tracking.
2. Identify and preserve **actual beat timestamps**; the song may have a small offset or tempo drift.
3. Estimate downbeats and measures; detect pickup/anacrusis where applicable.
4. Compute short-time RMS/energy, spectral flux and transient peaks.
5. Segment intro, verse, builds, choruses, bridge and outro using repeated patterns and listening.
6. Build a *shared musical timeline* for player input, stage animation and section scripting.
7. Test playback against the visual hit line at start, middle and end — one aligned note near the beginning is not sufficient.

Useful offline tools could include librosa, Essentia, soundfile, scipy, aubio or specialized stem-separation software. These are optional analysis tools, **not runtime dependencies** for a mobile release. Use human auditory verification rather than treating beat detection as infallible.

## 8.3 Instrument event extraction

Ideally analyze separate **licensed/user-owned stems** for drums, bass, guitar and vocals. If stems are unavailable, use source separation *as an aid*, not absolute truth. Maintain a confidence value per candidate attack; avoid over-generating uncertain notes. Distinguish powerful sustained vocals from percussion transients and distorted guitar noise. Consolidate near-simultaneous peaks. Validate with a waveform/timeline chart editor and listening.

## 8.4 Chart generation

- Use musically justified rhythmic onset events as candidates.
- Map candidates to the four fixed lanes.
- Deduplicate very-close onsets on a lane except intentional repeated notes.
- Add holds to properly sustained notes with verified durations.
- Assign tiers 0/1/2 based on the importance and complexity of the event.
- Protect thumb ergonomics: avoid unfair repetitions/chords in lower difficulties.
- Ensure no note is placed inside the count-in unless intentionally treated as tutorial content.
- Check end-of-song and silence boundaries.
- Export machine-readable JSON with exact audio-relative seconds.
- Optionally provide a review/editor view with waveform, beat lines, lanes and seek controls.

## 8.5 Validation and editorial rules

The most important criterion is **does playing the pattern feel like playing the song?** Not “does a visualization contain 1,000 events?” Specifically test lead vocal entrances, kick/snare backbeats, guitar riffs, the bridge and final chorus. Compare detected grid against the recording at 30, 60, 90 and 130 seconds. Make it easy to move notes by tens of milliseconds without rebuilding the entire chart.

## 8.6 Chart data model

A typical source record from the actual JSON:

```json
{
  "time": 0.163,
  "lane": 0,
  "tier": 0,
  "hold": 0.0,
  "confidence": 0.48,
  "role": "bass-root"
}
```

Interpretation:

- `time`: song/audio-relative seconds.
- `lane`: integer 0..3, Bass / Vocals / Guitar / Drums.
- `tier`: minimum difficulty 0 Casual, 1 Standard, 2 Expert.
- `hold`: duration in seconds; zero means a tap.
- `confidence`: chart-generation confidence/heuristic score, **not** player performance score.
- `role`: semantic cue such as bass-root, guitar-strum, backbeat, kick, etc.; useful for editor and animation refinement. The current runtime's `createChart()` discards role and confidence in its simplified note objects.

A typical root chart object contains:

```json
{
  "title": "You Won't Let Me Fall",
  "duration": 148.44,
  "estimated_bpm": 152,
  "beat_count": 380,
  "lead_in": 1.59,
  "description": "Instrument-inspired chart anchored to detected audio beats; stems have not been separated.",
  "sections": [
    {"time": 0, "name": "OPENING"},
    {"time": 13, "name": "VERSE 1"}
  ],
  "notes": [
    {"time": 0.163, "lane": 0, "tier": 0, "hold": 0.0, "confidence": 0.48, "role": "bass-root"}
  ],
  "beats": [0.163, 0.58, 0.998, 1.393]
}
```

**The arrays above are deliberately truncated examples.** Use the accompanying full `song_chart.json` file, not this excerpt, to reconstruct the actual song.

---

# 9. Animation system and sprite asset specification

## 9.1 Why the animation architecture matters

The project encountered a serious failure: image-generated sheets looked exciting at full size, but in the actual game frames barely changed, and later a grid slicing bug caused **floating legs, severed limbs, duplicated musicians and disconnected instruments**. The user rightly rejected “broken and swaying” animation. Future art work must be validated *visually in playback*, not merely by demonstrating that the image had multiple cells or that the browser reported no errors.

The corrected approach separates complete figures and positions each figure in a strict frame rectangle on a transparent canvas.

## 9.2 Current cleaned atlas (CURRENT)

- Source: `burn_bright_clean_atlas.png`.
- Pixel dimensions: **1680 × 1256**.
- Frames: **7 columns × 4 character rows = 28 frames**.
- **Per-frame cell: 240 × 314 pixels**.
- Current clean sheet is RGBA and has transparent background.
- Sprite extraction: `sourceX = frameIndex × 240`, `sourceY = rowIndex × 314`, `sourceW = 240`, `sourceH = 314`.

**Canonical sprite rows for the cleaned atlas:**

| Row | Character |
|---:|---|
| 0 | Scientist bassist |
| 1 | Lead female vocalist |
| 2 | Male electric guitarist |
| 3 | Brazilian drummer with red drum kit |

**Do not use old row assumptions.** The earlier 12-frame atlas used another row order in places. Reusing those indices caused wrong characters and broken poses.

## 9.3 Current frame semantics (CURRENT)

There are seven pose cells, not 12 in the latest cleaned atlas. The frame intent is approximately:

| Index | Meaning | Typical use |
|---:|---|---|
| 0 | Main/base performance pose | neutral groove |
| 1 | Alternate performance pose | beat loop |
| 2 | Stronger/expression pose | downbeat or singer accent |
| 3 | Low/forward performance motion | beat loop |
| 4 | Big musical accent / flourish | successful lane hit or big emphasis |
| 5 | Mistake / bent or slumped pose | immediate missed/wrong note |
| 6 | Recovery / return pose | after initial mistake |

The BB7 code currently loops `[0, 1, 3, 1]`, uses frame 2 briefly near a downbeat, frame 4 for most hit accents (frame 2 on vocals), and frames 5 then 6 for mistake/recovery. A hit accent persists for roughly **0.18 seconds**. A mistake occupies roughly **0.72 seconds**, switching after ~0.42 seconds. Exact artistic intent should be re-evaluated while looking at the atlas rather than treating these index labels as immutable.

## 9.4 Screen position and scale (CURRENT, approximate)

- Bassist: x≈83, y≈154, w≈114, h≈176.
- Lead vocalist: x≈200, y≈150, w≈122, h≈182.
- Guitarist: x≈318, y≈154, w≈114, h≈176.
- Drummer: x≈200, y≈154, w≈138, h≈180, **drawn first**, so other performers can stand in front.

These values are 400×800 canvas coordinates, not CSS pixels; they may be adapted to a redesigned viewport. The current performer drawing logic includes a few pixels of bobbing, slight rotational effect on accents/mistakes, colored hit aura and reaction labels. These transform effects should **supplement** articulated frames; never replace meaningful frame changes.

## 9.5 Required pose quality bar

Each frame should clearly change at least one meaningful body/instrument action, ideally several:

- **Bassist:** picking arm, finger/hand placement, instrument angle, body stance, coat movement.
- **Vocalist:** mouth, head, mic-to-mouth position, arm gesture, torso/leg stance.
- **Guitarist:** strumming arm, picking contact, fretting hand, guitar neck, body movement.
- **Drummer:** independent stick arms, clear pre-hit and strike poses, cymbal/tom accents; drum kit itself remains anchored.

Give each character natural anticipation, attack, follow-through and return, not random frame shuffling. Keep consistent anatomy and hands when going from pose to pose. For future-quality animation, prefer hand-designed cels or a thoughtfully rigged sprite system for individual limbs/instruments over completely separate AI images with inconsistent proportions.

## 9.6 Strong recommendation: animation state machine

Model at least these per-performer states:

- `idle`: standing or breathing before song/silence.
- `groove`: low-level beat-synced playing loop, musician-specific.
- `playAttack`: short action on corresponding musical attack.
- `accent`: stronger gesture for chorus or successful hit.
- `hold`: singer sustained note, guitarist sustained strum, etc.
- `mistake`: visibly wrong action immediately after miss/wrong input.
- `recover`: brief return to the groove.
- `celebrate`: high combo / big chorus / song completion.

**Priority:** mistake > recovery > deliberate accent > attack/hold > groove > idle. A mistake needs to be unmistakable even if the normal music loop is energetic. Map **audio musical cues** and **player gameplay events** separately so characters can animate on recorded phrases even when a player is not triggering a particular note.

## 9.7 Sprite pipeline requirements

A robust creation pipeline should do the following:

1. Design/approve a **neutral master model sheet** per character: silhouette, clothes, accessories, instrument, palette and proportions.
2. Draw a deliberate list of animation poses from that reference.
3. Output full-resolution transparent per-pose PNGs or frames with alpha, not a decorative collage.
4. Identify actual per-pose subject bounds, including hair, raised sticks, wide guitar necks, footwear and kit.
5. Fit every complete pose inside the same cell size with padding.
6. Align fixed anchors (feet/drum-kit base/center point); avoid shaking or shrinking the character between frames.
7. Pack as a strict grid with known, validated row/column order.
8. Produce a **labeled contact sheet** and **short loop GIF/video** for review.
9. Test the atlas programmatically: crop every cell, inspect nontransparent pixel bounds, calculate frame differences, check row identity and confirm no pixels spill across cells.
10. Run the game and test idle, accent, wrong note, natural miss, failed hold and recovery, at real phone scale.

**Never assume the grid layout of a raw generated promotional sprite sheet is valid.** The source illustration `pixel_rock_band_animation_sprite_sheet.png` was 1448×1086 but needed cleanup; it was *not* safe to crop by naïvely dividing width/height by seven and four.

## 9.8 Visual test criteria

A successful loop demonstrates different guitar string-strumming positions, mouth/mic action, drumstick location, and bassist instrument/arm movement, while the performers stay planted on the stage. When the game misses a note, the affected musician visibly does something wrong and recovers. Screenshots of frame 0 and frame 1 must not be effectively identical; motion should survive a 115×175 display size. A short capture should be watched, not merely exported.

---

# 10. Current technology and architecture

## 10.1 Platform decision

**Current implementation:** single-page HTML5 with inline CSS + plain JavaScript + HTML Canvas 2D + Web Audio API. No runtime framework, no required external packages, no Three.js. The stage is 2D pixel art with a **2.5D perspective highway**. This deliberately sacrifices literal 3D geometry in favor of predictable mobile performance and simple itch.io publishing.

**Initial idea:** the user asked if Three.js and 3D stage elements could be used. It was explored conceptually, but the actual working game chose Canvas. Another AI may recommend selective WebGL/Three.js enhancements (lights, parallax, crowd depth, camera effects) only if they demonstrably improve the phone experience without input latency, battery/performance regressions, or deployment problems.

## 10.2 HTML shell (CURRENT)

The BB7 file includes:

- `<main id="phone">` containing a logical 400×800 game canvas.
- `<canvas id="game" width="400" height="800">` with touch-action suppression.
- A DOM pause button.
- `#startScreen` with title, game pitch, song details, three difficulty buttons, calibration slider, Start button and audio status/error.
- `#pauseScreen` with resume, restart and menu.
- `#endScreen` with score/results, replay and menu.
- Styles designed for a portrait viewport scaling to available screen width and height.
- One JavaScript IIFE that initializes state, audio, notes, rendering, listeners and the animation loop.

This is convenient for prototype shipping but is now **too monolithic for long-term maintenance**. A modular source tree with a build step that emits a standalone `index.html` is recommended.

## 10.3 Logical canvas coordinate system (CURRENT)

- Logical canvas: `W=400`, `H=800`.
- Main stage begins around y=80 and ends near y=334.
- Perspective runway horizon around `topY=334`.
- Judgement line around `hitY=672`.
- Top highway edges: `topLeft=89`, `topRight=311`.
- Bottom highway edges: `botLeft=12`, `botRight=388`.
- Pads visually occupy approximately y=690–784; lower touch region is permitted from y≥635.

Projection helper:

```js
function roadAt(u) {
  u = Math.min(1, Math.max(0, u));
  const e = Math.pow(u, 1.5);
  return {
    y: topY + (hitY - topY) * e,
    left: topLeft + (botLeft - topLeft) * e,
    right: topRight + (botRight - topRight) * e,
    scale: 0.55 + e * 0.45
  };
}
```

`laneCenter(i, u)` finds the center x of lane i at normalized travel u, along with the local projected lane width. Upcoming notes use `u = 1 - (note.time - gameTime) / TRAVEL` and become larger as they approach the hit line. Note that the renderer clamps u into the perspective transform; avoid abrupt disappearance and ensure holds behave correctly at the horizon and hit line.

## 10.4 Gameplay state (CURRENT)

Runtime status transitions include `menu`, `preparing`, `playing`, `paused`, and `results`. State includes:

- `notes` and `total`, `judged`.
- `held[4]`, `holdTracks[4]`, pointer-to-lane map.
- `score`, `combo`, `maxCombo`, `perfect`, `great`, `good`, `missed`, `wrong`.
- `energy` (life meter).
- `hits[4]` (recent successful pad/animation times).
- `missAnimAt[4]`, `missType[4]` (independent musician mistake timing).
- `latencyMs` calibration slider.
- `particles`, `screenShake`, `flameLevel`, `comboBurstAt`.
- `difficulty` and `status`.
- `ctx`, `master`, `playbackSource`, `begin`, and audio-derived `t`.

## 10.5 Core routines (CURRENT)

- `createChart()`: filters tiered chart and builds runtime note objects.
- `audioSetup()`: creates/unlocks AudioContext, decodes embedded MP3, starts sample-accurate source after the lead-in.
- `startGame()`, `pauseGame()`, `resumeGame()`, `quitGame()`, `endGame()`: lifecycle.
- `press(lane)`, `release(lane)`, `updateGame(dt)`: note matching, hold handling, life/combo/scoring, mistake flags.
- `feedback()`, `markMistake()`: visual response triggers.
- `roadAt()`, `laneCenter()`: 2.5D coordinate mapping.
- `drawStage()`, `drawHighway()`, `drawHUD()`, `drawFeedback()`, `drawScanlines()`: Canvas presentation.
- `render()`: animation/frame loop (requestAnimationFrame), game time update from AudioContext.
- Keyboard/pointer listeners: multitouch input, pause button, blur/visibility pausing.
- Test hook: `window.__BURN_BRIGHT_TEST__` exposes current state and start/pause/resume/press/release for browser automation.

## 10.6 Audio playback and synchronization — preserve this carefully

The precise behavior that ultimately worked for the user on itch.io is:

1. The Start tap calls `startGame()`.
2. `startGame()` initiates `audioSetup()` **in the direct user gesture**, before awaiting expensive operations.
3. `audioSetup()` creates and resumes an `AudioContext` (`latencyHint:'interactive'`).
4. It reads the **inline** `SONG_SRC = 'data:audio/mpeg;base64,...'` string.
5. It base64-decodes to an `ArrayBuffer`, then calls `decodeAudioData`.
6. It creates an `AudioBufferSourceNode` connected to a master gain/output.
7. It sets `begin = ctx.currentTime + 0.12` and schedules audio playback at `begin + LEAD`.
8. Runtime game time is `t = ctx.currentTime - begin` while playing. A chart note becomes `LEAD + note.time`.
9. Pausing calls `ctx.suspend()`, which suspends the source and clock together. Resuming calls `ctx.resume()`.
10. Cleanup stops/disconnects the old source and closes its AudioContext before a fresh session, without awaiting cleanup *before* the user-gesture unlock.

**Do not replace this with `setTimeout()`-based playback, an untested HTML `<audio>` sync hack, or a relative MP3 file path.** The user repeatedly encountered a broken game with `Could not load song file: HTTP 404` on itch.io. Embedding solved that particular failure. Any new asset loading architecture must come with an automated test of the actual published ZIP.

## 10.7 Embedded audio verification

The embedded MP3 in inspected BB7 was verified **byte-for-byte identical** to `You Won't Let Me Fall.mp3` in the working directory:

`SHA-256: 5c5bdfc30de5178e1e43f92716095b7ba985daec1968c2b2198be667022eef64`

The latest BB7 also embeds a `1680×1256` clean atlas and a small `400×268` stage image. The official packaged archive contains an `index.html` at the ZIP root. The file is approximately 7.6 MB as standalone HTML and about 5.7 MB compressed in the ZIP.

## 10.8 Input behavior and ergonomic details

- `pointerdown` on the canvas starts input when game is playing and logical y≥635.
- Lane index is calculated by dividing logical x into four 100-pixel regions.
- `setPointerCapture` and a pointer-to-lane map allow release matching and multitouch.
- `pointerup`, `pointercancel`, `lostpointercapture` release holds.
- Desktop: D/F/J/K, 1/2/3/4, plus arrow-key aliases.
- Escape pauses; Space resumes from paused in the current keyboard logic.
- Blur and visibility changes automatically pause (important for switching tabs/apps).
- Offset slider range: **−120 to +120 milliseconds** in **10 ms** steps; applied in timing judgement, not by changing audio playback speed.

**Potential edge cases:** multiple pointers on one lane currently share a simple boolean `held[lane]`; releasing one pointer may release the lane even if a second remains. A future codebase should track pointer counts/IDs per lane and test simultaneous chords, finger slides, hold-overlaps, orientation changes and pointer-cancellation in mobile Safari.

## 10.9 Rendering pipeline

BB7 render loop (rough order):

1. Determine elapsed `dt`, update game time from `ctx.currentTime - begin`.
2. Apply slight screen shake.
3. Draw stage / performers / crowd.
4. Draw highway / animated grid / notes / holds / hit deck / pads.
5. Draw HUD and section progress.
6. Draw feedback text and particles.
7. Overlay faint scanlines.
8. Draw a subtle menu-mode background prompt behind menu UI.
9. Request next animation frame.

The stage and highway share the same logical canvas. Native DOM overlays are separately layered for menus and the pause button.

---

# 11. Distribution, deployment and mobile constraints

## 11.1 Distribution strategy (REQUIRED)

Deliver **two outputs** when completing a major version:

- **Standalone self-contained HTML** with code, chart, sprite atlas and MP3 embedded: convenient offline desktop/browser artifact.
- **itch.io HTML5 ZIP** containing `index.html` at the archive root. Prefer only files actually used; a single embedded index is safe until another packaging approach has been tested end to end.

Do not send a ZIP whose `index.html` is nested inside an extra folder unless the hosting format explicitly expects that. Do not assume itch.io resolves arbitrary asset paths automatically.

## 11.2 itch.io setup

- Project type: HTML5 / playable in browser.
- Upload the ZIP as the playable file.
- Set portrait viewport approximately **400×800**.
- Enable mobile support / mobile-friendly handling.
- Save and publish the game page.
- Open the real game URL in Safari on the actual iPhone, not only in attachment preview.
- Verify build label, playback, tap controls, loading/errors and pause/resume.

Prior tests show that a ChatGPT attachment viewer or iOS Files/Quick Look preview may not run interactive audio/JS even if the HTML works when downloaded or hosted.

## 11.3 Real-world build verification

A useful safeguard introduced after repeated publishing problems was putting a clear build identifier in the menu (`BB5 · OFFLINE AUDIO`, later `BB6 · MOBILE POLISH`, `BB7 · PREMIUM ART PASS`). When a user sees an old HTTP 404 message after uploading a supposedly fixed build, it may indicate stale or incorrect itch.io upload/caching rather than failure in the new code. Verify the **label visible on the published page** before debugging an older error.

Do not declare the live itch.io deployment fixed solely because a local Chromium iframe runs. Validate the served file if the live link is available.

## 11.4 Reliability requirements

- Audio unlock must be initiated by an intentional touch/click event.
- Loading screen must report progress/failure rather than appear frozen.
- Embedded MP3 must decode completely on iPhone memory limits; avoid redundant decoding or unnecessary simultaneous buffers.
- Pausing should keep notes and sound synchronized, and restart should fully reset inputs, chart status and audio context.
- Music and gameplay should not silently desync after app suspension, backgrounding or focus changes.
- All fonts/assets must remain legible if iOS text rendering differs slightly from desktop.
- Screen content must fit within the viewport, respecting notch, browser chrome and bottom gesture area.
- Keep touch latency and frame-time performance stable under heavy choruses/particle effects.

## 11.5 Technical tradeoffs

An all-inline 7+ MB HTML works for this prototype, but it is cumbersome to edit and can have higher parse/decode/memory costs on older phones. Maintain **modular editable development sources** (recommended next section), then generate a self-contained publishable HTML during packaging. Always compare the packaged output against the real song and image sources.

---

# 12. Visual UI screens in detail

## 12.1 Start / song setup screen

Must show, in descending visual importance:

- Brand/game title *Burn Bright*.
- Band identity *The Pixel Riot*.
- Current track *You Won't Let Me Fall*, estimated tempo and short game pitch.
- Clearly labeled four-lane control information; keyboard aliases where useful.
- Difficulty selection chips: Casual / Standard / Expert.
- Touch-offset slider displaying numeric milliseconds.
- Large and inviting **START THE SHOW** button.
- Audio preparation/error feedback.
- Optional small headphone recommendation and verified build identifier.

The menu needs good spacing on phones, avoiding oversized blocks of tiny pixel text. Primary action should remain visible within common portrait iframe sizes without accidental clipping. A condensed instructions sheet or “how to play” overlay could replace the text-heavy panel in future versions.

## 12.2 Gameplay HUD

Priority:

1. Score and current combo.
2. Life/energy meter and current song title.
3. Pause, reachable with one thumb but not easily hit accidentally.
4. Current song section and elapsed time/progress.
5. Notes / hit line / pads.

Pixel heading typography can be expressive, but dynamic numbers, score, combo, timing grades and timing-offset text must be crisply legible. Consider hiding less-important explanatory information during gameplay. Maintain contrast and avoid overlapped text at small widths.

## 12.3 Pause screen

Show that the show is paused, and make **Resume**, **Restart Song** and **Back to Menu** clearly distinct and accessible. Music and note clock freeze together. Do not allow accidental resumption from arbitrary touches behind the overlay. Pausing during a hold is an edge case needing explicit design (current logic ends held notes; see Known Issues).

## 12.4 Results screen

Should feel like the end of a concert set: strong headline, final score, progress/accomplishment, detailed judgments, max combo, accuracy, and prominent Play Again. Use celebratory imagery/crowd/spotlights proportional to performance rather than a plain spreadsheet or an unreadable effects storm. A separate result illustration or band bow/cheer animation is appropriate for future art.

## 12.5 Art rules for phone-scale clarity

- A musician’s arms, instrument, microphone or drumsticks must remain visible at roughly 120×180 drawn size.
- Don't place feedback over the singer’s face or directly over dense note clusters.
- Top score/combo and bottom pad labels must not overlap.
- Do not overuse glow/scanlines near note boundaries.
- Make note colors bright but with adequate dark outline and cream highlight.
- Preserve the four fixed lane colors across all UI states.
- Give every press a visible response even when the touch was outside a valid note; distinguish accepted hit from mere pad depression.

---

# 13. Asset inventory and provenance

## 13.1 Primary handoff files

These are the key artifacts inspected/available in the project workspace. The optional handoff ZIP accompanying this document can consolidate them for another instance.

| File | What it is | Priority |
|---|---|---|
| `Burn_Bright_BB7_Premium_Art_Pass.html` | Most recent source snapshot; embedded song, chart and atlas; BB7 UI/renderer | **Current reference** |
| `Burn_Bright_BB7_Premium_Art_Pass_ITCH_IO.zip` | Packaged BB7 as root `index.html` | Current distribution snapshot |
| `Burn_Bright_BB5_OFFLINE_PLAY.html` | Earlier audio-robust build **explicitly confirmed by user** on itch.io | Crucial fallback/regression reference |
| `You Won't Let Me Fall.mp3` | User-supplied flagship music | **Canonical audio** |
| `song_chart.json` | Full tiered instrument-inspired chart, sections and beat times | **Canonical chart** |
| `song_chart.csv` | Human-editable tabular view of chart | Editing reference |
| `burn_bright_clean_atlas.png` | Corrected 7×4/28-frame transparent animation atlas | **Canonical cleaned art** |
| `burn_bright_clean_atlas_preview.jpg` | Contact sheet useful for visual inspection | QA reference |
| `pixel_rock_band_animation_sprite_sheet.png` | Raw attractive seven-pose generated band sheet; was **not directly grid-safe** | Art reference, not runtime-ready |
| `burn_bright_v4_motion_proof.jpg` | Earlier motion comparison and poses | Evolution/animation reference |
| `burn_bright_pixel_riot_concert.png` and related concept art | Full-color stage/branding exploration | Optional reference |
| `Burn_Bright_BB5_BROWSER_TEST.png` | Browser-rendered test screenshot of stable BB5 | QA/context image |

**Image-generator output does not guarantee sprite sheet semantics.** Original generated artwork was edited/extracted to create runtime atlas data. Keep raw prompt concepts separate from production sprites.

## 13.2 Existing atlas and embedded assets

The inspected BB7 `ART` object contains:

- `atlas`: embedded PNG data URI, 1680×1256.
- `stage`: embedded PNG data URI, 400×268, although the stage is now largely drawn programmatically.

A modular project should keep original PNGs under an `assets/` directory and have the build pipeline embed them only into the final distribution artifact.

## 13.3 Prior major visual approaches and their lesson

- **Monochrome Game Boy:** charming initial pitch; too limited/flat for the desired production aesthetic.
- **Full-color isolated band illustrations:** established stronger personalities and clothing but had limited animation.
- **Procedural transformed cels:** frame count existed but felt like broken sway; failed to visibly move hands/instruments.
- **Raw AI seven-frame sheet pasted into runtime:** attractive concept art but incorrect cell slicing, fragmented performers.
- **Clean re-packed atlas:** repaired the anatomy/crop/alignment issue; current baseline.
- **BB6/BB7 premium UI styling:** direction toward consistent menu/stage/highway/pad art, still a candidate for further full visual redesign.

The preferred next step is a *purpose-built sprite workflow* and systematic QA, not layering another glow effect over a flawed asset.

---

# 14. Known problems, caveats, and corrective principles

This section is deliberately candid. The project should be continued from reality, not a flattering but inaccurate assessment of completion.

### 14.1 Confirmed historical failures

**Audio file HTTP 404 on itch.io.** An externally referenced `assets/you_wont_let_me_fall.mp3` (or equivalent) did not resolve after upload. The game displayed an audio error and did not play. A fully embedded MP3 plus proper user-gesture Web Audio startup solved the reported deployment issue; user explicitly confirmed an embedded BB5 release worked.

**Misleading “animated” sprite sheets.** Earlier animations were made of repeated images with slight transforms; a guitarist’s hands/guitar and drummer’s body barely changed. A numeric frame count was not proof of good animation.

**Severed sprites and duplicated body parts.** The attractive multi-pose generated image did not align to fixed grid cells. Naively slicing it caused torn anatomy, floating legs and duplicated band figures. A corrected atlas was built from complete extracted figures.

**Visual clutter / patchwork style.** Retro greens, arcade neon, aggressive bevels and mixed UI designs were layered across versions. The user requested a more coherent, clean, mobile-first aesthetic; BB6/BB7 began this work.

### 14.2 Present limitations requiring verification

- The chart is *instrument-inspired*, not verified against fully isolated professional stems.
- The latest BB7 source passed JavaScript syntax checks in its development run, but **the user has not yet confirmed BB7 plays correctly on their physical iPhone/itch.io**. The proven deployed milestone was BB5.
- The cleaned 28-frame sprites are improved, but they still may not constitute high-end, fully hand-animated multi-part musicians. Verify by watching actual gameplay, not by trusting counts.
- Current backing synth functions are vestigial; avoid accidental double audio or confusion.
- Life reaching zero may not produce a real failure screen; clarify intended behavior.
- Hold behavior across pause is not fully user-tested or product-specified.
- Current health penalties have stacked implementation details.
- The displayed weighted accuracy is not conventional raw hit accuracy.
- Wrong-note behavior can punish off-beat taps outside valid note windows and may need accessibility options.
- Simultaneous fingers on the *same* pad/lane can expose boolean `held[]` limitations.
- Touch-offset slider is rudimentary; there is no dedicated interactive calibration mini-game.
- The on-screen UI still has substantial text and a relatively tight HUD at 400 logical pixels; validate on smaller iPhones and browser chrome.
- The source is monolithic; refactoring is needed for maintainable multiple songs/venues.
- Audio/song permission to redistribute publicly is an external rights question, not established by the source file's existence.

### 14.3 Do not regress

1. Never claim a build is “verified on iPhone” because a desktop browser ran in a 400×800 window.
2. Never claim the game is fully Three.js/3D when it is Canvas 2D with projected lanes.
3. Never claim exact music transcription if the chart is heuristic.
4. Never claim individual-limb animation when the game swaps whole-body pre-rendered cels.
5. Never put the MP3 at a relative path unless packaging is verified against **actual itch.io runtime**.
6. Never reintroduce stale iframe/file preview assumptions after a successful hosted release.
7. Never describe work as complete without opening the generated artifact and checking functionality.

---

# 15. Recommended modular architecture for the next AI

The working publishable build can stay one file. The *editable project*, however, should be more structured.

```text
burn-bright/
├─ README.md
├─ docs/
│  ├─ BURN_BRIGHT_MASTER_BLUEPRINT.md
│  ├─ ART_BIBLE.md
│  ├─ CHARTING_GUIDE.md
│  ├─ TEST_PLAN.md
│  └─ DEPLOYMENT_GUIDE.md
├─ src/
│  ├─ main.js                # boot, lifecycle, error handling
│  ├─ game/
│  │  ├─ state.js             # game state machine
│  │  ├─ rules.js             # scoring, timing, health
│  │  ├─ input.js             # keyboard/multitouch/holds
│  │  ├─ chart.js             # load, validate, tier filters
│  │  ├─ sync.js              # audio time / calibration
│  │  └─ results.js
│  ├─ audio/
│  │  ├─ player.js           # AudioContext unlock, schedule, pause
│  │  └─ library.js          # song entries and metadata
│  ├─ visuals/
│  │  ├─ renderer.js         # Canvas draw orchestrator
│  │  ├─ highway.js          # perspective / note drawing
│  │  ├─ stage.js            # scene, light, crowd
│  │  ├─ sprites.js          # frame extraction, pivot, state machine
│  │  ├─ effects.js          # hit/miss/combo particles
│  │  ├─ hud.js              # score/combo/life/progress
│  │  └─ palettes.js
│  ├─ ui/
│  │  ├─ menus.js
│  │  ├─ calibration.js
│  │  └─ styles.css
│  └─ debug/
│     ├─ test-hooks.js
│     ├─ chart-inspector.js
│     └─ fps-meter.js
├─ assets/
│  ├─ characters/
│  │  ├─ band_atlas.png
│  │  └─ poses/...
│  ├─ stages/
│  ├─ ui/
│  ├─ cover/
│  └─ audio/
│     └─ you_wont_let_me_fall.mp3
├─ charts/
│  ├─ you_wont_let_me_fall.json
│  └─ you_wont_let_me_fall.csv
├─ tests/
│  ├─ gameplay.spec.js
│  ├─ audio-sync.spec.js
│  ├─ touch.spec.js
│  ├─ atlas-validation.py
│  └─ itch-package.spec.js
├─ scripts/
│  ├─ package-single-html.js
│  ├─ build-atlas.py
│  └─ analyze-song.py
└─ dist/
   ├─ index.html
   └─ Burn_Bright_ITCH_IO.zip
```

This is **recommended future structure**, not an accurate directory listing of BB7’s existing monolithic standalone HTML. The final exporter should base64-embed audio/image/chart into `dist/index.html` or use another verified no-404 approach.

## 15.1 Core model types (proposal)

```ts
type Lane = 0 | 1 | 2 | 3;
type Difficulty = 'casual' | 'standard' | 'expert';
type Judgment = 'perfect' | 'great' | 'good' | 'miss' | 'wrong' | 'holdLost';
type PerformerPose = 'idle' | 'groove' | 'playAttack' | 'accent' | 'hold' | 'mistake' | 'recover' | 'celebrate';

type ChartNote = {
  id: string;
  time: number;         // relative to start of MP3, in seconds
  lane: Lane;
  hold: number;         // duration, 0 for tap
  tier: 0 | 1 | 2;
  role?: string;
  confidence?: number;
};

type Song = {
  id: string;
  title: string;
  duration: number;
  bpmEstimate: number;
  beatTimes: number[];
  sections: {time: number; name: string}[];
  notes: ChartNote[];
  audioAsset: string;
};
```

These types help another AI avoid inventing incompatible schemas. Maintain source audio times and distinguish song time from game time.

---

# 16. Quality assurance and test matrix

## 16.1 Must-pass functional tests

| Area | Test | Pass condition |
|---|---|---|
| Load | Open standalone HTML in desktop browser | Start menu visible; no JS exception |
| Package | Inspect ZIP | `index.html` at archive root; no missing resources |
| Audio | Tap Start | AudioContext unlocks; decoded recorded song starts after lead-in |
| Audio network | Watch requests | No 404 or unexpected remote MP3/assets; offline build functions locally |
| Sync | Measure early/middle/late notes | Notes remain aligned with audio through 2:28 |
| Input | Tap each lane | Correct lane lights, matching note resolves |
| Multitouch | Tap 2–4 lanes together | Simultaneous notes can be hit |
| Hold | Press/release correct timing | Tail resolves; bonus applied |
| Hold failure | Release too early | Wrong-hold feedback + musician mistake state |
| Wrong tap | Tap when no note is within window | Wrong-note response, combo breaks, appropriate penalty |
| Natural miss | Let an incoming note pass | Correct player/musician miss reaction, stats updated |
| Scoring | Perfect/Great/Good examples | Expected points and health updates |
| Difficulty | Start 3 modes | 331 / 697 / 1091 notes loaded; tier logic correct |
| Pause | Pause mid-song | Audio clock and notes freeze together |
| Resume | Resume | No accumulated beat drift |
| Restart | Restart from pause/results | Stats, input, chart and song return to start |
| Background | Switch apps / hide page | Game auto-pauses and can resume safely |
| Results | Let song reach end | Correct summary and replay/menu |
| Animation | Inspect different play frames | Arms/instruments/mouth/sticks visibly differ |
| Mistake animation | Force each lane miss/wrong | Correct *individual* performer reacts then recovers |
| Small phone | Run portrait iframe/Safari | HUD, menu and pads fit; no unreachable buttons |
| Performance | Heavy chorus/Expert | No severe stutter, note popping or runaway memory |

## 16.2 Visual test sequence

Capture and review:

1. Start screen at typical iPhone portrait size.
2. Song opening with all four band members visible.
3. A verse with few notes — check groove animation without spam.
4. A chorus with simultaneous notes and dynamic stage.
5. Each player instrument in base, attack, flourish, mistake and recovery poses.
6. A successful Perfect hit + particle burst.
7. Incorrect lane tap/miss and recovery.
8. Hold-note head, body, completion and failure.
9. Pause screen.
10. Results screen.

Use recorded short clips/GIFs for animation; a still screenshot can prove layout but not motion.

## 16.3 Real device test matrix

Recommended browsers/devices:

- iPhone Safari, on *the actual hosted itch.io page* (mandatory acceptance).
- An additional smaller iPhone size.
- Android Chrome.
- Desktop Chrome or Chromium.
- Desktop Safari if available.
- Desktop Firefox as compatibility check.
- Mouse, touchscreen, keyboard, multi-finger/chord input.

Track layout, audio latency, first-tap permission, long-session heat/frame rate, background interruption, resizing and scrolling behavior. The game is **mobile-first**, not just a desktop page resized smaller.

## 16.4 Automation and verification approach

The current source intentionally exports a test hook:

```js
window.__BURN_BRIGHT_TEST__ = {
  get state() { /* status, song time, score, combo, energy, stats, difficulty... */ },
  start: startGame,
  pause: pauseGame,
  resume: resumeGame,
  press,
  release
};
```

Preserve/improve these hooks for integration tests (e.g. Playwright). Automated tests can simulate taps at known chart times by querying current `t`, but **audio unlock still needs a real user gesture in browser security contexts**. A useful test should assert not merely “button clicked” but also `hasRecording`, audio clock progression, note judgments, pause/resume drift and visible frame change. Do not put testing-only code in production that disables iOS audio restrictions.

---

# 17. Development roadmap: the most valuable next work

These are recommendations for the next AI, not an authorization to ignore the current vision or to rewrite the game indiscriminately.

## P0 — Protect and baseline the working release

1. Save BB5, BB7, original MP3, chart JSON and cleaned atlas as immutable baselines.
2. Launch both versions, inspect visuals and test actual song sync.
3. Confirm which build currently runs on the user's live itch.io page using its build label.
4. Perform a full mobile test and preserve screenshot/video evidence.
5. Refactor the audio and chart code *without changing behavior*, using tests to compare.
6. Set up repeatable build/release numbering and automated ZIP verification.

**Exit criterion:** the latest package works at least as well as user-confirmed BB5, including real iPhone hosted playback.

## P1 — True unified sprite animation

1. Approve the exact character model sheets for all four people.
2. Create 8–12 carefully designed playable poses per musician with consistent silhouette, limbs and props — **not** duplicate or nearly identical images.
3. Add separate drumstick/snare/crash timing, guitar down/up-strums, bass plucks and vocal mouth/mic choreography.
4. Add expressive mistake and recovery state, chorus gestures and a climactic celebration.
5. Export and QA fixed-grid atlases and watch test clips at in-game size.
6. Keep musician heads/instruments clear despite narrow stage space.

**Exit criterion:** a human can correctly identify whether each character is playing, accenting, missing or recovering **without reading HUD text**.

## P2 — Refined mobile game UI/UX

1. Distill menus into visually strong compact panels; avoid tiny overlong explanatory text.
2. Establish a consistent type scale and single-family pixel typography plan.
3. Redesign pad icons, note heads, hit line, holds and result summaries as one system.
4. Tune visual FX budget: selective accent effects; no needless strobe-like visual noise.
5. Ensure live HUD is readable on a physical iPhone and note field has enough breathing room.
6. Validate pause, orientation, safe-area handling and touch ergonomics.

**Exit criterion:** readable at one-handed/dual-thumb portrait distance; no element feels pasted from a different game.

## P3 — Musically faithful chart v2

1. Re-analyze user-supplied MP3, preserve exact timing; optionally separate stems for editorial support.
2. Manually review drum hits, guitar strums, bass accents and vocal phrase placements.
3. Improve holds, accents and dynamics across 11 song sections.
4. Rebalance Casual, Standard and Expert for musical satisfaction, not just density.
5. Validate late-song timing and multiple devices' audio latency.
6. Add a debug chart editor/waveform viewer for rapid iteration.

**Exit criterion:** players feel that the notes correspond to audible instrument events throughout the complete 2:28 track.

## P4 — Concert feel and polish

- Larger but more controlled combo celebrations.
- Crowds changing energy across verses, chorus and final moments.
- Stage scene variations (club/garage, rooftop, small hall, festival), if within scope.
- Distinct band animation personalities and genuine performance transitions.
- Optional on-song intro title and end-of-set animation.
- Optional accessible reduced-flash/reduced-screen-shake settings.

## P5 — Multi-song game framework (FUTURE)

- Song library with permitted audio and reusable per-song charts.
- Progression/records and difficulty history.
- Chart editor/importer for user-supplied tracks.
- More venues and consistent theming.
- Optional character/outfit selection constrained by approved designs.
- Optional more advanced stage depth via WebGL if justified by measured performance.

**Do not start with P5.** The owner prioritizes getting a convincing core performance working first.

---

# 18. Release process for future developers/AI assistants

## 18.1 Before coding

- Read this blueprint.
- Open the actual latest HTML and source chart, not remembered snippets.
- Visually inspect the actual clean atlas.
- Confirm the active MP3 is the recorded track.
- Confirm timing and lane order.
- State which aspect is being changed and which working systems must remain intact.

## 18.2 During development

- Preserve a prior working artifact.
- Keep source modular where possible.
- Fix art/cropping problems at the **asset level**, not with random offset guesses.
- Use deterministic frame tables and state priorities.
- Avoid changing timing/scoring while doing visual-only tasks.
- Test first-start, pause/resume, a mistake and a valid note after each major refactor.
- Capture comparison screenshots and an animated clip at phone size.

## 18.3 Before declaring completion

- Run JS syntax/static checks.
- Test runtime in a real browser.
- Ensure the embedded audio is present and decodes.
- Confirm chart counts and images are correct.
- Test scene, four performers, pad input, grade feedback, mistakes and holds.
- Verify correct pause/resume and end screen.
- Inspect the ZIP's root and asset references.
- If claiming itch.io/iPhone support, test the actual deployment/device (otherwise clearly say what was and was not tested).
- Supply a version-labeled standalone HTML and itch.io ZIP.
- Document what's improved, what's unchanged, and what remains unverified.

---

# 19. Product decisions: settled versus open

## Settled / explicitly supported by conversation

- Project identity is *Burn Bright: The Pixel Riot*.
- Four-person band with distinctive specific ethnicities, ages, outfits, physiques and roles as described.
- Drummer has **no beard or stubble** and wears sleeves.
- Female singer is **modestly dressed, sleeves, band T-shirt; never sexualized**.
- Bassist wears backward cap, glasses, lab coat and plays bass (not lead guitar).
- Guitarist's clothing and proportions are not oversized to the point of looking overweight.
- Music identity: energetic, early-2000s-inspired Christian alt-rock.
- Primary game format: **mobile portrait**.
- Four easy-to-hit bottom pads, aligned to four instrument lanes.
- Falling notes / Guitar Hero-like approach, with holds, streaks and scoring.
- Current song: real user-provided recording *You Won't Let Me Fall*.
- Recorded song audio and falling notes must be synchronized.
- Performance animation must include meaningful instrument/body movement and visible mistake states.
- Full-color polished pixel presentation is now preferred to the original limited monochrome palette.
- itch.io browser play is a central target, requiring robust packaging.

## Open or still needing explicit approval

- Game-over threshold and whether the song continues at 0 energy.
- Final scoring/health balance and the grading thresholds.
- Whether each pad should also trigger optional live instrument SFX (the current recording does not need overdubs).
- Whether the band should animate strictly from audio transients even without a player hit, or reserve larger actions for successful input (recommend both layers).
- Final frame count/rigging method for a truly production-quality animation system.
- Exact title/logo font and final reusable UI component art.
- Venue progression, unlocks and long-term game progression.
- Whether future updates should add selected Three.js stage effects.
- Rights/licensing requirements for distributing songs beyond the current user-provided recording.

---

# 20. A ready-to-paste brief for another coding AI

> **You are the lead gameplay engineer, technical artist and mobile UX designer for the HTML5 music rhythm game *Burn Bright: The Pixel Riot*. Read `BURN_BRIGHT_MASTER_BLUEPRINT.md` fully and inspect the supplied BB7 HTML, BB5 working fallback, clean sprite atlas, song chart and MP3 before changing anything. This is a 400×800 mobile-first, 2.5D Canvas portrait rhythm game with four lanes: Bass (green), Vocals (gold), Guitar (cyan), Drums (red). The playable soundtrack is the *actual user-supplied* 148.44-second recording *You Won't Let Me Fall* at approximately 152 BPM. The song and artwork must remain embedded in a browser-playable itch.io release; a previous external MP3 URL caused HTTP 404. Use the Web Audio clock for synchronization, and preserve the four-beat count-in, touch/keyboard input, three note tiers, holds, score, combo, health, pause/resume and results.**
>
> **Your most important responsibility is quality, not simply adding features. Preserve the approved band identities: slim Caucasian male scientist bassist in glasses/backward cap/lab coat; twenty-something Latina female singer in a modest sleeved band shirt/ponytail/hoops; medium-built Latino male guitarist with buzz cut and early-2000s rockwear; and a clean-shaven, wavy-haired Brazilian Latino drummer in sleeves with a natural broader frame and a red kit. The current 28-frame atlas is 1680×1256 (7×4, cells 240×314); its row order is bass, singer, guitarist, drummer. Raw generated sheets must never be naïvely sliced, as that caused severed limbs and duplicated sprites. Articulate hands, instruments and drumsticks with real playing states; implement clear missed-note and recovery reactions.**
>
> **Start by reproducing the current game and auditing the code and sprites. Then propose a focused, testable improvement plan. Build incrementally. Validate screenshots, animation clips and gameplay, not merely syntax. Keep the UI cohesive and readable on an actual phone. Package a versioned self-contained HTML and an itch.io ZIP whose root is `index.html`. Never claim physical-device or live-site validation you did not perform. Flag any unresolved musical chart inaccuracies, audio risks or design questions.**

---

# 21. Final vision / definition of done

The long-term goal is not simply “a browser rhythm game that technically works.” It is a small, compelling, **recognizably finished mobile concert game**. The band has unique personalities and appealing consistent design. The song feels alive. The player can instantly understand the four instrument roles, tap along on a phone, enjoy satisfying judgments, and watch performers respond in a way that looks like actually **playing instruments rather than swaying illustrations**. The stage responds to the song’s emotional structure, and the game remains readable when the notes become difficult. The title, menus, game HUD, pads, stage and results all belong to the same polished pixel-art world.

A new player should be able to open the itch.io page on an iPhone, tap Start, hear the real *You Won't Let Me Fall* recording, experience synchronized gameplay to its end, and replay without a broken asset, audio 404, off-screen button or confusing error. The implementation should be organized so a second song, a new venue or improved animation can be added without destabilizing the entire game. That is the bar for the next stage of *Burn Bright: The Pixel Riot*.

---

## Appendix A — Quick facts

| Item | Current fact |
|---|---|
| Title | *Burn Bright: The Pixel Riot* |
| Band | The Pixel Riot |
| Game genre | Four-lane mobile rhythm / concert game |
| Primary format | HTML5 portrait browser game |
| Logical canvas | 400×800 |
| Current render API | 2D Canvas, 2.5D projection (not actual Three.js) |
| Current audio | Web Audio decoded user-provided embedded MP3 |
| Song | *You Won't Let Me Fall*, 148.44 s |
| Estimated BPM | 152 |
| Count-in | Four beats ≈1.579 s |
| Note travel | 1.84 s |
| Difficulties | Casual 331, Standard 697, Expert 1091 |
| Controls | Touch; D/F/J/K, 1/2/3/4 |
| Touch offset | −120 to +120 ms, steps of 10 ms |
| Lanes | 0 Bass green; 1 Vox gold; 2 Guitar blue; 3 Drums red |
| Character atlas | 1680×1256; 7 columns × 4 rows |
| Atlas frame size | 240×314 |
| Frame rows | Bassist, vocalist, guitarist, drummer |
| Core graphics | Full-color retro pixel art / dark concert aesthetic |
| Publish target | itch.io HTML5 game ZIP, root index.html |
| Latest inspected source | BB7 Premium Art Pass |
| Last user-confirmed deployed milestone | BB5 embedded-audio release |
| Critical deployment lesson | No unresolved external MP3 URLs / HTTP 404 |
| Critical animation lesson | Test pose differences and grid bounds at actual game scale |

## Appendix B — Example startup and clock relationships

```js
const BPM = 152;
const BEAT = 60 / BPM;
const LEAD = BEAT * 4;
const TRAVEL = 1.84;

// During user-gesture startup, unlock AudioContext before awaiting decode.
// Recorded-song playback begins LEAD seconds after the game timeline starts.
begin = audioCtx.currentTime + 0.12;
source.start(begin + LEAD);

// Gameplay clock: audio context time, not Date.now or setInterval timing.
const gameTime = audioCtx.currentTime - begin;

// Convert MP3-relative chart events to game-relative times.
const noteTime = LEAD + chartEvent.time;

// Judgement window applies only a user-calibrated offset.
const signedDelta = noteTime - (gameTime + calibrationMs / 1000);
```

**Do not substitute approximate BPM-derived timestamps for the chart's actual detected beat landmarks if the chart provides specific beat times.**

## Appendix C — Minimum asset QA snippet (conceptual)

```python
from PIL import Image
atlas = Image.open('band_atlas.png').convert('RGBA')
FW, FH, COLS, ROWS = 240, 314, 7, 4
assert atlas.size == (FW * COLS, FH * ROWS)
for row in range(ROWS):
    for col in range(COLS):
        frame = atlas.crop((col*FW, row*FH, (col+1)*FW, (row+1)*FH))
        assert frame.getchannel('A').getbbox() is not None, (row, col)
        # Also inspect image visually and verify common ground pivot and safe margins.
```

This check only ensures frames are nonempty. It does **not** prove that poses are anatomically correct, visually aligned or interesting to watch. Real motion review remains mandatory.

## Appendix D — Key notes about the project’s history without a changelog

The game began as a classic Game Boy-like band rhythm concept with four unique musicians and four buttons. It became a genuine portrait HTML5 playable proof of concept, then acquired full-color rock pixel art, experimental sprite animation, stage lighting and 2.5D perspective lanes. The original synthesized demo was replaced by the user-supplied real song, for which audio beat analysis generated three charts. Attempts to ship that song revealed iPhone/audio-start and missing-asset problems; embedding the recording directly into the page ultimately produced a build confirmed to work by the user. Animation and sprite extraction needed further corrections after both inadequate swaying and a broken grid-slice that scattered figures across the stage. The cleaned 28-frame atlas and progressively refined mobile UI form the basis of the current BB7 code. The remaining mission is to make every visual and audio interaction genuinely production-quality while protecting the verified mobile audio and deployment behavior.

---

**End of master blueprint.**
