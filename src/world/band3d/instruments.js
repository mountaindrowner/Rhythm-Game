// =============================================================================
// instruments.js — guitar, bass, microphone and drum kit, built from shapes.
//
// Guitar bodies use THREE.Shape (a 2D outline, like drawing with a pen) and
// ExtrudeGeometry (which pushes that outline out into a 3D slab).
//
// Each stringed instrument's local space: x runs along the neck (body at 0,
// headstock at +x), y is "up" across the strings, z points out of the front.
// The returned object includes points the hands should reach for.
// =============================================================================
import * as THREE from 'three';
import { box, part } from './rig.js';

/** Electric guitar or bass. opts: { body, pickguard, neckLength, scale } */
export function buildStringed({ body, pickguard, neckLength, bodyScale = 1 }) {
  const g = new THREE.Group();

  // Body outline (an offset double-cutaway shape), centered near the origin.
  const s = new THREE.Shape();
  s.moveTo(-0.55, -0.05);
  s.bezierCurveTo(-0.6, -0.42, -0.2, -0.5, 0.05, -0.36);
  s.bezierCurveTo(0.2, -0.28, 0.3, -0.35, 0.42, -0.24);
  s.bezierCurveTo(0.5, -0.16, 0.38, -0.08, 0.3, -0.07);
  s.lineTo(0.3, 0.07);
  s.bezierCurveTo(0.42, 0.1, 0.55, 0.22, 0.42, 0.3);
  s.bezierCurveTo(0.3, 0.38, 0.18, 0.27, 0.05, 0.33);
  s.bezierCurveTo(-0.2, 0.46, -0.6, 0.36, -0.55, -0.05);
  const bodyGeo = new THREE.ExtrudeGeometry(s, {
    depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, curveSegments: 8,
  });
  bodyGeo.translate(0, 0, -0.05);
  bodyGeo.scale(bodyScale, bodyScale, 1);
  const bodyMesh = part(bodyGeo, body);
  g.add(bodyMesh);

  // Pickguard, pickups, bridge and knobs on the front
  box(g, 0.32, 0.2, 0.02, -0.12 * bodyScale, -0.1 * bodyScale, 0.075, pickguard);
  box(g, 0.05, 0.16, 0.02, 0.05, 0, 0.09, '#1a1a1a');
  box(g, 0.05, 0.16, 0.02, -0.12, 0, 0.09, '#1a1a1a');
  box(g, 0.06, 0.2, 0.03, -0.35 * bodyScale, 0, 0.09, '#c8c8d0');
  for (let k = 0; k < 2; k++) box(g, 0.05, 0.05, 0.04, (-0.3 - k * 0.1) * bodyScale, -0.22 * bodyScale, 0.09, '#d8d0c0');

  // Neck, fretboard, headstock, tuning pegs, strings
  const neckStart = 0.25;
  box(g, neckLength, 0.11, 0.07, neckStart + neckLength / 2, 0, 0.04, '#b07a3c');
  box(g, neckLength, 0.1, 0.02, neckStart + neckLength / 2, 0, 0.085, '#3b2416');
  const head = neckStart + neckLength;
  box(g, 0.26, 0.15, 0.05, head + 0.12, 0.02, 0.04, body);
  for (let k = 0; k < 3; k++) box(g, 0.04, 0.04, 0.06, head + 0.04 + k * 0.08, 0.1, 0.06, '#d8d8e0');
  box(g, neckLength + 0.6, 0.06, 0.01, neckStart + neckLength / 2 - 0.3, 0, 0.1, '#e8e4d8');

  return {
    group: g,
    // Where the strumming hand plucks/strums (in instrument space)
    strumPoint: new THREE.Vector3(-0.02, 0, 0.16),
    // The fretting hand slides between these two points along the neck
    fretNear: new THREE.Vector3(neckStart + 0.15, 0, 0.12),
    fretFar: new THREE.Vector3(neckStart + neckLength * 0.75, 0, 0.12),
  };
}

/** Handheld microphone; attach it to a hand. */
export function buildMic() {
  const g = new THREE.Group();
  const handle = part(new THREE.CylinderGeometry(0.045, 0.035, 0.32, 10), '#202028');
  handle.position.y = -0.05;
  const grille = part(new THREE.SphereGeometry(0.085, 12, 10), '#b8bcc8');
  grille.position.y = 0.16;
  g.add(handle, grille);
  return g;
}

/**
 * A red drum kit with a flame emblem on the kick drum. Positions are in the
 * drummer's space (he sits at the origin facing +z).
 * Returns hit points for each drum/cymbal and their meshes (for wobble).
 */
