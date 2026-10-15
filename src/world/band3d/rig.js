// =============================================================================
// rig.js — builds a blocky 3D person with real joints, and moves their arms
// and legs with "inverse kinematics" (IK).
//
// A RIG is a tree of joints. Each joint is an invisible THREE.Group; the
// visible blocks (meshes) hang off the joints. Rotating a joint moves
// everything below it — rotate a shoulder and the elbow, forearm and hand
// follow, just like a real arm.
//
//   root (feet on the floor)
//   └─ hips ─┬─ hipL ─ kneeL ─ ankleL      (legs)
//            ├─ hipR ─ kneeR ─ ankleR
//            └─ spine ─ chest ─┬─ neck ─ head
//                              ├─ shoulderL ─ elbowL ─ handL
//                              └─ shoulderR ─ elbowR ─ handR
//
// IK: instead of choosing shoulder and elbow angles by hand, we say "put the
// hand HERE" (e.g. on the guitar strings) and solveTwoBone() works out the
// angles. That's what lets the hands really strum and really hit drums.
//
// Characters face +z (toward the camera). Their RIGHT hand is on the -x side.
// =============================================================================
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const DIMS = {
  footH: 0.18, shin: 0.9, thigh: 0.95,
  waist: 0.4, chest: 1.0, neck: 0.12, head: 0.7,
  upperArm: 0.62, foreArm: 0.58,
  shoulderX: 0.56, shoulderY: 0.86, hipX: 0.22,
};
export const HIP_HEIGHT = DIMS.footH + DIMS.shin + DIMS.thigh;

// SPEED TRICK: every block uses this ONE material, and its color is painted
// into the shape itself ("vertex colors"). Then bake() can glue all blocks
// that move together into a single mesh, so the phone draws a whole forearm
// (or a whole guitar) in one go instead of piece by piece.
export const PAINTED = new THREE.MeshLambertMaterial({ vertexColors: true });

/** Paint every corner of a geometry one color. */
export function paint(geometry, color) {
  const c = new THREE.Color(color);
  const n = geometry.attributes.position.count;
  const colors = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) colors.set([c.r, c.g, c.b], i * 3);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/** A painted mesh from any geometry. */
export function part(geometry, color) {
  return new THREE.Mesh(paint(geometry, color), PAINTED);
}

/** Add a box of size (w,h,d) at (x,y,z) inside `parent`. */
export function box(parent, w, h, d, x, y, z, color) {
  const m = part(new THREE.BoxGeometry(w, h, d), color);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/**
 * Merge the painted blocks under each joint into one mesh per joint.
 * Meshes marked `userData.keep = true` (like the mouth, which stretches when
 * singing) are left alone. Call once after a character is fully built.
 */
export function bake(root) {
  const groups = [];
  root.traverse((o) => { if (o.isGroup || o === root) groups.push(o); });
  for (const g of groups) {
    const meshes = g.children.filter((c) => c.isMesh && c.material === PAINTED && !c.userData.keep);
    if (meshes.length < 2) continue;
    const geos = meshes.map((m) => {
      m.updateMatrix();
      const geo = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(m.matrix);
      for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'color'].includes(name)) geo.deleteAttribute(name);
      return geo;
    });
    const merged = new THREE.Mesh(mergeGeometries(geos), PAINTED);
    for (const m of meshes) { g.remove(m); m.geometry.dispose(); }
    g.add(merged);
  }
}

const joint = (parent, x, y, z) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
};

/**
 * Build the basic body. `look` supplies colors:
 * { skin, shirt, sleeve, forearm, pants, shoe, sole, brow }
 * and optionally `build` ('slim' | 'regular' | 'broad') for body shape.
 * Returns the joints so outfits, hair and instruments can be attached.
 */
