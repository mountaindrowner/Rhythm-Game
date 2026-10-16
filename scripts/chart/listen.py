"""listen.py — the "ears" of the chart maker: turns an MP3 into numbers.

Steps (each one is a function below):
  1. load_audio      decode the MP3 to a list of samples (mono, 22,050 per second)
  2. spectrogram     slice the sound into short frames and measure how loud
                     every pitch is in each frame (a "spectrogram")
  3. split_hpss      separate SMOOTH sounds (voice, guitar chords, bass notes)
                     from SPIKY sounds (drum hits). Trick: smooth sounds make
                     horizontal lines in a spectrogram, drum hits make vertical
                     lines, so a sideways blur keeps one and an up-down blur
                     keeps the other. (Called harmonic/percussive separation.)
  4. onset_curve     how much NEW sound starts in each frame, in a pitch range.
                     Peaks = notes or hits starting ("onsets").
  5. find_tempo      the beat speed (BPM), from how the onset curve repeats
  6. track_beats     the exact time of every beat, allowing small drifts
  7. find_downbeats  which beat is "1" of each bar of 4

Only needs numpy and the ffmpeg program. Times are in seconds from the start
of the MP3 ("song time").
"""
import subprocess

import numpy as np

SR = 22050     # samples per second we analyse at
NFFT = 2048    # samples per spectrogram frame (~93 ms)
HOP = 256      # samples between frames (~11.6 ms), so ~86 frames per second
FPS = SR / HOP

# The onset detector reacts a little BEFORE a hit really lands: a frame's
# loudness rises as soon as the front edge of its 93 ms window touches the
# hit. Measured with fake drum hits at known times (tests in
# scripts/chart/test_listen.py): peaks come 30-35 ms early. So onset and beat
# times get this correction added.
ONSET_BIAS = 0.033


def frame_time(frame):
    """Song time (seconds) of a spectrogram frame."""
    return frame * HOP / SR


def onset_time(frame):
    """Song time (seconds) of an onset or beat found at `frame`."""
    return frame * HOP / SR + ONSET_BIAS


def time_frame(t):
    return int(round(t * SR / HOP))


