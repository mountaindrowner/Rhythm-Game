# Pixel-art background for the itch.io page: stage lights, lightning and a
# crowd on both sides of the page. Drawn small (480x228), scaled up x5.
#   python3 scripts/itch/make_background.py docs/itch/background_2400x1140.png
import random, math, sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
random.seed(7)
PW, PH, S = 480, 228, 5
BG = (11, 11, 24)
LANE = [(99,255,121),(255,190,59),(75,189,255),(255,91,91)]
EXTRA = [(255,79,216),(183,139,255),(255,155,82)]
COLORS = LANE + EXTRA
def hexa(c,a): return c+(a,)

img = Image.new('RGB', (PW, PH), BG)
# 1) sky: a faint purple glow up top, darker toward the middle
glow = Image.new('RGB', (PW, PH), BG); g = ImageDraw.Draw(glow)
for y in range(PH):
    t = max(0, 1 - y/150)
    g.line([(0,y),(PW,y)], fill=(int(11+30*t), int(11+12*t), int(24+40*t)))
img = glow

# 2) beams from the lamps on the truss (added light)
TRUSS_Y = 14
lamps = [x for x in range(14, PW, 26)]
beams = Image.new('RGB', (PW, PH), (0,0,0)); bd = ImageDraw.Draw(beams, 'RGBA')
for i, x in enumerate(lamps):
    c = COLORS[i % len(COLORS)]
    ang = math.radians(random.uniform(-28, 28))
    L = random.uniform(140, 200); spread = random.uniform(0.10, 0.16)
    tip = (x, TRUSS_Y+6)
    a1, a2 = ang - spread, ang + spread
    p1 = (x + math.sin(a1)*L, TRUSS_Y+6 + math.cos(a1)*L)
    p2 = (x + math.sin(a2)*L, TRUSS_Y+6 + math.cos(a2)*L)
    bd.polygon([tip, p1, p2], fill=hexa(c, 34))
    # brighter core
    a1, a2 = ang - spread*0.35, ang + spread*0.35
    p1 = (x + math.sin(a1)*L*0.8, TRUSS_Y+6 + math.cos(a1)*L*0.8)
    p2 = (x + math.sin(a2)*L*0.8, TRUSS_Y+6 + math.cos(a2)*L*0.8)
    bd.polygon([tip, p1, p2], fill=hexa(c, 30))
beams = beams.filter(ImageFilter.GaussianBlur(1.2))
# fade the beams out as they go down
fade = Image.new('L', (PW, PH)); fd = ImageDraw.Draw(fade)
for y in range(PH): fd.line([(0,y),(PW,y)], fill=int(255*max(0, 1 - y/190)**1.2))
beams = Image.composite(beams, Image.new('RGB',(PW,PH)), fade)
img = ImageChops.add(img, beams)

# 3) haze
haze = Image.new('RGB', (PW, PH)); hd = ImageDraw.Draw(haze, 'RGBA')
for _ in range(60):
    x, y = random.uniform(0, PW), random.uniform(30, 160); r = random.uniform(10, 30)
    hd.ellipse([x-r, y-r*0.5, x+r, y+r*0.5], fill=(90, 70, 140, 10))
img = ImageChops.add(img, haze.filter(ImageFilter.GaussianBlur(6)))

d = ImageDraw.Draw(img)
STEEL, STEEL_HI, STEEL_LO = (70, 66, 96), (120, 114, 150), (34, 32, 52)
# 4) truss towers beside the page column, and the bar across the top
def tower(x, y0, y1, w=8):
    d.rectangle([x, y0, x+w, y1], outline=STEEL)
    for y in range(y0, y1, w):
        d.line([(x, y), (x+w, y+w)], fill=STEEL_LO)
        d.line([(x+w, y), (x, y+w)], fill=STEEL_LO)
    d.line([(x, y0), (x, y1)], fill=STEEL_HI)
for x in (100, 372): tower(x, TRUSS_Y, 182)
d.rectangle([0, TRUSS_Y-6, PW, TRUSS_Y+2], outline=STEEL)
for x in range(0, PW, 8):
    d.line([(x, TRUSS_Y-6), (x+8, TRUSS_Y+2)], fill=STEEL_LO)
    d.line([(x+8, TRUSS_Y-6), (x, TRUSS_Y+2)], fill=STEEL_LO)
d.line([(0, TRUSS_Y-6), (PW, TRUSS_Y-6)], fill=STEEL_HI)
# lamps hanging under the bar
for i, x in enumerate(lamps):
    c = COLORS[i % len(COLORS)]
    d.rectangle([x-3, TRUSS_Y+2, x+3, TRUSS_Y+7], fill=(28, 26, 40), outline=STEEL)
    d.rectangle([x-2, TRUSS_Y+6, x+2, TRUSS_Y+7], fill=c)
    d.point((x-1, TRUSS_Y+6), fill=(255,255,255))

