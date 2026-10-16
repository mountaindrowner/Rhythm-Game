// =============================================================================
// animBlocks.js — the band's CHOREOGRAPHER. For one musician it decides which
// drawn animation to show and which frame of it, every frame of the game.
//
// The animations come in BLOCKS (listed in assets/art/<set>/animations.json):
//   idle       standing around (menus, results screen)
//   groove     playing loops; each is "calm" (verses), "hype" (choruses) or "any"
//   sing       singing into a mic (the guitarist's backing / lead vocals)
//   accent     a big move for combo milestones and finished long notes
//   mistake    a flinch when you miss this musician's note
//   celebrate  a cheer (every 100-hit combo, end of the song)
//   bow        a bow to the crowd (end of the song)
//
// THE SMOOTHNESS TRICK: every animation starts AND ends on the same standing
// pose (the "hub"). So as long as we only switch at the END of a loop, the
// change is invisible. The rules:
//   * Loops are locked to the song's beats (a 2-beat loop restarts on every
//     second beat), so the band always moves in time.
//   * Grooves only change on BAR LINES (every 4 beats), like a real band.
//   * Accents and cheers wait for the current loop to finish (under a second).
//   * A mistake starts IMMEDIATELY (feedback must be instant) and is stretched
//     to end exactly where the next loop begins, so it flows back in.
//
// Choices are "random" but repeatable: the same bar of the same song always
// gets the same move, which makes bugs easy to reproduce.
// =============================================================================

/** A tiny integer hash: turns (bar, musician) into a well-mixed number. */
function hash(n) {
  n = (n ^ 61) ^ (n >>> 16);
  n = (n + (n << 3)) | 0;
  n ^= n >>> 4;
  n = Math.imul(n, 0x27d4eb2d);
  n ^= n >>> 15;
  return n >>> 0;
}

/** Sections where someone is singing (everything but the intro and outro). */
const VOCAL_SECTION = /VERSE|BUILD|CHORUS|REFRAIN|BRIDGE/;

/** Does this art set have animation blocks (or just the old play/accent/mistake)? */
export function hasBlocks(info) {
  return Object.values(info.anims).some((a) => a.block);
}

/**
 * @param {object} info   one member's entry from band.json
 * @param {string} name   'bassist' | 'singer' | 'guitarist' | 'drummer'
 * @param {number} seed   different per musician so they don't all change together
 */
