# Rhythm Riot: game design (working draft)

> **Research note (v0.6.1):** `docs/RESEARCH_RHYTHM_GAMES.md` compares this plan with Guitar Hero, Rock Band, Fortnite Festival, Rhythm Heaven and others, and suggests changes (Riot *phrases*, a swipe-up or button trigger, a visible ×1–×4 multiplier, EARLY/LATE hints, stars per song). Those suggestions are waiting on the owner's approval.

**Rhythm Riot** (working title) stars **X-ROADS**, a four-piece rock band. This doc fleshes out how the game should *play*: the core loop, **Riot Mode**, and the **ridiculous moments** that make it memorable. It's a proposal to react to. Nothing here is built yet unless it says **(built)**.

---

## 1. Design pillars

1. **Feels amazing to tap.** Every hit gets instant sound-synced feedback. Timing is fair and the notes are always readable.
2. **Ridiculous on purpose.** The game is willing to be absurd: big, silly, hilarious moments you want to show a friend. The comedy is wholesome and family-friendly, and the band is never the butt of a mean joke.
3. **The band is the reward.** Playing well makes X-ROADS look legendary. Playing badly makes them flail comically, never miserably.
4. **Smooth, always.** 60 fps on a phone matters more than extra detail. When something has to give, it's sharpness, never smoothness.

---

## 2. The core loop (what you do every second)

| Step | Now | Proposed |
|---|---|---|
| Notes fly down 4 lanes | (built) | Add **Riot notes**: glowing gold notes in key musical spots that fill the Riot meter |
| Tap or hold on time | (built) Perfect/Great/Good windows | Keep them, and add a subtle **early/late** hint under the judgement text so players learn their timing |
| Combo builds | (built) Score bonus grows with combo | Make it a visible **multiplier**: ×1, then ×2 at 10, ×3 at 20, ×4 at 30 hits in a row, shown as a big badge. Easier to understand than a hidden bonus |
| Energy | (built) Drains on misses; game over at 0 (practice mode turns it off) | Add a **last-chance wobble**: below 15% the music muffles and the stage lights flicker, so a game over is never a surprise |
| Song sections | (built) Lights and effects follow verse, chorus and bridge | Each section gets a gameplay identity (see §4) |

### Feel rules
- The judgement text and hit sparks appear **on the same frame** as the tap.
- Notes and the hit line are never covered by effects. Big moments happen **above** the highway: on stage, in the sky, in the crowd.
- The camera never shakes enough to make timing harder. *Reduce flashing* turns all shake off.

---

## 3. Riot Mode (the big power-up) — **built in v0.8**

> **As built (v0.8):** gold **Riot phrases** (one bar in every 8, marked in `chart.js` → `markRiotPhrases`) fill 25% each when you hit every note in them; a missed gold note loses that phrase. At **50%+** a **swipe up** (from a pad or anywhere on the stage; Space on a keyboard) unleashes it: the multiplier doubles (up to ×8), **energy can't drop**, +30 energy, and a full meter lasts 8 bars (half lasts 4). You keep earning during it. If energy hits 0 while Riot is ready, you get **2.5 seconds to swipe and save the show**. Activation fires pyro, confetti, a strobe, a synthesized whoosh + power chord, gold lanes and a gold screen glow, and the whole band does its big move. Numbers live in `RIOT` in `config.js`. The original proposal follows.

A meter fills up. When it's full, you unleash **RIOT MODE**: the most fun 8 bars of the song.

**Filling the meter**
- Hit **Riot notes** (gold glowing notes): +25% each.
- Finish a **hold note** without letting go: +10%.
- **Perfect streaks**: every 10 Perfects in a row adds +10%.

**Activating it**
- Tap **all four pads at once** (or press Space).
- Mobile-friendly: no tilting or swiping needed.

**While it's on (8 bars, about 12 seconds at 152 BPM)**
- **Double score** on top of the combo multiplier (up to ×8).
- **Energy can't drop**: misses don't hurt.
- **The stage goes wild:** maximum pyro, lasers and confetti; the crowd jumps; the band moves to their "legendary" animations.
- **One ridiculous moment fires** (see §5). You never know which one.
- **The highway changes look:** the lanes glow gold. The notes stay exactly the same so timing stays fair.

