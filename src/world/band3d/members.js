// =============================================================================
// members.js — what each band member looks like, following the character
// descriptions in docs/BURN_BRIGHT_MASTER_BLUEPRINT.md (section 3).
//
// Each builder starts from the shared body in rig.js, then adds hair, outfit
// details and an instrument.
// =============================================================================
import * as THREE from 'three';
import { buildBody, box, part, bake, PAINTED } from './rig.js';
import { buildStringed, buildMic, buildDrumKit, flameEmblem } from './instruments.js';

const SNEAKER = { shoe: '#f1ece2', sole: '#c0303a' };

const paintStick = () => part(new THREE.CylinderGeometry(0.02, 0.028, 0.75, 6), '#e8c890').geometry;

/** Bassist: slim scientist — backwards cap, glasses, light stubble, open lab coat, jeans. */
export function buildBassist() {
  const skin = '#f0c7a2';
  const rig = buildBody({ skin, shirt: '#16141c', sleeve: '#f4f4f0', forearm: '#f4f4f0', pants: '#3d5f9e', ...SNEAKER, brow: '#6b4a2e', build: 'slim' });
  const { head, chest, spine } = rig;
  // Light stubble on the jaw
  box(head, 0.5, 0.2, 0.02, 0, 0.13, 0.312, '#c9a387');
  // Backwards cap: crown + brim pointing back
  box(head, 0.66, 0.2, 0.66, 0, 0.74, 0, '#6b7a3a');
  box(head, 0.42, 0.05, 0.3, 0, 0.66, -0.42, '#5a6831');
  box(head, 0.64, 0.12, 0.08, 0, 0.6, -0.3, '#7a5a3a'); // hair peeking out the back
  // Glasses
  for (const s of [-1, 1]) {
    box(head, 0.2, 0.15, 0.02, s * 0.14, 0.4, 0.33, '#1a1a22');
    box(head, 0.14, 0.09, 0.02, s * 0.14, 0.4, 0.335, '#9fc8e0');
  }
  box(head, 0.08, 0.03, 0.02, 0, 0.42, 0.33, '#1a1a22');
  // Science T-shirt: little atom
  const atom = part(new THREE.TorusGeometry(0.1, 0.018, 6, 16), '#ffd34d');
  atom.position.set(0, 0.55, 0.26);
  chest.add(atom);
  box(chest, 0.05, 0.05, 0.02, 0, 0.55, 0.27, '#ffd34d');
  // Open lab coat: two front panels + back, hanging to mid-thigh
  for (const s of [-1, 1]) box(chest, 0.22, 1.85, 0.05, s * 0.31, 0.07, 0.27, '#f4f4f0');
  box(chest, 0.84, 1.85, 0.05, 0, 0.07, -0.27, '#f4f4f0');
  box(spine, 0.06, 1.0, 0.5, -0.41, -0.1, 0, '#e6e6e0');
  box(spine, 0.06, 1.0, 0.5, 0.41, -0.1, 0, '#e6e6e0');

  const bass = buildStringed({ body: '#1f5a3a', pickguard: '#e8e4d8', neckLength: 1.55, bodyScale: 1.05 });
  bake(rig.root);
  bake(bass.group);
  return { rig, instrument: bass, kind: 'bass' };
}

