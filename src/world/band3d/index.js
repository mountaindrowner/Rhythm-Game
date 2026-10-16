// =============================================================================
// band3d/index.js — places the four 3D musicians on stage and animates them.
//
// HOW THE ANIMATION STAYS IN TIME: the chart says exactly when each
// instrument plays (charts/song_chart.json). For every musician we look up
// the PREVIOUS and NEXT note for their instrument and shape the motion so a
// strum crosses the strings, or a drumstick touches the drum, at exactly that
// moment. Because it's computed from the audio clock, it can't drift.
//
// LAYERS, from most to least important:
//   1. game over      → everyone slumps
//   2. mistake        → that musician stumbles and shakes their head
//   3. your hit       → big accent (guitar neck up, fist in the air, crash!)
//   4. music cues     → strums, plucks, drum hits, singing
//   5. groove         → head-nods and knee bounces on the beat
// =============================================================================
import * as THREE from 'three';
import { WORLD, LEAD } from '../../config.js';
import { onSongChange } from '../../song/chart.js';
import { DRUM_RISER } from '../stage.js';
import { DIMS, HIP_HEIGHT, solveTwoBone, approach, envelope } from './rig.js';
import { buildBassist, buildSinger, buildGuitarist, buildDrummer } from './members.js';

const Z0 = WORLD.stageZ;
const TOP = WORLD.stageHeight;
const SCALE = 1.22;

// ---- Music cue lists (song time, sorted) -----------------------------------
// Refilled IN PLACE whenever the song changes, so the musicians (which keep
// references to these arrays) always follow the current song.
const byLane = [[], [], [], []];
const byRole = {};
const role = (name) => (byRole[name] ||= []);
const phraseTimes = [];
const dedupe = (list) => list.filter((v, i) => i === 0 || v - list[i - 1] > 0.02);
const refill = (list, values) => { list.length = 0; list.push(...values); };
onSongChange((song) => {
  byLane.forEach((l) => { l.length = 0; });
  Object.values(byRole).forEach((l) => { l.length = 0; });
  for (const n of song.allNotes) {
    byLane[n.lane].push(n.time);
    role(n.role).push(n.time);
  }
  Object.values(byRole).forEach((l) => l.sort((a, b) => a - b));
  byLane.forEach((l) => refill(l, dedupe(l.sort((a, b) => a - b))));
  refill(phraseTimes, dedupe([...role('vocal-phrase')]));
});

/** Index of the last time <= now (or -1), by binary search. */
function lastIndex(times, now) {
  let lo = 0;
  let hi = times.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= now) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

/**
 * Strum position in [-1, 1]. Each cue sweeps the hand across the strings
 * (through 0) in alternating directions — down, up, down, up — landing on 0
 * exactly at the cue time.
 */
function strumCurve(times, now, sweep = 0.07) {
  const i = lastIndex(times, now);
  const dirOf = (k) => (k % 2 ? 1 : -1);
  if (i >= 0 && now - times[i] < sweep) return -dirOf(i) * ((now - times[i]) / sweep);
  const next = i + 1;
  if (next < times.length && times[next] - now < sweep) return dirOf(next) * ((times[next] - now) / sweep);
  return next < times.length ? dirOf(next) : 0;
}

/** Stick/foot lift 0..1: exactly 0 on each hit, rising between hits. */
function liftCurve(times, now, rise = 0.13) {
  const i = lastIndex(times, now);
  const since = i >= 0 ? now - times[i] : 9;
  const until = i + 1 < times.length ? times[i + 1] - now : 9;
  const x = Math.min(1, Math.min(since, until) / rise);
  return x * x * (3 - 2 * x);
}

const hash = (n) => { const k = Math.sin(n * 91.17 + 7.3) * 43758.5; return k - Math.floor(k); };

