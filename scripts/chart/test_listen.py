"""Checks for the chart maker's "ears", using made-up sounds at known times.

Run with:  python3 scripts/chart/test_listen.py
(Needs numpy only. Not part of `npm test`, which runs without Python.)

If one of these fails after a change to listen.py, the game's notes would
land early or late, or at the wrong speed.
"""
import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import listen as L  # noqa: E402
import sections as SEC  # noqa: E402


def hits(times, kind, seconds=30, seed=1):
    """A track with one sound of the given kind at each time, over a quiet tone."""
    rng = np.random.default_rng(seed)
    y = np.zeros(int(seconds * L.SR), np.float32)
    t = np.arange(int(0.25 * L.SR)) / L.SR
    for at in times:
        if kind == "snare":
            sound = rng.standard_normal(len(t)) * np.exp(-t * 30)
        elif kind == "kick":
            sound = np.sin(2 * np.pi * 60 * t) * np.exp(-t * 12)
        else:  # a plucked string
            sound = np.sin(2 * np.pi * 330 * t) * np.exp(-t * 6) * np.minimum(1, t / 0.005)
        s = int(at * L.SR)
        y[s:s + len(t)] += sound.astype(np.float32)
    y += 0.05 * np.sin(2 * np.pi * 220 * np.arange(len(y)) / L.SR).astype(np.float32)
    return y


def peaks(curve, floor=0.3):
    return np.array([i for i in range(1, len(curve) - 1)
                     if curve[i] > floor and curve[i] >= curve[i - 1] and curve[i] > curve[i + 1]])


class OnsetTiming(unittest.TestCase):
    def test_onsets_land_on_the_hits(self):
        """After the ONSET_BIAS correction, detected hits are within 5 ms of the real ones."""
        times = np.arange(1.0, 29, 0.4)
        for kind in ("snare", "kick", "pluck"):
            env = L.onset_curve(L.spectrogram(hits(times, kind)))
            found = L.onset_time(peaks(env))
            err = np.array([found[np.abs(found - x).argmin()] - x for x in times])
            self.assertLess(abs(err.mean()), 0.005, f"{kind}: off by {err.mean() * 1000:.1f} ms on average")
            self.assertLess(err.std(), 0.006, f"{kind}: timing wobbles by {err.std() * 1000:.1f} ms")


class TempoAndBeats(unittest.TestCase):
    def setUp(self):
        self.times = np.arange(1.0, 29, 60 / 150)  # 150 BPM
        y = hits(self.times, "snare") + hits(self.times, "kick", seed=2)
        self.env = L.onset_curve(L.spectrogram(y))

    def test_tempo(self):
        self.assertAlmostEqual(L.find_tempo(self.env), 150, delta=1.5)

    def test_tempo_range_picks_half_speed(self):
        """With a slow range, the same track reads as 75 BPM (every other hit)."""
        self.assertAlmostEqual(L.find_tempo(self.env, 50, 100, 75), 75, delta=1)

    def test_beats_land_on_hits(self):
        beats = L.smooth_beats(L.onset_time(L.snap_to_onsets(L.track_beats(self.env, 150), self.env)))
        inside = beats[(beats > 2) & (beats < 27)]
        err = np.array([np.abs(self.times - b).min() for b in inside])
        self.assertGreater(len(inside), 55)
        self.assertLess(err.max(), 0.02, f"a beat is {err.max() * 1000:.0f} ms from its hit")

    def test_smoothing_keeps_a_steady_grid_steady(self):
        wobbly = self.times + np.random.default_rng(3).normal(0, 0.01, len(self.times))
        gaps = np.diff(L.smooth_beats(wobbly))
        self.assertLess(gaps.std(), 0.004)


class SectionNaming(unittest.TestCase):
    def test_short_parts_merge_into_neighbours(self):
        # calm calm BIG calm calm calm BIG BIG  ->  the lone big block is folded away
        self.assertEqual(SEC.tidy([0, 0, 2, 0, 0, 0, 2, 2]), [0, 0, 0, 0, 0, 0, 2, 2])

    def test_names(self):
        names = [n for _, n in SEC.name_parts([0, 0, 0, 0, 1, 2, 2, 0, 0, 1, 2, 2, 0, 0, 2, 2, 0])]
        self.assertEqual(names[0], "OPENING")
        self.assertIn("CHORUS 1", names)
        self.assertIn("FINAL CHORUS", names)
        self.assertEqual(names[-1], "OUTRO")


if __name__ == "__main__":
    unittest.main(verbosity=2)
