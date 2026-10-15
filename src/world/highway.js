// =============================================================================
// highway.js — the note highway: lanes, beat lines, the hit line, and the
// note gems flying toward you.
//
// COORDINATES: the hit line is at z = 0. "Further away" is negative z.
// A note due in 1 second sits at z = -1 * NOTE_SPEED. Every frame we just
// recompute each note's z from the audio clock — no physics, no drifting.
//
// PERFORMANCE TRICK ("object pool"): instead of creating/destroying a 3D
// object for each of the ~1000 notes, we make ~90 gems once and reuse them
// for whichever notes are currently visible.
// =============================================================================
import * as THREE from 'three';
import { WORLD, LANES, NOTE_SPEED, TRAVEL, LEAD } from '../config.js';
import { SONG } from '../song/chart.js';

const LW = WORLD.laneWidth;
const LEN = WORLD.highwayLength;
const HALF = LW * 2;
export const laneX = (lane) => (lane - 1.5) * LW;

export function createHighway(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const laneColors = LANES.map((l) => new THREE.Color(l.color));

  // ---- Road surface ----------------------------------------------------------
  const roadLen = LEN + 2;
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF * 2 + 0.3, roadLen),
    new THREE.MeshStandardMaterial({ color: '#0d1024', roughness: 0.35, metalness: 0.3 }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, 1.5 - roadLen / 2);
  group.add(road);

  // Tinted strip per lane; it lights up while that lane is pressed.
  const strips = LANES.map((l, i) => {
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(LW * 0.96, roadLen),
      new THREE.MeshBasicMaterial({ color: l.color, transparent: true, opacity: 0.06, depthWrite: false }),
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(laneX(i), 0.005, road.position.z);
    group.add(strip);
    return strip;
  });

  // Lane dividers and glowing outer rails.
  for (let i = 0; i <= 4; i++) {
    const outer = i === 0 || i === 4;
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(outer ? 0.09 : 0.03, outer ? 0.08 : 0.02, roadLen),
      new THREE.MeshBasicMaterial({ color: outer ? '#ffd27a' : '#6f8fe0', transparent: !outer, opacity: outer ? 1 : 0.55 }),
    );
    rail.position.set(-HALF + i * LW, 0.02, road.position.z);
    group.add(rail);
  }

  // ---- Beat lines that scroll toward you in time with the music ------------
  const beatMat = new THREE.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: 0.12, depthWrite: false });
  const downbeatMat = new THREE.MeshBasicMaterial({ color: '#ffd9a0', transparent: true, opacity: 0.3, depthWrite: false });
  const beatGeo = new THREE.PlaneGeometry(HALF * 2, 0.05);
  beatGeo.rotateX(-Math.PI / 2);
  const beatPool = Array.from({ length: 16 }, () => {
    const m = new THREE.Mesh(beatGeo, beatMat);
    m.position.y = 0.01;
    m.visible = false;
    group.add(m);
    return m;
  });

  // ---- Hit line + four targets (receptors) ---------------------------------
  const hitLine = new THREE.Mesh(
    new THREE.BoxGeometry(HALF * 2 + 0.2, 0.05, 0.1),
    new THREE.MeshBasicMaterial({ color: '#fff0c9' }),
  );
  hitLine.position.set(0, 0.03, 0);
  group.add(hitLine);

  const receptors = LANES.map((l, i) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.42, 32),
      new THREE.MeshBasicMaterial({ color: l.color, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(laneX(i), 0.04, 0);
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 32),
      new THREE.MeshBasicMaterial({ color: l.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(laneX(i), 0.035, 0);
    group.add(ring, glow);
    return { ring, glow, flashAt: -99 };
  });

  // ---- Note gems (pooled) ----------------------------------------------------
  const puckGeo = new THREE.CylinderGeometry(0.4, 0.42, 0.16, 28);
  const capGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.17, 24);
  const gemMats = laneColors.map((c) => new THREE.MeshStandardMaterial({
    color: c, emissive: c, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.2,
  }));
  const capMat = new THREE.MeshStandardMaterial({ color: '#fff6dc', emissive: '#fff1c4', emissiveIntensity: 0.6 });
  const missMat = new THREE.MeshStandardMaterial({ color: '#4a4458', roughness: 0.8 });
  const gems = Array.from({ length: 90 }, () => {
    const g = new THREE.Group();
    const puck = new THREE.Mesh(puckGeo, gemMats[0]);
    const cap = new THREE.Mesh(capGeo, capMat);
    g.add(puck, cap);
    g.visible = false;
    group.add(g);
    return { g, puck, cap };
  });

  // Long-note trails (pooled)
  const tailGeo = new THREE.BoxGeometry(0.22, 0.05, 1);
  tailGeo.translate(0, 0, -0.5); // extends "away" from its position
  const tailMats = laneColors.map((c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55 }));
  const tails = Array.from({ length: 24 }, () => {
    const m = new THREE.Mesh(tailGeo, tailMats[0]);
    m.position.y = 0.06;
    m.visible = false;
    group.add(m);
    return m;
  });

  let notes = [];
  let start = 0;

  function setNotes(list) {
    notes = list;
    start = 0;
  }

  function flash(lane, t) {
    receptors[lane].flashAt = t;
  }

  /**
   * @param {number} t        game time
   * @param {(lane:number)=>boolean} isHeld
   */
  function update(t, isHeld) {
    const zFor = (time) => -(time - t) * NOTE_SPEED;

    // Skip notes that are long gone.
    while (start < notes.length && notes[start].time + notes[start].hold < t - 0.6) start++;

    let gi = 0;
    let ti = 0;
    for (let i = start; i < notes.length; i++) {
      const n = notes[i];
      if (n.time - t > TRAVEL + 0.05) break; // not visible yet; nor are later ones
      const isHolding = n.hit && n.hold > 0 && !n.done;
      if (n.hit && !isHolding) continue;      // hit tap notes vanish
      if (n.done && !n.miss) continue;

      let z = zFor(n.time);
      if (isHolding) z = 0;                   // head stays on the line while held
      if (z > 2) continue;

      // Long-note trail
      if (n.hold > 0 && ti < tails.length) {
        const tailZ = Math.max(-LEN, zFor(n.time + n.hold));
        const len = z - tailZ;
        if (len > 0.01) {
          const tail = tails[ti++];
          tail.visible = true;
          tail.material = n.miss ? missMat : tailMats[n.lane];
          tail.position.set(laneX(n.lane), 0.06, z);
          tail.scale.z = len;
        }
      }

      if (gi < gems.length) {
        const gem = gems[gi++];
        gem.g.visible = true;
        gem.g.position.set(laneX(n.lane), 0.1, z);
        gem.puck.material = n.miss ? missMat : gemMats[n.lane];
        gem.cap.visible = !n.miss;
        // Grow slightly as they arrive, and spin a hold note's head while held.
        const s = n.hold > 0 ? 1.08 : 1;
        gem.g.scale.set(s, s, s);
        gem.g.rotation.y = isHolding ? t * 8 : 0;
      }
    }
    for (; gi < gems.length; gi++) gems[gi].g.visible = false;
    for (; ti < tails.length; ti++) tails[ti].visible = false;

    // Beat lines from the real detected beats.
    let bi = 0;
    const songTime = t - LEAD;
    for (let b = 0; b < SONG.beats.length && bi < beatPool.length; b++) {
      const dt = SONG.beats[b] - songTime;
      if (dt < -0.1) continue;
      if (dt > TRAVEL) break;
      const line = beatPool[bi++];
      line.visible = true;
      line.position.z = -dt * NOTE_SPEED;
      line.material = b % 4 === 0 ? downbeatMat : beatMat;
    }
    for (; bi < beatPool.length; bi++) beatPool[bi].visible = false;

    // Receptors: glow while pressed, flash on hits.
    receptors.forEach((r, lane) => {
      const held = isHeld(lane);
      const since = t - r.flashAt;
      const f = since >= 0 && since < 0.25 ? 1 - since / 0.25 : 0;
      r.glow.material.opacity = (held ? 0.35 : 0) + f * 0.6;
      const s = 1 + (held ? 0.12 : 0) + f * 0.25;
      r.ring.scale.set(s, s, s);
      strips[lane].material.opacity = held ? 0.2 : 0.06;
    });
  }

  return { group, update, setNotes, flash };
}
