# Art pipeline: the HD pixel band (PixelLab)

The default band look ("PIXEL HD" in Settings) was made with [PixelLab](https://pixellab.ai), an AI pixel-art tool, through its MCP API. This page records exactly how, so you can regenerate, tweak or extend the art.

## What was made

| Asset | PixelLab ID | Settings used |
|---|---|---|
| Bassist | character `9edad916-0964-485b-a644-fb1e4d1b43e7` | `create_character`, mode `v3`, 128 px, view `side`, black outline, high detail |
| Singer | character `b5cf0d98-8948-4212-8d92-036e4228f33e` | a "state" (variant) of `15aba405…`, edited so her T-shirt is full length, with no bare midriff |
| Guitarist | character `13b58784-433e-44db-b156-f0256c878dfb` | same settings as the bassist |
| Drummer | character `ef61d222-b8ca-4f7c-bae5-c7247d0c717c` | same settings as the bassist |
| Drum kit | object `4c49032f-f857-4308-86d6-d38c5d777166` | `create_1_direction_object`, sidescroller view, styled from the drummer sprite (1 of 4 candidates picked) |

Each musician has three south-facing (front-on) animations made with `animate_character` (v3, 8 frames): **play**, **accent** and **mistake**.

### Character prompts

These follow the character descriptions in `BURN_BRIGHT_MASTER_BLUEPRINT.md` §3.

- **Bassist:** rock band bassist: slim Caucasian man in his thirties, backwards olive-green ball cap, rectangular glasses, light stubble, open white lab coat over a black band t-shirt with a small yellow atom logo, blue jeans, red-and-white sneakers, holding a dark green electric bass guitar across his body, playful mad-scientist rocker
- **Singer:** rock band lead singer: Latina woman in her twenties, long dark brown hair in a high ponytail, gold hoop earrings, black short-sleeved band t-shirt with an orange flame logo, olive cargo pants with a chain, black sneakers, holding a handheld microphone, confident energetic pose, modest outfit
  - **Fix applied:** the first result had a cropped shirt. A variant was made with *"her black flame-logo band t-shirt is a normal full-length t-shirt that reaches down to her belt and fully covers her stomach and waist; no bare midriff"*.
- **Guitarist:** rock band guitarist: Latino man in his twenties, short buzz cut, small goatee, silver cross necklace, fitted black t-shirt, black wristbands, olive cargo pants, black sneakers, playing a dark red electric guitar, medium build, early-2000s rock style
- **Drummer:** rock band drummer: Brazilian Latino man in his twenties, clean-shaven with no beard and no facial hair, wavy medium-length dark brown hair swept back, black short-sleeved t-shirt, dark jeans, black sneakers, holding two wooden drumsticks, natural broad build

### Animation prompts

| Musician | play | accent | mistake |
|---|---|---|---|
| Bassist | plucks strings, left hand moves along the neck, head bobs | lifts the bass neck high and leans back | flinches, hunches, grimaces, recovers |
| Singer | sings into the mic, sways and bounces, ponytail swinging | keeps singing while raising her other arm with an open hand, waving to the crowd* | winces, lowers the mic, shakes her head, lifts it back |
| Guitarist | strums down and up, changes chords, nods | raises the guitar neck and does a small jump | stops strumming, grimaces, shakes it off |
| Drummer | alternately strikes downward with each stick, nods | raises both sticks high, then smashes down | freezes, drops his arms, then resumes |

\*The first singer accent ("raises her free hand in a fist toward the sky") came out with glitchy yellow blobs. It was deleted and regenerated with the wave description.

## How it gets into the game

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
- [ ] Checked on a real iPhone

## Cost

About 95 PixelLab generations in total (characters, the singer fix, the drum kit and 13 animations) from a 2,000-per-month plan.
