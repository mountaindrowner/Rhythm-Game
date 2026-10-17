# Art pipeline: the pixel bands (PixelLab)

Both pixel band looks were made with [PixelLab](https://pixellab.ai), an AI pixel-art tool, through its MCP API. This page records exactly how, so you can regenerate, tweak or extend the art.

- **Retro 16-bit** (the default since v0.5): 64 px characters with a full **animation library**. See the next section.
- **Pixel HD** (the default until v0.4): 128 px characters with three animations each. See "The HD band" below.

## The Retro band and its animation library

| Asset | PixelLab ID |
|---|---|
| Bassist | character `0ffefa3c-caa5-4a57-8de6-f1b7adaf8fde` |
| Singer | character `15f7fc9d-fa49-4552-8e3c-dc0b735fda87` |
| Guitarist | character `29bf08d6-000e-4e21-84fd-9b7a68a5e1d4` |
| Drummer | character `565befd0-46f7-4b8f-af4d-6a15bbaca679` |
| Drum kit | object `ddb28255-432c-40ca-b714-acd4cb6fcb21` |
| Guitarist's mic stand | object `6dee461d-8e9d-4bd0-b688-d7300797e0ef` (1 of 16 candidates picked) |

All IDs live in `assets/art/pixellab-retro/source.json`.

**The recipe.** `assets/art/pixellab-retro/animations.json` lists every animation: its name, its **block** (idle, groove, sing, accent, mistake, celebrate, bow), its energy (calm for verses, hype for choruses, or any), how many beats it lasts, and the prompt. There are 41 in total, about 10 per musician:

| Block | Bassist | Singer | Guitarist | Drummer |
|---|---|---|---|---|
| idle | idle | idle | idle | idle |
| groove (calm / hype / variations) | calm, hype, step, slap | calm, hype, point, heart | calm, hype, riff, windmill | calm, hype, fill, twirl |
| sing | | | sing (into his mic stand) | |
| accent, celebrate, bow | yes | yes | yes | yes |
| mistake | mistake_a, mistake_b | mistake_a, mistake_b | mistake_a, mistake_b | mistake_a, mistake_b |

**The smoothness rule.** Every animation is 16 frames and is generated with the musician's standing pose (the **hub**) as its *end frame* (`end_frame_base64` in `animate_character`, mode `v3`). Every animation starts and ends on the hub, so the game can chain any two without a jump. `src/world/animBlocks.js` then switches only where loops restart (see `docs/HOW_IT_WORKS.md`).

**Making and packing them:**

```bash
export PIXELLAB_API_KEY=...    # an environment secret; never commit it or paste it in chat
python3 scripts/pixellab/animate.py assets/art/pixellab-retro          # makes any that are missing (skips the rest)
python3 scripts/pixellab/fetch_and_pack.py --source assets/art/pixellab-retro/source.json
npm run dev                                                             # check at ?autoplay&view=stage
```

To add an animation, add an entry to the recipe and run both commands again.

To **redo** one (for example because it barely moves), rewrite its prompt and add `"version": 2`. `animate.py` then makes it under a new PixelLab name (`drummer_hype_v2`), and the packer uses that one. The old version stays in PixelLab until you delete it, so you can compare before committing. In v0.5.1 the drummer's four grooves and the guitarist's hype groove were redone this way. The first prompts put the stick hits "in front of his waist", which is exactly where the drum kit hides him. The new prompts keep all the motion above his chest (sticks over his head, head-banging, hair flying), and the measured movement went up 1.5–2.8×. **Tip:** describe motion the camera can actually see. The game picks it up from its block automatically. While PixelLab is still generating a character's animations, its sheet download returns *423 Locked*, so pack only after `animate.py` says `done`.

**Drummer staging.** The Retro kit is drawn at 0.8× size, and the drummer stands a quarter of a musician's height above its base (`kitScale` and `drummerLift` in `bandArt.js`). That way his arms and sticks show above the drums instead of only his head.

**Props.** `source.json` can list `props` (objects that belong to a musician). The mic stand is `{"for": "guitarist"}`. The packer trims each prop. `bandSprites.js` scales it to the owner's mouth height and stands it beside him.

**Cost.** About 90 generations for the 39 new animations plus the mic-stand candidates (2,000 per month on the current plan).

## Riot Mode versions (v0.10)

When Riot Mode starts, the band turns into powered-up versions of themselves. These are PixelLab **states** (variants that keep the same person) of the Retro characters, made with `create_character_state`:

| Musician | Riot version | PixelLab ID |
|---|---|---|
| Bassist | glowing neon-green glasses and bass, crackling electricity (still light stubble) | `66aa45e7-b79d-43b7-9df6-65a28e6a632d` |
| Singer | gold glowing flame logo, fiery ponytail tips, gold mic (still a full-length tee) | `27df0b87-1fb4-49b3-bd39-197be63c1fd9` |
| Guitarist | guitar on fire, glowing blue wristbands | `be71329d-eeb2-493f-83b0-0292b6ae8432` |
| Drummer | flaming drumsticks, flame-striped shirt (still clean-shaven) | `1f69307e-b998-4876-a9fc-9bca0a7008bc` |

Each has two 16-frame Riot loops (`riot`, `riot2`) that take turns every 2 bars. They live in `assets/art/pixellab-retro-riot/` (`source.json` has the edit descriptions, `animations.json` the recipe), and are made and packed exactly like the main library:

```bash
python3 scripts/pixellab/animate.py assets/art/pixellab-retro-riot
python3 scripts/pixellab/fetch_and_pack.py --source assets/art/pixellab-retro-riot/source.json
```

Cost: about 100 generations (4 states and 8 animations).

## The HD band

### What was made

| Asset | PixelLab ID | Settings used |
|---|---|---|
| Bassist | character `9edad916-0964-485b-a644-fb1e4d1b43e7` | `create_character`, mode `v3`, 128 px, view `side`, black outline, high detail |
| Singer | character `b5cf0d98-8948-4212-8d92-036e4228f33e` | a "state" (variant) of `15aba405…`, edited so her T-shirt is full length, with no bare midriff |
| Guitarist | character `13b58784-433e-44db-b156-f0256c878dfb` | same settings as the bassist |
| Drummer | character `ef61d222-b8ca-4f7c-bae5-c7247d0c717c` | same settings as the bassist |
| Drum kit | object `4c49032f-f857-4308-86d6-d38c5d777166` | `create_1_direction_object`, sidescroller view, styled from the drummer sprite (1 of 4 candidates picked) |

Each musician has three south-facing (front-on) animations made with `animate_character` (v3, 8 frames): **play**, **accent** and **mistake**.

#### Character prompts

These follow the character descriptions in `BURN_BRIGHT_MASTER_BLUEPRINT.md` §3.

- **Bassist:** rock band bassist: slim Caucasian man in his thirties, backwards olive-green ball cap, rectangular glasses, light stubble, open white lab coat over a black band t-shirt with a small yellow atom logo, blue jeans, red-and-white sneakers, holding a dark green electric bass guitar across his body, playful mad-scientist rocker
- **Singer:** rock band lead singer: Latina woman in her twenties, long dark brown hair in a high ponytail, gold hoop earrings, black short-sleeved band t-shirt with an orange flame logo, olive cargo pants with a chain, black sneakers, holding a handheld microphone, confident energetic pose, modest outfit
  - **Fix applied:** the first result had a cropped shirt. A variant was made with *"her black flame-logo band t-shirt is a normal full-length t-shirt that reaches down to her belt and fully covers her stomach and waist; no bare midriff"*.
- **Guitarist:** rock band guitarist: Latino man in his twenties, short buzz cut, small goatee, silver cross necklace, fitted black t-shirt, black wristbands, olive cargo pants, black sneakers, playing a dark red electric guitar, medium build, early-2000s rock style
- **Drummer:** rock band drummer: Brazilian Latino man in his twenties, clean-shaven with no beard and no facial hair, wavy medium-length dark brown hair swept back, black short-sleeved t-shirt, dark jeans, black sneakers, holding two wooden drumsticks, natural broad build

#### Animation prompts

| Musician | play | accent | mistake |
|---|---|---|---|
| Bassist | plucks strings, left hand moves along the neck, head bobs | lifts the bass neck high and leans back | flinches, hunches, grimaces, recovers |
| Singer | sings into the mic, sways and bounces, ponytail swinging | keeps singing while raising her other arm with an open hand, waving to the crowd* | winces, lowers the mic, shakes her head, lifts it back |
| Guitarist | strums down and up, changes chords, nods | raises the guitar neck and does a small jump | stops strumming, grimaces, shakes it off |
| Drummer | alternately strikes downward with each stick, nods | raises both sticks high, then smashes down | freezes, drops his arms, then resumes |

\*The first singer accent ("raises her free hand in a fist toward the sky") came out with glitchy yellow blobs. It was deleted and regenerated with the wave description.

### How it gets into the game

```text
PixelLab  ──spritesheet──▶  scripts/pixellab/fetch_and_pack.py  ──▶  assets/art/pixellab/
                                                                      bassist.png  (rows: idle, play, accent, mistake)
                                                                      singer.png, guitarist.png, drummer.png
                                                                      drumkit.png
                                                                      band.json    (cell size, rows, where the feet are)
                                                                ──▶  src/world/bandSprites.js (shows them on stage)
```

To re-download, for example after regenerating an animation in PixelLab:

```bash
pip install pillow
export PIXELLAB_API_KEY=...    # from your PixelLab account; never commit it
python3 scripts/pixellab/fetch_and_pack.py
npm run dev                    # check the result at ?autoplay&view=stage
```

The script expects each character to have animations named `<member>_play`, `<member>_accent` and `<member>_mistake`, for example `singer_play`.

## Quality checklist (from the blueprint)

- [x] The same pixel size for every musician and the kit (`PX` in `bandSprites.js`)
- [x] Feet anchored to the stage on every frame (PixelLab's centred pivot plus `footY`)
- [x] The drummer clean-shaven, the singer in a full-length sleeved band tee
- [x] Real pose changes (strums, mic moves, stick strikes), not just swaying
- [x] Reviewed in motion with `?autoplay&view=stage`, not only as still frames
- [x] Retro library: every switch between animations measured to be no bigger than normal frame-to-frame motion (no visible pops)
- [ ] Checked on a real iPhone

## Cost of the HD band

About 95 PixelLab generations in total (characters, the singer fix, the drum kit and 13 animations) from a 2,000-per-month plan.

### More Riot moves (v0.13.1)
Each musician now has four Riot moves in `assets/art/pixellab-retro-riot/animations.json`: `riot`, `riot2` (v0.10) and `riot3`, `riot4` (v0.13.1, 21 generations for the 8). The game rotates through every move with `"block": "riot"` that isn't marked `"use": false` (a new one every 2 bars). To redo a weak move: edit its prompt, give it `"version": 2`, remove `"use": false`, then run `animate.py` and `fetch_and_pack.py` on the riot folder.
