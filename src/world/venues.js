// =============================================================================
// venues.js — the places X-ROADS can play. Each song picks one (song/songs.js).
//
// A venue is mostly COLORS and a BACKDROP:
//   sky / fog      the background color, and the haze far things fade into
//   light          the soft light from above and below (sky color, ground color)
//   floor / deck   the ground and the stage platform
//   screen         'wall'   = the giant LED wall behind the band (indoors)
//                  'banner' = a smaller raised screen, so you can see the
//                             backdrop behind the band (outdoors)
//   subtitle       the small line on the LED screen under the band's name
//   backdrop       a function that paints the far-away scenery (city skyline,
//                  sunrise...) into a pixel-art canvas
//   props          a function that builds extra 3D things for this venue
//                  (string lights, trees, flags...)
//
// The backdrop is a huge flat picture far behind the stage. Its horizon is at
// the camera's eye level, so the lower part shows behind the band and the
// upper part shows above the stage on wider screens.
// =============================================================================
import * as THREE from 'three';
import { WORLD } from '../config.js';

const Z0 = WORLD.stageZ;

export const VENUES = {
  arena: {
    name: 'THE ARENA',
    sky: '#0b0b18',
    fog: ['#0b0b18', 24, 58],
    light: ['#8a8cff', '#1a0f24', 1.1],
    floor: '#100d1d',
    deck: '#2a1f3d',
    screen: 'wall',
    subtitle: 'LIVE  ·  RHYTHM RIOT TOUR',
    backdrop: null,
    props: null,
  },
  rooftop: {
    name: 'CITY ROOFTOP',
    sky: '#0d0a24',
    fog: ['#1a1238', 30, 80],
    light: ['#8f8cff', '#24143a', 1.0],
    floor: '#1d1b2c',
    deck: '#2b2440',
    screen: 'banner',
    subtitle: 'LIVE  ·  ROOFTOP SESSIONS',
    backdrop: paintCity,
    props: buildRooftop,
  },
  sunrise: {
    name: 'SUNRISE HILL',
    sky: '#2a3f8f',
    fog: ['#8a5f86', 30, 85],
    light: ['#ffcfa8', '#2c3b2a', 1.5],
    floor: '#203a24',
    deck: '#4a3426',
    screen: 'banner',
    subtitle: 'LIVE  ·  SUNRISE SESSION',
    backdrop: paintSunrise,
    props: buildHill,
  },
};

// ---- Backdrop size and placement (shared by every venue) -------------------
export const BACKDROP = { z: -60, width: 220, height: 70, bottom: -6, px: 704, py: 224 };
// Canvas pixel row of a world height on the backdrop, and of the horizon.
const rowOf = (y) => Math.round(BACKDROP.py * (1 - (y - BACKDROP.bottom) / BACKDROP.height));
const colOf = (x) => Math.round(BACKDROP.px * (x / BACKDROP.width + 0.5));
const EYE = 4.6; // the camera's height: the horizon on the backdrop

/** Small seeded random numbers so a backdrop looks the same every time. */
function seeded(seed) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function gradient(g, stops) {
  const grd = g.createLinearGradient(0, 0, 0, g.canvas.height);
  for (const [at, color] of stops) grd.addColorStop(at, color);
  g.fillStyle = grd;
  g.fillRect(0, 0, g.canvas.width, g.canvas.height);
}

// ---- Loading-screen poster art ----------------------------------------------
const POSTER = { w: 176, h: 112 };

/**
 * Paint a small picture of a venue for the loading screen's gig poster:
 * a window into the venue's backdrop (outdoor venues) or a pixel arena.
 */
export function paintPoster(canvas, key) {
  const venue = VENUES[key] || VENUES.arena;
  canvas.width = POSTER.w;
  canvas.height = POSTER.h;
  const g = canvas.getContext('2d');
  if (!venue.backdrop) {
    paintArenaPoster(g);
    return;
  }
  const full = document.createElement('canvas');
  full.width = BACKDROP.px;
  full.height = BACKDROP.py;
  venue.backdrop(full.getContext('2d'));
  // The middle of the backdrop, from the sky down to just below the horizon.
  const horizon = rowOf(EYE - 3);
  const y = Math.max(0, Math.min(BACKDROP.py - POSTER.h, horizon - POSTER.h + 14));
  g.drawImage(full, (BACKDROP.px - POSTER.w) / 2, y, POSTER.w, POSTER.h, 0, 0, POSTER.w, POSTER.h);
}

