// =============================================================================
// bandPixel.js — the four musicians as flat pixel-art cut-outs (the original
// art style). Choose it in Settings → Band look → Pixel art.
//
// Each musician is a flat "cut-out" (a plane) standing in the 3D world, showing
// one pose from the sprite atlas (assets/art/burn_bright_clean_atlas.png).
// The atlas is a grid: 7 poses across, 4 musicians down. Picking a pose just
// means sliding which part of the image the plane shows (texture offset).
//
// Pose meanings (columns):
//   0 neutral · 1 alternate · 2 strong/expressive · 3 low/forward
//   4 big accent · 5 mistake · 6 recovery
//
// TWO LAYERS OF ANIMATION:
//   * Music layer: whenever the chart has a note for a musician's instrument,
//     they play it (even if the player misses it), so the band follows the song.
//   * Player layer: your hits trigger a big accent pose + a colored ring;
//     misses make that one musician stumble, then recover.
// =============================================================================
import * as THREE from 'three';
import { WORLD, LANES, LEAD } from '../config.js';
import { DRUM_RISER } from './stage.js';
import { SONG } from '../song/chart.js';

const COLS = 7;
const ROWS = 4;
const CELL_ASPECT = 240 / 314; // width / height of one pose

const Z0 = WORLD.stageZ;
const TOP = WORLD.stageHeight;

// Where each musician stands. `row` is their row in the atlas.
// Drawn back-to-front automatically because they're real 3D positions.
// The drummer sits on a raised riser, back and right of the singer, so the
// singer never hides him.
const LAYOUT = [
  { lane: 0, row: 0, x: -5.2, y: TOP, z: Z0 - 2.4, h: 5.4 },               // bassist (left)
  { lane: 1, row: 1, x: -1.6, y: TOP, z: Z0 - 1.4, h: 5.6 },               // singer (front)
  { lane: 2, row: 2, x: 5.2, y: TOP, z: Z0 - 2.4, h: 5.4 },                // guitarist (right)
  { lane: 3, row: 3, x: DRUM_RISER.x, y: TOP + DRUM_RISER.h, z: DRUM_RISER.z, h: 5.8 }, // drummer
];

export function createBandPixel(scene, atlasUrl) {
  const group = new THREE.Group();
  scene.add(group);
  let defeated = false;
  const atlas = new THREE.TextureLoader().load(atlasUrl);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.magFilter = THREE.NearestFilter; // crisp pixels up close
  atlas.repeat.set(1 / COLS, 1 / ROWS);

  // Every musician's music cues (from ALL difficulty tiers), as song times.
  const cueTimes = [[], [], [], []];
  for (const n of SONG.allNotes) cueTimes[n.lane].push(n.time);
  cueTimes.forEach((list) => list.sort((a, b) => a - b));

  const shadowMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.45, depthWrite: false });

  const members = LAYOUT.map((spot) => {
    const w = spot.h * CELL_ASPECT;
    const geo = new THREE.PlaneGeometry(w, spot.h);
    geo.translate(0, spot.h / 2, 0); // pivot at the feet
    const tex = atlas.clone();       // shares the image; own offset per musician
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(spot.x, spot.y, spot.z);
    group.add(mesh);

    // Soft shadow on the floor.
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(w * 0.36, 24), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.y = 0.45;
    shadow.position.set(spot.x, spot.y + 0.01, spot.z + 0.2);
    group.add(shadow);

    // A colored ring that bursts outward from their feet when you hit a note.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1, 40),
      new THREE.MeshBasicMaterial({
        color: LANES[spot.lane].color, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(spot.x, spot.y + 0.03, spot.z + 0.2);
    group.add(ring);

    return {
      ...spot, mesh, tex, mat, ring,
      lastHit: -99, lastMistake: -99, lastCue: -99, cueCount: 0, cueIndex: 0,
    };
  });

  function setPose(m, col) {
    m.tex.offset.set(col / COLS, 1 - (m.row + 1) / ROWS);
  }

  /** Player events from rules.js land here. `t` is game time. */
  function onEvent(e, t) {
    const m = members[e.lane];
    if (e.type === 'hit' || e.type === 'holdComplete') m.lastHit = t;
    if (e.type === 'mistake') m.lastMistake = t;
  }

  /** Restart: rewind music cues and clear reactions. */
  function reset() {
    defeated = false;
    for (const m of members) {
      m.lastHit = m.lastMistake = m.lastCue = -99;
      m.cueCount = 0;
      m.cueIndex = 0;
    }
  }

  /**
   * @param {number} t      game time (0 = Start pressed)
   * @param {number} beat   beat position in the song
   * @param {boolean} live  true while a song is playing
   */
  function update(t, beat, live) {
    const songTime = t - LEAD;
    for (const m of members) {
      // Advance this musician's music cues up to now.
      const cues = cueTimes[m.lane];
      while (live && m.cueIndex < cues.length && cues[m.cueIndex] <= songTime) {
        m.cueIndex++;
        m.cueCount++;
        m.lastCue = t;
      }

      const sinceMiss = t - m.lastMistake;
      const sinceHit = t - m.lastHit;
      const sinceCue = t - m.lastCue;
      let pose;
      let bounce = 0;

      if (defeated) {
        pose = 5;                                        // game over: slumped
      } else if (sinceMiss >= 0 && sinceMiss < 0.72) {
        pose = sinceMiss < 0.42 ? 5 : 6;                 // stumble, then recover
      } else if (sinceHit >= 0 && sinceHit < 0.2) {
        pose = m.lane === 1 ? 2 : 4;                     // big accent on your hit
        bounce = (0.2 - sinceHit) * 0.6;
      } else if (live && sinceCue < 0.16) {
        pose = m.cueCount % 2 ? 1 : 3;                   // playing the music
      } else if (live) {
        pose = [0, 1, 0, 3][Math.floor(beat * 2 + m.row) & 3]; // grooving
      } else {
        pose = 0;                                        // idle in the menu
      }
      setPose(m, pose);

      // Little bob on the beat + squash/stretch on hits.
      const phase = ((beat % 1) + 1) % 1;
      const bob = live ? Math.pow(1 - phase, 3) * 0.06 : Math.sin(t * 2 + m.row) * 0.02;
      m.mesh.position.y = m.y + bob + bounce * 0.4;
      m.mesh.scale.set(1 - bounce * 0.15, 1 + bounce * 0.25, 1);

      // Flash red while stumbling.
      if (sinceMiss >= 0 && sinceMiss < 0.42) m.mat.color.setRGB(1, 0.5, 0.5);
      else m.mat.color.setRGB(1, 1, 1);

      // Expanding ring after a hit.
      const ringAge = sinceHit;
      if (ringAge >= 0 && ringAge < 0.45) {
        const s = 1 + ringAge * 5;
        m.ring.scale.set(s, s, s);
        m.ring.material.opacity = 0.9 * (1 - ringAge / 0.45);
      } else {
        m.ring.material.opacity = 0;
      }
    }
  }

  return {
    update, onEvent, reset,
    setDefeated(v) { defeated = v; },
    setVisible(v) { group.visible = v; },
  };
}