**Ending:** a big "RIOT OVER" stinger, the crowd roars, the score is tallied, and play goes straight back to normal.

---

## 4. Sections with a job

*You Won't Let Me Fall* has an opening, verses, builds, choruses, a refrain, a bridge, a final chorus and an outro. Each type of section can do something different:

| Section | Gameplay idea |
|---|---|
| **Opening** | A warm-up with few notes. The band does its intro pose and the crowd claps on beats 2 and 4. |
| **Verse** | A steady groove that teaches the lanes. Riot notes appear here so you can build the meter. |
| **Build** | Notes speed up, the lights rise, and a "GET READY" banner appears if your Riot meter is full. |
| **Chorus** | The best moment to use Riot Mode. Crowd lights and pyro happen anyway. |
| **Bridge = SOLO!** | A **solo showdown** (see §6). |
| **Final chorus** | Riot Mode lasts twice as long here, and the effects go to maximum. |
| **Outro** | A victory lap. The song ends with a **finale** chosen by how well you did. |

---

## 5. Ridiculous moments (the catalog)

Each moment is a short **event** made of three parts: a band or crowd animation, a stage effect, and a **trigger**. They're cosmetic and never block notes. At most **one per 16 bars**, so each one stays special.

| # | Moment | What happens | Trigger |
|---|---|---|---|
| 1 | **SHRED SOLO** | The guitarist solos so hard he floats off the stage, his guitar catches fire, and lightning hits the truss | Gold solo grade (§6) or a Riot Mode roll |
| 2 | **MAD SCIENCE** | The bassist pulls a bubbling beaker from his lab coat. It explodes in green smoke and he comes out with an enormous afro for the rest of the song | Riot Mode roll; or 30 bass notes in a row |
| 3 | **STICK LAUNCH** | The drummer hits so hard a stick flies into the crowd. A fan throws back a baguette, and he keeps drumming with it | Riot Mode roll; or 50 drum notes in a row |
| 4 | **THE NOTE THAT WOULDN'T END** | The singer holds a note so long the LED wall cracks, the crowd's hair blows back, and a bird lands on the truss to listen | Completing a long vocal hold note perfectly |
| 5 | **INFLATABLE DUCK** | A giant inflatable duck bounces across the crowd. Popping it on the beat (tap all pads) gives bonus points | Random during the chorus, about 1 in 3 songs |
| 6 | **CROWD SURF** | One band member stage-dives and surfs across the crowd while still playing, then gets passed back | 100-hit combo |
| 7 | **CONFETTI CANNON MISFIRE** | The confetti cannon fires backwards and buries the drummer, who keeps playing from under a confetti pile | Riot Mode roll |
| 8 | **KEYTAR GRANDMA** | A surprise guest with a keytar rides a hoverboard across the stage for 2 bars, then leaves | Very rare (about 1 in 20 songs). Becomes a collectible |
| 9 | **SPOTLIGHT CONFUSION** | All four spotlights chase the wrong person, so the band members keep stepping into them | Missing 3 notes in a row (the comedy version of failing) |
| 10 | **POWER CUT** (built, then upgraded) | On game over, the sound winds down like a dying tape, the band slumps, and the drummer's last stick bonks him on the head | Energy hits 0 |

### Finale (end of song, chosen by your result)
- **HEADLINER:** the band does a synchronized jump, the confetti cannons empty, and the duck returns wearing sunglasses.
- **NICE SET:** the band bows, and the singer throws the mic stand into the air and actually catches it.
- **KEEP ROCKING:** the band bows anyway, and the guitarist trips over a cable but turns it into a dramatic pose.

---

## 6. Solo showdown (the bridge) — **built in v0.9 as call-and-response**