/** The arena: rows of lights, beams, and a sea of hands. */
function paintArenaPoster(g) {
  const W = POSTER.w;
  const H = POSTER.h;
  const rand = seeded(7);
  gradient(g, [[0, '#05030c'], [0.6, '#24103a'], [1, '#3a1440']]);
  // Light beams fanning down from the rig.
  const colors = ['#ff3d6e', '#ffbe3b', '#4bbdff', '#63ff79', '#b65bff'];
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const x = 12 + i * 19;
    const grd = g.createLinearGradient(x, 6, x, H);
    grd.addColorStop(0, `${colors[i % colors.length]}66`);
    grd.addColorStop(1, `${colors[i % colors.length]}00`);
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(x - 1, 6);
    g.lineTo(x + 1, 6);
    g.lineTo(x + 14 + (i - 4) * 4, H);
    g.lineTo(x - 14 + (i - 4) * 4, H);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  // The lighting rig across the top.
  g.fillStyle = '#5d6178';
  g.fillRect(0, 3, W, 2);
  for (let i = 0; i < 9; i++) {
    g.fillStyle = colors[i % colors.length];
    g.fillRect(11 + i * 19, 5, 3, 2);
  }
  // A sea of fans with their hands up.
  for (let row = 0; row < 3; row++) {
    const y = H - 30 + row * 11;
    for (let x = -2; x < W; x += 6 + Math.floor(rand() * 4)) {
      const c = 26 - row * 8;
      g.fillStyle = `rgb(${c + 8},${c},${c + 18})`;
      g.fillRect(x, y, 5, 4);
      g.fillRect(x - 1, y + 4, 7, H);
      if (rand() < 0.4) g.fillRect(x + (rand() < 0.5 ? -1 : 5), y - 7, 1, 8);
      if (rand() < 0.08) {
        g.fillStyle = '#e8f6ff';
        g.fillRect(x + 5, y - 9, 1, 2);
      }
    }
  }
}