# 5) speaker stacks at the bottom of the towers
def speaker(x, y, w=22, h=18):
    d.rectangle([x, y, x+w, y+h], fill=(18, 17, 28), outline=(48, 45, 66))
    for cx, cy, r in ((x+w//2, y+h//2, 6),):
        d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(10, 10, 16), outline=(60, 56, 80))
        d.ellipse([cx-2, cy-2, cx+2, cy+2], fill=(40, 38, 56))
for x in (76, 112, 346, 382):
    speaker(x, 146); speaker(x, 164)

# 6) lightning on both sides (crackling like the logo)
bolts = Image.new('RGB', (PW, PH)); bl = ImageDraw.Draw(bolts)
def bolt(x, y, length, drift):
    pts = [(x, y)]
    while pts[-1][1] < y + length:
        px, py = pts[-1]
        pts.append((px + random.choice((-1, 1))*random.uniform(3, 9) + drift, py + random.uniform(6, 12)))
    return pts
for (x, drift) in ((62, 0.5), (418, -0.5)):
    pts = bolt(x, TRUSS_Y+4, random.uniform(60, 80), drift)
    bl.line(pts, fill=(50, 90, 230), width=3)
    bl.line(pts, fill=(200, 230, 255), width=1)
    # a fork
    k = len(pts)//2
    fork = bolt(pts[k][0], pts[k][1], 30, drift*4 + random.choice((-2, 2)))
    bl.line(fork, fill=(90, 150, 255), width=1)
glowb = bolts.filter(ImageFilter.GaussianBlur(5))
img = ImageChops.add(img, glowb)
img = ImageChops.add(img, bolts.filter(ImageFilter.GaussianBlur(0.6)))
core = Image.new('RGB', (PW, PH)); cl = ImageDraw.Draw(core)
random.seed(7)  # (cores re-drawn on the same paths)
img = ImageChops.add(img, Image.new('RGB', (PW, PH)))

# 7) the crowd: back rows lit by the stage haze, front rows dark silhouettes
d = ImageDraw.Draw(img)
rows = [(166, 0.8, (52, 44, 78)), (178, 0.95, (40, 34, 62)), (192, 1.1, (30, 25, 48)), (208, 1.3, (20, 17, 34))]
for ri, (base, sc, body) in enumerate(rows):
    x = random.uniform(-6, 0)
    while x < PW + 8:
        k = random.uniform(0.85, 1.15)  # people come in different sizes
        rim = random.choice(COLORS) if random.random() < 0.55 else tuple(min(255, v + 40) for v in body)
        rim = tuple(int(v*(0.5 + 0.1*ri)) for v in rim)
        hw = round(5*sc*k); hr = round(3*sc*k)
        top = base - round(random.uniform(-2, 4))
        # raised arms first (behind the body)
        if random.random() < 0.4:
            for side in random.choice(((-1,), (1,), (-1, 1))):
                sx = x + side*(hw-1); hx = sx + side*random.uniform(1, 4)*sc
                hy = top - random.uniform(11, 16)*sc
                d.line([(sx, top+2), (hx, hy)], fill=body, width=max(2, round(2*sc)))
                d.ellipse([hx-1.5*sc, hy-1.5*sc, hx+1.5*sc, hy+1.5*sc], fill=body)
                d.point((round(hx), round(hy-1.5*sc)), fill=rim)
                if random.random() < 0.18:  # a phone light
                    d.point((round(hx), round(hy-2*sc)), fill=(255, 250, 220))
        # shoulders and head
        d.rounded_rectangle([x-hw, top+1, x+hw, top+30], radius=max(1, round(2*sc)), fill=body)
        hy0 = top - 2*hr + 1
        d.ellipse([x-hr, hy0, x+hr, hy0+2*hr], fill=body)
        # rim light from the stage on the head and shoulders
        d.arc([x-hr, hy0, x+hr, hy0+2*hr], 200, 340, fill=rim)
        lit = tuple(min(255, v + 18) for v in body)
        d.line([(x-hw+1, top+1), (x-hr-1, top+1)], fill=lit)
        d.line([(x+hr+1, top+1), (x+hw-1, top+1)], fill=lit)
        x += random.uniform(7, 15)*sc
# phone glows (soft halos)
glow = Image.new('RGB', (PW, PH)); gd = ImageDraw.Draw(glow)
px = img.load()
for y in range(130, PH):
    for x in range(PW):
        if px[x, y] == (255, 250, 220): gd.ellipse([x-3, y-3, x+3, y+3], fill=(110, 100, 70))
img = ImageChops.add(img, glow.filter(ImageFilter.GaussianBlur(2.5)))

# 8) fade the outer edges and the very bottom into the page colour, so it
#    blends on any screen size
big = img.resize((PW*S, PH*S), Image.NEAREST)
mask = Image.new('L', big.size, 0); md = ImageDraw.Draw(mask)
W2, H2 = big.size
for x in range(W2):
    e = min(x, W2-1-x) / 260
    md.line([(x, 0), (x, H2)], fill=int(255*min(1, e)))
vm = Image.new('L', big.size, 0); vd = ImageDraw.Draw(vm)
for y in range(H2):
    e = (H2-1-y) / 90
    vd.line([(0, y), (W2, y)], fill=int(255*min(1, e)))
mask = ImageChops.multiply(mask, vm)
out = Image.composite(big, Image.new('RGB', big.size, BG), mask)
out.save(sys.argv[1], optimize=True)
