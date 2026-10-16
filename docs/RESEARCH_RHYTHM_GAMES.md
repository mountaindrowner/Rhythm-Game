# How other rhythm games do it (research, v0.6.1 and v0.11)

Before building Riot Mode and the rest of `docs/GAME_DESIGN.md`, we looked at how the well-known rhythm games handle the same problems. The aim is to keep what works for them and avoid what players complain about, so Rhythm Riot isn't designed in a vacuum. Sources are listed at the end. Most are reviews, wikis and player guides rather than official design documents, so exact numbers are approximate.

---

## 1. The short version

| Topic | What most games do | Where we are |
|---|---|---|
| **Power-up** | A meter filled by playing **marked phrases** perfectly, spent for **double score** (Guitar Hero Star Power, Rock Band Overdrive, Fortnite Festival). | Riot Mode is designed but not built. Our design fits the genre, with a few changes below. |
| **Multiplier** | A visible ×1–×4 that grows with your streak, and ×8 with the power-up (Guitar Hero). | Hidden combo bonus. Make it visible. |
| **Failing** | A rock/crowd meter; you get booed off. A **No Fail** option for parties and beginners (Rock Band 2). | ✅ Energy meter + game over + Practice mode. |
| **Timing feedback** | Early/late ("FAST/SLOW") hints and early/late counts on the results screen. | ❌ Only PERFECT/GREAT/GOOD. Add early/late. |
| **Calibration** | Almost every game opens with a latency test, because it can't be fully automatic. | ✅ Timing check screen. |
| **One clock** | Notes and judging follow the audio clock, never frame counts. | ✅ Built that way from day one. |
| **Stars and progression** | 5 stars per song (gold stars on Expert), unlocks, daily challenges, events. | ❌ Nothing saved between plays. |
| **Personality** | Everything moves to the beat (Hi-Fi Rush); funny failures (Rhythm Heaven); characters and call-and-response (Friday Night Funkin'). | ✅ The band, crowd and lights move to the beat, and the band reacts to misses. The ridiculous moments aren't built yet. |
| **Finales** | Rock Band's **Big Rock Ending**: freestyle, then hit the last note to bank the bonus. | Designed (finales), not built. |
| **Mobile controls** | Portrait, tap/slide/hold, the power-up on a **swipe up or an on-screen button**, haptic buzz on start and end (Fortnite Festival mobile). | ✅ Portrait, tap and hold. The power-up input is to be decided (see §3). |

---

## 2. Game by game

**Guitar Hero (Star Power).** You fill the meter by hitting every note of star-marked phrases; a partly missed phrase gives nothing. You need at least half a bar to activate it, by tilting the guitar (or later, hitting both cymbals). It **doubles the multiplier, up to ×8**, and makes the rock meter rise faster, so it can **save a failing run**. Early games didn't let you earn more while it was running; World Tour allowed it. Players learned "squeezing": activating at just the right moment to catch extra notes.

**Rock Band (Overdrive).** The same core idea. You fill it from white-note phrases (or whammying white sustains). Guitarists **tilt**, drummers activate at the end of special **fills**, and singers shout during gaps. You **can** keep earning while it's running. In a band it raises everyone's score, and a teammate can spend theirs to **rescue a player who failed**. Extras: **Unison Phrases** (a bonus if every player nails the same section) and the **Big Rock Ending**, a freestyle flourish whose points you only keep if everyone hits the final notes. Notes keep their colors during Overdrive, so reading the highway stays easy.

**Fortnite Festival (mobile).** The closest match to us: a modern, portrait, touch-screen four-lane game. You **tap** notes on the targets, **slide** to neighbouring lanes, and **hold** sustains. You earn Overdrive from marked sections and trigger it by **swiping up from a note you've played, or tapping an on-screen button**. **Haptics** buzz when it starts and ends. One guide says touch hit detection is more forgiving than on a controller (unconfirmed by Epic).

**Beatstar (mobile).** Portrait, three lanes, licensed hits. Songs ramp up in **stages within the song** (faster, more lanes). Stars per song unlock more songs. Players dislike its **"lose all progress" misses and gem-to-continue** pressure. That's a warning, not a model.

**Rhythm Heaven.** It is **audio-first**: the rhythm is taught by sound, and sometimes the screen is deliberately hidden to prove you don't need to see it. Failures are **comedy**: miss in the pea-skewering game and the diner chokes. Every few stages a **Remix** stage mashes the earlier games together under a new song. **Perfect Campaigns** pop up only now and then, as a rare, special challenge. Its early/late feedback is subtle (a character's face changes), and players notice when it's missing.

**Hi-Fi Rush.** The whole world moves to the beat, not just the player, with a toggleable metronome. It's **forgiving**: outside the puzzles you don't need perfect timing. Critics loved the **writing and humor**; the cast "bursts with personality."