/** Lead singer: ponytail, hoop earrings, sleeved band tee, olive cargo pants. */
export function buildSinger() {
  const skin = '#c98b5e';
  const rig = buildBody({ skin, shirt: '#17141d', sleeve: '#17141d', forearm: skin, pants: '#5d6b2e', shoe: '#1e1e24', sole: '#e8e4d8', brow: '#2a1610', build: 'slim' });
  const { head, chest, hips, legs, arms } = rig;
  const hair = '#3a1d14';
  box(head, 0.68, 0.22, 0.68, 0, 0.74, -0.01, hair);
  box(head, 0.68, 0.5, 0.14, 0, 0.5, -0.31, hair);
  // Long side locks framing the face, down past the chin
  box(head, 0.12, 0.72, 0.5, -0.34, 0.4, -0.06, hair);
  box(head, 0.12, 0.72, 0.5, 0.34, 0.4, -0.06, hair);
  box(head, 0.12, 0.3, 0.2, -0.33, 0.02, 0.12, '#5a2418');
  box(head, 0.12, 0.3, 0.2, 0.33, 0.02, 0.12, '#5a2418');
  box(head, 0.5, 0.1, 0.1, 0.06, 0.66, 0.3, hair); // side-swept bangs
  for (const s of [-1, 1]) box(head, 0.13, 0.03, 0.02, s * 0.14, 0.46, 0.318, '#120c10'); // lashes
  box(head, 0.16, 0.04, 0.02, 0, 0.16, 0.318, '#b5464e'); // lipstick
  box(head, 0.16, 0.08, 0.16, 0, 0.82, -0.32, '#c02a2a'); // scrunchie
  // Hoop earrings
  for (const s of [-1, 1]) {
    const hoop = part(new THREE.TorusGeometry(0.075, 0.016, 6, 16), '#f2c23a');
    hoop.position.set(s * 0.42, 0.18, 0.1);
    hoop.rotation.y = Math.PI / 2;
    head.add(hoop);
  }
  // Ponytail: three linked segments that swing (animated in band3d.js)
  const ponytail = [];
  let parent = new THREE.Group();
  parent.position.set(0, 0.8, -0.36);
  head.add(parent);
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Group();
    seg.position.set(0, i === 0 ? 0 : -0.36, 0);
    parent.add(seg);
    box(seg, 0.26 - i * 0.04, 0.4, 0.22 - i * 0.03, 0, -0.18, 0, i === 2 ? '#8a2a1c' : hair);
    ponytail.push(seg);
    parent = seg;
  }
  // Flame band logo on the shirt
  box(chest, 0.3, 0.28, 0.02, 0, 0.5, 0.26, '#e85a1c');
  box(chest, 0.16, 0.18, 0.02, 0, 0.47, 0.27, '#ffc23a');
  // Belt, chain and cargo pockets
  box(hips, 0.84, 0.08, 0.48, 0, 0.14, 0, '#222');
  box(hips, 0.04, 0.3, 0.04, 0.3, -0.05, 0.25, '#b8bcc8');
  for (const leg of legs) box(leg.hip, 0.1, 0.24, 0.3, leg.side * 0.2, -0.55, 0.02, '#4e5a24');
  for (const arm of arms) box(arm.elbow, 0.24, 0.1, 0.24, 0, -0.45, 0, '#111');
  const mic = buildMic();
  bake(rig.root);
  bake(mic);
  return { rig, mic, ponytail, kind: 'vocals' };
}

/** Guitarist: buzz cut, short goatee, cross necklace, black tee, cargo pants. */
export function buildGuitarist() {
  const skin = '#b9784e';
  const rig = buildBody({ skin, shirt: '#141318', sleeve: '#141318', forearm: skin, pants: '#56602c', shoe: '#1e1e24', sole: '#e8e4d8', brow: '#1a120e' });
  const { head, chest, legs, arms } = rig;
  box(head, 0.64, 0.08, 0.64, 0, 0.72, 0, '#1c1612');
  box(head, 0.64, 0.3, 0.06, 0, 0.56, -0.31, '#1c1612');
  box(head, 0.2, 0.1, 0.02, 0, 0.07, 0.316, '#2a1e16'); // goatee
  // Cross necklace
  box(chest, 0.3, 0.02, 0.02, 0, 0.86, 0.26, '#c8ccd6');
  box(chest, 0.03, 0.18, 0.02, 0, 0.72, 0.265, '#e0e4ec');
  box(chest, 0.11, 0.03, 0.02, 0, 0.76, 0.265, '#e0e4ec');
  for (const leg of legs) box(leg.hip, 0.1, 0.24, 0.3, leg.side * 0.2, -0.55, 0.02, '#4a5424');
  for (const arm of arms) box(arm.elbow, 0.24, 0.1, 0.24, 0, -0.45, 0, '#111');
  const guitar = buildStringed({ body: '#8e1422', pickguard: '#121214', neckLength: 1.05 });
  bake(rig.root);
  bake(guitar.group);
  return { rig, instrument: guitar, kind: 'guitar' };
}

/** Drummer: wavy swept-back hair, clean-shaven, sleeved tee, red kit. */
export function buildDrummer() {
  const skin = '#a9693f';
  const rig = buildBody({ skin, shirt: '#1a1720', sleeve: '#1a1720', forearm: skin, pants: '#2c3346', shoe: '#1e1e24', sole: '#e8e4d8', brow: '#20140e', build: 'broad' });
  const { head } = rig;
  const hair = '#2e1a10';
  box(head, 0.68, 0.2, 0.7, 0, 0.76, -0.04, hair);
  box(head, 0.68, 0.46, 0.16, 0, 0.5, -0.32, hair);
  box(head, 0.1, 0.34, 0.56, -0.33, 0.55, -0.06, hair);
  box(head, 0.1, 0.34, 0.56, 0.33, 0.55, -0.06, hair);
  // a few waves on top
  for (let i = 0; i < 3; i++) box(head, 0.2, 0.08, 0.5, -0.2 + i * 0.2, 0.88, -0.08, '#3a2214');
  const kit = buildDrumKit(flameEmblem());
  const sticks = [0, 1].map(() => {
    const m = new THREE.Mesh(paintStick(), PAINTED);
    m.geometry.translate(0, 0.375, 0); // pivot at the butt end
    return m;
  });
  bake(kit.group);
  bake(rig.root);
  return { rig, kit, sticks, kind: 'drums' };
}