export function buildBody(look) {
  const D = DIMS;
  const width = { slim: 0.86, regular: 1, broad: 1.1 }[look.build || 'regular'];
  const root = new THREE.Group();
  const hips = joint(root, 0, HIP_HEIGHT, 0);
  box(hips, 0.82, 0.36, 0.46, 0, 0, 0, look.pants);

  const legs = [-1, 1].map((side) => {
    const hip = joint(hips, side * D.hipX, -0.05, 0);
    box(hip, 0.32, D.thigh, 0.34, 0, -D.thigh / 2, 0, look.pants);
    const knee = joint(hip, 0, -D.thigh, 0);
    box(knee, 0.29, D.shin, 0.3, 0, -D.shin / 2, 0, look.pants);
    const ankle = joint(knee, 0, -D.shin, 0);
    box(ankle, 0.3, D.footH, 0.5, 0, -D.footH / 2, 0.1, look.shoe);
    box(ankle, 0.31, 0.05, 0.52, 0, -D.footH + 0.025, 0.1, look.sole);
    return { hip, knee, ankle, side };
  });

  const spine = joint(hips, 0, 0.12, 0);
  box(spine, 0.8 * width, D.waist, 0.44, 0, D.waist / 2, 0, look.shirt);
  const chest = joint(spine, 0, D.waist, 0);
  box(chest, 0.92 * width, D.chest, 0.5, 0, D.chest / 2, 0, look.shirt);

  const neck = joint(chest, 0, D.chest, 0);
  box(neck, 0.26, 0.16, 0.26, 0, 0.06, 0, look.skin);
  const head = joint(neck, 0, D.neck, 0);
  box(head, 0.62, D.head, 0.62, 0, D.head / 2, 0, look.skin);
  // Face: eyes, brows, nose, ears, mouth (mouth can open for singing)
  for (const s of [-1, 1]) {
    box(head, 0.09, 0.1, 0.02, s * 0.14, 0.4, 0.315, '#1a1220');
    box(head, 0.14, 0.04, 0.02, s * 0.14, 0.49, 0.315, look.brow || '#2a1a14');
    box(head, 0.06, 0.16, 0.12, s * 0.33, 0.36, 0, look.skin);
  }
  box(head, 0.08, 0.1, 0.06, 0, 0.3, 0.33, look.skin);
  const mouth = box(head, 0.2, 0.05, 0.02, 0, 0.16, 0.316, '#5a1d24');
  mouth.userData.keep = true; // it stretches when singing, so don't merge it

  const arms = [-1, 1].map((side) => {
    const shoulder = joint(chest, side * D.shoulderX * width, D.shoulderY, 0);
    box(shoulder, 0.25, D.upperArm, 0.25, 0, -D.upperArm / 2, 0, look.forearm);
    // short sleeve over the upper arm
    box(shoulder, 0.29, 0.3, 0.29, 0, -0.12, 0, look.sleeve);
    const elbow = joint(shoulder, 0, -D.upperArm, 0);
    box(elbow, 0.21, D.foreArm, 0.21, 0, -D.foreArm / 2, 0, look.forearm);
    const hand = joint(elbow, 0, -D.foreArm, 0);
    box(hand, 0.2, 0.22, 0.2, 0, -0.09, 0, look.skin);
    return { shoulder, elbow, hand, side };
  });

  return { root, hips, spine, chest, neck, head, mouth, legs, arms };
}

// ---------------------------------------------------------------------------
// Two-bone IK. `upper` is the shoulder/hip joint, `lower` the elbow/knee.
// `target` and `pole` are in the coordinate space of upper's PARENT.
// The pole says which way the elbow/knee should point.
// ---------------------------------------------------------------------------
const DOWN = new THREE.Vector3(0, -1, 0);
const _toT = new THREE.Vector3();
const _bend = new THREE.Vector3();
const _elbowDir = new THREE.Vector3();
const _fore = new THREE.Vector3();
const _inv = new THREE.Quaternion();

export function solveTwoBone(upper, lower, a, b, target, pole) {
  _toT.copy(target).sub(upper.position);
  const d = THREE.MathUtils.clamp(_toT.length(), Math.abs(a - b) + 1e-3, a + b - 1e-3);
  _toT.normalize();
  // Bend direction: the part of the pole that is sideways to the target line.
  _bend.copy(pole).addScaledVector(_toT, -pole.dot(_toT));
  if (_bend.lengthSq() < 1e-6) _bend.set(0, 0, 1);
  _bend.normalize();
  // Law of cosines gives the angle at the shoulder.
  const cosA = THREE.MathUtils.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  _elbowDir.copy(_toT).multiplyScalar(cosA).addScaledVector(_bend, sinA);
  upper.quaternion.setFromUnitVectors(DOWN, _elbowDir);
  // Forearm points from the elbow to the target, expressed in the upper bone's space.
  _fore.copy(_toT).multiplyScalar(d).addScaledVector(_elbowDir, -a).normalize();
  _inv.copy(upper.quaternion).invert();
  _fore.applyQuaternion(_inv);
  lower.quaternion.setFromUnitVectors(DOWN, _fore);
}

/** Smoothly move vector `v` toward `target` (frame-rate independent). */
export function approach(v, target, dt, speed = 30) {
  v.lerp(target, 1 - Math.exp(-dt * speed));
}

/** 0→1→0 envelope: quick attack, hold, smooth release. */
export function envelope(since, attack, hold, release) {
  if (since < 0) return 0;
  if (since < attack) return since / attack;
  if (since < attack + hold) return 1;
  const r = (since - attack - hold) / release;
  return r < 1 ? 1 - r * r * (3 - 2 * r) : 0;
}