**Friday Night Funkin'.** **Call-and-response**: an opponent sings a phrase, then you answer it (the PaRappa the Rapper formula). Very distinct, colourful, pixel-art characters drive its popularity.

**Project DIVA (Chance Time).** A marked section where your **combo builds a growing bonus** (100, 200, … up to 5,000 points per note); a miss resets it. The arcade version made Chance Time unfailable (no life loss). It pays off with a big visual moment at the end of the section.

**Rock Band 4 (freestyle solos).** Solos become **improvised**: any notes sound good because they're in the song's key. You're **scored but can't fail**, and on-screen cues guide what to play. A tutorial was needed before players understood them.

**Arcade games (DDR, beatmania, SOUND VOLTEX, Project DIVA).** **FAST/SLOW** or EARLY/LATE markers on judgements. Results screens **count earlies and lates**, which reveals a drift players don't notice themselves. Top windows are tight (about ±15–40 ms), while mobile games are more forgiving.

**Arcaea / Project Sekai (mobile).** Progression through **story and characters**, events, and **one-try-a-day challenges** (Project Sekai). Arcaea is praised for letting you buy songs and play them freely, instead of the "stamina" limits common on mobile.

---

## 3. What this means for Rhythm Riot

### Keep (the research backs these choices)
- One audio clock, the timing check, Practice mode (No Fail), and generous touch timing windows (ours are Perfect ±45 ms, Great ±97 ms, Good ±175 ms).
- Casual has no chords, and harder levels add notes rather than speed. That matches the charting guides ("make easier versions by removing notes", "beginners shouldn't juggle several inputs").
- Everything on stage moving to the beat (lights, crowd sway, band), and the band reacting to misses.

### Change in our Riot Mode design (`GAME_DESIGN.md` §3)
1. **Riot phrases instead of single gold notes.** Every big game fills the meter from a **marked phrase you must play perfectly**, not one note. Phrases teach players to stay accurate for a few seconds, and they're easy to show (glowing gold notes with a gold edge on the highway).
2. **Activation: a swipe up on the pads, or a big glowing button.** This is how Fortnite Festival does it on phones. Tapping all four pads at once (our current idea) collides with real chords and is easy to trigger by accident. Hold off on haptics for iPhone: Safari doesn't support web vibration.
3. **Keep earning during Riot Mode** (as Rock Band and later Guitar Hero do), and let Riot Mode **pull you back from a game over**: energy rises instead of falling. That's the "save" moment players love.
4. **Show a ×1–×4 multiplier** that Riot doubles (up to ×8). This is the genre standard and much easier to read than our hidden combo bonus.

### Add (small, high value)
- **EARLY / LATE** under GREAT and GOOD, plus an early/late count on the results screen. If a player is consistently early or late, the results screen can offer "Adjust timing by X ms?", using the timing setting we already have.
- **Stars per song:** 1–5 stars from score, with **gold stars** for an Expert full combo or Riot-perfect run. Save the best score and stars per song and difficulty, and show them in the song picker. This gives every song a reason to replay.