export function buildDrumKit(emblemTexture) {
  const kit = new THREE.Group();
  const SHELL = '#b3202b';
  const HEAD = '#efe9dc';
  const CHROME = '#9aa0ad';
  const brass = new THREE.MeshLambertMaterial({ color: '#e0a83a', emissive: '#3a2400' });

  const drum = (r, h, x, y, z, tiltX = 0) => {
    const g = new THREE.Group();
    const body = part(new THREE.CylinderGeometry(r, r, h, 20), SHELL);
    const top = part(new THREE.CylinderGeometry(r * 0.97, r * 0.97, 0.01, 20), HEAD);
    top.position.y = h / 2 + 0.005;
    g.add(body, top);
    g.position.set(x, y, z);
    g.rotation.x = tiltX;
    g.userData.keep = true; // wobbles when hit
    kit.add(g);
    return g;
  };
  const stand = (x, z, height) => {
    const m = part(new THREE.CylinderGeometry(0.025, 0.025, height, 6), CHROME);
    m.position.set(x, height / 2, z);
    kit.add(m);
  };
  const cymbal = (r, x, y, z, tilt) => {
    const geo = new THREE.ConeGeometry(r, 0.06, 24, 1, true);
    const m = new THREE.Mesh(geo, brass);
    m.material.side = THREE.DoubleSide;
    m.position.set(x, y, z);
    m.rotation.set(tilt, 0, 0);
    m.userData.keep = true; // wobbles when hit
    kit.add(m);
    stand(x, z - 0.05, y);
    return m;
  };

  // Kick drum lying on its side, emblem facing the crowd
  const kick = new THREE.Group();
  const kickShell = part(new THREE.CylinderGeometry(0.6, 0.6, 0.55, 28), SHELL);
  kickShell.rotation.x = Math.PI / 2;
  const front = new THREE.Mesh(new THREE.CircleGeometry(0.57, 28), new THREE.MeshLambertMaterial({ map: emblemTexture }));
  front.position.z = 0.28;
  kick.add(kickShell, front);
  kick.position.set(0, 0.6, 1.05);
  kit.add(kick);

  const snare = drum(0.3, 0.18, 0.42, 1.45, 0.62, 0.15);
  stand(0.42, 0.62, 1.36);
  const tom1 = drum(0.24, 0.24, 0.27, 1.98, 0.98, 0.45);
  const tom2 = drum(0.26, 0.26, -0.28, 1.98, 0.98, 0.45);
  const floorTom = drum(0.34, 0.45, -0.85, 1.15, 0.55);
  stand(-0.85, 0.55, 0.95);
  // Hi-hat (two cymbals) on the drummer's left (+x)
  const hatTop = cymbal(0.3, 0.92, 1.72, 0.55, 0);
  const hatBottom = cymbal(0.3, 0.92, 1.66, 0.55, 0);
  hatBottom.rotation.x = Math.PI;
  const crash = cymbal(0.42, 0.85, 2.55, 0.95, 0.35);
  const ride = cymbal(0.45, -1.0, 2.25, 0.9, 0.3);
  // Stool
  box(kit, 0.6, 0.12, 0.6, 0, 1.0, 0, '#202028');
  stand(0, 0, 0.95);
  // Pedals
  box(kit, 0.2, 0.05, 0.4, 0.15, 0.04, 0.55, '#555a66');
  box(kit, 0.2, 0.05, 0.4, 0.75, 0.04, 0.35, '#555a66');

  const pt = (x, y, z) => new THREE.Vector3(x, y, z);
  return {
    group: kit,
    hits: {
      snare: { point: pt(0.38, 1.6, 0.6), mesh: snare },
      hat: { point: pt(0.85, 1.8, 0.5), mesh: hatTop },
      tom1: { point: pt(0.27, 2.12, 0.92), mesh: tom1 },
      tom2: { point: pt(-0.28, 2.13, 0.92), mesh: tom2 },
      floor: { point: pt(-0.8, 1.42, 0.5), mesh: floorTom },
      crash: { point: pt(0.75, 2.62, 0.8), mesh: crash },
      ride: { point: pt(-0.92, 2.32, 0.75), mesh: ride },
    },
    kickPedal: pt(0.15, 0.12, 0.5),
    hatPedal: pt(0.75, 0.12, 0.3),
  };
}

/** Pixel-art flame emblem for the kick drum, drawn on a small canvas. */
export function flameEmblem() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#f2ece0';
  g.fillRect(0, 0, 32, 32);
  const flame = [
    '..........##..........',
    '.........###..........',
    '........####...#......',
    '.......#####..##......',
    '......######.###......',
    '.....##########.......',
    '....###########..#....',
    '....############.#....',
    '...###...#######.#....',
    '...##.....#######.....',
    '...##......######.....',
    '...###.....######.....',
    '....###...######......',
    '.....##########.......',
    '.......######.........',
  ];
  g.fillStyle = '#26202c';
  flame.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') g.fillRect(x + 5, y + 8, 1, 1); }));
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
