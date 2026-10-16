"""make_chart.py — turn a song (MP3) into a playable note chart for the game.

Usage (needs Python 3 with numpy, plus the ffmpeg program):

    python3 scripts/chart/make_chart.py assets/audio/trust_god_anyway.mp3 \\
        --id trust_god_anyway --title "Trust God Anyway" --vocalist singer \\
        --venue chapel

Writes charts/<id>.json and a picture of the analysis, charts/<id>.png (beats,
sections and notes on a timeline; open it to check the result at a glance).
Then add the song to src/song/songs.js so it shows up in the game.

What happens (see the other files in this folder):
  listen.py    finds the tempo, every beat, and which beat is "1" of the bar
  sections.py  splits the song into OPENING / VERSE / CHORUS / ... by energy
  notes.py     places notes for every lane and difficulty on the beat grid
  picture.py   draws the analysis picture

Options to correct things by hand:
  --tempo 60-100       look for the tempo in this range (default 90-190). Use
                       it if the chart feels twice or half as fast as the song.
  --sections FILE      your own section list instead of the automatic one, a
                       JSON list like
                       [{"time": "0:00", "name": "OPENING"},
                        {"time": "0:13", "name": "VERSE 1"},
                        {"time": "0:31", "name": "CHORUS 1"}, ...]
                       Times can be "m:ss" or seconds. Names should contain
                       OPENING, VERSE, BUILD, CHORUS, REFRAIN, BRIDGE or OUTRO
                       (FINAL CHORUS too); the game picks lights and moves by them.
"""
import argparse
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import listen as L  # noqa: E402
import notes as N  # noqa: E402
import picture  # noqa: E402
import sections as SEC  # noqa: E402


def parse_time(v):
    if isinstance(v, (int, float)):
        return float(v)
    m, s = v.split(":")
    return int(m) * 60 + float(s)


def analyse(path, tempo_range=(90, 190)):
    """Everything the chart needs to know about the audio."""
    y = L.load_audio(path)
    duration = len(y) / L.SR
    print(f"  {duration:.1f} s of audio")
    S = L.spectrogram(y)
    H, P = L.split_hpss(S)
    env = L.onset_curve(S)
    lo, hi = tempo_range
    center = 130 if lo < 130 < hi else (lo * hi) ** 0.5  # the middle of the range
    bpm = L.find_tempo(env, lo, hi, center)
    beat_frames = L.snap_to_onsets(L.trim_silence(L.track_beats(env, bpm), S), env)
    beats = L.smooth_beats(L.onset_time(beat_frames))
    kick, snare = L.onset_curve(P, 30, 150), L.onset_curve(P, 1500, 6000)
    first_downbeat = L.find_downbeats(beat_frames, kick, snare, L.chroma(H, beat_frames))
    bpm = 60 / float(np.median(np.diff(beats)))
    print(f"  tempo {bpm:.1f} BPM, {len(beats)} beats, first downbeat at beat {first_downbeat}")
    return {"duration": duration, "S": S, "H": H, "P": P, "env": env, "beats": beats,
            "bpm": bpm, "first_downbeat": first_downbeat}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio")
    ap.add_argument("--id", required=True, help="short name, e.g. trust_god_anyway")
    ap.add_argument("--title", required=True)
    ap.add_argument("--vocalist", default="singer", choices=["singer", "guitarist", "duet"])
    ap.add_argument("--venue", default="arena")
    ap.add_argument("--tempo", default="90-190", help="tempo range to search, e.g. 60-100")
    ap.add_argument("--sections", help="JSON file with your own sections (see above)")
    ap.add_argument("--out", default="charts")
    args = ap.parse_args()

    print(f"listening to {args.audio}")
    a = analyse(args.audio, tuple(float(x) for x in args.tempo.split("-")))
    beats = a["beats"]
    bar_times = beats[a["first_downbeat"]::4]

    if args.sections:
        sections = [{"time": parse_time(s["time"]), "name": s["name"].upper()} for s in json.load(open(args.sections))]
        sections.sort(key=lambda s: s["time"])
        sections[0]["time"] = 0
        print("  sections from", args.sections)
        details = None
    else:
        sections, details = SEC.find_sections(bar_times, a["S"], a["duration"])
    print("  sections:", ", ".join(f"{int(s['time'] // 60)}:{s['time'] % 60:04.1f} {s['name']}" for s in sections))

    notes = N.place_notes(beats, a["first_downbeat"], sections, a["H"], a["P"], a["duration"])
    for tier, label in enumerate(["casual", "standard", "expert"]):
        sel = [n for n in notes if n["tier"] <= tier]
        lanes = [sum(1 for n in sel if n["lane"] == k) for k in range(4)]
        print(f"  {label:8s} {len(sel):4d} notes ({len(sel) / a['duration']:.1f}/s)  "
              f"bass {lanes[0]} vocals {lanes[1]} guitar {lanes[2]} drums {lanes[3]}  "
              f"holds {sum(1 for n in sel if n['hold'] > 0)}")

    chart = {
        "title": args.title,
        "duration": round(a["duration"], 3),
        "estimated_bpm": round(a["bpm"], 2),
        "vocalist": args.vocalist,
        "venue": args.venue,
        "beat_count": len(beats),
        "first_downbeat": a["first_downbeat"],
        "description": "Made by scripts/chart/make_chart.py: beats tracked from the audio, notes placed on "
                       "the beat grid from each lane's part of the sound (drums = percussive, bass/guitar/"
                       "vocals = tonal bands). Sections are an energy map"
                       + (" set by hand." if args.sections else " (automatic)."),
        "sections": sections,
        "notes": notes,
        "beats": [round(float(b), 3) for b in beats],
    }
    os.makedirs(args.out, exist_ok=True)
    path = os.path.join(args.out, f"{args.id}.json")
    with open(path, "w") as f:
        json.dump(chart, f, separators=(",", ":"))
    print("wrote", path)
    pic = os.path.join(args.out, f"{args.id}.png")
    picture.draw(pic, a, chart, details)
    print("wrote", pic)


if __name__ == "__main__":
    main()
