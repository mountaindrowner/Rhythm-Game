# The itch.io page: everything to fill in

Written for v0.13.2. The images are in `docs/itch/` (cover and banner); the screenshots come from the game itself (see "Screenshots" below). Copy and paste from here when making or updating the page at **itch.io → Dashboard → Create new project** (or **Edit game**).

---

## 1. Edit game: the basics

| Field | What to put |
|---|---|
| **Title** | Rhythm Riot |
| **Project URL** | `rhythm-riot` (so the page is `yourname.itch.io/rhythm-riot`) |
| **Short description or tagline** | Tap along with X-ROADS, unleash Riot Mode, and steal center stage. |
| **Classification** | Games |
| **Kind of project** | HTML |
| **Release status** | In development |
| **Pricing** | No payments, or $0 or donate (your call) |

## 2. Uploads

1. **Upload files**: `dist/rhythm-riot-itch.zip` (make it with `npm run build`; it's one `index.html` with everything inside).
2. Tick **"This file will be played in the browser"**.

## 3. Embed options

| Setting | Choose | Why |
|---|---|---|
| **Embed in page** | Manually set size | |
| **Viewport dimensions** | **540 × 960** | The game is a tall phone screen; anything wider just adds black bars. |
| **Mobile friendly** | ✅ on, **Orientation: Portrait** | It's made for phones held upright. |
| **Automatically start on page load** | ❌ off ("Click to launch") | The game is 22 MB; the player's tap also unlocks the sound on iPhones. |
| **Fullscreen button** | ✅ on | It plays much better full screen. |
| **Enable scrollbars** | ❌ off | |
| **SharedArrayBuffer support** | ❌ off | Not needed. |

## 4. Details

| Field | What to put |
|---|---|
| **Genre** | Rhythm |
| **Tags** (up to 10) | rhythm, music, rock, pixel-art, band, mobile, touch-friendly, arcade, 2d, singleplayer |
| **AI generation disclosure** | **Yes.** Tick **graphics** (the band and crowd art was made with PixelLab, an AI pixel-art tool). If the form has a box for code, tick it too (the code was written with an AI assistant). Leave sound unticked unless the songs themselves were made with AI. |
| **Custom noun** | leave blank |
| **App store links** | none |
| **Community** | Comments |
| **Visibility** | **Draft** first. Test it on your phone, then switch to **Public** (or **Restricted** with a password to share with friends first). |

### Metadata (the "More information" box)
| Field | What to put |
|---|---|
| **Platforms** | HTML5 (plays in the browser on phones and computers) |
| **Inputs** | Touchscreen, Keyboard, Mouse |
| **Average session** | A few minutes |
| **Languages** | English |
| **Accessibility** | Adjustable difficulty |
| **Made with** | Three.js, Vite |
| **Links** | Play the latest build: https://mountaindrowner.github.io/Rhythm-Game/ |

## 5. Cover image and screenshots

- **Cover image:** `docs/itch/cover_630x500.png` (itch's recommended size; a sharper 1260 × 1000 version is in the download kit).
- **Screenshots:** 4–6 of these (phone portrait, 800 × 1600): title screen, gameplay, Riot Mode, Center Stage slam, Center Stage mini-game, set list, loading poster.
- **Gameplay video / trailer:** itch only takes a YouTube or Vimeo link. Add one later if you record a phone capture.

## 6. Description (paste this into the big text box)

Use the editor's toolbar to turn the lines in CAPITALS into headings.

```
X-ROADS is playing tonight, and you're the band.

Rhythm Riot is a rock-show rhythm game made for your phone. Tap the four pads (bass, vocals, guitar, drums) in time with real X-ROADS songs while the band plays live above the note highway and the crowd goes wild.

HOW TO PLAY
• Tap a pad as its note hits the line. Hold for long notes.
• Hit gold Riot phrases to charge the Riot meter, then SWIPE UP to unleash RIOT MODE: the band transforms, lightning strikes, and your points multiply up to ×8.
• Land enough Perfects on one pad and that musician TAKES CENTER STAGE: they slam onto the board for a quick mini-game.
• Run out of energy and the show is over (cue the sad trombone).

WHAT'S IN IT
• 3 songs, each at its own venue: The Arena, City Rooftop and Sunrise Hill
  – You Won't Let Me Fall
  – You're Not My Plan B
  – Trust God Anyway
• 3 difficulties: Casual, Standard and Expert
• 8 random Riot Mode effects: Inferno, Giants, Zero Gravity, Disco Fever, Echo, Glitch, Glory and High Voltage
• 4 Center Stage mini-games: Drum Frenzy, Mad Science, Crowd Hearts and Shred
• Guitar and bass solos, Big Rock Endings, stars and high scores for every song
• A timing check to match the game to your phone or headphones

CONTROLS
Phone: tap the pads, swipe up for Riot Mode.
Keyboard: D F J K (or 1 2 3 4, or the arrow keys), Space for Riot Mode, Esc to pause.

TIPS
• Headphones recommended.
• On iPhone, turn off silent mode so you can hear the music.
• Run the TIMING CHECK once if the notes feel early or late.

⚠ PHOTOSENSITIVITY WARNING
This game has lightning flashes and strobe lights. Turn on "Reduce flashing" in Settings to calm them down.

This is an early build and it's still growing: more songs, more ridiculous moments. Tell us what you think in the comments!

CREDITS
Music: X-ROADS
Band and crowd art: made with PixelLab
Font: Pixelify Sans (SIL Open Font License)
Built with Three.js
```

## 7. Edit theme (the "Edit theme" button at the top of your game page)

These match the game's own colours.

| Setting | Value |
|---|---|
| **Layout** | Centered column (the default) |
| **Banner** | Upload `docs/itch/banner_960x300.png`, alignment **center** |
| **Hide game title** | ✅ (the banner already shows the logo) |
| **Background** | `#0b0b18` (the game's night sky) |
| **Background image** | none |
| **Inner column (BG2)** | `#18112a` |
| **Text** | `#fff2d1` (cream) |
| **Links** | `#ffc86b` (gold) |
| **Buttons** | `#ff9b52` (amp orange) |
| **Header font** | a pixel font from the list if one is offered (for example *Silkscreen* or *Press Start 2P*); otherwise *Lato*, bold |
| **Body font** | Lato (or anything plain and easy to read) |
| **Screenshots** | Sidebar |

**Custom CSS:** itch only allows it on request, and it isn't needed for this page.

## 8. Updating the game later

1. `npm run build` → upload the new `dist/rhythm-riot-itch.zip`.
2. **Delete the old upload** (or untick "played in the browser" on it) so only one build is played.
3. Optional: post a short **devlog** ("Added a new song!") from the page; followers get notified.