def load_audio(path):
    """Decode any audio file to mono float samples at SR, using ffmpeg."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def spectrogram(y):
    """Magnitude spectrogram, shape (frequency bins, frames).

    Frames are centred on their time (we pad half a frame at the start), so
    frame k is at exactly k * HOP / SR seconds."""
    y = np.pad(y, NFFT // 2)
    frames = np.lib.stride_tricks.sliding_window_view(y, NFFT)[::HOP]
    window = np.hanning(NFFT).astype(np.float32)
    return np.abs(np.fft.rfft(frames * window, axis=1)).T.astype(np.float32)


def bin_of(hz):
    """Spectrogram row for a frequency in Hz."""
    return int(round(hz * NFFT / SR))


def _median_filter(x, size, axis):
    """Median of each value and its neighbours along one axis (done in chunks
    so it doesn't need gigabytes of memory)."""
    x = np.moveaxis(x, axis, -1)
    pad = size // 2
    out = np.empty_like(x)
    for start in range(0, x.shape[0], 64):
        block = np.pad(x[start:start + 64], ((0, 0), (pad, pad)), mode="edge")
        win = np.lib.stride_tricks.sliding_window_view(block, size, axis=-1)
        out[start:start + 64] = np.median(win, axis=-1)
    return np.moveaxis(out, -1, axis)


def split_hpss(S, size=17):
    """Split a spectrogram into (harmonic, percussive) parts. See step 3 above."""
    H = _median_filter(S, size, axis=1)  # blur along time: keeps steady tones
    P = _median_filter(S, size, axis=0)  # blur along pitch: keeps sharp hits
    mask = H ** 2 / (H ** 2 + P ** 2 + 1e-10)
    return S * mask, S * (1 - mask)


def onset_curve(S, fmin=30, fmax=8000):
    """How much new sound starts in each frame, between fmin and fmax Hz.

    Uses "spectral flux": the increase in (log) loudness of each pitch from
    one frame to the next, added up. Returned curve is cleaned (a moving
    average is subtracted so slow swells don't count) and scaled to 0..1."""
    band = np.log1p(100 * S[bin_of(fmin):bin_of(fmax) + 1])
    flux = np.maximum(0, np.diff(band, axis=1, prepend=band[:, :1])).sum(axis=0)
    k = int(FPS * 0.4)
    local = np.convolve(flux, np.ones(k) / k, mode="same")
    curve = np.maximum(0, flux - local)
    top = np.percentile(curve, 99.5) or 1
    return np.clip(curve / top, 0, 1)


def band_energy(S, fmin, fmax):
    """Loudness (in dB) of a pitch range, per frame."""
    e = (S[bin_of(fmin):bin_of(fmax) + 1] ** 2).sum(axis=0)
    return 10 * np.log10(e + 1e-9)


def find_tempo(env, lo=90, hi=190, center=130):
    """Beats per minute, from the autocorrelation of the onset curve.

    Autocorrelation = slide the curve against itself and see at which delay
    it lines up best; a song with a steady beat lines up at one beat's delay.

    Half and double speed often fit almost equally well (a song at 167 BPM
    also repeats every 2 beats, i.e. at 83 BPM). We prefer tempos near
    `center` inside lo..hi, a typical rock range. For a truly slow song, pass
    a lower range (make_chart.py --tempo 60-100)."""
    x = env - env.mean()
    ac = np.correlate(x, x, mode="full")[len(x) - 1:]
    ac /= ac[0]
    lags = np.arange(len(ac))
    best, best_score = None, -np.inf
    for lag in range(int(FPS * 60 / hi), int(FPS * 60 / lo) + 1):
        bpm = 60 * FPS / lag
        prior = np.exp(-0.5 * (np.log2(bpm / center) / 0.6) ** 2)
        score = (ac[lag] + 0.5 * ac[min(2 * lag, len(ac) - 1)] + 0.25 * ac[lag // 2]) * prior
        if score > best_score:
            best, best_score = lag, score
    # Refine between frames with a parabola through the peak.
    a, b, c = ac[best - 1], ac[best], ac[best + 1]
    shift = 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) != 0 else 0
    return 60 * FPS / (lags[best] + shift)


def track_beats(env, bpm, tightness=100):
    """Frame numbers of every beat (dynamic programming, after Dan Ellis 2007).

    Idea: walk through the song keeping, for every frame, the best score of a
    chain of beats ending there. A chain earns points for landing on onsets
    and loses points when the gap between beats strays from the tempo. At the
    end we follow the best chain backwards."""
    period = 60 * FPS / bpm
    n = len(env)
    score = env.astype(np.float64).copy()
    back = np.full(n, -1)
    lo, hi = int(round(period / 2)), int(round(period * 2))
    gaps = np.arange(lo, hi + 1)
    penalty = -tightness * np.log(gaps / period) ** 2
    for t in range(hi, n):
        cand = score[t - gaps] + penalty
        k = int(np.argmax(cand))
        if cand[k] > 0:
            score[t] += cand[k]
            back[t] = t - gaps[k]
    # Best chain end in the last beat period, then walk backwards.
    tail = n - int(period) - 1
    t = tail + int(np.argmax(score[tail:]))
    beats = []
    while t >= 0:
        beats.append(t)
        t = back[t]
    return np.array(beats[::-1])


def trim_silence(beats, S):
    """Drop beats in the silence before the music starts and after it ends."""
    loud = band_energy(S, 30, 8000)
    level = np.percentile(loud, 90)
    keep = [b for b in beats if loud[max(0, b - 4):b + 5].max() > level - 35]
    return np.array(keep)


def snap_to_onsets(beats, env, reach=0.035):
    """Nudge each beat (up to `reach` seconds) onto the strongest nearby onset,
    so it lands where the hit actually is, not just where the grid says."""
    r = int(reach * FPS)
    out = []
    for b in beats:
        lo, hi = max(0, b - r), min(len(env), b + r + 1)
        win = env[lo:hi]
        out.append(lo + int(np.argmax(win)) if win.max() > 0.15 else b)
    return np.array(out)


def chroma(S, frames):
    """Pitch-class profile (C, C#, ... B) of the harmonic sound around each
    given frame: which notes of the scale are sounding. Used to spot chord
    changes."""
    freqs = np.arange(S.shape[0]) * SR / NFFT
    valid = (freqs > 60) & (freqs < 2000)
    pc = np.zeros(S.shape[0], dtype=int)
    pc[valid] = (np.round(12 * np.log2(freqs[valid] / 440)) + 9) % 12  # 0 = C
    out = []
    for i, f in enumerate(frames):
        end = frames[i + 1] if i + 1 < len(frames) else f + 30
        seg = S[valid, f:max(f + 1, end)].mean(axis=1)
        v = np.bincount(pc[valid], weights=seg, minlength=12)
        out.append(v / (np.linalg.norm(v) + 1e-9))
    return np.array(out)


def find_downbeats(beats, kick, snare, chords):
    """Which beat in each group of 4 is beat "1".

    Rock and pop usually put the kick drum on 1 (and 3), the snare on 2 and 4,
    and change chords on 1. Try all four possibilities and keep the one that
    fits best. Returns the index (0-3) of the first downbeat."""
    change = np.r_[0, 1 - (chords[1:] * chords[:-1]).sum(axis=1)]
    k = kick[beats]
    s = snare[beats]
    scores = []
    for phase in range(4):
        idx = np.arange(len(beats))
        pos = (idx - phase) % 4
        scores.append(2 * change[pos == 0].mean() + k[pos == 0].mean() + 0.5 * k[pos == 2].mean()
                      + 0.5 * (s[pos == 1].mean() + s[pos == 3].mean()) - 0.5 * s[pos == 0].mean())
    return int(np.argmax(scores))


def smooth_beats(times, reach=8):
    """Even out tiny wobbles in the beat times.

    Each beat is replaced by a straight-line fit through its neighbours (up to
    `reach` beats either side). A steady tempo becomes perfectly even, while a
    band that slowly speeds up or slows down is still followed."""
    times = np.asarray(times, dtype=float)
    idx = np.arange(len(times))
    out = np.empty_like(times)
    for i in idx:
        lo, hi = max(0, i - reach), min(len(times), i + reach + 1)
        a, b = np.polyfit(idx[lo:hi], times[lo:hi], 1)
        out[i] = a * i + b
    return out