export function createDirector(info, name, seed) {
  const anims = info.anims;
  // Group the animation names by block: { groove: ['calm', 'hype', ...], ... }
  const blocks = {};
  for (const [animName, a] of Object.entries(anims)) {
    if (a.block) (blocks[a.block] ||= []).push(animName);
  }
  const has = (block) => (blocks[block] || []).length > 0;
  const beatsOf = (animName) => anims[animName].beats || 2;

  let cur = null;          // { name, loop, start, end }
  let lastBeat = 0;
  let queue = [];          // one-shots waiting for the current loop to finish
  let mistakeWanted = false;
  let lastAccentBeat = -99;
  let pendingAccent = false;
  let vocalist = 'singer';

  // ---- Choosing a loop ------------------------------------------------------
  function guitaristSings(ctx, phrase) {
    if (name !== 'guitarist' || !has('sing') || !VOCAL_SECTION.test(ctx.section)) return false;
    const chorus = ctx.energy === 'hype';
    if (vocalist === 'guitarist') return true;                      // he's the lead
    if (vocalist === 'duet') return chorus || phrase % 2 === 0;     // trade lines, share choruses
    return chorus && hash(phrase * 31 + seed) % 2 === 0;           // backing vocals in choruses
  }

  function pickLoop(beat, ctx) {
    if (!ctx.live || !has('groove')) return has('idle') ? blocks.idle[0] : 'hub';
    const phrase = Math.floor(beat / 8); // a phrase = 2 bars, so moves last a while
    if (guitaristSings(ctx, phrase)) return blocks.sing[0];
    const fits = (n) => anims[n].energy === ctx.energy || anims[n].energy === 'any';
    const grooves = blocks.groove.filter(fits);
    if (!grooves.length) return blocks.groove[0];
    // The groove named after the energy ("calm"/"hype") is the main one; the
    // others are variations that show up about one phrase in three.
    const main = grooves.includes(ctx.energy) ? ctx.energy : grooves[0];
    const extras = grooves.filter((n) => n !== main);
    const h = hash(phrase * 7 + seed * 101);
    if (extras.length && h % 3 === 0) return extras[(h >>> 2) % extras.length];
    return main;
  }

  const startLoop = (animName, beat) => ({ name: animName, loop: true, start: beat, end: Infinity });
  const startOneShot = (animName, beat, end = beat + beatsOf(animName)) =>
    ({ name: animName, loop: false, start: beat, end });

  function startMistake(beat) {
    const options = blocks.mistake;
    const pick = options[hash(Math.floor(beat) + seed) % options.length];
    // End on the next 2-beat line at least 1.25 beats away, where loops restart.
    const end = Math.ceil((beat + 1.25) / 2) * 2;
    return startOneShot(pick, beat, end);
  }

  /** What to do once a one-shot has finished. */
  function next(beat, ctx) {
    if (queue.length) return startOneShot(queue.shift(), beat);
    return startLoop(pickLoop(beat, ctx), beat);
  }

  // ---- Public API -----------------------------------------------------------
  return {
    setVocalist(v) { vocalist = v; },
    /** You missed this musician's note. */
    mistake() { if (has('mistake')) mistakeWanted = true; },
    /** A big move: milestones and finished long notes. `force` skips the cooldown. */
    accent(force = false) {
      if (!has('accent')) return;
      if (force) pendingAccent = true;
      else if (!pendingAccent) pendingAccent = 'soft';
    },
    celebrate() { if (has('celebrate') && !queue.includes('celebrate')) queue = ['celebrate']; },
    /** End of the song: cheer, then bow. */
    finale() { queue = ['celebrate', 'bow'].filter(has); },
    reset() { cur = null; queue = []; mistakeWanted = false; pendingAccent = false; lastAccentBeat = -99; },

    /**
     * @param {number} beat  beat position (song beats in a song, a menu clock otherwise)
     * @param {{live: boolean, energy: 'calm'|'hype', section: string, defeated: boolean}} ctx
     * @returns {{anim: string, frame: number}}
     */
    update(beat, ctx) {
      // The clock jumped (song started or ended): start fresh from here.
      if (!cur || beat < lastBeat - 0.01 || beat - lastBeat > 8) {
        mistakeWanted = false;
        pendingAccent = false;
        cur = next(beat, ctx);
      }
      lastBeat = beat;

      if (ctx.defeated) {
        // Game over: freeze slumped partway through a mistake.
        const slump = has('mistake') ? blocks.mistake[blocks.mistake.length - 1] : 'hub';
        return { anim: slump, frame: Math.floor(anims[slump].frames * 0.4) };
      }

      // Turn requests into queued moves.
      if (pendingAccent) {
        // Finished long notes ('soft') have a cooldown so it doesn't happen constantly.
        const ok = pendingAccent === true || beat - lastAccentBeat > 16;
        if (ok && !queue.length) { queue.push('accent'); lastAccentBeat = beat; }
        pendingAccent = false;
      }
      if (mistakeWanted) {
        mistakeWanted = false;
        const alreadyFlinching = !cur.loop && anims[cur.name].block === 'mistake';
        if (!alreadyFlinching) cur = startMistake(beat);
      }

      if (cur.loop) {
        // Did we just reach the end of a loop? (Loops restart every L beats.)
        const L = beatsOf(cur.name);
        const boundary = Math.floor(beat / L) * L;
        if (boundary > cur.start + 1e-6) {
          if (queue.length) {
            cur = startOneShot(queue.shift(), boundary);
          } else if (boundary % 4 === 0) {
            // A bar line: maybe switch to a different groove.
            const want = pickLoop(boundary, ctx);
            cur = startLoop(want, boundary);
          }
        }
      } else if (beat >= cur.end) {
        cur = next(cur.end, ctx);
      }

      // Which frame?
      const a = anims[cur.name];
      let p;
      if (cur.loop) {
        const L = beatsOf(cur.name);
        p = (((beat / L) % 1) + 1) % 1; // locked to the beat grid
      } else {
        p = Math.min(0.999, Math.max(0, (beat - cur.start) / (cur.end - cur.start)));
      }
      return { anim: cur.name, frame: Math.floor(p * a.frames) };
    },
  };
}
