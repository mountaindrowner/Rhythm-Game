"""Download the band's PixelLab sprite sheets and pack them for the game.

Usage (needs Python 3 with Pillow, and your PixelLab API key):

    export PIXELLAB_API_KEY=...        # never commit this key
    python3 scripts/pixellab/fetch_and_pack.py

Options:
    --source FILE      which characters to fetch (default: assets/art/pixellab/source.json)
    --out DIR          where to write (default: the source file's folder)
    --allow-missing    use the idle pose for animations that don't exist yet
                       (handy for previewing a new look before animating it)

Reads   assets/art/pixellab/source.json   (which characters to fetch)
Writes  assets/art/pixellab/<member>.png  (only the frames the game uses)
        assets/art/pixellab/drumkit.png
        assets/art/pixellab/band.json     (frame layout + where the feet are)

Each output sheet is one row per animation: idle, play, accent, mistake.
Every cell is the same size and every animation keeps PixelLab's cell-centred
pivot, so frames line up without any per-frame offsets.
"""
import argparse
import io
import json
import os
import sys
import urllib.request
import zipfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_SOURCE = os.path.join(ROOT, "assets", "art", "pixellab", "source.json")
API = "https://api.pixellab.ai/mcp"
ANIMS = ["play", "accent", "mistake"]  # rows after the idle row, in this order


def fetch(url, key):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def lowest_opaque_row(img):
    """Pixel row (from the top) of the lowest non-transparent pixel: the feet."""
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    return bbox[3] if bbox else img.height


def sprite_height(img):
    """How many pixels tall the character actually is (ignoring empty space)."""
    bbox = img.getchannel("A").getbbox()
    return bbox[3] - bbox[1] if bbox else img.height


def pack_member(name, zip_bytes, out_dir, allow_missing):
    z = zipfile.ZipFile(io.BytesIO(zip_bytes))
    meta_name = next(n for n in z.namelist() if n.endswith(".json"))
    meta = json.loads(z.read(meta_name))["spritesheet"]
    sheet = Image.open(io.BytesIO(z.read(meta["path"]))).convert("RGBA")
    cw, ch = meta["cell_size"]["width"], meta["cell_size"]["height"]

    def cell(row, col):
        return sheet.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))

    rows = {"idle": [cell(0, 0)]}  # row 0, column 0 = facing the viewer
    for anim in ANIMS:
        info = next((r for r in meta["rows"] if r.get("animation") == f"{name}_{anim}"), None)
        if info is None:
            if not allow_missing:
                sys.exit(f"{name}: animation '{name}_{anim}' not found in PixelLab sheet")
            print(f"  {name}: no '{anim}' animation yet, using the idle pose")
            rows[anim] = [rows["idle"][0]]
            continue
        # Column 0 is PixelLab's reference pose; the animation proper is 1..N-1.
        rows[anim] = [cell(info["row"], c) for c in range(1, info["frame_count"])]

    cols = max(len(f) for f in rows.values())
    out = Image.new("RGBA", (cols * cw, len(rows) * ch), (0, 0, 0, 0))
    layout = {}
    for r, (anim, frames) in enumerate(rows.items()):
        for c, f in enumerate(frames):
            out.alpha_composite(f, (c * cw, r * ch))
        layout[anim] = {"row": r, "frames": len(frames)}
    out.save(os.path.join(out_dir, f"{name}.png"), optimize=True)
    return {"file": f"{name}.png", "cell": [cw, ch], "columns": cols, "rows": len(rows),
            "anims": layout, "footY": lowest_opaque_row(rows["idle"][0]),
            "height": sprite_height(rows["idle"][0])}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", default=DEFAULT_SOURCE)
    ap.add_argument("--out", default=None)
    ap.add_argument("--allow-missing", action="store_true")
    args = ap.parse_args()
    out_dir = args.out or os.path.dirname(os.path.abspath(args.source))
    os.makedirs(out_dir, exist_ok=True)
    key = os.environ.get("PIXELLAB_API_KEY")
    if not key:
        sys.exit("Set PIXELLAB_API_KEY first (see the docstring).")
    src = json.load(open(args.source))
    manifest = {"members": {}, "drumkit": None}
    for name, m in src["members"].items():
        print("fetching", name)
        zip_bytes = fetch(f"{API}/characters/{m['character_id']}/spritesheet", key)
        manifest["members"][name] = {"lane": m["lane"], **pack_member(name, zip_bytes, out_dir, args.allow_missing)}

    print("fetching drum kit")
    z = zipfile.ZipFile(io.BytesIO(fetch(f"{API}/objects/{src['drumkit']['object_id']}/spritesheet", key)))
    png = next(n for n in z.namelist() if n.endswith(".png"))
    kit = Image.open(io.BytesIO(z.read(png))).convert("RGBA")
    bbox = kit.getchannel("A").getbbox()
    kit = kit.crop(bbox)
    kit.save(os.path.join(out_dir, "drumkit.png"), optimize=True)
    manifest["drumkit"] = {"file": "drumkit.png", "size": list(kit.size)}

    with open(os.path.join(out_dir, "band.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print("wrote", out_dir)


if __name__ == "__main__":
    main()
