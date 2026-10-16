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
taken from its first cell).
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


def hub_pose(folder, member, band):
    """The standing pose (row 0, col 0 of the packed sheet) as PNG base64."""
    cw, ch = band["members"][member]["cell"]
    img = Image.open(os.path.join(folder, f"{member}.png")).convert("RGBA").crop((0, 0, cw, ch))
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

    todo = []
    for member, spec in recipe["members"].items():
        cid = src["members"][member]["character_id"]
        have = existing_animations(cid)
        hub = hub_pose(folder, member, band)
        for a in spec["anims"]:
            full = f"{member}_{a['name']}"
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
