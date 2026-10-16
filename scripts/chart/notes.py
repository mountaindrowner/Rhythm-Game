"""notes.py — decides where the notes go, for every lane and difficulty.

The lanes follow the band: 0 Bass, 1 Vocals, 2 Guitar, 3 Drums. Each lane
"listens" to its own part of the sound (see listen.py):
  Drums  = the SPIKY sound: kick (low), snare (middle-high), hi-hat (high)
  Bass   = the SMOOTH sound below 250 Hz
  Guitar = the SMOOTH sound from 250 Hz to 2 kHz
  Vocals = the SMOOTH sound from 1 to 3.5 kHz, where voices are clearest
(There's no perfect way to pull one instrument out of a finished mix, so
lanes are "inspired by" their instrument, like the original chart.)

Notes may only land on a rhythm grid made from the beats: each beat is cut
into 4 (sixteenth notes). Every grid slot gets a score per lane: how strongly
that lane's sound starts there, with a bonus for strong positions (beat 1 of
a bar > other beats > half-beats > quarter-beats).

DIFFICULTIES are built in layers. Casual picks the best notes, on beats only,
one at a time. Standard ADDS more (still on the beat, but two lanes at once).
Expert adds more again (half-beats too). So every Casual note is also in Standard and Expert,
which is how the game's "tier" field works (0 = Casual and up, 1 = Standard
and up, 2 = Expert only).

How many notes: about as many per second as "You Won't Let Me Fall" (the
first song), more in choruses and fewer in calm parts.
"""
from bisect import bisect_left, insort

import numpy as np

import listen as L

LANES = {"bass": 0, "vocals": 1, "guitar": 2, "drums": 3}

# Notes per second of music for each difficulty, counting all its layers.
# (The first song has 2.2 / 4.7 / 7.3.)
DENSITY = [2.1, 4.4, 6.9]
# Share of the notes each lane gets (drums carry the beat).
SHARE = {"drums": 0.38, "guitar": 0.27, "bass": 0.19, "vocals": 0.16}
# How busy each kind of section is, compared with the song's average.
SECTION_WEIGHT = {"OPENING": 0.55, "VERSE": 0.85, "BUILD": 1.0, "CHORUS": 1.15, "REFRAIN": 0.9,
                  "BRIDGE": 0.8, "FINAL CHORUS": 1.25, "OUTRO": 0.65}
# Rules per difficulty: finest grid allowed (0 downbeat .. 4 sixteenth),
# minimum gap between notes in the same lane (in beats), most lanes at once,
# and minimum gap between ANY two notes (beats) unless they're a chord.
# These match how the first song's chart plays: Casual and Standard stay on
# the beat (Standard adds two-lane chords instead of faster rhythms), and
# Expert adds half-beats, never anything faster.
RULES = [
    {"finest": 2, "lane_gap": 2.0, "chord": 1, "any_gap": 1.0},   # Casual
    {"finest": 2, "lane_gap": 1.0, "chord": 2, "any_gap": 1.0},   # Standard
    {"finest": 3, "lane_gap": 0.5, "chord": 2, "any_gap": 0.5},   # Expert
]
POSITION_BONUS = [1.5, 1.35, 1.25, 1.0, 0.8]  # downbeat, beat 3, other beats, half-beat, quarter-beat
MIN_STRENGTH = 0.12  # don't put notes on (near) silence


def section_weight(name):
    if name.startswith("FINAL"):
        return SECTION_WEIGHT["FINAL CHORUS"]
    return next((w for k, w in SECTION_WEIGHT.items() if name.startswith(k)), 0.85)


def build_grid(beats, first_downbeat):
    """Every sixteenth-note slot: (time, position level, beat index)."""
    slots = []
    for i in range(len(beats) - 1):
        in_bar = (i - first_downbeat) % 4
        for j in range(4):
            t = beats[i] + j * (beats[i + 1] - beats[i]) / 4
            if j == 0:
                level = 0 if in_bar == 0 else 1 if in_bar == 2 else 2
            else:
                level = 3 if j == 2 else 4
            slots.append((t, level, i + j / 4))
    return slots