// ---- Build ----------------------------------------------------------------
export function createBand3D(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const shadowMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.4, depthWrite: false });

  const place = (m, x, y, z, turn) => {
    m.rig.root.position.set(x, y, z);
    m.rig.root.rotation.y = turn;
    m.rig.root.scale.setScalar(SCALE);
    group.add(m.rig.root);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.75, 20), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    m.rig.root.add(shadow);
  };

  const bass = buildBassist();
  const singer = buildSinger();
  const guitar = buildGuitarist();
  const drums = buildDrummer();
  place(bass, -5.0, TOP, Z0 - 2.3, 0.22);
  place(singer, -1.5, TOP, Z0 - 1.3, 0.08);
  place(guitar, 5.0, TOP, Z0 - 2.3, -0.22);
  place(drums, DRUM_RISER.x, TOP + DRUM_RISER.h, DRUM_RISER.z - 0.6, -0.1);

  // Strap the guitar and bass to their players' chests.
  bass.instrument.group.position.set(-0.08, 0.02, 0.44);
  bass.baseTilt = 0.38;
  guitar.instrument.group.position.set(-0.15, 0.1, 0.44);
  guitar.baseTilt = 0.45;
  for (const m of [bass, guitar]) m.rig.chest.add(m.instrument.group);

  // Microphone in the singer's right hand; drum kit and sticks with the drummer.
  singer.rig.arms[0].hand.add(singer.mic);
  singer.mic.position.set(0, -0.14, 0.06);
  drums.rig.root.add(drums.kit.group);
  drums.sticks.forEach((s) => drums.kit.group.add(s));
  drums.rig.hips.position.set(0, 1.06 + 0.18, -0.05);
  for (const piece of Object.values(drums.kit.hits)) {
    piece.base = piece.mesh.rotation.clone();
    piece.struckAt = -99;
  }

  const members = [bass, singer, guitar, drums];
  members.forEach((m, lane) => {
    m.lane = lane;
    m.lastHit = -99;
    m.hitStrength = 0;
    m.lastMistake = -99;
    m.hands = [new THREE.Vector3(), new THREE.Vector3()];
    m.handsInit = false;
    m.pony = { ax: 0, vx: 0, az: 0, vz: 0, lastHead: new THREE.Vector3() };
    m.fret = 0.3;
    m.smooth = { lean: 0, nod: 0, tilt: 0, hipsY: 0 };
  });

  let defeated = false;
  let visible = true;

  // ---- Shared helpers ------------------------------------------------------
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const UP = new THREE.Vector3(0, 1, 0);
  const armPole = [new THREE.Vector3(-1, -0.7, -0.6), new THREE.Vector3(1, -0.7, -0.6)];
  const kneePole = new THREE.Vector3(0, 0, 1);

  /** Put a foot (ankle) at a point given in root space using leg IK. */
  function placeFoot(m, leg, rootPoint, pole = kneePole) {
    const hips = m.rig.hips;
    tmp.copy(rootPoint).sub(hips.position).applyQuaternion(quat.copy(hips.quaternion).invert());
    tmp2.copy(pole).applyQuaternion(quat);
    solveTwoBone(leg.hip, leg.knee, DIMS.thigh, DIMS.shin, tmp, tmp2);
    // keep the foot flat on the floor
    quat.copy(hips.quaternion).multiply(leg.hip.quaternion).multiply(leg.knee.quaternion).invert();
    leg.ankle.quaternion.copy(quat);
  }

  /** Move both hands toward their (chest-space) targets and solve the arms. */
  function placeHands(m, targets, dt, speed = 38) {
    if (!m.handsInit) { m.hands[0].copy(targets[0]); m.hands[1].copy(targets[1]); m.handsInit = true; }
    m.rig.arms.forEach((arm, i) => {
      approach(m.hands[i], targets[i], dt, speed);
      solveTwoBone(arm.shoulder, arm.elbow, DIMS.upperArm, DIMS.foreArm, m.hands[i], armPole[i]);
    });
  }

  /** Body posture shared by everyone. */
  function posture(m, dt, { lean, nod, tilt, hipsY, turn = 0, shake = 0 }) {
    const s = m.smooth;
    const k = 1 - Math.exp(-dt * 18);
    s.lean += (lean - s.lean) * k;
    s.nod += (nod - s.nod) * k;
    s.tilt += (tilt - s.tilt) * k;
    s.hipsY += (hipsY - s.hipsY) * k;
    const r = m.rig;
    if (m.kind !== 'drums') r.hips.position.y = HIP_HEIGHT + s.hipsY;
    else r.hips.position.y = 1.24 + s.hipsY * 0.3;
    r.spine.rotation.set(s.lean, 0, s.tilt);
    r.neck.rotation.set(s.nod, turn + shake, 0);
  }

  // Reaction amounts for a musician at game time t.
  function reactions(m, t) {
    const sinceMiss = t - m.lastMistake;
    const sinceHit = t - m.lastHit;
    return {
      miss: defeated ? 1 : envelope(sinceMiss, 0.06, 0.32, 0.35),
      shake: sinceMiss >= 0 && sinceMiss < 0.5 && !defeated ? Math.sin(sinceMiss * 30) * 0.3 * (1 - sinceMiss / 0.5) : 0,
      hit: defeated ? 0 : envelope(sinceHit, 0.04, 0.12, 0.25) * m.hitStrength,
    };
  }

  // ---- Stringed players (bass + guitar) -------------------------------------
  function animateStringed(m, t, songTime, beat, live, dt, energy) {
    const { miss, shake, hit } = reactions(m, t);
    const phase = ((beat % 1) + 1) % 1;
    const pulse = live ? Math.pow(1 - phase, 3) : 0.3 + 0.3 * Math.sin(t * 2);
    const bang = (0.12 + energy * 0.18) * pulse;
    const isBass = m.kind === 'bass';

    posture(m, dt, {
      lean: 0.08 + miss * 0.55 - hit * 0.3 + bang * 0.3,
      nod: bang * 1.3 + miss * 0.5 - hit * 0.35,
      tilt: Math.sin(beat * Math.PI) * 0.04 * (live ? 1 : 0.3),
      hipsY: -pulse * 0.1 - miss * 0.15 + hit * 0.12,
      shake,
    });

    const inst = m.instrument;
    inst.group.rotation.set(-0.12 + miss * 0.25, 0, m.baseTilt + hit * 0.55 - miss * 0.2);
    inst.group.updateMatrix();

    // Strumming hand: sweeps across the strings on every cue for this lane.
    const times = byLane[m.lane];
    const strum = live && !defeated ? strumCurve(times, songTime) : 0;
    tmp.copy(inst.strumPoint);
    tmp.y += strum * (isBass ? 0.1 : 0.2);
    tmp.z += isBass ? Math.abs(strum) * 0.05 : 0;
    const strumTarget = tmp.applyMatrix4(inst.group.matrix).clone();
    strumTarget.y -= miss * 0.35;
    strumTarget.z += miss * 0.15;

    // Fretting hand: slides to a new spot along the neck for each note.
    const idx = Math.max(0, lastIndex(times, songTime));
    const wanted = live ? 0.15 + hash(idx) * 0.7 : 0.35;
    m.fret += (wanted - m.fret) * (1 - Math.exp(-dt * 14));
    const fretTarget = tmp2.copy(inst.fretNear).lerp(inst.fretFar, m.fret).applyMatrix4(inst.group.matrix).clone();

    placeHands(m, [strumTarget, fretTarget], dt);
    const s = 0.45 + pulse * 0.05;
    placeFoot(m, m.rig.legs[0], tmp.set(-s, DIMS.footH, 0.05));
    placeFoot(m, m.rig.legs[1], tmp.set(s, DIMS.footH, 0.05));
  }

  // ---- Singer ---------------------------------------------------------------
  const vocalTimes = byLane[1];
  const GESTURES = [
    new THREE.Vector3(0.7, 0.25, 0.25),  // hand on hip
    new THREE.Vector3(1.05, 1.0, 0.75),  // reach out to the crowd
    new THREE.Vector3(0.55, 2.0, 0.35),  // fist up
    new THREE.Vector3(0.15, 0.75, 0.38), // hand on heart
  ];
  const POINT_UP = new THREE.Vector3(0.45, 2.15, 0.45);

  function animateSinger(m, t, songTime, beat, live, dt, energy) {
    const { miss, shake, hit } = reactions(m, t);
    const phase = ((beat % 1) + 1) % 1;
    const pulse = live ? Math.pow(1 - phase, 3) : 0.3 + 0.3 * Math.sin(t * 2);

    const i = lastIndex(vocalTimes, songTime);
    const since = i >= 0 ? songTime - vocalTimes[i] : 9;
    const until = i + 1 < vocalTimes.length ? vocalTimes[i + 1] - songTime : 9;
    const singing = live && !defeated && (since < 1.4 || until < 0.35);
    const open = live ? envelope(since, 0.03, 0.1, 0.3) * (0.6 + 0.4 * hash(i)) : 0;
    m.rig.mouth.scale.y = 1 + open * 3.2 + (singing ? 0.6 : 0);

    posture(m, dt, {
      lean: miss * 0.5 - hit * 0.15 + (singing ? -0.06 : 0.04),
      nod: pulse * (0.1 + energy * 0.12) + miss * 0.45 - hit * 0.3 - open * 0.12,
      tilt: Math.sin(beat * Math.PI) * 0.06,
      hipsY: -pulse * 0.08 - miss * 0.12 + hit * 0.3,
      turn: singing ? 0 : Math.sin(t * 0.7) * 0.3,
      shake,
    });

    const micTarget = singing
      ? new THREE.Vector3(-0.1, 1.27, 0.46)
      : new THREE.Vector3(-0.38, 0.55 - miss * 0.2, 0.4);
    const p = lastIndex(phraseTimes, songTime);
    let free = (live && p >= 0 ? GESTURES[p % GESTURES.length] : GESTURES[0]).clone();
    if (hit > 0) free.lerp(POINT_UP, hit);
    if (miss > 0) free.lerp(new THREE.Vector3(0.2, 1.45, 0.4), miss); // hand to forehead: "oops"
    placeHands(m, [micTarget, free], dt, 22);

    const s = 0.5;
    placeFoot(m, m.rig.legs[0], tmp.set(-s, DIMS.footH, 0.1));
    placeFoot(m, m.rig.legs[1], tmp.set(s, DIMS.footH, -0.05));

    // Point the microphone at her mouth.
    m.rig.root.updateMatrixWorld(true);
    const mouthWorld = m.rig.head.localToWorld(tmp.set(0, 0.16, 0.4));
    const micWorld = m.mic.getWorldPosition(tmp2);
    const dir = mouthWorld.sub(micWorld).normalize();
    m.rig.arms[0].hand.getWorldQuaternion(quat);
    m.mic.quaternion.setFromUnitVectors(UP, dir).premultiply(quat.invert());

    // Ponytail: a springy pendulum pushed around by head movement.
    const head = m.rig.head.getWorldPosition(tmp);
    const pony = m.pony;
    const vx = (head.x - pony.lastHead.x) / Math.max(dt, 1e-3);
    const vy = (head.y - pony.lastHead.y) / Math.max(dt, 1e-3);
    pony.lastHead.copy(head);
    pony.vx += (-pony.ax * 60 - pony.vx * 6 + vy * 0.9) * dt;
    pony.vz += (-pony.az * 60 - pony.vz * 6 - vx * 0.9) * dt;
    pony.ax += pony.vx * dt;
    pony.az += pony.vz * dt;
    m.ponytail[0].rotation.set(0.45 + pony.ax, 0, pony.az);
    m.ponytail[1].rotation.set(-0.25 + pony.ax * 0.6, 0, pony.az * 0.6);
    m.ponytail[2].rotation.set(-0.1 + pony.ax * 0.4, 0, pony.az * 0.4);
  }

  // ---- Drummer --------------------------------------------------------------
  const kick = role('kick');
  const snareTimes = role('backbeat');
  const hatTimes = role('hi-hat');
  const stickTip = [new THREE.Vector3(), new THREE.Vector3()];

  function strike(piece, songTime, times) {
    const i = lastIndex(times, songTime);
    if (i >= 0 && songTime - times[i] < 0.03 && piece.struckAt !== times[i]) piece.struckAt = times[i];
  }

  function animateDrummer(m, t, songTime, beat, live, dt, energy) {
    const { miss, shake, hit } = reactions(m, t);
    const phase = ((beat % 1) + 1) % 1;
    const pulse = live ? Math.pow(1 - phase, 3) : 0.3;
    const kit = m.kit;
    const play = live && !defeated;

    posture(m, dt, {
      lean: 0.18 + miss * 0.5 - hit * 0.25 + pulse * 0.05,
      nod: pulse * (0.15 + energy * 0.2) + miss * 0.5 - hit * 0.3,
      tilt: 0,
      hipsY: hit * 0.3,
      shake,
    });
    m.rig.root.updateMatrixWorld(true);

    // Which drum each hand plays right now, and how high the stick is lifted.
    // Right hand (index 0, -x side): snare on the backbeat. Left hand: hi-hat.
    // A hit on your DRUMS pad: both sticks crash the cymbals.
    const accent = hit > 0 && m.hitStrength >= 0.7; // crash only on big moments
    const pieces = accent ? [kit.hits.ride, kit.hits.crash] : [kit.hits.snare, kit.hits.hat];
    const lifts = !play ? [0.5, 0.5]
      : accent ? [1 - hit, 1 - hit]
      : [liftCurve(snareTimes, songTime), liftCurve(hatTimes, songTime)];
    if (play && !accent) {
      strike(kit.hits.snare, songTime, snareTimes);
      strike(kit.hits.hat, songTime, hatTimes);
    }
    if (accent && t - m.lastHit < 0.05) { kit.hits.crash.struckAt = songTime; kit.hits.ride.struckAt = songTime; }

    const targets = [0, 1].map((i) => {
      const lift = Math.min(1, lifts[i] + miss);
      const side = i === 0 ? -1 : 1;
      stickTip[i].copy(pieces[i].point).add(tmp.set(0, lift * 0.65, -lift * 0.2));
      // The hand holds the stick ~0.6 back from its tip, toward the drummer.
      const hand = tmp2.set(side * 0.3, 2.25, 0.05).sub(stickTip[i]).normalize().multiplyScalar(0.62).add(stickTip[i]);
      hand.y -= miss * 0.4;
      return m.rig.chest.worldToLocal(m.rig.root.localToWorld(hand.clone()));
    });
    placeHands(m, targets, dt, 45);

    // Sticks run from each hand to its tip.
    m.rig.root.updateMatrixWorld(true);
    m.sticks.forEach((stick, i) => {
      const handWorld = m.rig.arms[i].hand.getWorldPosition(tmp);
      const butt = kit.group.worldToLocal(handWorld.clone()).add(tmp2.set(0, -0.1, 0));
      stick.position.copy(butt);
      const dir = stickTip[i].clone().sub(butt).normalize();
      stick.quaternion.setFromUnitVectors(UP, dir);
    });

    // Feet: right foot on the kick pedal (taps on kick cues), left on the hi-hat pedal.
    const kickLift = play ? liftCurve(kick, songTime, 0.1) : 0.3;
    placeFoot(m, m.rig.legs[0], tmp.copy(kit.kickPedal).add(tmp2.set(0, DIMS.footH + kickLift * 0.12, -0.05)), new THREE.Vector3(0, 0.6, 1));
    placeFoot(m, m.rig.legs[1], tmp.copy(kit.hatPedal).add(tmp2.set(0, DIMS.footH, 0)), new THREE.Vector3(0, 0.6, 1));

    // Drums and cymbals wobble after being struck.
    for (const piece of Object.values(kit.hits)) {
      const age = songTime - piece.struckAt;
      const w = age >= 0 && age < 0.6 ? Math.sin(age * 40) * 0.12 * (1 - age / 0.6) : 0;
      piece.mesh.rotation.x = piece.base.x + w;
      piece.mesh.rotation.z = piece.base.z + w * 0.5;
    }
  }

  // ---- Public interface (same as the pixel band) ---------------------------
  return {
    onEvent(e, t) {
      const m = members[e.lane];
      // Normal hits get a small bounce; a combo milestone (every 25 in a row)
      // makes the WHOLE band do their big move.
      if ((e.type === 'hit' && e.milestone) || e.type === 'riotStart') {
        for (const each of members) { each.lastHit = t; each.hitStrength = 1; }
      } else if (e.type === 'hit' || e.type === 'holdComplete') {
        m.lastHit = t;
        m.hitStrength = e.type === 'holdComplete' ? 0.7 : e.grade === 'perfect' ? 0.35 : 0.2;
      }
      if (e.type === 'mistake') m.lastMistake = t;
    },
    reset() {
      defeated = false;
      for (const m of members) { m.lastHit = -99; m.lastMistake = -99; }
    },
    setDefeated(v) { defeated = v; },
    setVisible(v) { visible = v; group.visible = v; },
    /**
     * @param {number} t       game time
     * @param {number} beat    beat position
     * @param {boolean} live   a song is playing
     * @param {number} dt      seconds since last frame
     * @param {number} energy  0..1 how intense the music is right now
     */
    update(t, beat, live, dt, energy = 0.5) {
      if (!visible) return;
      const songTime = t - LEAD;
      animateStringed(bass, t, songTime, beat, live, dt, energy);
      animateSinger(singer, t, songTime, beat, live, dt, energy);
      animateStringed(guitar, t, songTime, beat, live, dt, energy);
      animateDrummer(drums, t, songTime, beat, live, dt, energy);
    },
  };
}