// ---- City at night (You're Not My Plan B) ----------------------------------
function paintCity(g) {
  const W = g.canvas.width;
  const H = g.canvas.height;
  const rand = seeded(42);
  const horizon = rowOf(EYE - 3);
  gradient(g, [[0, '#06051a'], [0.55, '#1c1347'], [horizon / H, '#5a2a6e'], [1, '#2a1438']]);
  // Stars and a moon
  for (let i = 0; i < 160; i++) {
    g.fillStyle = rand() > 0.85 ? '#ffe9b0' : '#b8c0ff';
    g.fillRect(Math.floor(rand() * W), Math.floor(rand() * horizon * 0.8), 1, 1);
  }
  g.fillStyle = '#fff4d6';
  g.beginPath();
  g.arc(colOf(30), rowOf(30), 9, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1c1347';
  g.beginPath();
  g.arc(colOf(30) + 4, rowOf(30) - 2, 8, 0, Math.PI * 2);
  g.fill();
  // Two layers of buildings: far (dim) and near (darker, with lit windows)
  for (const layer of [{ tone: '#2d2257', top: [6, 22], win: 0.18 }, { tone: '#140f2c', top: [3, 16], win: 0.35 }]) {
    let x = 0;
    while (x < W) {
      const w = 10 + Math.floor(rand() * 26);
      const topY = rowOf(EYE + layer.top[0] + rand() * (layer.top[1] - layer.top[0]));
      g.fillStyle = layer.tone;
      g.fillRect(x, topY, w, H - topY);
      if (rand() > 0.7) g.fillRect(x + Math.floor(w / 2) - 1, topY - 6, 2, 6); // antenna
      for (let wy = topY + 3; wy < H - 2; wy += 4) {
        for (let wx = x + 2; wx < x + w - 2; wx += 3) {
          if (rand() < layer.win) {
            g.fillStyle = rand() > 0.3 ? '#ffd27a' : '#7fe0ff';
            g.fillRect(wx, wy, 1, 2);
          }
        }
      }
      x += w + Math.floor(rand() * 3);
    }
  }
  // Neon signs on a few rooftops
  const NEON = ['#ff4fd8', '#4bf0ff', '#ffbe3b'];
  for (let i = 0; i < 7; i++) {
    g.fillStyle = NEON[i % 3];
    const nx = Math.floor(rand() * (W - 20));
    const ny = rowOf(EYE + 4 + rand() * 8);
    g.fillRect(nx, ny, 10 + Math.floor(rand() * 10), 2);
  }
}

// ---- Sunrise over the hills (Trust God Anyway) -----------------------------
function paintSunrise(g) {
  const W = g.canvas.width;
  const H = g.canvas.height;
  const rand = seeded(7);
  const horizon = rowOf(EYE);
  gradient(g, [[0, '#2a3f8f'], [0.35, '#6a5fb0'], [0.6, '#e98a9a'], [horizon / H, '#ffc46b'], [1, '#ffb070']]);
  // The sun, just rising, with soft rings around it
  const sx = colOf(-8);
  const sy = rowOf(EYE + 4);
  for (const [r, c] of [[34, 'rgba(255,220,140,0.18)'], [22, 'rgba(255,230,160,0.3)'], [14, '#fff1b8']]) {
    g.fillStyle = c;
    g.beginPath();
    g.arc(sx, sy, r, 0, Math.PI * 2);
    g.fill();
  }
  // Long pixel clouds, lit from below
  for (let i = 0; i < 9; i++) {
    const cy = Math.floor(rand() * horizon * 0.7) + 8;
    const cx = Math.floor(rand() * W);
    const cw = 30 + Math.floor(rand() * 60);
    g.fillStyle = 'rgba(255, 214, 196, 0.55)';
    g.fillRect(cx, cy, cw, 3);
    g.fillStyle = 'rgba(255, 170, 150, 0.45)';
    g.fillRect(cx + 6, cy + 3, cw - 12, 2);
  }
  // Mountain ranges: far (hazy purple) to near (dark green)
  const ranges = [
    { tone: '#8a6aa8', base: EYE + 1, peak: 11, jag: 0.6 },
    { tone: '#5a4a86', base: EYE - 1, peak: 7, jag: 0.8 },
    { tone: '#2d3f3a', base: EYE - 3, peak: 4, jag: 1.2 },
  ];
  for (const r of ranges) {
    g.fillStyle = r.tone;
    let h = rand() * r.peak;
    for (let x = 0; x < W; x++) {
      h += (rand() - 0.5) * r.jag;
      h = Math.max(0, Math.min(r.peak, h + (rand() < 0.01 ? (rand() - 0.5) * 6 : 0)));
      const top = rowOf(r.base + h);
      g.fillRect(x, top, 1, H - top);
    }
  }
  // A few birds
  g.fillStyle = '#2a2240';
  for (let i = 0; i < 6; i++) {
    const bx = colOf(-30 + rand() * 60);
    const by = rowOf(EYE + 14 + rand() * 10);
    g.fillRect(bx, by, 2, 1);
    g.fillRect(bx + 2, by + 1, 1, 1);
    g.fillRect(bx + 3, by, 2, 1);
  }
}

// ---- Props -------------------------------------------------------------------
/**
 * Hanging lights (or flags) along a sagging line between two points: a
 * "catenary", like a real cable. Returns the points along it.
 */
function sagLine(a, b, sag, count) {
  const pts = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const p = new THREE.Vector3().lerpVectors(a, b, t);
    p.y -= sag * 4 * t * (1 - t);
    pts.push(p);
  }
  return pts;
}

/** String lights: warm bulbs that twinkle (one Points object = one draw call). */
function stringLights(group, lines, color) {
  const pts = lines.flatMap(([a, b, sag, n]) => sagLine(a, b, sag, n));
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.PointsMaterial({ color, size: 0.28, transparent: true, opacity: 0.95, depthWrite: false });
  const bulbs = new THREE.Points(geo, mat);
  group.add(bulbs);
  // The wires
  const wireMat = new THREE.LineBasicMaterial({ color: '#1a1424' });
  for (const [a, b, sag] of lines) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(sagLine(a, b, sag, 24)), wireMat));
  return { mat };
}

