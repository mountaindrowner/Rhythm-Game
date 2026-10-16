"""Download the crowd fans from PixelLab and pack them into one sprite sheet.

Usage (needs Python 3 with Pillow, and your PixelLab API key):

    export PIXELLAB_API_KEY=...        # never commit this key
    python3 scripts/pixellab/pack_crowd.py

Reads   assets/art/crowd/source.json
Writes  assets/art/crowd/crowd.png    one row per fan: [standing, cheer frames...]
        assets/art/crowd/crowd.json   layout + where the feet are

The fans face the stage, so we use the "north" (seen-from-behind) view.
"""
import io
import json
import os
import sys
import zipfile

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_and_pack import API, fetch  # noqa: E402  (shared download helper)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "assets", "art", "crowd")


def main():
    key = os.environ.get("PIXELLAB_API_KEY")
    if not key:
        sys.exit("Set PIXELLAB_API_KEY first.")
    src = json.load(open(os.path.join(OUT, "source.json")))
    rows = []
    for name, fan in src["fans"].items():
        print("fetching", name)
        z = zipfile.ZipFile(io.BytesIO(fetch(f"{API}/characters/{fan['character_id']}/spritesheet", key)))
        meta = json.loads(z.read(next(n for n in z.namelist() if n.endswith(".json"))))["spritesheet"]
        sheet = Image.open(io.BytesIO(z.read(meta["path"]))).convert("RGBA")
        cw, ch = meta["cell_size"]["width"], meta["cell_size"]["height"]
        cell = lambda r, c: sheet.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
        north = meta["rows"][0]["directions"].index("north")
        frames = [cell(0, north)]
        anim = next((r for r in meta["rows"] if r.get("animation") == "cheer"), None)
        if anim:
            frames += [cell(anim["row"], c) for c in range(1, anim["frame_count"])]
        else:
            print(f"  {name}: no 'cheer' animation yet, standing only")
        rows.append((name, frames, (cw, ch)))

    # All rows share one cell size (the largest), centred on each cell.
    cw = max(r[2][0] for r in rows)
    ch = max(r[2][1] for r in rows)
    cols = max(len(r[1]) for r in rows)
    out = Image.new("RGBA", (cols * cw, len(rows) * ch), (0, 0, 0, 0))
    layout = []
    for r, (name, frames, (fw, fh)) in enumerate(rows):
        for c, f in enumerate(frames):
            out.alpha_composite(f, (c * cw + (cw - fw) // 2, r * ch + (ch - fh) // 2))
        layout.append({"name": name, "frames": len(frames)})
    # Feet = lowest opaque pixel of each standing frame, measured in the packed cell.
    foot = []
    height = []
    for r in range(len(rows)):
        bbox = out.crop((0, r * ch, cw, (r + 1) * ch)).getchannel("A").getbbox()
        foot.append(bbox[3] if bbox else ch)
        height.append(bbox[3] - bbox[1] if bbox else ch)
    out.save(os.path.join(OUT, "crowd.png"), optimize=True)
    json.dump({"file": "crowd.png", "cell": [cw, ch], "columns": cols, "rows": len(rows),
               "fans": layout, "footY": max(foot), "height": max(height)},
              open(os.path.join(OUT, "crowd.json"), "w"), indent=2)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