> **As built (v0.9):** songs list their solo in `songs.js` (`solo: { section: 'BRIDGE', who }`). In that section every 4 bars split into a 2-bar **call** (see-through ghost notes the soloist plays, with a spotlight on them) and a 2-bar **response** (the same rhythm for you to copy). The medal comes from the share of response notes hit (60% bronze, 80% silver, 95% gold, +1,000 / 2,500 / 5,000). **Gold = SHRED:** the soloist floats off the stage for 5 seconds with flames under them and lightning from the truss. *You Won't Let Me Fall* → guitarist, *Trust God Anyway* → bassist, *You're Not My Plan B* has no solo (no bridge). The **Big Rock Ending** (§5 finales) is built too: `bigRockEnding: true` clears the last 4 bars; every pad tap scores (×multiplier) and is banked only by hitting the final gold bar (any pad). The original proposal follows.

For about 12 bars the spotlight goes to **one** band member, rotating each song or chosen by whoever played best so far.

- That member's lane gets a burst of fast notes. The other lanes go quiet.
- At the end, you get a **solo grade** by accuracy, and the animation escalates with it:
  - **Bronze (60%+):** a spin and a power stance.
  - **Silver (80%+):** a knee slide across the whole stage while the crowd parts.
  - **Gold (95%+):** the moment for that member (SHRED SOLO, MAD SCIENCE, STICK LAUNCH or THE NOTE THAT WOULDN'T END).
- A solo meter fills on screen above the highway as you play.

---

## 7. Making it smooth (rules for the art and the code)

**Animation** *(built in v0.5 for the Retro band: `animBlocks.js`)*
- **16 frames** per loop, each loop lasting a whole number of beats (for example, 16 frames over 2 beats ≈ 20 fps of real motion at 152 BPM).
- Every animation starts and ends on the same **neutral hub pose**, so any animation can follow any other without a jump.
- Switch animations only **on bar lines**, the way a real band changes moves.
- Big moments are **one-shot** animations that finish back on the hub pose.

**Performance budget (phone)**
- **Frame rate:** 60 fps target. *(built)* `perf.js` lowers the rendering resolution if a phone drops below about 45 fps, and raises it again when there's room. Add `?fps` to see the numbers.
- **Draw calls** (separate drawing jobs per frame): under 150. The game is at about 120 now. *(built)* The whole crowd is a single draw call.
- **Particles:** fixed-size pools. Nothing is created or deleted during a song.

**Testing**
- Every moment can be triggered from a debug address (for example `?moment=duck`) so it can be checked quickly.
- Each moment is reviewed in motion (as a short video), not just as screenshots.

---

## 8. Suggested build order

1. **Riot meter + Riot Mode + a multiplier badge.** This changes how the game plays the most.
2. ~~**The animation-block system** (the hub pose, switching on bar lines) and the first 16-frame library for the chosen band look.~~ **(built in v0.5)**
3. **Solo showdown** with SHRED SOLO as the first gold moment.
4. **More moments:** MAD SCIENCE, STICK LAUNCH, INFLATABLE DUCK, CROWD SURF.
5. **Finales**, the comedy fail, and collectibles (a "moments seen" list on the results screen).

---

## 9. Decisions (owner, after the research in `RESEARCH_RHYTHM_GAMES.md`)
- **Riot Mode:** filled by gold **Riot phrases**, triggered by a **swipe up**, and it **can save you from a game over**. Accepted: keep earning during it, a ×1–×4 multiplier that Riot doubles to ×8.
- **Small things:** EARLY/LATE hints, an early/late count with a timing fix on the results screen, and stars per song with **gold stars as the top reward on Expert** (built in v0.7).
- **Solos:** **call-and-response** (a band member plays a lick, you copy it), in songs that have a solo spot.
- **Finale:** a **Big Rock Ending** when the song's ending suits it.
- **Failure is funny**, never sad.
- **Difficulty:** Standard and Expert were too hard on a phone; v0.7 made every difficulty gentler.

## 10. Earlier questions (still open)
1. ~~Riot Mode trigger~~ (decided: swipe up)
2. Should solos rotate between band members, or always go to whoever has played best?
3. How rare should the rare moments be? Rare is special, but it can be frustrating if nobody ever sees them.
4. Are there any ridiculous moments that feel off-brand for X-ROADS (a Christian rock band) and should be cut?
5. Any moments **you** want to add? (A list of the band's inside jokes would be gold here.)