function buildRooftop(group) {
  const dark = new THREE.MeshLambertMaterial({ color: '#2a2740' });
  // A low wall (parapet) around the roof, behind the stage and down the sides
  const back = new THREE.Mesh(new THREE.BoxGeometry(70, 1.1, 0.6), dark);
  back.position.set(0, 0.55, Z0 - 17);
  group.add(back);
  for (const x of [-22, 22]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 40), dark);
    side.position.set(x, 0.55, Z0 + 3);
    group.add(side);
  }
  // A water tower and some air-conditioning boxes on the roof
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3.4, 12), new THREE.MeshLambertMaterial({ color: '#4a3a32' }));
  tank.position.set(-17, 7.2, Z0 - 12);
  group.add(tank);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.4, 12), new THREE.MeshLambertMaterial({ color: '#3a2c28' }));
  roof.position.set(-17, 9.6, Z0 - 12);
  group.add(roof);
  for (const dx of [-1.4, 1.4]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 5.5, 0.25), dark);
    leg.position.set(-17 + dx, 2.75, Z0 - 12);
    group.add(leg);
  }
  for (const [x, z] of [[15, Z0 - 10], [18, Z0 - 4]]) {
    const ac = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 1.8), new THREE.MeshLambertMaterial({ color: '#545a70' }));
    ac.position.set(x, 0.7, z);
    group.add(ac);
  }
  // Poles at the sides with string lights to the stage truss and across the crowd
  const poleMat = new THREE.MeshLambertMaterial({ color: '#3a3550' });
  for (const x of [-13.5, 13.5]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), poleMat);
    pole.position.set(x, 3.5, -5.5);
    group.add(pole);
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const lights = stringLights(group, [
    [V(-9.4, 9, Z0 - 2), V(-13.5, 6.8, -5.5), 1.2, 16],
    [V(9.4, 9, Z0 - 2), V(13.5, 6.8, -5.5), 1.2, 16],
    [V(-13.5, 6.8, -5.5), V(13.5, 6.8, -5.5), 1.6, 40],
    [V(-9.4, 7.5, Z0 - 2), V(9.4, 7.5, Z0 - 2), 0.8, 30],
  ], '#ffd48a');
  return {
    update(time, beat) {
      lights.mat.opacity = 0.75 + 0.25 * Math.max(0, Math.cos(beat * Math.PI * 2));
    },
  };
}

function buildHill(group) {
  // Pine trees: stacked cones, around the field and behind the stage
  const leaf = [new THREE.MeshLambertMaterial({ color: '#1f4a34' }), new THREE.MeshLambertMaterial({ color: '#2a5a3c' })];
  const trunk = new THREE.MeshLambertMaterial({ color: '#4a3020' });
  const rand = seeded(11);
  const spots = [];
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    spots.push([side * (12 + rand() * 18), Z0 - 2 - rand() * 30]);
  }
  for (let i = 0; i < 10; i++) spots.push([(rand() - 0.5) * 30, Z0 - 16 - rand() * 18]);
  for (const [x, z] of spots) {
    const h = 5 + rand() * 6;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, h * 0.25, 6), trunk);
    t.position.set(x, h * 0.125, z);
    group.add(t);
    for (let k = 0; k < 3; k++) {
      const r = (1.9 - k * 0.45) * (h / 8);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h * 0.42, 7), leaf[k % 2]);
      cone.position.set(x, h * (0.3 + k * 0.22), z);
      group.add(cone);
    }
  }
  // Festival bunting: little triangle flags on lines from the truss to poles
  const poleMat = new THREE.MeshLambertMaterial({ color: '#6a4a30' });
  for (const x of [-13.5, 13.5]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), poleMat);
    pole.position.set(x, 3.5, -5.5);
    group.add(pole);
  }
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const lines = [
    [V(-9.4, 9, Z0 - 2), V(-13.5, 6.8, -5.5), 1.2, 14],
    [V(9.4, 9, Z0 - 2), V(13.5, 6.8, -5.5), 1.2, 14],
    [V(-13.5, 6.8, -5.5), V(13.5, 6.8, -5.5), 1.6, 34],
  ];
  const flagPts = lines.flatMap(([a, b, sag, n]) => sagLine(a, b, sag, n));
  const flagGeo = new THREE.BufferGeometry();
  flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([-0.22, 0, 0, 0.22, 0, 0, 0, -0.45, 0], 3));
  const COLORS = ['#ff6a5b', '#ffbe3b', '#4bbdff', '#63d47a', '#ff7ad1'].map((c) => new THREE.Color(c));
  const flags = new THREE.InstancedMesh(flagGeo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), flagPts.length);
  const m = new THREE.Matrix4();
  flagPts.forEach((p, i) => {
    m.makeTranslation(p.x, p.y, p.z);
    flags.setMatrixAt(i, m);
    flags.setColorAt(i, COLORS[i % COLORS.length]);
  });
  group.add(flags);
  const wireMat = new THREE.LineBasicMaterial({ color: '#3a2a20' });
  for (const [a, b, sag] of lines) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(sagLine(a, b, sag, 24)), wireMat));
  return {
    update(time) {
      // A gentle breeze: the whole bunting sways a touch
      flags.position.y = Math.sin(time * 1.3) * 0.05;
    },
  };
}
