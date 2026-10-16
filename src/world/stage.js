// =============================================================================
// stage.js — the concert venue: stage platform, drum riser, LED wall, truss,
// speakers, moving spotlights and the crowd.
//
// setVenue() dresses it as one of the places in venues.js (arena, rooftop,
// sunrise...): colors, sky, LED screen size, backdrop and extra props.
//
// Everything here is built from simple shapes (boxes, planes, cones) so it is
// cheap for phones to draw. update() runs every frame and makes the lights and
// crowd react to the beat and to how intense the current song section is.
// =============================================================================
import * as THREE from 'three';
import { WORLD } from '../config.js';
import { VENUES, BACKDROP } from './venues.js';

const Z0 = WORLD.stageZ;          // front edge of the stage
const TOP = WORLD.stageHeight;    // stage floor height
const DEPTH = 9;                  // stage depth (front to back)

// The drum riser's position is shared with band.js so the drummer stands on it.
export const DRUM_RISER = { x: 1.9, z: Z0 - 5.4, h: 1.6 };

// Where each musician stands on stage (x and z). Used by the bands, and by
// the effects that aim at one of them (solo spotlight, flames, lightning).
export const BAND_SPOTS = {
  bassist:   { x: -5.0, z: Z0 - 2.3 },
  singer:    { x: -1.5, z: Z0 - 1.3 },
  guitarist: { x: 5.0,  z: Z0 - 2.3 },
  drummer:   { x: DRUM_RISER.x, z: DRUM_RISER.z - 0.4 },
};

// Colors used per song section: [main light, accent light].
const MOODS = {
  OPENING: ['#3b6dff', '#8f5bff'],
  VERSE: ['#4bbdff', '#ffb066'],
  BUILD: ['#5ef0ff', '#ffbe3b'],
  CHORUS: ['#ff8a3d', '#ff4f8b'],
  REFRAIN: ['#ffbe3b', '#4bbdff'],
  BRIDGE: ['#9b5bff', '#ff5bd1'],
  OUTRO: ['#ffcf6b', '#ff6a3d'],
};
export function moodFor(section) {
  const key = Object.keys(MOODS).find((k) => section.includes(k)) || 'VERSE';
  return MOODS[section.startsWith('FINAL') ? 'CHORUS' : key];
}