### Shape the bigger features
- **Solo showdown → call-and-response** (Friday Night Funkin', PaRappa, Rhythm Heaven). The soloist plays a short phrase (ghost notes and a spotlight), and you play it back. It's easy to understand, it stars a band member, and it's naturally funny when it goes wrong.
- **Finale → a Big Rock Ending.** In the last bars, mash any pads freely for bonus points, with lights, pyro and the band going wild. You only bank them if you hit the final note.
- **Make failure funny** (Rhythm Heaven). Each miss or game over gets a comic band reaction, never a sad one. That's already a pillar in our design doc; the research says it's a big part of why players love Rhythm Heaven.
- **Ridiculous moments as rare surprises** (Rhythm Heaven's Perfect Campaigns, Project DIVA's Chance Time payoff). Rare is special, but tie at least one to something the player does (finishing a Riot phrase), so players can learn to make them happen.
- **Later:** a daily challenge song (Project Sekai), and a "remix" medley of all songs once there are more (Rhythm Heaven).

### Avoid
- Stamina, gems, or paying to continue (Beatstar's most criticised feature).
- Tilt or shake controls (players found buttons more precise even on guitars).
- Changing note colours during the power-up (Rock Band kept them; readability first).
- Forced "lose everything on one miss" modes, except as an optional challenge.

---

## 4. Suggested order (replaces §8 of `GAME_DESIGN.md` once you approve it)

1. **Multiplier badge + EARLY/LATE + results early/late count.** Small, makes every song feel better now.
2. **Stars and best scores per song** in the song picker.
3. **Riot Mode** with Riot phrases, a swipe-up or button trigger, rescue from game over, and ×8.
4. **Big Rock Ending** finale.
5. **Call-and-response solo** with the first ridiculous moment as its gold reward.
6. More ridiculous moments; then daily challenge and remix.

## 5. Questions for you
1. Riot Mode trigger: **swipe up on the pads**, a **big button**, or both (like Fortnite Festival)?
2. Should Riot Mode be able to **save you from a game over**?
3. Do you like **call-and-response** for the solos (a band member plays a lick, you copy it)?
4. Stars: is a **gold star** for an Expert full combo the right top reward?

---

## 6. Menus and the start of a song (v0.11)

The owner found the old menu plain, cluttered and see-through. Before rebuilding it we checked how other games get you from "open the game" to "playing". (This round came from web-search summaries, because most pages couldn't be opened directly, so treat the details as approximate.)

| Game | How you get to a song |
|---|---|
| **Guitar Hero III** | A short main menu: Career, Quickplay, Options. Loading screens show **tips and jokes** ("use Star Power at ×4"). Guitar Hero Live opens a show with a **walk-on**: backstage, then out on stage to a cheering crowd. |
| **Rock Band 4** | Difficulty chosen per player before the song. "Shows" split songs into sets. The **drummer counts the song in**. Bigger venues get bigger stage effects. |
| **Fortnite Festival** | Difficulty sits in the lobby and **stays picked between songs**. Then you choose the song and ready up. |
| **Beat Saber** | Solo / Campaign / Online / Party, then pick a track, then a difficulty. Every song has a **preview** start time and length, and its own environment (venue). |
| **Project Sekai, Beatstar** | Difficulty as a row of buttons; **best result remembered per difficulty**; one big play button in thumb reach. |

**Common patterns:** a short first menu (one main "play" path plus options); the **best score per difficulty** on every song; **song previews** while browsing; loading screens with tips and humor; the start of a song treated as part of the show (walk-on, count-in); the main buttons in the **bottom third** of a phone screen where thumbs reach.

**What we built (v0.11):** a title screen that's its own pixel-art rock show (truss scaffolding, lights, an LED wall, the band, a crowd, a logo crackling with electricity), with START THE SHOW, SETTINGS and TIMING CHECK at the bottom. Then **difficulty → set list** (the owner's order, and the Fortnite one: your best stars and score for that difficulty show on every song, and the picked song plays a chorus preview), a **gig-poster loading screen** with a tip, a camera **swoop over the crowd** with "LIVE AT THE ARENA", and the drummer's **4 stick clicks** on the song's own beat (3, 2, 1, ROCK!).

---

## Sources
- Guitar Hero Star Power and squeezing: [Giant Bomb: Star Power](https://giantbomb.com/wiki/Concepts/Star_Power), [Giant Bomb: Squeezing](https://giantbomb.com/wiki/Concepts/Squeezing)
- Rock Band Overdrive, Unison Phrases, Big Rock Ending: [MobyGames: Rock Band](https://www.mobygames.com/game/32021), [Wikipedia: Rock Band](https://en.wikipedia.org/wiki/Rock_Band_(video_game)), [StrategyWiki: Rock Band gameplay](https://strategywiki.org/wiki/Rock_Band/Gameplay), [Wikipedia: Rock Band 4](https://en.wikipedia.org/wiki/Rock_Band_4), [Futurelooks: World Tour vs Rock Band 2](https://www.futurelooks.com/battle-of-the-band-games-guitar-hero-world-tour-vs-rock-band-2/2/)
- Fail and No Fail: [Wikipedia: Guitar Hero](https://en.wikipedia.org/wiki/Guitar_Hero_(video_game)), [Engadget: World Tour won't include No Fail](https://www.engadget.com/2008-09-03-guitar-hero-world-tour-wont-include-no-fail-option.html), [Futurelooks: Guitar Hero 5 review](https://futurelooks.com/guitar-hero-5-for-the-xbox-360-reviewed/2)
- Timing windows: [Rock Band hints (TrueAchievements)](https://www.trueachievements.com/game/Rock-Band/walkthrough/2), [Rhythm Horizon mechanics](https://rhythmhorizon.com/mechanics/?v=0b3b97fa6688), [Rhythm game scoring explained](https://rhythm-games.com/guides/rhythm-game-scoring-system-explained), [Building fair judgement windows in JavaScript](https://dev.to/skywalker_2de7de5f97df567/building-fair-rhythm-game-judgement-windows-in-javascript-1og9), [Rhythm Doctor latency discussion](https://steamcommunity.com/app/774181/discussions/0/3200370144982666969/), [Rhythm game crash course](https://exceed7.com/native-audio/rhythm-game-crash-course/index.html)
- Early/late displays: [Project DIVA Mega Mix+ discussion](https://steamcommunity.com/app/1761390/discussions/0/3422185980116444483), [EXCEED GEAR play options](https://voltexes.com/exceed-gear-play-options-guide/), [Etterna forum](https://community.etternaonline.com/t/i-need-help-as-a-newbie/2962)
- Fortnite Festival mobile: [Epic Games: Get started with Fortnite Festival Mobile](https://www.epicgames.com/help/c-44153013/c-45296221/a20539676), [Wikipedia: Fortnite Festival](https://en.wikipedia.org/wiki/Fortnite_Festival), [ExitLag mobile layout guide](https://www.exitlag.com/blog/fortnite-festival-mobile-layout/)
- Beatstar: [Common Sense Media](https://www.commonsensemedia.org/app-reviews/beatstar), [Boss Rush review](https://bossrush.net/2022/02/game-review-guitar-heros-little-brother-beatstar/), [Canaltech](https://canaltech.com.br/games/beatstar-e-o-novo-guitar-hero-conheca-o-jogo-de-ritmo-para-celular-196145/)
- Rhythm Heaven: [Wikipedia: Rhythm Heaven series](https://en.wikipedia.org/wiki/Rhythm_Heaven_(series)), [Pocket Tactics: 20th anniversary](https://www.pockettactics.com/rhythm-heaven-anniversary), [Engadget preview](https://www.engadget.com/2011-06-11-rhythm-heaven-preview.html), [Strand Magazine: Groove](https://www.strandmagazine.co.uk/single-post/rhythm-heaven-groove-brings-the-series-back-without-missing-a-beat), [Pure Nintendo: Megamix review](https://purenintendo.com/review-rhythm-heaven-megamix-3ds-eshop/), [Giant Bomb: Rhythm Heaven](https://www.giantbomb.com/wd/3030-21312), [Final Weapon: Groove review](https://finalweapon.net/2026/07/08/rhythm-heaven-groove-review/)
- Hi-Fi Rush: [Unwinnable: style is substance](https://unwinnable.com/2023/07/21/in-hi-fi-rush-style-is-substance-165/), [GGRecon review](https://ggrecon.com/reviews/hi-fi-rush-review), [Prima Games review](https://primagames.com/reviews/hi-fi-rush-review-an-ensemble-of-pure-enjoyment)
- Friday Night Funkin': [Newgrounds wiki: FNF](https://newgrounds.wiki.gg/wiki/FNF), [Hagenberg games wiki](https://hagenberg.games/wiki/Friday_Night_Funkin)
- Project DIVA Chance Time: [pixiv encyclopedia: Project DIVA](https://dic.pixiv.net/history/ProjectDIVA/664153)
- Rock Band 4 freestyle solos: [TechCrunch](https://techcrunch.com/2015/07/14/rock-band-4-guitar-solos), [Game Informer](https://gameinformer.com/games/rock_band_4/b/xboxone/archive/2015/08/29/rock-band-4-freestyle-guitar-solos-are-fun-once-you-understand-them)
- Mobile progression: [Wikipedia: Arcaea](https://en.wikipedia.org/wiki/Arcaea), [Wikipedia: Hatsune Miku: Colorful Stage!](https://en.wikipedia.org/wiki/Hatsune_Miku:_Colorful_Stage!), [Project Sekai beginner guide](https://shapes.inc/games/guides/project-sekai-beginner-guide)
- Menus and song starts (v0.11): [Guitar Hero loading phrases](https://guitarhero.fandom.com/wiki/Loading_phrases), [Guitar Hero Quickplay](https://guitarhero.fandom.com/wiki/Quickplay), [Wikipedia: Guitar Hero Live](https://en.wikipedia.org/wiki/Guitar_Hero_Live), [Destructoid: Guitar Hero Live review](https://www.destructoid.com/reviews/review-guitar-hero-live/), [Cheat CC: Rock Band 4 preview](https://www.cheatcc.com/articles/rock-band-4-preview-ps4/), [Engadget: Rock Band venues](https://www.engadget.com/2007-10-09-rock-bands-virtual-venues-unveiled.html), [Epic Games: Fortnite Festival help](https://www.epicgames.com/help/fortnite-festival-c-202300000001635/a202300000012260), [Beat Saber: preparing a song](https://beatsaber.com/documentation/preparing-the-song/index.html), [Steam: Beat Saber](https://store.steampowered.com/app/620980), [Android Central: Beatstar](https://www.androidcentral.com/beatstar-android-game-week), [Thumb-zone design](https://parachutedesign.ca/blog/thumb-zone-ux/)
- Charting: [osu! forum: mapping the prominent layer](https://osu.ppy.sh/community/forums/posts/7011477), [Flash Flash Revolution: stepping easier charts](https://www.flashflashrevolution.com/vbz/node/97913), [Clone Hero difficulty guidelines](https://customsongscentral.com/diff-guitar)
