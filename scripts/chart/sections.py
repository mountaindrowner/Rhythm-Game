"""sections.py — splits a song into named parts: OPENING, VERSE 1, BUILD,
CHORUS 1, ... BRIDGE, FINAL CHORUS, OUTRO. The game uses these names for its
lights, effects, band moves and how many notes to place (choruses are the big
moments, verses are calmer).

How (an ENERGY map, not a lyric sheet):
  1. Measure every bar (4 beats): how loud it is and how bright (lots of
     cymbals and distorted guitar = bright).
  2. Group bars into 4-bar blocks starting on the song's phrase line (songs
     change section on 4-bar lines; bar 0 may be a pickup, so we find the
     offset).
  3. Call each block CALM, MEDIUM or BIG compared with the rest of the song,
     then tidy up so each part lasts at least 8 bars.
  4. Name the parts by energy and position: big parts are choruses (the last
     one is the FINAL CHORUS), a medium part right before a chorus is a BUILD,
     a calm part after two choruses is the BRIDGE, the start and end are the
     OPENING and OUTRO, everything else is a VERSE.

The energy (calm vs big) is reliable, and that is what drives the game's
feel. The exact names and boundaries are a best guess: a computer can't hear
the lyrics. To set them by hand, give make_chart.py a sections file (see
--sections there).
"""
import numpy as np

import listen as L


def bar_energy(bar_frames, S):
    """One number per bar: loudness plus brightness.

    Half of it is compared with the whole song, half with the bars around it
    (about 24 bars). Many songs keep building, so with only the whole-song
    yardstick the first verse looks "quiet" and every late part looks "big";
    the local half still catches a chorus lifting above the verse next to it."""
    loud = L.band_energy(S, 30, 8000)
    bright = L.band_energy(S, 2500, 9000) - loud

    def per_bar(x):
        return np.array([x[a:max(a + 1, b)].mean() for a, b in zip(bar_frames[:-1], bar_frames[1:])])

    def z(x):
        return (x - x.mean()) / (x.std() + 1e-9)

    e = z(per_bar(loud)) + 0.5 * z(per_bar(bright))
    local = np.array([e[i] - e[max(0, i - 12):i + 12].mean() for i in range(len(e))])
    return 0.5 * e + z(local)


def phrase_offset(energy):
    """Which of the 4 possible bar offsets the energy changes favour. Songs
    change section on 4-bar lines, but bar 0 may be a pickup or half intro."""
    change = np.abs(np.diff(energy, prepend=energy[0]))
    return int(np.argmax([change[o::4].mean() for o in range(4)]))


def levels(block_energy):
    """CALM (0), MEDIUM (1) or BIG (2) per block, relative to this song."""
    big = np.percentile(block_energy, 60)
    calm = np.percentile(block_energy, 30)
    return [2 if e >= big else 0 if e < calm else 1 for e in block_energy]


def runs_of(lv):
    """[start, end, level] for each stretch of blocks with the same level."""
    runs = []
    for i, v in enumerate(lv):
        if runs and runs[-1][2] == v:
            runs[-1][1] = i + 1
        else:
            runs.append([i, i + 1, v])
    return runs


def tidy(lv, min_blocks=2):
    """Merge parts shorter than min_blocks (8 bars) into a neighbour, so the
    lights and band don't flip back and forth every few seconds. The first
    and last parts may stay short (intros and endings often are)."""
    lv = list(lv)
    while True:
        runs = runs_of(lv)
        short = [r for r in range(1, len(runs) - 1) if runs[r][1] - runs[r][0] < min_blocks]
        if not short:
            return lv
        r = short[0]
        a, b, v = runs[r]
        prev_v, next_v = runs[r - 1][2], runs[r + 1][2]
        # Join whichever neighbour is closer in energy (ties: the louder one).
        dp, dn = abs(prev_v - v), abs(next_v - v)
        target = prev_v if dp < dn or (dp == dn and prev_v > next_v) else next_v
        lv[a:b] = [target] * (b - a)


def name_parts(lv):
    """Turn energy runs into section names (see the module notes)."""
    runs = runs_of(lv)
    kinds = []
    choruses = 0
    # An opening is short: if the first calm part is long, only its first
    # 8 bars are the opening and the rest is the first verse.
    if runs and runs[0][2] != 2 and runs[0][1] - runs[0][0] > 2:
        a, b, v = runs[0]
        runs[0:1] = [[a, a + 2, v], [a + 2, b, v]]
        runs[1].append("VERSE")
    for r, run in enumerate(runs):
        a, b, v = run[:3]
        nxt = runs[r + 1][2] if r + 1 < len(runs) else None
        if len(run) > 3:
            kinds.append(run[3])
        elif v == 2:
            kinds.append("CHORUS")
            choruses += 1
        elif r == 0:
            kinds.append("OPENING")
        elif r == len(runs) - 1:
            kinds.append("OUTRO")
        elif nxt == 2 and v == 1 and b - a <= 2:
            kinds.append("BUILD")
        elif choruses >= 2 and nxt == 2:
            kinds.append("BRIDGE")
        else:
            kinds.append("VERSE")
    # Two short verse parts in a row (a calm half, then a busier half) are one
    # verse; long ones stay separate (VERSE 1, VERSE 2).
    keep = [r for r in range(len(runs)) if not (
        r > 0 and kinds[r] == kinds[r - 1] == "VERSE" and runs[r][1] - runs[r - 1][0] <= 4)]
    runs, kinds = [runs[r] for r in keep], [kinds[r] for r in keep]
    # Number them; the last chorus is the FINAL CHORUS.
    count = {}
    last = max((r for r, k in enumerate(kinds) if k == "CHORUS"), default=-1)
    named = []
    for r, (run, k) in enumerate(zip(runs, kinds)):
        a = run[0]
        if k in ("VERSE", "CHORUS", "BUILD"):
            count[k] = count.get(k, 0) + 1
            name = f"{k} {count[k]}" if k != "BUILD" or count[k] > 1 else "BUILD"
            if k == "CHORUS" and r == last and count[k] > 1:
                name = "FINAL CHORUS"
        else:
            name = k
        named.append((a, name))
    return named


def find_sections(bar_times, S, song_end):
    """Returns ([{"time", "name"}...], details) for the game. bar_times = when
    each bar starts (song time)."""
    n = len(bar_times)
    bar_frames = np.array([L.time_frame(t - L.ONSET_BIAS) for t in list(bar_times) + [song_end]])
    energy = bar_energy(bar_frames, S)
    off = phrase_offset(energy)
    starts = ([0] if off else []) + list(range(off, n, 4))
    if len(starts) > 1 and n - starts[-1] < 2:
        starts.pop()  # fold a tiny last scrap into the block before
    ends = starts[1:] + [n]
    block_energy = np.array([energy[a:b].mean() for a, b in zip(starts, ends)])
    lv = tidy(levels(block_energy))
    named = name_parts(lv)
    out = [{"time": 0 if i == 0 else round(float(bar_times[starts[i]]), 3), "name": name} for i, name in named]
    return out, {"starts": starts, "levels": lv, "block_energy": block_energy, "offset": off, "bar_energy": energy}