export function createStage(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1, ...extra });

  // ---- Venue floor and stage platform --------------------------------------
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), std('#100d1d'));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, -0.01, -15);
  group.add(floor);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(20, TOP, DEPTH), std('#2a1f3d', { roughness: 0.45 }));
  deck.position.set(0, TOP / 2, Z0 - DEPTH / 2);
  group.add(deck);

  // Glowing strip along the stage's front edge.
  const edge = new THREE.Mesh(new THREE.BoxGeometry(20, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: '#ff9b52' }));
  edge.position.set(0, TOP, Z0);
  group.add(edge);

  // Drum riser — lifts the drummer so he's visible behind the singer.
  const riser = new THREE.Mesh(new THREE.BoxGeometry(5, DRUM_RISER.h, 3), std('#33264d'));
  riser.position.set(DRUM_RISER.x, TOP + DRUM_RISER.h / 2, DRUM_RISER.z - 0.4);
  group.add(riser);
  const riserEdge = edge.clone();
  riserEdge.scale.set(5 / 20, 1, 1);
  riserEdge.position.set(DRUM_RISER.x, TOP + DRUM_RISER.h, DRUM_RISER.z + 1.1);
  group.add(riserEdge);

  // ---- LED wall: a canvas we draw pixel graphics into, used as a texture ---
  const led = document.createElement('canvas');
  led.width = 192;
  led.height = 84;
  const ledCtx = led.getContext('2d');
  const ledTex = new THREE.CanvasTexture(led);
  ledTex.magFilter = THREE.NearestFilter; // keep pixels crisp
  ledTex.colorSpace = THREE.SRGBColorSpace;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(17, 7.4), new THREE.MeshBasicMaterial({ map: ledTex, fog: false }));
  wall.position.set(0, TOP + 6.6, Z0 - DEPTH + 0.2);
  group.add(wall);

  // ---- Backdrop: far-away scenery for outdoor venues (one big flat picture) --
  const backdropCanvas = document.createElement('canvas');
  backdropCanvas.width = BACKDROP.px;
  backdropCanvas.height = BACKDROP.py;
  const backdropTex = new THREE.CanvasTexture(backdropCanvas);
  backdropTex.magFilter = THREE.NearestFilter; // chunky pixels, like the band
  backdropTex.colorSpace = THREE.SRGBColorSpace;
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(BACKDROP.width, BACKDROP.height),
    new THREE.MeshBasicMaterial({ map: backdropTex, fog: false, depthWrite: false }),
  );
  backdrop.position.set(0, BACKDROP.bottom + BACKDROP.height / 2, BACKDROP.z);
  backdrop.renderOrder = -1; // drawn first, behind everything
  backdrop.visible = false;
  group.add(backdrop);

  // ---- Truss (the metal frame holding the lights) ---------------------------
  const metal = std('#4a4f6b', { metalness: 0.6, roughness: 0.4 });
  for (const x of [-9.4, 9.4]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.45, 10, 0.45), metal);
    tower.position.set(x, 5, Z0 - 2);
    group.add(tower);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(19.2, 0.5, 0.5), metal);
  beam.position.set(0, 10, Z0 - 2);
  group.add(beam);

  // Chase lights along the bottom of the truss beam
  const chase = [];
  for (let i = 0; i < 14; i++) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.2), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    lamp.position.set(-8.45 + i * 1.3, 9.65, Z0 - 1.7);
    group.add(lamp);
    chase.push(lamp);
  }

  // ---- Speaker stacks --------------------------------------------------------
  const cabMat = std('#1b1830');
  const coneMat = std('#2c3566', { roughness: 0.3 });
  for (const x of [-8, 8]) {
    for (let k = 0; k < 2; k++) {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.6, 1.3), cabMat);
      cab.position.set(x, TOP + 0.8 + k * 1.65, Z0 - 1.2);
      group.add(cab);
      const cone = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20), coneMat);
      cone.position.set(x, TOP + 0.8 + k * 1.65, Z0 - 0.54);
      group.add(cone);
    }
  }

  // ---- Moving spotlights -----------------------------------------------------
  // Each one is a real SpotLight (lights the stage) plus a see-through cone
  // (the visible beam you'd see in a smoky venue).
  const spots = [];
  const spotXs = [-6, -2, 2, 6];
  spotXs.forEach((x, i) => {
    const light = new THREE.SpotLight('#ffffff', 40, 0, 0.42, 0.6, 1.2);
    light.position.set(x, 9.7, Z0 - 2);
    light.target.position.set(x * 0.4, TOP, Z0 - 3);
    group.add(light, light.target);

    const beamMat = new THREE.MeshBasicMaterial({
      color: '#ffffff', transparent: true, opacity: 0.08,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    const coneGeo = new THREE.ConeGeometry(2.2, 9, 24, 1, true);
    coneGeo.translate(0, -4.5, 0); // put the cone's tip at the pivot point
    const cone = new THREE.Mesh(coneGeo, beamMat);
    cone.position.copy(light.position);
    group.add(cone);
    spots.push({ light, cone, x, phase: i * 1.7 });
  });

  // ---- Where the crowd stands (drawn by crowd.js; used by showfx.js too) ----
  // Fans stand on both sides of the highway, between you and the stage, in
  // loose ROWS: packed tight against the stage barrier, then thinning out
  // toward you so you can pick out individual people. Each row is a little
  // wider than the one in front of it, like a real crowd fanning out.
  const fans = [];
  const rand = mulberry32(7);
  // Row depths: a few rows close together by the stage, then rows further and
  // further apart all the way back toward you (z = -3.6 is just past the far
  // end of the note highway's sides), so the crowd has real depth and you can
  // pick out individual people.
  const ROW_Z = [Z0 + 0.8, Z0 + 2.2, Z0 + 3.8, Z0 + 5.6, Z0 + 7.6, Z0 + 9.8, Z0 + 11.8, Z0 + 13.4];
  let lookCycle = 0; // hands out fan sprites in turn so neighbours look different
  ROW_Z.forEach((z, r) => {
    const k = r / (ROW_Z.length - 1);              // 0 = by the stage, 1 = near you
    const gap = 1.8 + k * 1.0;                     // space between fans in this row
    const inner = 3.6 - k * 0.6;                   // closest a fan stands to the note highway
    const outer = 10.5 + k * 2.5;                  // how far out to the side the row goes
    const stagger = r % 2 ? gap / 2 : 0;           // back-row heads peek between front-row heads
    for (const side of [-1, 1]) {
      for (let x = inner + stagger + rand() * 0.3; x < outer; x += gap * (0.85 + rand() * 0.3)) {
        if (rand() < 0.35 - k * 0.2) continue;     // gaps in the crowd (most by the stage, so it isn't crammed)
        lookCycle += 1 + Math.floor(rand() * 3);   // skip 1-3 sprites each time
        fans.push({
          x: side * x,
          z: z + (rand() - 0.5) * 0.6,             // not perfectly lined up
          s: 0.85 + rand() * 0.3,          // size variation
          phase: rand() * Math.PI * 2,     // so they don't all jump (or sway) together
          jumpy: rand(),                   // how easily this fan gets hyped
          look: lookCycle,                 // which fan sprite (crowd.js picks)
        });
      }
    }
  });
  // Sorted far-to-near so nearer fans are drawn in front.
  fans.sort((a, b) => a.z - b.z);

  // ---- Floating haze specks for atmosphere ---------------------------------
  const hazeCount = 160;
  const hazePos = new Float32Array(hazeCount * 3);
  for (let i = 0; i < hazeCount; i++) {
    hazePos[i * 3] = (rand() - 0.5) * 18;
    hazePos[i * 3 + 1] = TOP + rand() * 9;
    hazePos[i * 3 + 2] = Z0 + 2 - rand() * 10;
  }
  const hazeGeo = new THREE.BufferGeometry();
  hazeGeo.setAttribute('position', new THREE.BufferAttribute(hazePos, 3));
  const haze = new THREE.Points(hazeGeo, new THREE.PointsMaterial({
    color: '#ffd9a8', size: 0.06, transparent: true, opacity: 0.5,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  group.add(haze);

  // ---- Venues ----------------------------------------------------------------
  const hemi = scene.children.find((o) => o.isHemisphereLight);
  const venueProps = {}; // built the first time a venue is used: { group, update }
  let venueId = '';
  let venue = VENUES.arena;

  /** Dress the stage as one of the venues in venues.js. */
  function setVenue(id) {
    venue = VENUES[id] || VENUES.arena;
    venueId = VENUES[id] ? id : 'arena';
    scene.background = new THREE.Color(venue.sky);
    scene.fog.color.set(venue.fog[0]);
    scene.fog.near = venue.fog[1];
    scene.fog.far = venue.fog[2];
    if (hemi) {
      hemi.color.set(venue.light[0]);
      hemi.groundColor.set(venue.light[1]);
      hemi.intensity = venue.light[2];
    }
    floor.material.color.set(venue.floor);
    deck.material.color.set(venue.deck);
    // Indoors: the giant LED wall. Outdoors: a smaller screen raised up high,
    // so the scenery shows behind the band.
    // Both sit just under the truss, with the band name near the top, so it
    // shows above the drummer's head.
    if (venue.screen === 'banner') {
      wall.scale.setScalar(0.8);
      wall.position.y = TOP + 7.55;
    } else {
      wall.scale.setScalar(1);
      wall.position.y = TOP + 6.6;
    }
    backdrop.visible = !!venue.backdrop;
    if (venue.backdrop) {
      const g = backdropCanvas.getContext('2d');
      g.clearRect(0, 0, BACKDROP.px, BACKDROP.py);
      venue.backdrop(g);
      backdropTex.needsUpdate = true;
    }
    for (const [key, p] of Object.entries(venueProps)) p.group.visible = key === venueId;
    if (venue.props && !venueProps[venueId]) {
      const propGroup = new THREE.Group();
      group.add(propGroup);
      venueProps[venueId] = { group: propGroup, ...venue.props(propGroup) };
    }
    lastLedKey = ''; // redraw the LED screen with this venue's subtitle
  }

  // ---- Per-frame animation -------------------------------------------------
  const cA = new THREE.Color();
  const cB = new THREE.Color();
  const WHITE = new THREE.Color('#ffffff');
  const DIM = new THREE.Color('#2a2440');
  let lastLedKey = '';
  let lastIntensity = 0.5;

  /**
   * @param {number} time       seconds (any steadily increasing clock)
   * @param {number} beat       beat position (e.g. 41.3)
   * @param {string} section    e.g. "CHORUS 1"
   * @param {number} hype       0..1 extra excitement from the player's combo
   */
  function update(time, beat, section, hype) {
    const phase = ((beat % 1) + 1) % 1;
    const pulse = Math.pow(1 - phase, 4); // 1 right on the beat, fades quickly
    const big = section.includes('CHORUS') || section === 'OUTRO';
    const intensity = (big ? 1 : section.includes('BUILD') ? 0.75 : section === 'OPENING' ? 0.35 : 0.55) + hype * 0.3;
    const [main, accent] = moodFor(section);
    cA.set(main);
    cB.set(accent);

    spots.forEach((s, i) => {
      const swing = Math.sin(time * (0.7 + intensity * 0.6) + s.phase) * (0.25 + intensity * 0.25);
      s.cone.rotation.z = swing;
      s.cone.rotation.x = Math.sin(time * 0.5 + s.phase) * 0.15;
      const col = i % 2 ? cB : cA;
      s.cone.material.color.copy(col);
      s.cone.material.opacity = 0.03 + intensity * 0.05 + pulse * 0.07 * intensity;
      s.light.color.copy(col);
      s.light.intensity = 15 + intensity * 30 + pulse * 40 * intensity;
      s.light.target.position.x = s.x + Math.sin(swing) * 9;
    });

    edge.material.color.copy(cA).lerp(WHITE, pulse * 0.5);
    const lit = Math.floor(beat * 2);
    chase.forEach((lamp, i) => {
      const on = big ? (i + lit) % 3 === 0 : (i + lit) % 7 === 0;
      lamp.material.color.copy(on ? (i % 2 ? cA : cB) : DIM);
    });

    haze.rotation.y = Math.sin(time * 0.05) * 0.05;
    lastIntensity = intensity;
    venueProps[venueId]?.update?.(time, beat);

    // Redraw the LED wall only when something visible changes (saves battery).
    const step = Math.floor(beat * 2);
    const fireStep = big ? Math.floor(time * 12) : 0; // flames flicker 12×/s
    const key = `${step}|${section}|${Math.round(hype * 4)}|${fireStep}`;
    if (key !== lastLedKey) {
      lastLedKey = key;
      drawLed(ledCtx, step, intensity, main, accent, big ? fireStep : -1, venue.subtitle);
      ledTex.needsUpdate = true;
    }
  }

  setVenue('arena');
  return {
    group, update, fans, setVenue,
    get intensity() { return lastIntensity; },
    get venue() { return venueId; },
  };
}

/**
 * Pixel-art LED wall: animated equalizer bars + the band name.
 * During choruses (fire >= 0) the bars become flickering flames.
 */
function drawLed(g, step, intensity, main, accent, fire, subtitle) {
  const W = g.canvas.width;
  const H = g.canvas.height;
  g.fillStyle = '#0d0b1c';
  g.fillRect(0, 0, W, H);
  // LED dot grid
  for (let x = 0; x < W; x += 4) {
    for (let y = 0; y < H; y += 4) {
      g.fillStyle = (x + y) % 12 === 0 ? '#1d1a33' : '#15132a';
      g.fillRect(x, y, 3, 3);
    }
  }
  if (fire >= 0) {
    // Flames: columns of hot pixels, flickering
    const FIRE = ['#ff3b1f', '#ff6a1f', '#ff9d2e', '#ffd34d', '#fff2b0'];
    for (let x = 0; x < W; x += 4) {
      const h = Math.floor((0.35 + 0.65 * hash(x * 7 + fire * 13)) * 9) * 4;
      for (let y = 0; y < h; y += 4) {
        g.fillStyle = FIRE[Math.min(FIRE.length - 1, Math.floor((y / h) * FIRE.length))];
        g.fillRect(x, H - 4 - y, 3, 3);
      }
    }
  } else {
    // Equalizer bars along the bottom, pseudo-random per half-beat
    const bars = 24;
    for (let i = 0; i < bars; i++) {
      const h = Math.floor((0.25 + 0.75 * hash(i * 13 + step * 7)) * intensity * 7) * 4;
      g.fillStyle = i % 2 ? main : accent;
      for (let y = 0; y < h; y += 4) g.fillRect(i * 8 + 1, H - 4 - y, 6, 3);
    }
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  drawBandLogo(g, W / 2, 17, main);
  g.font = 'bold 9px monospace';
  g.fillStyle = '#ffc86b';
  g.fillText(subtitle, W / 2, 36);
}

/**
 * The X-ROADS logo in chunky pixels: a big crossed "X" (two roads meeting at
 * a crossroads) in the current light color, then "ROADS".
 */
function drawBandLogo(g, cx, cy, color) {
  g.font = 'bold 24px monospace';
  g.textBaseline = 'middle';
  const roads = 'ROADS';
  const roadsW = g.measureText(roads).width;
  const xSize = 22;
  const dashW = 7;  // the "-" in X-ROADS
  const gap = 4;
  const left = cx - (xSize + gap + dashW + gap + roadsW) / 2;
  // The X: two thick diagonal "roads" with dashed center lines.
  const drawRoad = (x1, y1, x2, y2) => {
    g.strokeStyle = '#1a0f24';
    g.lineWidth = 9;
    g.beginPath(); g.moveTo(x1 + 1, y1 + 2); g.lineTo(x2 + 1, y2 + 2); g.stroke();
    g.strokeStyle = color;
    g.lineWidth = 7;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    g.strokeStyle = '#fff2d1';
    g.lineWidth = 1;
    g.setLineDash([2, 2]);
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    g.setLineDash([]);
  };
  drawRoad(left, cy - xSize / 2, left + xSize, cy + xSize / 2);
  drawRoad(left + xSize, cy - xSize / 2, left, cy + xSize / 2);
  // The dash, as a little road segment
  const dashX = left + xSize + gap;
  g.fillStyle = '#1a0f24';
  g.fillRect(dashX + 1, cy - 1, dashW, 4);
  g.fillStyle = '#fff2d1';
  g.fillRect(dashX, cy - 2, dashW, 4);
  const textX = dashX + dashW + gap;
  g.textAlign = 'left';
  g.fillStyle = '#2a1238';
  g.fillText(roads, textX + 2, cy + 2);
  g.fillStyle = '#fff2d1';
  g.fillText(roads, textX, cy);
  g.textAlign = 'center';
}

function hash(n) {
  const k = Math.sin(n * 83.714 + 12.49) * 43758.23;
  return k - Math.floor(k);
}

/** Small seeded random generator so the crowd looks the same every time. */
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