def strength_at(curve, t, reach=0.04):
    """Strongest onset of `curve` within `reach` seconds of song time t."""
    f = L.time_frame(t - L.ONSET_BIAS)
    r = int(reach * L.FPS)
    win = curve[max(0, f - r):f + r + 1]
    return float(win.max()) if len(win) else 0.0


def lane_curves(H, P):
    """The onset curve each lane listens to (and the drum sub-parts)."""
    return {
        "kick": L.onset_curve(P, 30, 150),
        "snare": L.onset_curve(P, 1500, 6000),
        "hat": L.onset_curve(P, 6000, 10000),
        "bass": L.onset_curve(H, 30, 250),
        "guitar": L.onset_curve(H, 250, 2000),
        "vocals": L.onset_curve(H, 1000, 3500),
    }


def role_for(lane, level, drum_part=None, phrase_start=False):
    """A name for what this note "is", used by the 3D band's animation."""
    if lane == "drums":
        return {"kick": "kick", "snare": "backbeat", "hat": "hi-hat"}[drum_part]
    if lane == "bass":
        return "bass-root" if level <= 2 else "bass-pickup"
    if lane == "guitar":
        return "guitar-strum" if level <= 2 else "guitar-offbeat" if level == 3 else "guitar-upstroke"
    return "vocal-phrase" if phrase_start or level <= 2 else "vocal-syncopation"


def find_holds(slots, curves, vocal_level, beat_len, sections_at):
    """Long vocal notes: a vocal onset whose sound then keeps going (and
    doesn't restart) for at least 1.25 beats. Like the first song's chart they
    are short, 1 to 2 beats. Returns {slot index: hold beats}."""
    holds = {}
    loud_enough = np.percentile(vocal_level, 55)
    last_end = -1
    for k, (t, level, _) in enumerate(slots):
        if level > 3 or t < last_end or sections_at(t).startswith(("OPENING", "OUTRO")):
            continue
        if strength_at(curves["vocals"], t) < 0.2:
            continue
        f0 = L.time_frame(t - L.ONSET_BIAS)
        start_level = vocal_level[f0:f0 + 4].mean()
        if start_level < loud_enough:
            continue
        # Follow the sound until it drops 8 dB or a new vocal note starts.
        f = f0 + int(0.15 * L.FPS)
        while f < len(vocal_level) - 1 and vocal_level[f] > start_level - 8 and curves["vocals"][f] < 0.45:
            f += 1
        length = (f - f0) / L.FPS / beat_len
        if length >= 1.25:
            # Finish a little before the sound does: easier to release in time.
            beats = min(2.0, max(1.0, np.floor(length * 2) / 2 - 0.5))
            holds[k] = beats
            last_end = t + (beats + 1) * beat_len
    return holds


