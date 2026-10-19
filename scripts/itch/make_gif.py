# Joins the frames from make_page_art.mjs into the "Meet X-ROADS" GIF.
#   python3 scripts/itch/make_gif.py <out-folder>
# Each frame's file name ends in how long it shows, in milliseconds.
import glob, os, sys
from PIL import Image

out = sys.argv[1]
files = sorted(glob.glob(os.path.join(out, 'frames', '*.png')))
frames = [Image.open(f).convert('RGB') for f in files]
durations = [int(os.path.basename(f).split('_')[1].split('.')[0]) for f in files]
# One shared colour palette, made from a normal frame and a Riot frame, so the
# colours don't flicker from frame to frame.
ref = Image.new('RGB', (600, 600))
ref.paste(frames[10], (0, 0))
ref.paste(frames[50], (0, 300))
palette = ref.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
gif = [f.quantize(palette=palette, dither=Image.Dither.NONE) for f in frames]
gif[0].save(os.path.join(out, 'meet_x_roads.gif'), save_all=True, append_images=gif[1:],
            duration=durations, loop=0, disposal=1)
