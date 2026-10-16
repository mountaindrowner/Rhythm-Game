"""picture.py — draws a chart's analysis as a PNG timeline, 30 seconds per row:

  coloured band   the sections (CHORUS = orange, VERSE = blue, ...)
  grey curve      how much new sound starts at each moment (the onset curve)
  ticks           every beat; tall ticks are beat 1 of each bar
  4 lanes         the notes: Bass (green), Vocals (gold), Guitar (blue),
                  Drums (red). Big dots = Casual, medium = Standard,
                  small = Expert only. Bars = long (hold) notes.
"""
from PIL import Image, ImageDraw

import listen as L

ROW_SECONDS = 30
PX_PER_S = 60
LANE_COLORS = ["#3fd468", "#ffbe3b", "#4bbdff", "#ff5b5b"]
SECTION_COLORS = {"OPENING": "#5b5f97", "VERSE": "#2f6fb5", "BUILD": "#8fbf3f", "CHORUS": "#ff8a3d",
                  "REFRAIN": "#d8a93b", "BRIDGE": "#9b5bff", "FINAL": "#ff4f6b", "OUTRO": "#6b6b80"}


def section_color(name):
    return next((c for k, c in SECTION_COLORS.items() if name.startswith(k)), "#555")


def draw(path, a, chart, details=None):
    dur = chart["duration"]
    rows = int(dur // ROW_SECONDS) + 1
    W = ROW_SECONDS * PX_PER_S + 70
    ROW_H = 230
    img = Image.new("RGB", (W, rows * ROW_H + 40), "#16141f")
    d = ImageDraw.Draw(img)
    d.text((10, 10), f"{chart['title']}  -  {chart['estimated_bpm']} BPM, {chart['beat_count']} beats, "
                     f"{len(chart['notes'])} notes (expert)", fill="white")
    env = a["env"]
    secs = chart["sections"] + [{"time": dur, "name": ""}]
    first_db = chart.get("first_downbeat", 0)
    for r in range(rows):
        y0 = 40 + r * ROW_H
        t0 = r * ROW_SECONDS
        x_of = lambda t: 60 + (t - t0) * PX_PER_S  # noqa: E731
        d.text((4, y0 + 2), f"{t0 // 60}:{t0 % 60:02d}", fill="#aaa")
        # Sections
        for s, nxt in zip(secs[:-1], secs[1:]):
            a_, b_ = max(s["time"], t0), min(nxt["time"], t0 + ROW_SECONDS)
            if a_ < b_:
                d.rectangle([x_of(a_), y0, x_of(b_), y0 + 16], fill=section_color(s["name"]))
                if s["time"] >= t0:
                    d.text((x_of(a_) + 3, y0 + 2), s["name"], fill="white")
        # Onset curve
        base = y0 + 70
        f_a, f_b = L.time_frame(t0), min(len(env), L.time_frame(t0 + ROW_SECONDS))
        pts = [(x_of(L.frame_time(f) + L.ONSET_BIAS), base - 45 * env[f]) for f in range(f_a, f_b)]
        if len(pts) > 1:
            d.line(pts, fill="#777", width=1)
        # Beats
        for i, b in enumerate(chart["beats"]):
            if t0 <= b < t0 + ROW_SECONDS:
                down = (i - first_db) % 4 == 0
                d.line([(x_of(b), base - (50 if down else 20)), (x_of(b), base + 4)],
                       fill="#ffffff" if down else "#8a8aa0", width=2 if down else 1)
        # Lanes
        for lane in range(4):
            ly = y0 + 95 + lane * 32
            d.line([(60, ly), (W - 10, ly)], fill="#2a2838")
            d.text((4, ly - 6), ["BASS", "VOX", "GTR", "DRUM"][lane], fill=LANE_COLORS[lane])
        for n in chart["notes"]:
            if not (t0 <= n["time"] < t0 + ROW_SECONDS):
                continue
            ly = y0 + 95 + n["lane"] * 32
            x = x_of(n["time"])
            rad = [7, 5, 3][n["tier"]]
            if n["hold"] > 0:
                d.rectangle([x, ly - 3, x_of(min(t0 + ROW_SECONDS, n["time"] + n["hold"])), ly + 3],
                            fill=LANE_COLORS[n["lane"]])
            d.ellipse([x - rad, ly - rad, x + rad, ly + rad], fill=LANE_COLORS[n["lane"]])
    img.save(path, optimize=True)