def place_notes(beats, first_downbeat, sections, H, P, song_end):
    """The whole chart: a list of notes {time, lane, tier, hold, confidence, role}."""
    beats = np.asarray(beats)
    beat_len = float(np.median(np.diff(beats)))
    slots = build_grid(beats, first_downbeat)
    curves = lane_curves(H, P)
    vocal_level = L.band_energy(H, 300, 3500)

    def section_at(t):
        name = sections[0]["name"]
        for s in sections:
            if t >= s["time"]:
                name = s["name"]
        return name

    # Score every (slot, lane) pair.
    cands = []
    for k, (t, level, _) in enumerate(slots):
        for lane in LANES:
            if lane == "drums":
                parts = {p: strength_at(curves[p], t) * w for p, w in (("kick", 1.0), ("snare", 1.0), ("hat", 0.7))}
                part = max(parts, key=parts.get)
                s = parts[part]
            else:
                part, s = None, strength_at(curves[lane], t)
            if s >= MIN_STRENGTH:
                cands.append({"k": k, "t": t, "level": level, "lane": lane, "s": s, "part": part,
                              "score": s * POSITION_BONUS[level]})

    holds = find_holds(slots, curves, vocal_level, beat_len, section_at)

    # Section spans and their note targets.
    bounds = [s["time"] for s in sections] + [song_end]
    spans = [(bounds[i], bounds[i + 1], sections[i]["name"]) for i in range(len(sections))]
    total_w = sum((b - a) * section_weight(n) for a, b, n in spans)
    song_len = song_end - bounds[0]

    chosen = []                              # accepted notes
    times = []                               # their times, kept sorted
    by_lane = {lane: [] for lane in LANES}   # sorted times per lane
    busy = {lane: [] for lane in LANES}      # (start, end) of long notes per lane
    eps = 1e-6

    def near(sorted_times, t, gap):
        """Is any time in the sorted list within `gap` seconds of t?"""
        i = bisect_left(sorted_times, t - gap + eps)
        return i < len(sorted_times) and sorted_times[i] < t + gap - eps

    def fits(c, rules, hold=0.0):
        t, lane = c["t"], c["lane"]
        if c["level"] > rules["finest"]:
            return False
        if any(a - 0.01 <= t < b for a, b in busy[lane]):
            return False  # this lane is holding a long note
        if near(by_lane[lane], t, rules["lane_gap"] * beat_len):
            return False
        if hold and near(by_lane[lane], t + (hold + 0.5) * beat_len / 2, (hold + 0.5) * beat_len / 2 + 0.01):
            return False  # a long note needs its lane free until it ends
        i, j = bisect_left(times, t - 0.01), bisect_left(times, t + 0.01)
        if j - i >= rules["chord"]:
            return False
        if rules["any_gap"]:
            gap = rules["any_gap"] * beat_len
            k = bisect_left(times, t - gap + eps)
            while k < len(times) and times[k] < t + gap - eps:
                if abs(times[k] - t) >= 0.01:
                    return False  # too close to another note (but not a chord)
                k += 1
        return True

    def accept(c, tier, hold=0.0):
        note = {"time": round(c["t"], 3), "lane": LANES[c["lane"]], "tier": tier,
                "hold": round(hold * beat_len, 3), "confidence": round(min(1.0, c["s"]), 2),
                "role": "vocal-phrase-end" if hold else role_for(c["lane"], c["level"], c["part"])}
        chosen.append(note)
        insort(times, c["t"])
        insort(by_lane[c["lane"]], c["t"])
        if hold:
            busy[c["lane"]].append((c["t"], c["t"] + (hold + 0.5) * beat_len))

    for tier, rules in enumerate(RULES):
        layer_total = DENSITY[tier] * song_len
        for a, b, name in spans:
            target = layer_total * (b - a) * section_weight(name) / total_w
            have = sum(1 for n in chosen if a <= n["time"] < b)
            need = int(round(target)) - have
            if need <= 0:
                continue
            pool = sorted((c for c in cands if a <= c["t"] < b), key=lambda c: -c["score"])
            # Long vocal notes first (Standard and up; they need a free lane).
            if tier == 1:
                for c in pool:
                    if c["lane"] == "vocals" and c["k"] in holds and need > 0 and fits(c, rules, holds[c["k"]]):
                        accept(c, tier, holds[c["k"]])
                        need -= 1
            quota = {lane: int(round(need * SHARE[lane])) + 1 for lane in LANES}
            # Pass 1 keeps each lane to its share; pass 2 fills any gap from any lane.
            for capped in (True, False):
                for c in pool:
                    if need <= 0:
                        break
                    if capped and quota[c["lane"]] <= 0:
                        continue
                    if fits(c, rules):
                        accept(c, tier)
                        quota[c["lane"]] -= 1
                        need -= 1
    chosen.sort(key=lambda n: (n["time"], n["lane"]))
    return chosen
