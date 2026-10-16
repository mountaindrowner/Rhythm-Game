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

Each output sheet is one row per animation: the standing pose ("hub"), then
either every animation in <folder>/animations.json (the recipe) if it exists,
or the classic three: play, accent, mistake.
Every cell is the same size and every animation keeps PixelLab's cell-centred
pivot, so frames line up without any per-frame offsets.
"""
import argparse
import io
import json
import os
import sys
import time
import urllib.request
import zipfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_SOURCE = os.path.join(ROOT, "assets", "art", "pixellab", "source.json")
API = "https://api.pixellab.ai/mcp"
ANIMS = ["play", "accent", "mistake"]  # rows after the idle row, in this order


def fetch(url, key, attempts=4):
    """Download with a few retries: flaky connections happen."""
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {key}"})
    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except OSError as err:
            if attempt == attempts:
                raise
            wait = 2 ** attempt
            print(f"  network error ({err}); retrying in {wait}s")
            time.sleep(wait)


def lowest_opaque_row(img):
    """Pixel row (from the top) of the lowest non-transparent pixel: the feet."""
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    return bbox[3] if bbox else img.height


def sprite_height(img):
    """How many pixels tall the character actually is (ignoring empty space)."""
    bbox = img.getchannel("A").getbbox()
    return bbox[3] - bbox[1] if bbox else img.height


def pack_member(name, zip_bytes, out_dir, allow_missing, recipe=None):
    z = zipfile.ZipFile(io.BytesIO(zip_bytes))
    meta_name = next(n for n in z.namelist() if n.endswith(".json"))
    meta = json.loads(z.read(meta_name))["spritesheet"]
    sheet = Image.open(io.BytesIO(z.read(meta["path"]))).convert("RGBA")
    cw, ch = meta["cell_size"]["width"], meta["cell_size"]["height"]

    def cell(row, col):
        return sheet.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))

    rows = {"hub": [cell(0, 0)]}  # row 0, column 0 = the standing pose, facing the viewer
    extra = {}  # per-animation info copied from the recipe (block, loop, beats...)
    wanted = ANIMS
    source_name = {anim: f"{name}_{anim}" for anim in ANIMS}  # name in PixelLab
    if recipe:
        wanted = [a["name"] for a in recipe["anims"]]
        extra = {a["name"]: {k: v for k, v in a.items() if k not in ("name", "prompt", "version")}
                 for a in recipe["anims"]}
        # Redone animations ("version": 2) live in PixelLab as <member>_<name>_v2.
        source_name = {a["name"]: f"{name}_{a['name']}" + (f"_v{a['version']}" if a.get("version", 1) > 1 else "")
                       for a in recipe["anims"]}
    for anim in wanted:
        info = next((r for r in meta["rows"] if r.get("animation") == source_name[anim]), None)
        if info is None:
            if not allow_missing:
                sys.exit(f"{name}: animation '{source_name[anim]}' not found in PixelLab sheet")
            print(f"  {name}: no '{anim}' animation yet, using the standing pose")
            rows[anim] = [rows["hub"][0]]
            continue
        # Column 0 is PixelLab's reference pose; the animation proper is 1..N-1.
        rows[anim] = [cell(info["row"], c) for c in range(1, info["frame_count"])]

    cols = max(len(f) for f in rows.values())
    out = Image.new("RGBA", (cols * cw, len(rows) * ch), (0, 0, 0, 0))
    layout = {}
    for r, (anim, frames) in enumerate(rows.items()):
        for c, f in enumerate(frames):
            out.alpha_composite(f, (c * cw, r * ch))
        layout[anim] = {"row": r, "frames": len(frames), **extra.get(anim, {})}
    out.save(os.path.join(out_dir, f"{name}.png"), optimize=True)
    # Older art sets call the standing pose "idle"; keep that name working.
    if "idle" not in layout:
        layout["idle"] = layout["hub"]
    return {"file": f"{name}.png", "cell": [cw, ch], "columns": cols, "rows": len(rows),
            "anims": layout, "footY": lowest_opaque_row(rows["hub"][0]),
            "height": sprite_height(rows["hub"][0])}


def pack_object(object_id, name, out_dir, key):
    """Download a one-direction PixelLab object and save it trimmed to its pixels."""
    z = zipfile.ZipFile(io.BytesIO(fetch(f"{API}/objects/{object_id}/spritesheet", key)))
    png = next(n for n in z.namelist() if n.endswith(".png"))
    img = Image.open(io.BytesIO(z.read(png))).convert("RGBA")
    img = img.crop(img.getchannel("A").getbbox())
    img.save(os.path.join(out_dir, f"{name}.png"), optimize=True)
    return {"file": f"{name}.png", "size": list(img.size)}


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
    recipe_path = os.path.join(os.path.dirname(os.path.abspath(args.source)), "animations.json")
    recipe = json.load(open(recipe_path)) if os.path.exists(recipe_path) else None
    manifest = {"members": {}, "drumkit": None}
    for name, m in src["members"].items():
        print("fetching", name)
        zip_bytes = fetch(f"{API}/characters/{m['character_id']}/spritesheet", key)
        member_recipe = recipe["members"].get(name) if recipe else None
        manifest["members"][name] = {"lane": m["lane"], **pack_member(name, zip_bytes, out_dir, args.allow_missing, member_recipe)}

    print("fetching drum kit")
    manifest["drumkit"] = pack_object(src["drumkit"]["object_id"], "drumkit", out_dir, key)
    # Props: extra stage objects, e.g. the guitarist's mic stand.
    for name, prop in src.get("props", {}).items():
        print("fetching prop", name)
        manifest.setdefault("props", {})[name] = {**pack_object(prop["object_id"], name, out_dir, key),
                                                  **{k: v for k, v in prop.items() if k != "object_id"}}

    with open(os.path.join(out_dir, "band.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print("wrote", out_dir)


if __name__ == "__main__":
    main()
