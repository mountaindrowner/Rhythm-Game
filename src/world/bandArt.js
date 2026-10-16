// =============================================================================
// bandArt.js — the sprite art sets the band can wear. Each set is a folder made
// by scripts/pixellab/fetch_and_pack.py (band.json + one PNG per musician +
// drumkit.png). Importing them here embeds them in the built game.
//
// To add a new look: pack it into assets/art/<folder>/, add an entry below,
// then add it to `bands` in main.js and a button in index.html (Settings).
// =============================================================================
import hdManifest from '../../assets/art/pixellab/band.json';
import hdBassist from '../../assets/art/pixellab/bassist.png';
import hdSinger from '../../assets/art/pixellab/singer.png';
import hdGuitarist from '../../assets/art/pixellab/guitarist.png';
import hdDrummer from '../../assets/art/pixellab/drummer.png';
import hdKit from '../../assets/art/pixellab/drumkit.png';

import retroManifest from '../../assets/art/pixellab-retro/band.json';
import retroBassist from '../../assets/art/pixellab-retro/bassist.png';
import retroSinger from '../../assets/art/pixellab-retro/singer.png';
import retroGuitarist from '../../assets/art/pixellab-retro/guitarist.png';
import retroDrummer from '../../assets/art/pixellab-retro/drummer.png';
import retroKit from '../../assets/art/pixellab-retro/drumkit.png';

/** 128 px, fully animated (play / accent / mistake). */
export const HD_ART = {
  manifest: hdManifest,
  urls: { bassist: hdBassist, singer: hdSinger, guitarist: hdGuitarist, drummer: hdDrummer, drumkit: hdKit },
};

/** 64 px chunky 16-bit look. Not animated yet: code-driven motion for now. */
export const RETRO_ART = {
  manifest: retroManifest,
  urls: { bassist: retroBassist, singer: retroSinger, guitarist: retroGuitarist, drummer: retroDrummer, drumkit: retroKit },
};
