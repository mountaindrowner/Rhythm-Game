"""Generate the band's missing animations in PixelLab, from the recipe.

Usage:
    export PIXELLAB_API_KEY=...
    python3 scripts/pixellab/animate.py assets/art/pixellab-retro
    python3 scripts/pixellab/fetch_and_pack.py --source assets/art/pixellab-retro/source.json

Reads <folder>/source.json (which characters) and <folder>/animations.json
(the recipe). For every recipe entry that the character doesn't have yet
(named "<member>_<name>"), it asks PixelLab for a front-facing animation that
STARTS and ENDS on the musician's standing pose (the "hub"), so any two
animations can be chained without a jump. Safe to re-run: existing ones are
skipped. Waits politely when PixelLab's 8 job slots are full.

Needs <folder>/<member>.png from a previous fetch_and_pack run (the hub pose is
taken from its first cell, trimmed back to the character's canvas size).

To REDO an animation (say the prompt was too timid), edit its prompt and give
it "version": 2. It is then made under a new PixelLab name
(<member>_<name>_v2), so the old one stays until you delete it.
"""
import base64
import io
import json
import os
import sys
import time

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mcp_client import call_tool  # noqa: E402


def pixellab_name(member, anim):
    """The animation's name in PixelLab: <member>_<name>, plus _v2, _v3... for redos."""
    version = anim.get("version", 1)
    return f"{member}_{anim['name']}" + (f"_v{version}" if version > 1 else "")


def hub_pose(folder, member, band, canvas):
    """The standing pose (row 0, col 0 of the packed sheet) as PNG base64.

    Packed cells are bigger than the character's canvas (animations can reach
    outside it), and the pose sits in the middle, so cut the canvas-sized
    square out of the centre."""
    cw, ch = band["members"][member]["cell"]
    x, y = (cw - canvas) // 2, (ch - canvas) // 2
    img = Image.open(os.path.join(folder, f"{member}.png")).convert("RGBA").crop((x, y, x + canvas, y + canvas))
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()


def existing_animations(character_id):
    text = call_tool("get_character", {"character_id": character_id, "include_preview": False})
    names = set()
    for line in text.splitlines():
        line = line.strip()
        if " — " in line and "dir" in line:
            names.add(line.split(" — ")[0])
    return names


def main():
    folder = sys.argv[1] if len(sys.argv) > 1 else "assets/art/pixellab-retro"
    src = json.load(open(os.path.join(folder, "source.json")))
    recipe = json.load(open(os.path.join(folder, "animations.json")))
    band = json.load(open(os.path.join(folder, "band.json")))
    frames = recipe.get("frames", 16)
    canvas = recipe.get("canvas", 64)

    todo = []
    for member, spec in recipe["members"].items():
        cid = src["members"][member]["character_id"]
        have = existing_animations(cid)
        hub = hub_pose(folder, member, band, canvas)
        for a in spec["anims"]:
            full = pixellab_name(member, a)
            if full in have:
                continue
            prompt = f"{a['prompt']}, {spec['holding']}, then returns to the starting pose"
            todo.append((full, {
                "character_id": cid, "directions": ["south"], "mode": "v3",
                "frame_count": frames, "action_description": prompt,
                "animation_name": full, "end_frame_base64": hub,
            }))
    print(f"{len(todo)} animations to make")

    while todo:
        name, args = todo[0]
        reply = call_tool("animate_character", args)
        if "job slots" in reply or "concurrency" in reply.lower():
            print("  slots full, waiting...")
            call_tool("wait_for_jobs", {})
            continue
        if reply.startswith("error"):
            print(f"  {name}: {reply[:200]}")
            todo.pop(0)
            continue
        print(f"  queued {name}")
        todo.pop(0)

    print("waiting for the last jobs...")
    while True:
        r = call_tool("wait_for_jobs", {})
        if "still running" not in r:
            break
        time.sleep(1)
    print("done")


if __name__ == "__main__":
    main()
